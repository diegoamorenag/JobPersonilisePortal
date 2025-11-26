const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');

/**
 * Scraper Routes
 * /api/scraper
 */

// Get all available scrapers
router.get('/', scraperController.getScrapers);

// Run a specific scraper
router.post('/:scraperName/run', scraperController.runScraper);

// Run multiple scrapers
router.post('/run-multiple', scraperController.runMultipleScrapers);

// Get active scrapes
router.get('/active', scraperController.getActiveScrapes);

// Get scrape history
router.get('/history', scraperController.getScrapeHistory);

// Get statistics
router.get('/stats', scraperController.getStatistics);

// Clear history
router.delete('/history', scraperController.clearHistory);

module.exports = router;