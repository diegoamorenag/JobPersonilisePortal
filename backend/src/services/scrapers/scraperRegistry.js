const OficinaDeTrabajoCeiScraper = require('./OficinaDeTrabajoCeiScraper');
const LinkedInJobsScraper = require('./LinkedInJobsScraper');

/**
 * Scraper Registry
 * Central registry for all available job portal scrapers
 */
class ScraperRegistry {
  constructor() {
    this.scrapers = new Map();
    this.registerDefaultScrapers();
  }

  /**
   * Register default scrapers
   */
  registerDefaultScrapers() {
    this.register('oficina-trabajo-cei', OficinaDeTrabajoCeiScraper);
    this.register('linkedin', LinkedInJobsScraper);
  }

  /**
   * Register a new scraper
   * @param {string} name - Scraper identifier
   * @param {Function} ScraperClass - Scraper class constructor
   */
  register(name, ScraperClass) {
    if (typeof ScraperClass !== 'function') {
      throw new Error(`Invalid scraper class for ${name}`);
    }

    this.scrapers.set(name, ScraperClass);
    console.log(`[Registry] Registered scraper: ${name}`);
  }

  /**
   * Unregister a scraper
   * @param {string} name - Scraper identifier
   */
  unregister(name) {
    this.scrapers.delete(name);
    console.log(`[Registry] Unregistered scraper: ${name}`);
  }

  /**
   * Get a scraper instance
   * @param {string} name - Scraper identifier
   * @param {Object} config - Scraper configuration
   * @returns {Object} Scraper instance
   */
  getScraper(name, config = {}) {
    const ScraperClass = this.scrapers.get(name);

    if (!ScraperClass) {
      throw new Error(`Scraper not found: ${name}. Available scrapers: ${this.getAvailableScrapers().join(', ')}`);
    }

    return new ScraperClass(config);
  }

  /**
   * Get all available scraper names
   * @returns {Array} Array of scraper names
   */
  getAvailableScrapers() {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Check if a scraper is registered
   * @param {string} name - Scraper identifier
   * @returns {boolean} True if registered
   */
  hasScraper(name) {
    return this.scrapers.has(name);
  }

  /**
   * Get scraper info
   * @returns {Array} Array of scraper information
   */
  getScrapersInfo() {
    const info = [];

    for (const [name, ScraperClass] of this.scrapers.entries()) {
      const instance = new ScraperClass();
      info.push({
        id: name,
        name: instance.source,
        baseUrl: instance.baseUrl
      });
    }

    return info;
  }
}

// Export singleton instance
module.exports = new ScraperRegistry();
