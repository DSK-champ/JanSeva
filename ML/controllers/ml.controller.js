const mongoose = require('mongoose');
const Volunteer = require('../../Backend/src/models/Volunteer');
const VillageScore = require('../../Backend/src/models/VillageScore');
const VolunteerScore = require('../../Backend/src/models/VolunteerScore');
const SkillWeight = require('../../Backend/src/models/SkillWeight');
const DomainSkillMap = require('../../Backend/src/models/DomainSkillMap');

const { buildVolunteerScoringPipeline } = require('../pipelines/volunteerScoring');
const { buildVulnerabilityPipeline, buildOverallVulnerabilityPipeline } = require('../pipelines/villageVulnerability');
const { buildSmartMatchPipeline, DOMAIN_SKILL_MAP } = require('../pipelines/smartMatch');
const { buildDeploymentPipeline } = require('../pipelines/deploymentPlan');

// Helper
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sendSuccess = (res, code, msg, data) => res.status(code).json({ success: true, message: msg, data });

// ─── GET /api/ml/stats ────────────────────────────────────────────────────────
const getStats = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { campaignId } = req.query;

  let villageQuery = {};
  if (campaignId) {
    villageQuery.campaignId = new mongoose.Types.ObjectId(campaignId);
  }

  const [totalVillages, criticalVillages, sectorAvgResult] = await Promise.all([
    db.collection('villageScores').countDocuments(villageQuery),
    db.collection('villageScores').countDocuments({ ...villageQuery, vulnerabilityClass: 'CRITICAL' }),
    db.collection('villageScores').aggregate([
      { $match: villageQuery },
      {
        $group: {
          _id: null,
          avgHealth: { $avg: '$healthScore' },
          avgFood: { $avg: '$foodScore' },
          avgEducation: { $avg: '$educationScore' },
          avgShelter: { $avg: '$shelterScore' }
        }
      }
    ]).toArray()
  ]);

  let totalVolunteers = 0;
  let avgScore = 0;
  
  if (campaignId) {
    // Registered volunteers for this campaign
    const regs = await db.collection('campaignregistrations').find({ campaignId: new mongoose.Types.ObjectId(campaignId) }).toArray();
    totalVolunteers = regs.length;
    const volIds = regs.map(r => r.volunteerId);
    if (volIds.length > 0) {
      const avgScoreResult = await db.collection('volunteerscores').aggregate([
        { $match: { volunteerId: { $in: volIds } } },
        { $group: { _id: null, avg: { $avg: '$totalScore' } } }
      ]).toArray();
      avgScore = avgScoreResult[0]?.avg || 0;
    }
  } else {
    totalVolunteers = await db.collection('volunteers').countDocuments();
    const avgScoreResult = await db.collection('volunteerscores').aggregate([
      { $group: { _id: null, avg: { $avg: '$totalScore' } } }
    ]).toArray();
    avgScore = avgScoreResult[0]?.avg || 0;
  }

  sendSuccess(res, 200, 'ML stats fetched', {
    totalVillages,
    criticalVillages,
    totalVolunteers,
    avgVolunteerScore: Math.round(avgScore * 10) / 10,
    sectorAverages: sectorAvgResult[0] || {},
    tierBreakdown: [] // Removing tier breakdown from basic stats since it's heavy and rarely used here
  });
});



// ─── GET /api/ml/village-rankings ─────────────────────────────────────────────
const getVillageRankings = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { domain, limit = 50, campaignId } = req.query;

  const sortField = domain === 'health' ? 'healthScore'
    : domain === 'food' ? 'foodScore'
    : domain === 'education' ? 'educationScore'
    : domain === 'shelter' ? 'shelterScore'
    : 'overallVulnerabilityScore';

  let matchQuery = {};
  if (domain) matchQuery.primaryDomain = domain;
  if (campaignId) matchQuery.campaignId = new mongoose.Types.ObjectId(campaignId);

  const villages = await db.collection('villageScores').aggregate([
    { $match: matchQuery },
    { $sort: { [sortField]: -1 } },
    { $limit: parseInt(limit) },
    {
      $project: {
        villageId: 1, villageName: 1, state: 1, district: 1,
        overallVulnerabilityScore: 1, vulnerabilityClass: 1, primaryDomain: 1,
        healthScore: 1, foodScore: 1, educationScore: 1, shelterScore: 1,
        domainsAvailable: 1, population: 1, campaignId: 1
      }
    }
  ]).toArray();

  sendSuccess(res, 200, 'Village rankings fetched', villages);
});

