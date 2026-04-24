const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { randomUUID } = require('crypto');
const SurveyUpload = require('../../Backend/src/models/SurveyUpload');
const SurveyResponse = require('../../Backend/src/models/SurveyResponse');
const { buildVulnerabilityPipeline, buildOverallVulnerabilityPipeline } = require('../pipelines/villageVulnerability');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sendSuccess = (res, code, msg, data) => res.status(code).json({ success: true, message: msg, data });

// ─── Survey Type Column Definitions ───────────────────────────────────────────
const SURVEY_COLUMNS = {
  food: [
    'village_id', 'village_name', 'household_id', 'surveyor_id', 'survey_date',
    'monthly_income', 'meals_per_day', 'food_source_type', 'food_insecure_months_per_year',
    'child_malnutrition_yn', 'household_size', 'ration_card_yn', 'clean_water_access_yn',
    'crop_failure_last_3yr', 'food_aid_receipt_yn', 'pds_access_yn', 'caloric_intake_score'
  ],
  health: [
    'village_id', 'village_name', 'household_id', 'surveyor_id', 'survey_date',
    'infant_deaths_last_5yr', 'maternal_deaths_last_5yr', 'chronic_illness_count',
    'distance_to_hospital_km', 'hospital_visits_per_year', 'vaccinated_children_pct',
    'sanitation_access_yn', 'clean_water_access_yn', 'health_insurance_yn',
    'malnourished_children_under5', 'disability_count', 'open_defecation_yn'
  ],
  education: [
    'village_id', 'village_name', 'household_id', 'surveyor_id', 'survey_date',
    'school_age_children_count', 'enrolled_children_count', 'dropout_children_count',
    'distance_to_school_km', 'illiterate_adults_count', 'total_adults_count',
    'literate_females_count', 'total_females_count', 'highest_education_level',
    'midday_meal_access_yn', 'internet_access_yn', 'teachers_in_school', 'primary_school_nearby_yn'
  ],
  shelter: [
    'village_id', 'village_name', 'household_id', 'surveyor_id', 'survey_date',
    'house_type', 'room_count', 'household_size', 'electricity_access_yn', 'toilet_access_yn',
    'drinking_water_source', 'flood_prone_yn', 'house_damaged_yn', 'persons_per_room',
    'owns_land_yn', 'pmay_beneficiary_yn', 'disaster_affected_yn', 'kitchen_separate_yn'
  ],
  emergency: [
    'village_id', 'village_name', 'household_id', 'surveyor_id', 'survey_date',
    'emergency_type', 'affected_households', 'casualties', 'displaced_persons',
    'relief_received_yn', 'infrastructure_damage_level', 'response_time_hours',
    'external_aid_received_yn', 'lives_at_risk', 'evacuation_done_yn'
  ]
};

