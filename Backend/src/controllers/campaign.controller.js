const Campaign = require('../models/Campaign');
const Village = require('../models/Village');
const VillageScore = require('../models/VillageScore');
const Volunteer = require('../models/Volunteer');
const Assignment = require('../models/Assignment');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

// ─── GET /api/campaigns — List all campaigns (public) ────────────────────────
const getCampaigns = asyncHandler(async (req, res) => {
  const { status = 'Active', category, state } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (state) filter.state = new RegExp(state, 'i');

  const campaigns = await Campaign.find(filter)
    .sort({ isEmergency: -1, startDate: 1 })
    .limit(20)
    .lean();

  sendSuccess(res, 200, 'Campaigns fetched', campaigns);
});

// ─── POST /api/campaigns — NGO creates campaign ───────────────────────────────
const createCampaign = asyncHandler(async (req, res) => {
  const { title, description, category, targetAmount, volunteerTarget, startDate, endDate, state, city } = req.body;
  if (!title || !description || !category || !startDate || !endDate)
    throw new AppError('title, description, category, startDate, endDate are required', 400);

  const NGO = require('../models/NGO');
  const ngo = await NGO.findOne({ userId: req.user._id });
  if (!ngo) throw new AppError('NGO profile not found for this user', 404);

  const campaign = await Campaign.create({
    ngoId: ngo._id,
    title, description, category,
    targetAmount: targetAmount || 0,
    volunteerTarget: volunteerTarget || 10,
    startDate, endDate,
    isEmergency: req.body.isEmergency || false,
    state: state || ngo.state,
    city: city || ngo.city,
    ngoSummary: { name: ngo.name, city: ngo.city, state: ngo.state },
  });

  sendSuccess(res, 201, 'Campaign created', campaign);
});

// ─── POST /api/campaigns/:id/join — Volunteer joins ──────────────────────────
const joinCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);
  if (campaign.status !== 'Active') throw new AppError('Campaign is not active', 400);

  const alreadyJoined = campaign.volunteers.some(v => v.toString() === req.user._id.toString());
  if (alreadyJoined) throw new AppError('You have already joined this campaign', 400);

  // Same Day Constraint
  const userCampaigns = await Campaign.find({
    volunteers: req.user._id,
    status: { $in: ['Active', 'Upcoming'] }
  });
  const campaignDateStr = new Date(campaign.startDate).toDateString();
  const sameDayConflict = userCampaigns.find(c => new Date(c.startDate).toDateString() === campaignDateStr);
  if (sameDayConflict) {
    throw new AppError('You are already registered for another campaign on this exact same date.', 400);
  }

  campaign.volunteers.push(req.user._id);
  await campaign.save();
  sendSuccess(res, 200, 'Joined campaign successfully', { volunteersCount: campaign.volunteers.length });
});

// ─── POST /api/campaigns/:id/leave — Volunteer leaves ─────────────────────────
const leaveCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);

  // Check 24h cutoff
  const timeUntilStart = new Date(campaign.startDate).getTime() - Date.now();
  if (timeUntilStart > 0 && timeUntilStart < 24 * 60 * 60 * 1000) {
    throw new AppError('Cannot unregister within 24 hours of event start', 400);
  }

  campaign.volunteers = campaign.volunteers.filter(v => v.toString() !== req.user._id.toString());
  await campaign.save();
  sendSuccess(res, 200, 'Left campaign successfully', { volunteersCount: campaign.volunteers.length });
});

// ─── GET /api/campaigns/my — Volunteer gets their registered campaigns ────────
const getMyCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find({ volunteers: req.user._id })
    .sort({ startDate: 1 })
    .lean();
  sendSuccess(res, 200, 'My campaigns fetched', campaigns);
});

