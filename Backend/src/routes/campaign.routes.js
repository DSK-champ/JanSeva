const router = require('express').Router();
const { getCampaigns, createCampaign, createCampaignWithSurvey, joinCampaign, leaveCampaign, getMyCampaigns, getNgoCampaigns, getCampaignById, getCampaignDetailsNGO, getCampaignStats, deleteCampaign, getAffiliatedCampaigns } = require('../controllers/campaign.controller');
const { protect, optionalAuth } = require('../middlewares/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', optionalAuth, getCampaigns);
router.get('/stats', optionalAuth, getCampaignStats);

router.get('/my', protect, getMyCampaigns);
router.get('/affiliated', protect, getAffiliatedCampaigns);
router.get('/ngo/my', protect, getNgoCampaigns);

router.get('/:id', optionalAuth, getCampaignById);
router.get('/ngo/:id', protect, getCampaignDetailsNGO);
router.delete('/:id', protect, deleteCampaign);
router.post('/', createCampaign);
router.post('/with-survey', upload.single('survey'), createCampaignWithSurvey);
router.post('/:id/join', joinCampaign);
router.post('/:id/leave', leaveCampaign);

module.exports = router;
