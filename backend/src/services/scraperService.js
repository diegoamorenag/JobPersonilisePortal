const { getScraper, getAvailableScrapers, getScrapersInfo } = require('./scrapers');

/**
 * Scraper Service
 * High-level service for managing scraping operations
 */
class ScraperService {
  constructor() {
    this.activeScrapes = new Map();
    this.scrapeHistory = [];
  }

  /**
   * Run a scraper by name
   * @param {string} scraperName - Name of the scraper to run
   * @param {Object} options - Scraping options
   * @returns {Promise<Object>} Scraping results
   */
  async runScraper(scraperName, options = {}) {
    const scrapeId = this.generateScrapeId(scraperName);

    console.log(`[ScraperService] Starting scrape ${scrapeId} with scraper: ${scraperName}`);

    // Check if scraper exists
    const availableScrapers = getAvailableScrapers();
    if (!availableScrapers.includes(scraperName)) {
      throw new Error(`Unknown scraper: ${scraperName}. Available: ${availableScrapers.join(', ')}`);
    }

    // Mark as active
    this.activeScrapes.set(scrapeId, {
      scraperName,
      startTime: new Date(),
      status: 'running'
    });

    try {
      // Get scraper instance
      const scraper = getScraper(scraperName, options.config);

      // Run scraper
      const result = await scraper.scrape(options);

      // Update status
      this.activeScrapes.delete(scrapeId);

      // Add to history
      const historyEntry = {
        id: scrapeId,
        scraperName,
        startTime: this.activeScrapes.get(scrapeId)?.startTime || new Date(),
        endTime: new Date(),
        duration: Date.now() - (this.activeScrapes.get(scrapeId)?.startTime?.getTime() || Date.now()),
        success: result.success,
        stats: result.stats,
        errorCount: result.errors?.length || 0
      };

      this.scrapeHistory.push(historyEntry);

      // Keep only last 100 entries
      if (this.scrapeHistory.length > 100) {
        this.scrapeHistory.shift();
      }

      console.log(`[ScraperService] Scrape ${scrapeId} completed. Success: ${result.success}`);

      return {
        scrapeId,
        ...result,
        ...historyEntry
      };

    } catch (error) {
      console.error(`[ScraperService] Scrape ${scrapeId} failed: ${error.message}`);

      this.activeScrapes.delete(scrapeId);

      // Add failed scrape to history
      this.scrapeHistory.push({
        id: scrapeId,
        scraperName,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Run multiple scrapers in parallel
   * @param {Array} scraperConfigs - Array of {name, options} objects
   * @returns {Promise<Array>} Array of results
   */
  async runMultipleScrapers(scraperConfigs) {
    console.log(`[ScraperService] Running ${scraperConfigs.length} scrapers in parallel`);

    const promises = scraperConfigs.map(({ name, options }) =>
      this.runScraper(name, options).catch(error => ({
        scraperName: name,
        success: false,
        error: error.message
      }))
    );

    return Promise.all(promises);
  }

  /**
   * Run multiple scrapers sequentially
   * @param {Array} scraperConfigs - Array of {name, options} objects
   * @returns {Promise<Array>} Array of results
   */
  async runMultipleScrapersSequential(scraperConfigs) {
    console.log(`[ScraperService] Running ${scraperConfigs.length} scrapers sequentially`);

    const results = [];

    for (const { name, options } of scraperConfigs) {
      try {
        const result = await this.runScraper(name, options);
        results.push(result);
      } catch (error) {
        results.push({
          scraperName: name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get all available scrapers
   * @returns {Array} Array of scraper names
   */
  getAvailableScrapers() {
    return getAvailableScrapers();
  }

  /**
   * Get detailed info about all scrapers
   * @returns {Array} Array of scraper information
   */
  getScrapersInfo() {
    return getScrapersInfo();
  }

  /**
   * Get active scrapes
   * @returns {Array} Array of active scrape info
   */
  getActiveScrapes() {
    return Array.from(this.activeScrapes.entries()).map(([id, info]) => ({
      id,
      ...info,
      duration: Date.now() - info.startTime.getTime()
    }));
  }

  /**
   * Get scrape history
   * @param {number} limit - Number of recent scrapes to return
   * @returns {Array} Array of scrape history entries
   */
  getScrapeHistory(limit = 20) {
    return this.scrapeHistory
      .slice(-limit)
      .reverse();
  }

  /**
   * Get statistics about scraping operations
   * @returns {Object} Statistics
   */
  getStatistics() {
    const total = this.scrapeHistory.length;
    const successful = this.scrapeHistory.filter(s => s.success).length;
    const failed = total - successful;

    const totalJobsScraped = this.scrapeHistory.reduce(
      (sum, entry) => sum + (entry.stats?.total || 0),
      0
    );

    const totalJobsSaved = this.scrapeHistory.reduce(
      (sum, entry) => sum + (entry.stats?.saved || 0),
      0
    );

    const averageDuration = total > 0
      ? this.scrapeHistory.reduce((sum, entry) => sum + (entry.duration || 0), 0) / total
      : 0;

    return {
      totalScrapes: total,
      successfulScrapes: successful,
      failedScrapes: failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(2) + '%' : '0%',
      totalJobsScraped,
      totalJobsSaved,
      averageDuration: Math.round(averageDuration),
      activeScrapes: this.activeScrapes.size
    };
  }

  /**
   * Generate a unique scrape ID
   * @param {string} scraperName - Name of scraper
   * @returns {string} Unique ID
   */
  generateScrapeId(scraperName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `${scraperName}-${timestamp}-${random}`;
  }

  /**
   * Clear scrape history
   */
  clearHistory() {
    this.scrapeHistory = [];
    console.log('[ScraperService] History cleared');
  }
}

// Export singleton instance
module.exports = new ScraperService();