// Example rows for each survey type (3 per template)
const TEMPLATE_EXAMPLES = {
  food: [
    ['VLG_001', 'Rampur', 'HH_001', 'SRV_001', '2024-01-15', 4500, 2, 'Self-grown', 4, 1, 5, 0, 1, 1, 0, 0, 35],
    ['VLG_001', 'Rampur', 'HH_002', 'SRV_001', '2024-01-15', 8000, 3, 'Market', 1, 0, 4, 1, 1, 0, 1, 1, 55],
    ['VLG_001', 'Rampur', 'HH_003', 'SRV_001', '2024-01-15', 3000, 1, 'Self-grown', 7, 1, 7, 0, 0, 2, 0, 0, 20]
  ],
  health: [
    ['VLG_001', 'Rampur', 'HH_001', 'SRV_001', '2024-01-15', 2, 1, 3, 18, 2, 45, 0, 0, 0, 2, 1, 1],
    ['VLG_001', 'Rampur', 'HH_002', 'SRV_001', '2024-01-15', 0, 0, 1, 8, 5, 80, 1, 1, 1, 0, 0, 0],
    ['VLG_001', 'Rampur', 'HH_003', 'SRV_001', '2024-01-15', 1, 0, 4, 25, 1, 30, 0, 0, 0, 3, 2, 1]
  ],
  education: [
    ['VLG_001', 'Rampur', 'HH_001', 'SRV_001', '2024-01-15', 3, 2, 1, 5, 4, 6, 2, 4, 'Primary', 1, 0, 2, 1],
    ['VLG_001', 'Rampur', 'HH_002', 'SRV_001', '2024-01-15', 2, 2, 0, 2, 1, 4, 3, 4, 'Secondary', 1, 1, 3, 1],
    ['VLG_001', 'Rampur', 'HH_003', 'SRV_001', '2024-01-15', 4, 1, 3, 8, 5, 5, 1, 5, 'None', 0, 0, 1, 0]
  ],
  shelter: [
    ['VLG_001', 'Rampur', 'HH_001', 'SRV_001', '2024-01-15', 'Kutcha', 2, 6, 0, 0, 'Well', 1, 1, 3.0, 0, 0, 1, 0],
    ['VLG_001', 'Rampur', 'HH_002', 'SRV_001', '2024-01-15', 'Pucca', 4, 4, 1, 1, 'Tap', 0, 0, 1.0, 1, 1, 0, 1],
    ['VLG_001', 'Rampur', 'HH_003', 'SRV_001', '2024-01-15', 'Semi-Pucca', 2, 8, 0, 0, 'River', 1, 0, 4.0, 0, 0, 1, 0]
  ],
  emergency: [
    ['VLG_001', 'Rampur', 'HH_001', 'SRV_001', '2024-01-15', 'Flood', 45, 3, 120, 0, 'Severe', 48, 0, 200, 0],
    ['VLG_001', 'Rampur', 'HH_002', 'SRV_001', '2024-01-15', 'Drought', 30, 0, 0, 1, 'Moderate', 24, 1, 50, 1],
    ['VLG_001', 'Rampur', 'HH_003', 'SRV_001', '2024-01-15', 'Flood', 60, 5, 200, 0, 'Critical', 72, 0, 350, 0]
  ]
};

// ─── GET /api/surveys/templates/:type ─────────────────────────────────────────
const downloadTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!SURVEY_COLUMNS[type]) {
    return res.status(400).json({ success: false, message: `Invalid survey type. Use: ${Object.keys(SURVEY_COLUMNS).join(', ')}` });
  }

  const columns = SURVEY_COLUMNS[type];
  const examples = TEMPLATE_EXAMPLES[type] || [];
  const rows = [columns, ...examples];

  const csvContent = stringify(rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_survey_template.csv"`);
  res.send(csvContent);
});