// ─── GET /api/ml/village/:id/detail ───────────────────────────────────────────
const getVillageDetail = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { id } = req.params;

  const village = await db.collection('villageScores').findOne({ villageId: id });
  if (!village) {
    return res.status(404).json({ success: false, message: 'Village not found in ML scores' });
  }

  // Percentile rank among all villages
  const totalVillages = await db.collection('villageScores').countDocuments();
  const lowerCount = await db.collection('villageScores').countDocuments({
    overallVulnerabilityScore: { $lt: village.overallVulnerabilityScore }
  });
  const percentileRank = totalVillages > 1 ? Math.round((lowerCount / (totalVillages - 1)) * 100) : 50;

  // Domain breakdown from surveyresponses
  const domainCounts = {};
  for (const type of ['health', 'food', 'education', 'shelter']) {
    const count = await db.collection('surveyresponses').countDocuments({ villageId: id, surveyType: type });
    domainCounts[type] = count;
  }

  sendSuccess(res, 200, 'Village detail fetched', {
    ...village,
    percentileRank,
    householdsPerDomain: domainCounts
  });
});

// ─── GET /api/ml/volunteers/ranked ────────────────────────────────────────────
const getRankedVolunteers = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { tier, limit = 100, campaignId } = req.query;

  const matchStage = tier ? { 'scoreData.tier': tier } : {};

  let volunteerIds = null;
  if (campaignId) {
    const regs = await db.collection('campaignregistrations').find({ campaignId: new mongoose.Types.ObjectId(campaignId) }).toArray();
    volunteerIds = regs.map(r => r.volunteerId);
    if (volunteerIds.length === 0) return sendSuccess(res, 200, 'No volunteers', []);
  }

  const pipeline = [];
  if (volunteerIds) pipeline.push({ $match: { userId: { $in: volunteerIds } } });

  pipeline.push(
    {
      $lookup: {
        from: 'volunteerscores',
        localField: 'userId',
        foreignField: 'volunteerId',
        as: 'scoreData'
      }
    },
    { $unwind: { path: '$scoreData', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    { $match: matchStage },
    { $sort: { 'scoreData.totalScore': -1 } },
    { $limit: parseInt(limit) },
    {
      $project: {
        _id: 1,
        name: '$userInfo.name',
        email: '$userInfo.email',
        skills: 1,
        domains: 1,
        availability: 1,
        isAvailable: 1,
        location: 1,
        volunteeringHours: 1,
        completedRequests: 1,
        rating: 1,
        totalScore: { $ifNull: ['$scoreData.totalScore', 0] },
        tier: { $ifNull: ['$scoreData.tier', 'D'] },
        skillScore: { $ifNull: ['$scoreData.skillScore', 0] },
        experienceScore: { $ifNull: ['$scoreData.experienceScore', 0] },
        reliabilityScore: { $ifNull: ['$scoreData.reliabilityScore', 0] }
      }
    }
  );

  const volunteers = await db.collection('volunteers').aggregate(pipeline).toArray();

  sendSuccess(res, 200, 'Ranked volunteers fetched', volunteers);
});

