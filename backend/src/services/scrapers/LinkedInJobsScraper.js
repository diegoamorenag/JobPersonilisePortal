const JobPortalScraper = require('./JobPortalScraper');

/**
 * Scraper for LinkedIn Jobs (public listings)
 * Demonstrates another implementation of JobPortalScraper
 *
 * NOTE: LinkedIn has anti-scraping measures. This is for educational purposes.
 * Consider using their official API for production use.
 */
class LinkedInJobsScraper extends JobPortalScraper {
  constructor(config = {}) {
    super({
      baseUrl: config.baseUrl || 'https://www.linkedin.com',
      source: 'LinkedIn Jobs',
      timeout: config.timeout || 20000,
      maxRetries: config.maxRetries || 2,
      delayBetweenRequests: config.delayBetweenRequests || 3000,
      ...config
    });

    this.searchEndpoint = '/jobs/search';
  }

  /**
   * Scrape LinkedIn job listings
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Scraping results
   */
  async scrape(options = {}) {
    const { query = '', location = '', maxPages = 1 } = options;

    console.log(`[${this.source}] Starting scrape with query: "${query}", location: "${location}"`);
    this.reset();

    try {
      for (let page = 0; page < maxPages; page++) {
        const start = page * 25; // LinkedIn uses 25 jobs per page
        const url = this.buildSearchUrl({ query, location, start });

        console.log(`[${this.source}] Scraping page ${page + 1}/${maxPages}`);

        const $ = await this.fetchAndParse(url);
        const pageJobs = await this.extractJobsFromPage($);

        if (pageJobs.length === 0) {
          console.log(`[${this.source}] No more jobs found`);
          break;
        }

        this.jobs.push(...pageJobs);

        if (page < maxPages - 1) {
          await this.delay(this.delayBetweenRequests);
        }
      }

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
   * Build LinkedIn search URL
   * @param {Object} params - Search parameters
   * @returns {string} Search URL
   */
  buildSearchUrl(params) {
    const { query = '', location = '', start = 0 } = params;

    const url = new URL(this.searchEndpoint, this.baseUrl);

    if (query) {
      url.searchParams.append('keywords', query);
    }

    if (location) {
      url.searchParams.append('location', location);
    }

    if (start > 0) {
      url.searchParams.append('start', start);
    }

    // LinkedIn specific parameters
    url.searchParams.append('f_TPR', 'r604800'); // Posted in last 7 days
    url.searchParams.append('position', '1');
    url.searchParams.append('pageNum', '0');

    return url.toString();
  }

  /**
   * Extract jobs from LinkedIn page
   * @param {Object} $ - Cheerio instance
   * @returns {Array} Job listings
   */
  async extractJobsFromPage($) {
    const jobs = [];

    // LinkedIn job cards selector
    const jobCards = $('li.jobs-search__results-list > div, ul.jobs-search__results-list > li');

    if (jobCards.length === 0) {
      console.warn(`[${this.source}] No job cards found. Page structure may have changed.`);
    }

    jobCards.each((index, element) => {
      try {
        const job = this.extractJobData($, element);

        if (job && job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.error(`[${this.source}] Error extracting job ${index}: ${error.message}`);
      }
    });

    return jobs;
  }

  /**
   * Extract job data from LinkedIn job card
   * @param {Object} $ - Cheerio instance
   * @param {Object} element - Job card element
   * @returns {Object} Job data
   */
  extractJobData($, element) {
    const title = this.extractText($, '.base-search-card__title', element);
    const company = this.extractText($, '.base-search-card__subtitle', element);
    const location = this.extractText($, '.job-search-card__location', element);

    // Get job link
    let applyLink = this.extractAttribute($, 'a.base-card__full-link', 'href', element);

    if (applyLink && !applyLink.startsWith('http')) {
      applyLink = new URL(applyLink, this.baseUrl).toString();
    }

    // Extract job ID from URL
    const jobIdMatch = applyLink?.match(/\/jobs\/view\/(\d+)/);
    const jobId = jobIdMatch ? jobIdMatch[1] : null;

    // Get metadata
    const metadata = this.extractText($, '.job-search-card__listed-time', element);

    return {
      title,
      company,
      location,
      description: `Posted ${metadata}`, // LinkedIn doesn't show full description in search
      applyLink: applyLink || this.baseUrl,
      externalId: jobId ? `linkedin-${jobId}` : this.generateExternalId({ title, company }),
      tags: this.extractTags($, element),
      postedAt: this.parsePostedDate(metadata),
      source: this.source
    };
  }

  /**
   * Extract tags from LinkedIn job card
   * @param {Object} $ - Cheerio instance
   * @param {Object} element - Job element
   * @returns {Array} Tags
   */
  extractTags($, element) {
    const tags = [];

    // Extract job insights
    const insights = $(element).find('.job-search-card__benefits-insight');
    insights.each((i, el) => {
      const tag = $(el).text().trim();
      if (tag) tags.push(tag);
    });

    return tags;
  }

  /**
   * Parse LinkedIn posted date format
   * @param {string} dateText - Date text (e.g., "2 days ago", "1 week ago")
   * @returns {Date} Parsed date
   */
  parsePostedDate(dateText) {
    if (!dateText) return new Date();

    const now = new Date();

    // Parse "X hours ago"
    const hoursMatch = dateText.match(/(\d+)\s*hour/i);
    if (hoursMatch) {
      now.setHours(now.getHours() - parseInt(hoursMatch[1]));
      return now;
    }

    // Parse "X days ago"
    const daysMatch = dateText.match(/(\d+)\s*day/i);
    if (daysMatch) {
      now.setDate(now.getDate() - parseInt(daysMatch[1]));
      return now;
    }

    // Parse "X weeks ago"
    const weeksMatch = dateText.match(/(\d+)\s*week/i);
    if (weeksMatch) {
      now.setDate(now.getDate() - parseInt(weeksMatch[1]) * 7);
      return now;
    }

    // Parse "X months ago"
    const monthsMatch = dateText.match(/(\d+)\s*month/i);
    if (monthsMatch) {
      now.setMonth(now.getMonth() - parseInt(monthsMatch[1]));
      return now;
    }

    return now;
  }
}

module.exports = LinkedInJobsScraper;
