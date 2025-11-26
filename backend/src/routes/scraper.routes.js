const express = require('express');
const router = express.Router();
const ScraperController = require('../controllers/scraper.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

router.use(authenticate);

// User can trigger scraping for their sources
router.post('/trigger', ScraperController.triggerScraping);
router.get('/status', ScraperController.getScrapingStatus);
router.get('/history', ScraperController.getScrapingHistory);

// Admin only
router.post('/trigger-all', isAdmin, ScraperController.triggerAllSources);
router.get('/logs', isAdmin, ScraperController.getScraperLogs);
router.delete('/jobs/cleanup', isAdmin, ScraperController.cleanupOldJobs);

module.exports = router;