// ─── GET /api/campaigns/ngo/my — NGO gets their created campaigns ────────────
const getNgoCampaigns = asyncHandler(async (req, res) => {
  const NGO = require('../models/NGO');
  const ngo = await NGO.findOne({ userId: req.user._id });
  if (!ngo) throw new AppError('NGO profile not found for this user', 404);

  const campaigns = await Campaign.find({ ngoId: ngo._id })
    .sort({ createdAt: -1 })
    .lean();
  
  // also fetch assignments for each campaign to show stats
  const Assignment = require('../models/Assignment');
  const campIds = campaigns.map(c => c._id);
  const assignments = await Assignment.find({ campaignId: { $in: campIds } }).lean();

  const cWithStats = campaigns.map(c => {
    const cAssigns = assignments.filter(a => a.campaignId.toString() === c._id.toString());
    return {
      ...c,
      registeredVolunteers: c.volunteers ? c.volunteers.length : 0,
      villagesAided: cAssigns.length,
      assignedVolunteers: cAssigns.reduce((sum, a) => sum + a.volunteers_assigned.length, 0)
    };
  });

  sendSuccess(res, 200, 'NGO campaigns fetched', cWithStats);
});

// ─── GET /api/campaigns/:id — Single campaign ────────────────────────────────
const getCampaignById = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).populate('volunteers', 'name email').lean();
  if (!campaign) throw new AppError('Campaign not found', 404);
  sendSuccess(res, 200, 'Campaign fetched', campaign);
});

// ─── GET /api/campaigns/stats — Campaign analytics ───────────────────────────
const getCampaignStats = asyncHandler(async (req, res) => {
  const stats = await Campaign.aggregate([
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 }, totalTarget: { $sum: '$targetAmount' }, totalRaised: { $sum: '$raisedAmount' } } }],
        topCampaigns: [
          { $sort: { raisedAmount: -1 } },
          { $limit: 5 },
          { $project: { title: 1, raisedAmount: 1, targetAmount: 1, status: 1, 'ngoSummary.name': 1 } },
        ],
      },
    },
  ]);
  sendSuccess(res, 200, 'Campaign stats fetched', stats[0]);
});

const { parse } = require('csv-parse/sync');

