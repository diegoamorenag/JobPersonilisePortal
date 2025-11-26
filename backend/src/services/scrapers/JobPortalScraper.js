const axios = require('axios');
const cheerio = require('cheerio');
const Job = require('../../models/Job');

/**
 * Base class for all job portal scrapers
 * Provides common functionality for fetching, parsing, and storing job data
 */
class JobPortalScraper {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || '';
    this.source = config.source || 'Unknown';
    this.timeout = config.timeout || 10000;
    this.maxRetries = config.maxRetries || 3;
    this.delayBetweenRequests = config.delayBetweenRequests || 1000;
    this.userAgent = config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    this.jobs = [];
    this.errors = [];
  }

  /**
   * Main scraping method - must be implemented by child classes
   * @param {Object} options - Scraping options (search query, location, etc.)
   * @returns {Promise<Array>} Array of scraped jobs
   */
  async scrape(options = {}) {
    throw new Error('scrape() method must be implemented by child class');
  }

  /**
   * Fetch HTML content from a URL
   * @param {string} url - URL to fetch
   * @returns {Promise<string>} HTML content
   */
  async fetchPage(url) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[${this.source}] Fetching: ${url} (attempt ${attempt}/${this.maxRetries})`);

        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
          }
        });

        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`[${this.source}] Attempt ${attempt} failed: ${error.message}`);

        if (attempt < this.maxRetries) {
          await this.delay(this.delayBetweenRequests * attempt);
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Parse HTML content using Cheerio
   * @param {string} html - HTML content
   * @returns {Object} Cheerio instance
   */
  parseHTML(html) {
    return cheerio.load(html);
  }

  /**
   * Fetch and parse a page in one step
   * @param {string} url - URL to fetch
   * @returns {Promise<Object>} Cheerio instance
   */
  async fetchAndParse(url) {
    const html = await this.fetchPage(url);
    return this.parseHTML(html);
  }

  /**
   * Clean and normalize job data
   * @param {Object} job - Raw job data
   * @returns {Object} Cleaned job data
   */
  cleanJobData(job) {
    return {
      title: this.cleanText(job.title),
      company: this.cleanText(job.company),
      location: this.cleanText(job.location),
      description: this.cleanText(job.description),
      source: this.source,
      applyLink: job.applyLink?.trim() || '',
      externalId: job.externalId || this.generateExternalId(job),
      tags: Array.isArray(job.tags) ? job.tags.filter(Boolean) : [],
      postedAt: job.postedAt || new Date()
    };
  }

  /**
   * Clean text by removing extra whitespace and newlines
   * @param {string} text - Text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }

  /**
   * Generate a unique external ID for a job
   * @param {Object} job - Job data
   * @returns {string} External ID
   */
  generateExternalId(job) {
    const source = this.source.toLowerCase().replace(/\s+/g, '-');
    const titleSlug = job.title?.toLowerCase().replace(/\s+/g, '-').substring(0, 50) || 'unknown';
    const companySlug = job.company?.toLowerCase().replace(/\s+/g, '-').substring(0, 30) || 'unknown';
    const timestamp = Date.now();

    return `${source}-${companySlug}-${titleSlug}-${timestamp}`;
  }

  /**
   * Validate job data before saving
   * @param {Object} job - Job data to validate
   * @returns {boolean} True if valid
   */
  validateJobData(job) {
    const required = ['title', 'company', 'location', 'applyLink', 'source'];
    const missing = required.filter(field => !job[field]);

    if (missing.length > 0) {
      console.warn(`[${this.source}] Invalid job data - missing fields: ${missing.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * Save jobs to database
   * @param {Array} jobs - Array of job objects
   * @returns {Promise<Object>} Save results
   */
  async saveJobs(jobs = null) {
    const jobsToSave = jobs || this.jobs;

    if (jobsToSave.length === 0) {
      console.log(`[${this.source}] No jobs to save`);
      return { saved: 0, failed: 0, duplicates: 0 };
    }

    let saved = 0;
    let failed = 0;
    let duplicates = 0;

    for (const job of jobsToSave) {
      try {
        const cleanedJob = this.cleanJobData(job);

        if (!this.validateJobData(cleanedJob)) {
          failed++;
          continue;
        }

        const result = await Job.updateOne(
          { externalId: cleanedJob.externalId },
          { $set: cleanedJob },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          saved++;
        } else if (result.matchedCount > 0) {
          duplicates++;
        }
      } catch (error) {
        console.error(`[${this.source}] Error saving job: ${error.message}`);
        failed++;
        this.errors.push({ job, error: error.message });
      }
    }

    console.log(`[${this.source}] Results: ${saved} saved, ${duplicates} duplicates, ${failed} failed`);

    return { saved, duplicates, failed, total: jobsToSave.length };
  }

  /**
   * Extract text from a Cheerio element safely
   * @param {Object} $ - Cheerio instance
   * @param {string} selector - CSS selector
   * @param {Object} context - Context element (optional)
   * @returns {string} Extracted text
   */
  extractText($, selector, context = null) {
    try {
      const element = context ? $(context).find(selector) : $(selector);
      return element.text().trim();
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract attribute from a Cheerio element safely
   * @param {Object} $ - Cheerio instance
   * @param {string} selector - CSS selector
   * @param {string} attribute - Attribute name
   * @param {Object} context - Context element (optional)
   * @returns {string} Attribute value
   */
  extractAttribute($, selector, attribute, context = null) {
    try {
      const element = context ? $(context).find(selector) : $(selector);
      return element.attr(attribute) || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Delay execution for a specified time
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scraping statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      source: this.source,
      totalJobs: this.jobs.length,
      totalErrors: this.errors.length,
      errors: this.errors
    };
  }

  /**
   * Reset scraper state
   */
  reset() {
    this.jobs = [];
    this.errors = [];
  }
}

module.exports = JobPortalScraper;