// ─── POST /api/surveys/upload ─────────────────────────────────────────────────
const uploadSurveys = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded.' });
  }

  const sessionId = randomUUID();
  const results = [];
  const surveysUploaded = [];

  for (const file of files) {
    // Detect survey type from filename
    const lowerName = file.originalname.toLowerCase();
    let detectedType = null;
    for (const type of Object.keys(SURVEY_COLUMNS)) {
      if (lowerName.includes(type)) { detectedType = type; break; }
    }
    if (!detectedType) {
      results.push({ file: file.originalname, status: 'failed', reason: 'Could not detect survey type from filename. Include type (food/health/education/shelter/emergency) in filename.' });
      continue;
    }

    const requiredCols = SURVEY_COLUMNS[detectedType];
    let records;

    try {
      records = parse(file.buffer.toString('utf-8'), {
        columns: true, 
        skip_empty_lines: true, 
        trim: true,
        bom: true,
        relax_column_count: true
      });
    } catch (e) {
      results.push({ file: file.originalname, status: 'failed', reason: `Parse error: ${e.message}` });
      continue;
    }

    if (records.length === 0) {
      results.push({ file: file.originalname, status: 'failed', reason: 'File is empty.' });
      continue;
    }

    // Validate required mandatory columns
    const mandatory = ['village_id', 'village_name', 'household_id', 'surveyor_id', 'survey_date'];
    const fileColumns = Object.keys(records[0]);
    const missing = mandatory.filter(c => !fileColumns.includes(c));
    if (missing.length > 0) {
      results.push({ file: file.originalname, status: 'failed', reason: `Missing mandatory columns: ${missing.join(', ')}` });
      continue;
    }

    // Save upload metadata
    const uploadDoc = await SurveyUpload.create({
      ngoId: req.user?.ngoId || null,
      sessionId,
      surveyType: detectedType,
      filename: file.originalname,
      villagesIncluded: [...new Set(records.map(r => r.village_name).filter(Boolean))],
      rowCount: records.length,
      status: 'processing'
    });

    // Insert all rows into surveyresponses
    const responseRows = records.map(r => ({
      sessionId,
      uploadId: uploadDoc._id,
      surveyType: detectedType,
      villageId: r.village_id,
      villageName: r.village_name,
      householdId: r.household_id,
      surveyorId: r.surveyor_id,
      surveyDate: r.survey_date ? new Date(r.survey_date) : new Date(),
      data: r
    }));

    await db.collection('surveyresponses').insertMany(responseRows);

    // Mark as processed
    await SurveyUpload.findByIdAndUpdate(uploadDoc._id, { status: 'processed' });

    surveysUploaded.push(detectedType);
    results.push({ file: file.originalname, surveyType: detectedType, rowsInserted: records.length, status: 'processed' });
  }

  // Trigger vulnerability pipeline for all successfully uploaded types
  if (surveysUploaded.length > 0) {
    const domainMap = { health: 'healthScore', food: 'foodScore', education: 'educationScore', shelter: 'shelterScore' };
    for (const type of surveysUploaded) {
      if (domainMap[type]) {
        const p = buildVulnerabilityPipeline(type, domainMap[type]);
        if (p) await db.collection('surveyresponses').aggregate(p).toArray();
      }
    }
    await db.collection('villageScores').aggregate(buildOverallVulnerabilityPipeline()).toArray();
  }

  sendSuccess(res, 200, 'Survey upload complete', { sessionId, results });
});

// ─── GET /api/surveys/report/:sessionId ───────────────────────────────────────
const getReport = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db;
  const { sessionId } = req.params;

  // All uploads for this session
  const uploads = await SurveyUpload.find({ sessionId }).lean();
  if (!uploads.length) {
    return res.status(404).json({ success: false, message: 'Session not found.' });
  }

  // Get all village IDs from this session
  const villageIds = await db.collection('surveyresponses').distinct('villageId', { sessionId });
  
  // Get scores from villageScores for these villages
  const scores = await db.collection('villageScores').find({ villageId: { $in: villageIds } }).toArray();
  const scoreMap = {};
  scores.forEach(s => { scoreMap[s.villageId] = s; });

  // For each village, check which domains were uploaded
  const report = await Promise.all(villageIds.map(async (vid) => {
    const scoreData = scoreMap[vid] || {};
    const domainCoverage = {};
    const missingDomains = [];
    for (const type of ['health', 'food', 'education', 'shelter']) {
      const count = await db.collection('surveyresponses').countDocuments({ sessionId, villageId: vid, surveyType: type });
      domainCoverage[type] = count;
      if (count === 0) missingDomains.push(type);
    }

    const availableDomains = 4 - missingDomains.length;
    const completeness = Math.round((availableDomains / 4) * 100);

    return {
      villageId: vid,
      villageName: scoreData.villageName,
      healthScore: scoreData.healthScore,
      foodScore: scoreData.foodScore,
      educationScore: scoreData.educationScore,
      shelterScore: scoreData.shelterScore,
      overallVulnerabilityScore: scoreData.overallVulnerabilityScore,
      vulnerabilityClass: scoreData.vulnerabilityClass,
      dataCompleteness: completeness,
      domainCoverage,
      missingDomainWarnings: missingDomains.map(d => `No ${d} survey uploaded for ${vid}`)
    };
  }));

  sendSuccess(res, 200, 'Survey report generated', {
    sessionId,
    uploads,
    villageReports: report
  });
});

module.exports = { downloadTemplate, uploadSurveys, getReport };