// ─── POST /api/campaigns/with-survey — Create Campaign & Run Aid Algorithm ─────
const createCampaignWithSurvey = asyncHandler(async (req, res) => {
  const { title, description, category, targetAmount, volunteerTarget, startDate, endDate, state, city } = req.body;
  if (!title || !description || !category || !startDate || !endDate)
    throw new AppError('title, description, category, startDate, endDate are required', 400);
 
  const DOMAIN_MAP = {
    medical: 'Healthcare & Wellness',
    food: 'Food Security & Distribution',
    education: 'Education & Mentorship',
    shelter: 'Shelter & Caregiving',
    emergency: 'Emergency & Disaster Response'
  };

  const NGO = require('../models/NGO');
  const ngo = await NGO.findOne({ userId: req.user._id });
  if (!ngo) throw new AppError('NGO profile not found for this user', 404);

  // 1. Create the Campaign
  const campaign = await Campaign.create({
    ngoId: ngo._id,
    title, description, category,
    targetAmount: targetAmount || 0,
    volunteerTarget: volunteerTarget || 10,
    startDate, endDate,
    isEmergency: req.body.isEmergency === 'true' || req.body.isEmergency === true,
    state: state || ngo.state,
    city: city || ngo.city,
    ngoSummary: { name: ngo.name, city: ngo.city, state: ngo.state },
  });
 
  try {
    // 2. Process CSV if provided
    let villagesCount = 0;
    let assignmentsCount = 0;
 
    if (req.file) {
      const csvData = req.file.buffer.toString('utf-8');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        cast: true,
        relax_column_count: true,
        comment: '#'
      });

      // 3. Group Households into Villages and Aggregate Metrics
      const villageGroups = {};
      const villageScoreDocs = [];

      for (const row of records) {
        const vid = row.village_id || `VIL_${row.village_name || 'Unknown'}`;
        if (!villageGroups[vid]) {
          villageGroups[vid] = {
            village_id: vid,
            village_name: row.village_name || 'Unnamed Village',
            state: row.state || ngo.state,
            district: row.district || row.city || ngo.city,
            population: parseInt(row.population) || 0,
            households: 0,
            metrics: {
              // Health
              vaccination_coverage: [],
              infant_mortality: [],
              malnutrition: [],
              hospital_dist: [],
              doctors: [],
              // Food
              food_insecurity: [],
              meals_per_day: [],
              water_access: [],
              crop_failure: [],
              ration_card: [],
              // Education
              literacy: [],
              enrollment: [],
              teacher_ratio: [],
              dropout: [],
              school_dist: [],
              // Shelter
              homeless_damaged: [],
              persons_per_room: [],
              electricity_gap: [],
              sanitation_gap: [],
              disaster: []
            }
          };
        }

        const g = villageGroups[vid];
        g.households += 1;
        const pop = parseInt(row.population);
        if (!isNaN(pop)) g.population += pop;

        // Helper to push value if it's a valid number
        const pushVal = (val) => {
          const num = parseFloat(val);
          return (!isNaN(num)) ? num : null;
        };

        const addMetric = (arr, val) => {
          if (val !== null && val !== undefined) {
            const num = parseFloat(val);
            if (!isNaN(num)) arr.push(num);
          }
        };

        // Health mappings
        addMetric(g.metrics.vaccination_coverage, row.vaccination_coverage_pct ?? row.vaccinated_children_pct);
        addMetric(g.metrics.infant_mortality, row.infant_mortality_rate_per_1000 ?? (row.infant_deaths_last_5yr ? row.infant_deaths_last_5yr * 20 : null)); 
        addMetric(g.metrics.malnutrition, row.malnutrition_children_pct ?? row.malnourished_children_under5 ?? (row.child_malnutrition_yn !== undefined ? row.child_malnutrition_yn * 100 : null));
        addMetric(g.metrics.hospital_dist, row.avg_distance_to_hospital_km ?? row.distance_to_hospital_km);
        addMetric(g.metrics.doctors, row.doctors_per_1000);

        // Food mappings
        addMetric(g.metrics.food_insecurity, row.food_insecure_households_pct ?? (row.food_insecure_months_per_year ? row.food_insecure_months_per_year * 8.33 : null));
        addMetric(g.metrics.meals_per_day, row.avg_meals_per_day ?? row.meals_per_day);
        addMetric(g.metrics.water_access, row.clean_water_access_pct ?? (row.clean_water_access_yn !== undefined ? row.clean_water_access_yn * 100 : null));
        addMetric(g.metrics.crop_failure, row.crop_failure_last_3_years ?? (row.crop_failure_last_3yr ? row.crop_failure_last_3yr * 33.3 : null));
        addMetric(g.metrics.ration_card, row.ration_card_coverage_pct ?? (row.ration_card_yn !== undefined ? row.ration_card_yn * 100 : null));

        // Education mappings
        addMetric(g.metrics.literacy, row.literacy_rate_pct ?? (row.total_females_count > 0 ? (row.literate_females_count / row.total_females_count * 100) : null));
        addMetric(g.metrics.enrollment, row.school_enrollment_pct ?? (row.school_age_children_count > 0 ? (row.enrolled_children_count / row.school_age_children_count * 100) : null));
        addMetric(g.metrics.teacher_ratio, row.student_teacher_ratio ?? (row.teachers_in_school > 0 ? (row.enrolled_children_count / row.teachers_in_school) : null));
        addMetric(g.metrics.dropout, row.dropout_rate_pct ?? (row.enrolled_children_count > 0 ? (row.dropout_children_count / row.enrolled_children_count * 100) : null));
        addMetric(g.metrics.school_dist, row.distance_to_school_km);

        // Shelter mappings
        addMetric(g.metrics.homeless_damaged, row.homeless_or_damaged_homes_pct ?? (row.house_damaged_yn !== undefined ? row.house_damaged_yn * 100 : null));
        addMetric(g.metrics.persons_per_room, row.avg_persons_per_room ?? row.persons_per_room);
        addMetric(g.metrics.electricity_gap, row.homes_without_electricity_pct ?? (row.electricity_access_yn !== undefined ? (1 - row.electricity_access_yn) * 100 : null));
        addMetric(g.metrics.sanitation_gap, row.homes_without_sanitation_pct ?? (row.toilet_access_yn !== undefined ? (1 - row.toilet_access_yn) * 100 : null));
        addMetric(g.metrics.disaster, row.disaster_affected_pct ?? (row.disaster_affected_yn !== undefined ? row.disaster_affected_yn * 100 : null));
      }

      const villageDocs = [];
      const avg = (arr, def = 0) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : def;
      const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

      for (const vid in villageGroups) {
        const g = villageGroups[vid];
        const m = g.metrics;

        // Calculate Average Metrics for the village
        const vax = avg(m.vaccination_coverage, 75);
        const imr = avg(m.infant_mortality, 10);
        const mal = avg(m.malnutrition, 15);
        const hdist = avg(m.hospital_dist, 5);
        const docs = avg(m.doctors, 0.5);

        const food_ins = avg(m.food_insecurity, 20);
        const meals = avg(m.meals_per_day, 2.5);
        const water = avg(m.water_access, 70);
        const crop = avg(m.crop_failure, 1);
        const ration = avg(m.ration_card, 80);

        const lit = avg(m.literacy, 65);
        const enroll = avg(m.enrollment, 80);
        const tratio = avg(m.teacher_ratio, 35);
        const drop = avg(m.dropout, 10);
        const sdist = avg(m.school_dist, 3);

        const shelter_dmg = avg(m.homeless_damaged, 5);
        const ppr = avg(m.persons_per_room, 3);
        const elec_gap = avg(m.electricity_gap, 20);
        const san_gap = avg(m.sanitation_gap, 30);
        const dis = avg(m.disaster, 10);

        // Scoring Logic
        const m_score = (100 - vax) * 0.20 + imr * 0.30 + mal * 0.25 + hdist * 0.15 + (5 - clamp(docs, 0, 5)) * 20 * 0.10;
        const f_score = food_ins * 0.35 + (3 - clamp(meals, 0, 3)) * 33.3 * 0.30 + (100 - water) * 0.15 + clamp(crop, 0, 3) * 33.3 * 0.10 + (100 - ration) * 0.10;
        const e_score = (100 - lit) * 0.25 + (100 - enroll) * 0.30 + clamp(tratio - 30, 0, 50) * 2 * 0.20 + drop * 0.15 + clamp(sdist, 0, 20) * 5 * 0.10;
        const s_score = shelter_dmg * 0.30 + clamp(ppr - 1, 0, 9) * 11.1 * 0.15 + elec_gap * 0.15 + san_gap * 0.20 + dis * 0.20;

        const overall_score = (m_score + f_score + e_score + s_score) / 4;
        const vulnClass = overall_score > 75 ? 'CRITICAL' : overall_score > 60 ? 'HIGH' : overall_score > 40 ? 'MEDIUM' : 'LOW';
        const pDomain = m_score >= Math.max(f_score, e_score, s_score) ? 'Medical' 
                     : f_score >= Math.max(m_score, e_score, s_score) ? 'Food'
                     : e_score >= Math.max(m_score, f_score, s_score) ? 'Education'
                     : 'Shelter';

        villageDocs.push({
          campaignId: campaign._id,
          village_id: g.village_id,
          village_name: g.village_name,
          state: g.state,
          district: g.district,
          population: Math.max(g.population, g.households * 4),
          survey_date: new Date(),
          medical: { vaccination_coverage_pct: vax, infant_mortality_rate_per_1000: imr, malnutrition_children_pct: mal, avg_distance_to_hospital_km: hdist, doctors_per_1000: docs, score: m_score },
          food: { food_insecure_households_pct: food_ins, avg_meals_per_day: meals, clean_water_access_pct: water, crop_failure_last_3_years: crop, ration_card_coverage_pct: ration, score: f_score },
          education: { literacy_rate_pct: lit, school_enrollment_pct: enroll, student_teacher_ratio: tratio, dropout_rate_pct: drop, distance_to_school_km: sdist, score: e_score },
          shelter: { homeless_or_damaged_homes_pct: shelter_dmg, avg_persons_per_room: ppr, homes_without_electricity_pct: elec_gap, homes_without_sanitation_pct: san_gap, disaster_affected_pct: dis, score: s_score },
          overall_priority_score: overall_score
        });

        villageScoreDocs.push({
          campaignId: campaign._id,
          villageId: g.village_id,
          villageName: g.village_name,
          state: g.state,
          district: g.district,
          population: Math.max(g.population, g.households * 4),
          healthScore: m_score,
          foodScore: f_score,
          educationScore: e_score,
          shelterScore: s_score,
          overallVulnerabilityScore: overall_score,
          vulnerabilityClass: vulnClass,
          primaryDomain: pDomain,
          domainsAvailable: ['Medical', 'Food', 'Education', 'Shelter'].filter((_, i) => [m_score, f_score, e_score, s_score][i] > 15),
          computedAt: new Date()
        });
      }

      const [insertedVillages, insertedScores] = await Promise.all([
        Village.insertMany(villageDocs),
        VillageScore.insertMany(villageScoreDocs)
      ]);
      villagesCount = insertedVillages.length;
 
      // 4. Volunteer Ranking
      const volsToRank = await Volunteer.find({}).sort({ volunteeringHours: -1 });
      let currentRank = 1;
      for (const v of volsToRank) {
        await Volunteer.updateOne({ _id: v._id }, { $set: { rank: currentRank++ } });
      }
 
      // 5. Multi-Domain Assignment Logic
      let domainTargetsObj = {};
      if (req.body.domainTargets) {
        try {
          domainTargetsObj = JSON.parse(req.body.domainTargets);
        } catch(e) {}
      } else {
        // Fallback
        domainTargetsObj[category.toLowerCase()] = { villages: 3, volunteers: volunteerTarget };
      }
 
      const assignmentDocs = [];
      const allAssignedVolIds = new Set();
      const activeDomains = Object.keys(domainTargetsObj).map(d => d.toLowerCase());
 
      const domainSelectedVillages = {};
      let globalTotalScore = 0;
 
      for (const domainStr of activeDomains) {
        const targets = domainTargetsObj[domainStr];
        const targetV = parseInt(targets.villages) || 3;
        
        const topVillages = [...insertedVillages].sort((a, b) => {
          const scoreA = a[domainStr]?.score || 0;
          const scoreB = b[domainStr]?.score || 0;
          return scoreB - scoreA;
        }).slice(0, targetV);
 
        domainSelectedVillages[domainStr] = topVillages;
        
        topVillages.forEach(v => {
          globalTotalScore += (v[domainStr]?.score || 0);
        });
      }

      const targetAmountVal = parseFloat(req.body.targetAmount) || 0;
 
      for (const domainStr of activeDomains) {
        const targets = domainTargetsObj[domainStr];
        const topVillages = domainSelectedVillages[domainStr];
        const totalVolunteersForDomain = parseInt(targets.volunteers) || 10;
        
        const dbDomain = DOMAIN_MAP[domainStr] || domainStr;
        const matchedVols = await Volunteer.find({ domains: dbDomain }).sort({ rank: 1 });
        const K = topVillages.length;
        
        if (K > 0 && matchedVols.length > 0) {
          const domainTotalScore = topVillages.reduce((sum, v) => sum + (v[domainStr]?.score || 0), 0);
 
          // 1. Calculate how many volunteers each village needs proportionally
          const villageNeeds = topVillages.map(village => {
            const score = village[domainStr]?.score || 0;
            let needed = 0;
            if (domainTotalScore > 0) {
              needed = Math.round((score / domainTotalScore) * totalVolunteersForDomain);
            }
            if (needed === 0 && totalVolunteersForDomain > 0) needed = 1;
            return needed;
          });
 
          const totalNeededAcrossDomain = villageNeeds.reduce((a, b) => a + b, 0);
          const volsToDeal = matchedVols.slice(0, totalNeededAcrossDomain);
          
          const groups = Array.from({ length: K }, () => []);
          let volIndex = 0;
          let villagesStillNeeding = true;
          
          // 2. Capacity-Aware Round Robin Dealing
          while (volIndex < volsToDeal.length && villagesStillNeeding) {
            villagesStillNeeding = false;
            for (let idx = 0; idx < K; idx++) {
              if (groups[idx].length < villageNeeds[idx] && volIndex < volsToDeal.length) {
                groups[idx].push(volsToDeal[volIndex]);
                volIndex++;
                villagesStillNeeding = true;
              }
            }
          }
 
          topVillages.forEach((village, idx) => {
            const score = village[domainStr]?.score || 0;
            
            let fundsAssigned = 0;
            if (globalTotalScore > 0) {
              fundsAssigned = Math.round((score / globalTotalScore) * targetAmountVal);
            }
 
            const needed = villageNeeds[idx];
            const group = groups[idx];
            
            assignmentDocs.push({
              campaignId: campaign._id,
              village_id: village.village_id,
              village_name: village.village_name,
              domain: domainStr,
              priority_rank: idx + 1,
              domain_score: score,
              funds_assigned: fundsAssigned,
              volunteers_needed: needed,
              volunteers_assigned: group.map(g => g.userId),
              group_id: `GRP_${domainStr.substring(0,3).toUpperCase()}_${idx+1}`,
              group_rank_spread: group.map(g => g.rank)
            });
 
            group.forEach(g => allAssignedVolIds.add(g.userId.toString()));
          });
        }
      }
 
      if (assignmentDocs.length > 0) {
        await Assignment.insertMany(assignmentDocs);
        assignmentsCount = assignmentDocs.length;
        
        campaign.volunteers = Array.from(allAssignedVolIds);
        await campaign.save();
      }
    }
 
    sendSuccess(res, 201, 'Campaign created and surveyed successfully', {
      campaign,
      villagesProcessed: villagesCount,
      assignmentsCreated: assignmentsCount
    });
  } catch (err) {
    // 6. Rollback Campaign Creation on failure to prevent orphan campaigns
    await Campaign.findByIdAndDelete(campaign._id);
    throw err;
  }
});

