const JobPortalScraper = require('./JobPortalScraper');

/**
 * Scraper for Oficina de Trabajo CEI
 * Extends JobPortalScraper with site-specific scraping logic
 */
class OficinaDeTrabajoCeiScraper extends JobPortalScraper {
  constructor(config = {}) {
    super({
      baseUrl: config.baseUrl || 'https://www.oficinaempleo.cl',
      source: 'Oficina de Trabajo CEI',
      timeout: config.timeout || 15000,
      maxRetries: config.maxRetries || 3,
      delayBetweenRequests: config.delayBetweenRequests || 2000,
      ...config
    });

    // Site-specific configuration
    this.searchEndpoint = '/buscar-empleo';
    this.jobsPerPage = config.jobsPerPage || 20;
  }

  /**
   * Main scraping method for Oficina de Trabajo CEI
   * @param {Object} options - Search options
   * @param {string} options.query - Search query (job title, keywords)
   * @param {string} options.location - Location filter
   * @param {number} options.maxPages - Maximum pages to scrape
   * @returns {Promise<Array>} Array of scraped jobs
   */
  async scrape(options = {}) {
    const { query = '', location = '', maxPages = 1 } = options;

    console.log(`[${this.source}] Starting scrape with query: "${query}", location: "${location}"`);
    this.reset();

    try {
      for (let page = 1; page <= maxPages; page++) {
        console.log(`[${this.source}] Scraping page ${page}/${maxPages}`);

        const url = this.buildSearchUrl({ query, location, page });
        const $ = await this.fetchAndParse(url);

        const pageJobs = await this.extractJobsFromPage($);

        if (pageJobs.length === 0) {
          console.log(`[${this.source}] No more jobs found on page ${page}`);
          break;
        }

        this.jobs.push(...pageJobs);

        // Delay between page requests to be respectful
        if (page < maxPages) {
          await this.delay(this.delayBetweenRequests);
        }
      }

      console.log(`[${this.source}] Scraping complete. Found ${this.jobs.length} jobs`);

      // Save jobs to database
      const results = await this.saveJobs();

      return {
        success: true,
        jobs: this.jobs,
        stats: results,
        errors: this.errors
      };

    } catch (error) {
      console.error(`[${this.source}] Scraping failed: ${error.message}`);
      this.errors.push({ error: error.message, stack: error.stack });

      return {
        success: false,
        jobs: this.jobs,
        stats: { saved: 0, duplicates: 0, failed: 0, total: 0 },
        errors: this.errors
      };
    }
  }

  /**
   * Build search URL with parameters
   * @param {Object} params - Search parameters
   * @returns {string} Complete search URL
   */
  buildSearchUrl(params) {
    const { query = '', location = '', page = 1 } = params;

    // Construct URL with query parameters
    const url = new URL(this.searchEndpoint, this.baseUrl);

    if (query) {
      url.searchParams.append('q', query);
    }

    if (location) {
      url.searchParams.append('location', location);
    }

    if (page > 1) {
      url.searchParams.append('page', page);
    }

    return url.toString();
  }