// ─── GET /api/ml/smart-match/:villageId ────────────────────────────────────────
const getSmartMatch = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { villageId } = req.params;

  const village = await db.collection('villageScores').findOne({ villageId });
  if (!village) {
    return res.status(404).json({ success: false, message: 'Village not found in ML scores' });
  }

  // 1. Check if there's an existing assignment for this village
  const assignment = await db.collection('assignments').findOne({ village_id: villageId });
  
  if (assignment) {
    const volIds = assignment.volunteers_assigned;
    const volProfiles = await db.collection('volunteers').find({ userId: { $in: volIds } }).toArray();
    const userIds = volProfiles.map(v => v.userId);
    const users = await db.collection('users').find({ _id: { $in: userIds } }).project({ name: 1, email: 1 }).toArray();
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const volScores = await db.collection('volunteerscores').find({ volunteerId: { $in: userIds } }).toArray();
    const scoreMap = {};
    volScores.forEach(s => { scoreMap[s.volunteerId.toString()] = s; });

    const enriched = volProfiles.map(v => {
      const uIdStr = v.userId?.toString();
      const score = scoreMap[uIdStr];
      return {
        ...v,
        name: userMap[uIdStr]?.name || 'Unknown',
        email: userMap[uIdStr]?.email || 'Unknown',
        matchScore: score?.totalScore || 0,
        tier: score?.tier || 'D',
        matchingSkills: (v.skills || []).filter(s => (DOMAIN_SKILL_MAP[village.primaryDomain] || []).includes(s))
      };
    }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return sendSuccess(res, 200, 'Assigned volunteers fetched', {
      village,
      topN: enriched.length,
      consideredCount: enriched.length,
      matched: enriched,
      isAssigned: true
    });
  }

  const { primaryDomain, state, overallVulnerabilityScore, vulnerabilityClass } = village;
  const topN = vulnerabilityClass === 'CRITICAL' ? 5 : vulnerabilityClass === 'HIGH' ? 4 : 3;

  const pipeline = buildSmartMatchPipeline(primaryDomain, state, topN);
  const [result] = await db.collection('volunteers').aggregate(pipeline).toArray();

  // Merge facets and deduplicate, take top N
  const seen = new Set();
  const merged = [];

  // Priority: tierA first, then tierBC, then others
  for (const vol of [...(result?.tierA || []), ...(result?.tierBC || []), ...(result?.tierD || []), ...(result?.all || [])]) {
    if (!seen.has(vol._id.toString())) {
      seen.add(vol._id.toString());
      merged.push(vol);
    }
    if (merged.length >= topN) break;
  }

  // Enrich with user name
  const userIds = merged.map(v => v.userId);
  const users = await db.collection('users').find({ _id: { $in: userIds } }).project({ name: 1, email: 1 }).toArray();
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  const enriched = merged.map(v => ({
    ...v,
    name: userMap[v.userId?.toString()]?.name || 'Unknown',
    email: userMap[v.userId?.toString()]?.email || 'Unknown'
  }));

  sendSuccess(res, 200, 'Smart match computed', {
    village,
    topN,
    consideredCount: (result?.all?.length || 0),
    matched: enriched
  });
});

// ─── GET /api/ml/deployment-plan ──────────────────────────────────────────────
const getDeploymentPlan = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { campaignId } = req.query;

  // Since we have Assignments now, the deployment plan is just fetching assignments!
  let query = {};
  if (campaignId) query.campaignId = new mongoose.Types.ObjectId(campaignId);

  const assignments = await db.collection('assignments').find(query).toArray();
  
  if (assignments.length === 0) return sendSuccess(res, 200, 'Deployment plan fetched', []);

  // Fetch volunteers info
  const volIds = [...new Set(assignments.flatMap(a => a.volunteers_assigned))];
  const users = await db.collection('users').find({ _id: { $in: volIds } }).project({ name: 1 }).toArray();
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u.name; });

  const volsScores = await db.collection('volunteerscores').find({ volunteerId: { $in: volIds } }).toArray();
  const scoreMap = {};
  volsScores.forEach(s => { scoreMap[s.volunteerId.toString()] = s; });

  const deploymentPlan = assignments.map(a => ({
    villageId: a.village_id,
    villageName: a.village_name,
    primaryDomain: a.domain,
    vulnerabilityClass: a.domain_score > 75 ? 'CRITICAL' : a.domain_score > 65 ? 'HIGH' : 'MEDIUM',
    overallVulnerabilityScore: a.domain_score,
    fundsAssigned: a.funds_assigned || 0,
    assignedVolunteers: a.volunteers_assigned.map(vid => {
      const vidStr = vid.toString();
      const score = scoreMap[vidStr];
      return {
        id: vidStr,
        name: userMap[vidStr] || 'Unknown',
        tier: score?.tier || 'D',
        matchScore: score?.totalScore || 0,
        skills: score?.skills || []
      }
    })
  }));

  sendSuccess(res, 200, 'Deployment plan computed', deploymentPlan);
});