// ─── DELETE /api/campaigns/:id — NGO deletes their campaign ──────────────────
const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new AppError('Campaign not found', 404);
 
  // Check ownership
  const NGO = require('../models/NGO');
  const ngo = await NGO.findOne({ userId: req.user._id });
  if (!ngo || campaign.ngoId.toString() !== ngo._id.toString()) {
    throw new AppError('You do not have permission to delete this campaign', 403);
  }
 
  // Delete related data: Villages and Assignments
  const Village = require('../models/Village');
  const Assignment = require('../models/Assignment');
  
  await Promise.all([
    Village.deleteMany({ campaignId: campaign._id }),
    Assignment.deleteMany({ campaignId: campaign._id }),
    Campaign.findByIdAndDelete(campaign._id)
  ]);
 
  sendSuccess(res, 200, 'Campaign and all associated data deleted successfully');
});

// ─── GET /api/campaigns/ngo/:id — NGO Campaign Details with Assignments ───────
const getCampaignDetailsNGO = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).lean();
  if (!campaign) throw new AppError('Campaign not found', 404);

  const Assignment = require('../models/Assignment');
  const Volunteer = require('../models/Volunteer');
  
  const assignments = await Assignment.find({ campaignId: campaign._id }).sort({ domain: 1, priority_rank: 1 }).lean();
  
  const allUserIds = [...new Set(assignments.flatMap(a => a.volunteers_assigned))];
  
  const vols = await Volunteer.find({ userId: { $in: allUserIds } })
    .populate('userId', 'name email')
    .lean();
    
  const volMap = {};
  vols.forEach(v => {
    if (v.userId) {
      volMap[v.userId._id.toString()] = {
        name: v.userId.name,
        email: v.userId.email,
        hours: v.volunteeringHours,
        rank: v.rank
      };
    }
  });

  const detailedAssignments = assignments.map(a => {
    return {
      ...a,
      volunteerDetails: a.volunteers_assigned.map(uid => volMap[uid.toString()] || { name: 'Unknown', hours: 0 })
    };
  });

  const Village = require('../models/Village');
  const rawSurvey = await Village.find({ campaignId: campaign._id }).lean();

  // Also fetch all registered volunteers and their domains
  const registeredUserIds = campaign.volunteers || [];
  const registeredVolsRaw = await Volunteer.find({ userId: { $in: registeredUserIds } })
    .populate('userId', 'name email')
    .lean();
    
  const registeredVolunteers = registeredVolsRaw.map(v => ({
    name: v.userId?.name || 'Unknown',
    email: v.userId?.email || 'Unknown',
    domains: v.domains || [],
    hours: v.volunteeringHours
  }));

  sendSuccess(res, 200, 'Detailed campaign fetched', { 
    campaign, 
    assignments: detailedAssignments, 
    rawSurvey,
    registeredVolunteers
  });
});

module.exports = { getCampaigns, createCampaign, createCampaignWithSurvey, joinCampaign, leaveCampaign, getMyCampaigns, getNgoCampaigns, getCampaignById, getCampaignDetailsNGO, getCampaignStats, deleteCampaign };