  /**
   * Extract job listings from a page
   * NOTE: This is a template implementation. You'll need to adjust selectors
   * based on the actual HTML structure of Oficina de Trabajo CEI
   *
   * @param {Object} $ - Cheerio instance
   * @returns {Promise<Array>} Array of job objects
   */
  async extractJobsFromPage($) {
    const jobs = [];

    // IMPORTANT: These selectors are examples - adjust based on actual site structure
    // Common selectors to try: '.job-listing', '.job-card', '.position', '[data-job]', 'article', '.vacancy'
    const jobElements = $('.job-listing, .job-card, article.job, .vacancy-item');

    if (jobElements.length === 0) {
      console.warn(`[${this.source}] No job elements found. Selectors may need adjustment.`);
    }

    jobElements.each((index, element) => {
      try {
        const job = this.extractJobData($, element);

        if (job && job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.error(`[${this.source}] Error extracting job at index ${index}: ${error.message}`);
        this.errors.push({ index, error: error.message });
      }
    });

    return jobs;
  }

  /**
   * Extract data from a single job element
   * @param {Object} $ - Cheerio instance
   * @param {Object} element - Job element
   * @returns {Object} Job data
   */
  extractJobData($, element) {
    // Extract basic job information
    // ADJUST THESE SELECTORS based on actual site structure
    const title = this.extractText($, '.job-title, h2, h3, .position-title', element);
    const company = this.extractText($, '.company-name, .employer, .company', element);
    const location = this.extractText($, '.job-location, .location, .place', element);
    const description = this.extractText($, '.job-description, .description, .summary, p', element);

    // Extract apply link
    let applyLink = this.extractAttribute($, 'a.job-link, a.apply-btn, a', 'href', element);

    // Handle relative URLs
    if (applyLink && !applyLink.startsWith('http')) {
      applyLink = new URL(applyLink, this.baseUrl).toString();
    }

    // Extract additional information
    const tags = this.extractTags($, element);
    const postedDate = this.extractPostedDate($, element);

    // Create unique external ID
    const externalId = this.createExternalId(title, company, applyLink);

    return {
      title,
      company,
      location,
      description,
      applyLink: applyLink || this.baseUrl,
      externalId,
      tags,
      postedAt: postedDate,
      source: this.source
    };
  }

  /**
   * Extract job tags (salary, type, schedule, etc.)
   * @param {Object} $ - Cheerio instance
   * @param {Object} element - Job element
   * @returns {Array} Array of tags
   */
  extractTags($, element) {
    const tags = [];

    // Try to extract tags from various elements
    const tagElements = $(element).find('.tag, .badge, .job-type, .salary, .schedule');

    tagElements.each((i, el) => {
      const tag = $(el).text().trim();
      if (tag) {
        tags.push(tag);
      }
    });

    // Extract from data attributes
    const jobType = $(element).attr('data-type') || $(element).find('[data-type]').attr('data-type');
    if (jobType) tags.push(jobType);

    return tags.filter(Boolean);
  }

  /**
   * Extract posted date from job element
   * @param {Object} $ - Cheerio instance
   * @param {Object} element - Job element
   * @returns {Date} Posted date
   */
  extractPostedDate($, element) {
    const dateText = this.extractText($, '.posted-date, .date, time, .publish-date', element);

    if (!dateText) {
      return new Date();
    }

    // Try to parse relative dates (e.g., "2 days ago", "hace 3 días")
    const daysAgoMatch = dateText.match(/(\d+)\s*(day|día|days|días)\s*ago|hace/i);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1]);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return date;
    }

    // Try to parse standard date formats
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Default to current date
    return new Date();
  }

  /**
   * Create a unique external ID for a job
   * @param {string} title - Job title
   * @param {string} company - Company name
   * @param {string} url - Job URL
   * @returns {string} External ID
   */
  createExternalId(title, company, url) {
    // Try to extract ID from URL
    const urlMatch = url?.match(/\/job\/(\d+)|\/id\/(\d+)|id=(\d+)/);
    if (urlMatch) {
      const id = urlMatch[1] || urlMatch[2] || urlMatch[3];
      return `${this.source.toLowerCase().replace(/\s+/g, '-')}-${id}`;
    }

    // Fallback to generating from title and company
    return this.generateExternalId({ title, company });
  }

  /**
   * Override cleanJobData to add site-specific cleaning
   * @param {Object} job - Raw job data
   * @returns {Object} Cleaned job data
   */
  cleanJobData(job) {
    const cleaned = super.cleanJobData(job);

    // Add site-specific cleaning
    // Remove common unwanted text patterns
    if (cleaned.description) {
      cleaned.description = cleaned.description
        .replace(/Compartir en redes sociales/gi, '')
        .replace(/Aplicar ahora/gi, '')
        .trim();
    }

    return cleaned;
  }
}

module.exports = OficinaDeTrabajoCeiScraper;