// ─── POST /api/ml/recompute ────────────────────────────────────────────────────
const recompute = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;

  // 1. Ensure indexes
  await db.collection('volunteerscores').createIndex({ totalScore: -1, tier: 1 });
  await db.collection('villageScores').createIndex({ overallVulnerabilityScore: -1 });
  await db.collection('surveyresponses').createIndex({ villageId: 1, surveyType: 1 });
  await db.collection('skillweights').createIndex({ skill: 1 }, { unique: true, background: true }).catch(() => {});

  // 2. Ensure skillweights seeded
  const existingWeights = await db.collection('skillweights').countDocuments();
  if (existingWeights === 0) {
    await db.collection('skillweights').insertMany([
      { skill: 'Medical',      weight: 1.0,  tier: 'HIGH'   },
      { skill: 'First Aid',    weight: 0.9,  tier: 'HIGH'   },
      { skill: 'Counselling',  weight: 0.8,  tier: 'HIGH'   },
      { skill: 'Teaching',     weight: 0.65, tier: 'MEDIUM' },
      { skill: 'Construction', weight: 0.55, tier: 'MEDIUM' },
      { skill: 'Cooking',      weight: 0.50, tier: 'MEDIUM' },
      { skill: 'Logistics',    weight: 0.45, tier: 'MEDIUM' },
      { skill: 'Driving',      weight: 0.40, tier: 'MEDIUM' },
      { skill: 'Translation',  weight: 0.25, tier: 'LOW'    },
      { skill: 'IT Support',   weight: 0.15, tier: 'LOW'    }
    ]);
  }

  // 3. Ensure domainskillmap seeded
  const existingDomains = await db.collection('domainskillmap').countDocuments();
  if (existingDomains === 0) {
    await db.collection('domainskillmap').insertMany([
      { domain: 'Healthcare & Wellness',        skills: ['Medical', 'First Aid', 'Counselling'] },
      { domain: 'Food Security & Distribution', skills: ['Cooking', 'Logistics', 'Driving', 'First Aid'] },
      { domain: 'Education & Mentorship',       skills: ['Teaching', 'Counselling', 'Translation', 'IT Support'] },
      { domain: 'Shelter & Caregiving',         skills: ['Construction', 'Logistics', 'Driving', 'Counselling'] },
      { domain: 'Emergency & Disaster Response',skills: ['Medical', 'First Aid', 'Logistics', 'Driving', 'Construction'] }
    ]);
  }

  // 4. Run volunteer scoring pipeline
  const volPipeline = buildVolunteerScoringPipeline();
  await db.collection('volunteers').aggregate(volPipeline).toArray();

  // 5. Run village vulnerability pipelines for existing surveyresponses data
  const SurveyResponse = require('../../Backend/src/models/SurveyResponse');
  const hasSurveys = await db.collection('surveyresponses').countDocuments();

  let villagesProcessed = 0;
  if (hasSurveys > 0) {
    const { buildVulnerabilityPipeline: bvp, buildOverallVulnerabilityPipeline: bovp } = require('../pipelines/villageVulnerability');
    const domainMap = { health: 'healthScore', food: 'foodScore', education: 'educationScore', shelter: 'shelterScore' };
    for (const [surveyType, scoreField] of Object.entries(domainMap)) {
      const p = bvp(surveyType, scoreField);
      if (p) await db.collection('surveyresponses').aggregate(p).toArray();
    }
    await db.collection('villageScores').aggregate(bovp()).toArray();
    villagesProcessed = await db.collection('villageScores').countDocuments();
  }

  const volunteerCount = await db.collection('volunteerscores').countDocuments();

  sendSuccess(res, 200, 'Recompute successful', {
    volunteersScored: volunteerCount,
    villagesProcessed
  });
});

