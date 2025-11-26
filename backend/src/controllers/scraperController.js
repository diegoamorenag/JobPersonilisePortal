const scraperService = require('../services/scraperService');

/**
 * Scraper Controller
 * Handles HTTP requests for scraping operations
 */

/**
 * Get all available scrapers
 * GET /api/scrapers
 */
const getScrapers = async (req, res) => {
  try {
    const scrapers = scraperService.getScrapersInfo();

    res.json({
      success: true,
      count: scrapers.length,
      scrapers
    });
  } catch (error) {
    console.error('[ScraperController] Error getting scrapers:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scrapers',
      message: error.message
    });
  }
};

/**
 * Run a specific scraper
 * POST /api/scrapers/:scraperName/run
 * Body: { query, location, maxPages, config }
 */
const runScraper = async (req, res) => {
  try {
    const { scraperName } = req.params;
    const options = req.body;

    // Validate scraper name
    const availableScrapers = scraperService.getAvailableScrapers();
    if (!availableScrapers.includes(scraperName)) {
      return res.status(404).json({
        success: false,
        error: 'Scraper not found',
        availableScrapers
      });
    }

    console.log(`[ScraperController] Running scraper: ${scraperName}`, options);

    // Run scraper
    const result = await scraperService.runScraper(scraperName, options);

    res.json({
      success: true,
      scraper: scraperName,
      result
    });

  } catch (error) {
    console.error('[ScraperController] Error running scraper:', error.message);
    res.status(500).json({
      success: false,
      error: 'Scraper execution failed',
      message: error.message
    });
  }
};

/**
 * Run multiple scrapers
 * POST /api/scrapers/run-multiple
 * Body: { scrapers: [{ name, options }], parallel: true/false }
 */
const runMultipleScrapers = async (req, res) => {
  try {
    const { scrapers, parallel = true } = req.body;

    if (!Array.isArray(scrapers) || scrapers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: scrapers array is required'
      });
    }

    console.log(`[ScraperController] Running ${scrapers.length} scrapers ${parallel ? 'in parallel' : 'sequentially'}`);

    let results;
    if (parallel) {
      results = await scraperService.runMultipleScrapers(scrapers);
    } else {
      results = await scraperService.runMultipleScrapersSequential(scrapers);
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results
    });

  } catch (error) {
    console.error('[ScraperController] Error running multiple scrapers:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to run multiple scrapers',
      message: error.message
    });
  }
};

/**
 * Get active scrapes
 * GET /api/scrapers/active
 */
const getActiveScrapes = async (req, res) => {
  try {
    const activeScrapes = scraperService.getActiveScrapes();

    res.json({
      success: true,
      count: activeScrapes.length,
      scrapes: activeScrapes
    });
  } catch (error) {
    console.error('[ScraperController] Error getting active scrapes:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active scrapes',
      message: error.message
    });
  }
};

/**
 * Get scrape history
 * GET /api/scrapers/history?limit=20
 */
const getScrapeHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = scraperService.getScrapeHistory(limit);

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('[ScraperController] Error getting scrape history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scrape history',
      message: error.message
    });
  }
};

/**
 * Get scraping statistics
 * GET /api/scrapers/stats
 */
const getStatistics = async (req, res) => {
  try {
    const stats = scraperService.getStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('[ScraperController] Error getting statistics:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      message: error.message
    });
  }
};

/**
 * Clear scrape history
 * DELETE /api/scrapers/history
 */
const clearHistory = async (req, res) => {
  try {
    scraperService.clearHistory();

    res.json({
      success: true,
      message: 'Scrape history cleared'
    });
  } catch (error) {
    console.error('[ScraperController] Error clearing history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear history',
      message: error.message
    });
  }
};

module.exports = {
  getScrapers,
  runScraper,
  runMultipleScrapers,
  getActiveScrapes,
  getScrapeHistory,
  getStatistics,
  clearHistory
};
