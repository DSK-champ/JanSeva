const express = require('express');
const multer = require('multer');
const router = express.Router();
const mlController = require('./controllers/ml.controller');
const surveyController = require('./controllers/survey.controller');
const { protect } = require('../Backend/src/middlewares/auth.middleware');

// Multer: in-memory storage for CSV uploads (up to 5 files, 10MB each)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// ─── ML Routes ────────────────────────────────────────────────────────────────
router.get('/ml/stats', mlController.getStats);
router.get('/ml/village-rankings', mlController.getVillageRankings);
router.get('/ml/village/:id/detail', mlController.getVillageDetail);
router.get('/ml/volunteers/ranked', mlController.getRankedVolunteers);
router.get('/ml/smart-match/:villageId', mlController.getSmartMatch);
router.get('/ml/deployment-plan', mlController.getDeploymentPlan);
router.post('/ml/campaign/:id/run-matching', mlController.runMatching);
router.post('/ml/recompute', protect, mlController.recompute);

// ─── Survey Routes ────────────────────────────────────────────────────────────
router.get('/surveys/templates/:type', surveyController.downloadTemplate);
router.post('/surveys/upload', protect, upload.array('surveys', 5), surveyController.uploadSurveys);
router.get('/surveys/report/:sessionId', protect, surveyController.getReport);

module.exports = router;