// ─── POST /api/ml/campaign/:id/run-matching ─────────────────────────────────
// Proportional + diverse volunteer allocation per village
const runMatching = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = mongoose.connection.db;
  const campaignId = new mongoose.Types.ObjectId(id);
  const maxVillages = parseInt(req.query.maxVillages || req.body.maxVillages || 0) || null;

  const campaign = await db.collection('campaigns').findOne({ _id: campaignId });
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
  
  console.log(`[Matching] Campaign: ${campaign.title}, TargetAmount: ${campaign.targetAmount}`);

  const registered = await db.collection('campaignregistrations').find({ campaignId }).toArray();
  if (!registered.length) return res.status(400).json({ success: false, message: 'No registered volunteers found' });

  const volIds = registered.map(r => r.volunteerId);
  const allScores = await db.collection('volunteerscores')
    .find({ volunteerId: { $in: volIds } }).sort({ totalScore: -1 }).toArray();
  if (!allScores.length) return res.status(400).json({ success: false, message: 'No volunteer scores found. Run recompute first.' });



  // Fetch domain expertise per volunteer
  const volProfiles = await db.collection('volunteers').find({ userId: { $in: volIds } }).toArray();
  const domainMap = {};
  for (const vp of volProfiles) domainMap[vp.userId.toString()] = vp.domains || [];

  let vScores = await db.collection('villageScores')
    .find({ campaignId }).sort({ overallVulnerabilityScore: -1 }).toArray();
  if (!vScores.length) return res.status(400).json({ success: false, message: 'No village scores found for this campaign' });
  if (maxVillages && maxVillages > 0) vScores = vScores.slice(0, maxVillages);

  await db.collection('assignments').deleteMany({ campaignId });
  const newAssignments = [];
  const allAssigned = new Set();

  // Helper: proportional-cap + round-robin interleaved assignment
  // Each village's quota is proportional to its vulnerability score.
  // Volunteers are distributed by cycling (vol[0]→v1, vol[1]→v2, vol[2]→v3, vol[3]→v1 ...)
  // so each village gets a SPREAD of high and low ranked volunteers instead of a sequential block.
  const assignToVillages = async (villages, volPool, domainLabel, totalBudget) => {
    if (!villages.length || !volPool.length) return;

    const totalVuln = villages.reduce((s, v) => s + (v.overallVulnerabilityScore || 0), 0);
    // Total pool capped at 40 to avoid giant groups
    const poolSize = Math.min(volPool.length, 40);

    // Proportional allocation per village — at least 3 each
    const allocs = villages.map(v => {
      const prop = totalVuln > 0 ? (v.overallVulnerabilityScore || 0) / totalVuln : 1 / villages.length;
      return Math.max(3, Math.round(prop * poolSize));
    });

    // Interleave: merge experienced (A/B) and novice (C/D) alternately so the
    // round-robin cycle itself delivers a mixed tier to every village slot
    const exp = volPool.filter(s => s.tier === 'A' || s.tier === 'B');
    const nov = volPool.filter(s => s.tier === 'C' || s.tier === 'D');
    const interleaved = [];
    const maxLen = Math.max(exp.length, nov.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < exp.length) interleaved.push(exp[i]);
      if (i < nov.length) interleaved.push(nov[i]);
    }

    // Initialize per-village buckets
    const buckets = villages.map(() => []);
    let viCursor = 0;

    for (const vol of interleaved) {
      if (allAssigned.has(vol.volunteerId.toString())) continue;

      // Find the next village (from cursor) that still has quota
      let placed = false;
      for (let attempt = 0; attempt < villages.length; attempt++) {
        const vi = (viCursor + attempt) % villages.length;
        if (buckets[vi].length < allocs[vi]) {
          buckets[vi].push(vol);
          allAssigned.add(vol.volunteerId.toString());
          viCursor = (vi + 1) % villages.length; // advance cursor
          placed = true;
          break;
        }
      }
      if (!placed) break; // all villages are full
    }

    // Persist assignments
    for (let i = 0; i < villages.length; i++) {
      const village = villages[i];
      const prop = totalVuln > 0 ? (village.overallVulnerabilityScore || 0) / totalVuln : 1 / villages.length;
      const vols = buckets[i];
      if (!vols.length) continue;

      const volUserIds = vols.map(v => v.volunteerId);
      newAssignments.push({
        campaignId, village_id: village.villageId, village_name: village.villageName,
        domain: domainLabel, priority_rank: newAssignments.length + 1,
        domain_score: village.overallVulnerabilityScore,
        funds_assigned: totalVuln > 0 ? Math.round(prop * totalBudget) : Math.floor(totalBudget / villages.length),
        volunteers_needed: vols.length, volunteers_assigned: volUserIds,
        group_id: `GRP_${domainLabel.substring(0,3).toUpperCase()}_${village.villageId}`,
        group_rank_spread: vols.map(v => v.totalScore), createdAt: new Date(), updatedAt: new Date()
      });
      for (const v of vols) {
        await db.collection('campaignregistrations').updateOne(
          { campaignId, volunteerId: v.volunteerId },
          { $set: { status: 'matched', matchScore: v.totalScore || 0, assignedVillageId: village.villageId } }
        );
      }
    }
  };

  // Domain keyword → volunteer domain string matching
  const DOMAIN_MATCH = {
    food:      kw => kw.toLowerCase().includes('food') || kw.toLowerCase().includes('nutri') || kw.toLowerCase().includes('agri'),
    medical:   kw => kw.toLowerCase().includes('health') || kw.toLowerCase().includes('medic') || kw.toLowerCase().includes('wellness'),
    education: kw => kw.toLowerCase().includes('educ') || kw.toLowerCase().includes('teach') || kw.toLowerCase().includes('mentor'),
    shelter:   kw => kw.toLowerCase().includes('shelter') || kw.toLowerCase().includes('construct') || kw.toLowerCase().includes('care'),
  };

  const isMultiDomain = campaign.category === 'Other' || campaign.category === 'Multi-Domain Aid';

  // Calculate total vulnerability across ALL villages being assigned
  let totalCampaignVuln = 0;
  const groups = { food: [], medical: [], education: [], shelter: [] };
  
  if (isMultiDomain) {
    for (const v of vScores) {
      const domScores = {
        food: v.foodScore || 0, medical: v.healthScore || 0,
        education: v.educationScore || 0, shelter: v.shelterScore || 0
      };
      const primary = Object.entries(domScores).sort((a, b) => b[1] - a[1])[0][0];
      groups[primary].push(v);
      totalCampaignVuln += (v.overallVulnerabilityScore || 0);
    }
  } else {
    totalCampaignVuln = vScores.reduce((s, v) => s + (v.overallVulnerabilityScore || 0), 0);
  }

  const campaignBudget = campaign.targetAmount || 0;

  if (isMultiDomain) {
    // For each domain group, find volunteers with matching expertise
    for (const [domain, villages] of Object.entries(groups)) {
      if (!villages.length) continue;
      const matcher = DOMAIN_MATCH[domain];
      const domainVols = allScores.filter(s => {
        const volDomains = domainMap[s.volunteerId.toString()] || [];
        return volDomains.some(d => matcher(d));
      });
      // Fallback if not enough domain specialists
      const pool = domainVols.length >= 3
        ? domainVols.filter(s => !allAssigned.has(s.volunteerId.toString()))
        : allScores.filter(s => !allAssigned.has(s.volunteerId.toString()));

      // Instead of fixed /4, we use the proportion of this domain's vuln to total
      const domainVuln = villages.reduce((s, v) => s + (v.overallVulnerabilityScore || 0), 0);
      const domainBudget = totalCampaignVuln > 0 ? (domainVuln / totalCampaignVuln) * campaignBudget : campaignBudget / 4;
      
      await assignToVillages(villages, pool, domain, domainBudget);
    }
  } else {
    // Single-domain: proportional + diverse across all villages
    const pool = allScores.filter(s => !allAssigned.has(s.volunteerId.toString()));
    await assignToVillages(vScores, pool, campaign.category, campaign.targetAmount || 0);
  }

  const assignedUserIds = [...allAssigned].map(id => new mongoose.Types.ObjectId(id));
  await db.collection('campaignregistrations').updateMany(
    { campaignId, volunteerId: { $nin: assignedUserIds } }, { $set: { status: 'rejected' } }
  );
  if (newAssignments.length) await db.collection('assignments').insertMany(newAssignments);
  await db.collection('campaigns').updateOne(
    { _id: campaignId }, { $addToSet: { volunteers: { $each: assignedUserIds } } }
  );
  await db.collection('campaignreports').insertOne({
    campaignId, ngoId: campaign.ngoId, generatedAt: new Date(),
    matchedCount: assignedUserIds.length, villagesAssigned: newAssignments.length
  });
  res.json({ success: true, message: 'Matching successful', matchedCount: assignedUserIds.length, villagesAssigned: newAssignments.length });
});

module.exports = { getStats, getVillageRankings, getVillageDetail, getRankedVolunteers, getSmartMatch, getDeploymentPlan, recompute, runMatching };
