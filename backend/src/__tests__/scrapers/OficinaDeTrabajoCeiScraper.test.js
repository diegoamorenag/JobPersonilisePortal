const OficinaDeTrabajoCeiScraper = require('../../services/scrapers/OficinaDeTrabajoCeiScraper');
const Job = require('../../models/Job');
const axios = require('axios');

// Mock dependencies
jest.mock('../../models/Job');
jest.mock('axios');

describe('OficinaDeTrabajoCeiScraper', () => {
  let scraper;

  beforeEach(() => {
    scraper = new OficinaDeTrabajoCeiScraper();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct default values', () => {
      expect(scraper.source).toBe('Oficina de Trabajo CEI');
      expect(scraper.baseUrl).toBe('https://www.oficinaempleo.cl');
      expect(scraper.searchEndpoint).toBe('/buscar-empleo');
      expect(scraper.jobsPerPage).toBe(20);
    });

    it('should accept custom configuration', () => {
      const customScraper = new OficinaDeTrabajoCeiScraper({
        baseUrl: 'https://custom.com',
        timeout: 20000,
        jobsPerPage: 50
      });

      expect(customScraper.baseUrl).toBe('https://custom.com');
      expect(customScraper.timeout).toBe(20000);
      expect(customScraper.jobsPerPage).toBe(50);
    });
  });

  describe('buildSearchUrl()', () => {
    it('should build URL without parameters', () => {
      const url = scraper.buildSearchUrl({});

      expect(url).toBe('https://www.oficinaempleo.cl/buscar-empleo');
    });

    it('should build URL with query parameter', () => {
      const url = scraper.buildSearchUrl({ query: 'developer' });

      expect(url).toContain('q=developer');
    });

    it('should build URL with location parameter', () => {
      const url = scraper.buildSearchUrl({ location: 'Santiago' });

      expect(url).toContain('location=Santiago');
    });

    it('should build URL with page parameter', () => {
      const url = scraper.buildSearchUrl({ page: 2 });

      expect(url).toContain('page=2');
    });

    it('should build URL with all parameters', () => {
      const url = scraper.buildSearchUrl({
        query: 'software engineer',
        location: 'Santiago',
        page: 3
      });

      expect(url).toContain('q=software+engineer');
      expect(url).toContain('location=Santiago');
      expect(url).toContain('page=3');
    });
  });

  describe('extractJobData()', () => {
    it('should extract job data from element', () => {
      const $ = require('cheerio').load(`
        <div class="job-listing">
          <h2 class="job-title">Software Engineer</h2>
          <div class="company-name">Tech Corp</div>
          <div class="job-location">Santiago</div>
          <p class="job-description">Great opportunity to work with us</p>
          <a class="job-link" href="/job/123">Apply</a>
        </div>
      `);

      const element = $('.job-listing')[0];
      const job = scraper.extractJobData($, element);

      expect(job.title).toBe('Software Engineer');
      expect(job.company).toBe('Tech Corp');
      expect(job.location).toBe('Santiago');
      expect(job.description).toBe('Great opportunity to work with us');
      expect(job.applyLink).toContain('/job/123');
      expect(job.source).toBe('Oficina de Trabajo CEI');
    });

    it('should handle missing elements gracefully', () => {
      const $ = require('cheerio').load('<div class="job-listing"></div>');
      const element = $('.job-listing')[0];
      const job = scraper.extractJobData($, element);

      expect(job.title).toBe('');
      expect(job.company).toBe('');
      expect(job.location).toBe('');
    });
  });

  describe('createExternalId()', () => {
    it('should extract ID from URL with /job/ pattern', () => {
      const id = scraper.createExternalId(
        'Developer',
        'Company',
        'https://example.com/job/12345'
      );

      expect(id).toBe('oficina-de-trabajo-cei-12345');
    });

    it('should extract ID from URL with id= pattern', () => {
      const id = scraper.createExternalId(
        'Developer',
        'Company',
        'https://example.com/apply?id=67890'
      );

      expect(id).toBe('oficina-de-trabajo-cei-67890');
    });

    it('should generate ID if URL has no pattern', () => {
      const id = scraper.createExternalId(
        'Developer',
        'Company',
        'https://example.com'
      );

      expect(id).toContain('oficina-de-trabajo-cei-');
    });
  });

  describe('extractPostedDate()', () => {
    it('should parse "X days ago" format', () => {
      const $ = require('cheerio').load('<div class="posted-date">3 days ago</div>');
      const element = $('div')[0];
      const date = scraper.extractPostedDate($, element);

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 3);

      expect(date.getDate()).toBe(expectedDate.getDate());
    });

    it('should parse Spanish "hace X días" format', () => {
      const $ = require('cheerio').load('<div class="posted-date">hace 5 días</div>');
      const element = $('div')[0];
      const date = scraper.extractPostedDate($, element);

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 5);

      expect(date.getDate()).toBe(expectedDate.getDate());
    });

    it('should return current date if no date text found', () => {
      const $ = require('cheerio').load('<div></div>');
      const element = $('div')[0];
      const date = scraper.extractPostedDate($, element);

      const now = new Date();
      expect(date.getDate()).toBe(now.getDate());
    });
  });

  describe('extractTags()', () => {
    it('should extract tags from elements', () => {
      const $ = require('cheerio').load(`
        <div>
          <span class="tag">Remote</span>
          <span class="badge">Full-time</span>
          <span class="salary">$50k-$70k</span>
        </div>
      `);

      const element = $('div')[0];
      const tags = scraper.extractTags($, element);

      expect(tags).toContain('Remote');
      expect(tags).toContain('Full-time');
      expect(tags).toContain('$50k-$70k');
    });

    it('should extract from data attributes', () => {
      const $ = require('cheerio').load(`
        <div data-type="Contract">
          <span class="tag">Remote</span>
        </div>
      `);

      const element = $('div')[0];
      const tags = scraper.extractTags($, element);

      expect(tags).toContain('Remote');
      expect(tags).toContain('Contract');
    });
  });

  describe('cleanJobData()', () => {
    it('should remove unwanted text patterns', () => {
      const rawJob = {
        title: 'Developer',
        company: 'Company',
        location: 'Location',
        description: 'Great job. Aplicar ahora. Compartir en redes sociales.',
        applyLink: 'https://example.com',
        externalId: 'job-1'
      };

      const cleaned = scraper.cleanJobData(rawJob);

      expect(cleaned.description).not.toContain('Aplicar ahora');
      expect(cleaned.description).not.toContain('Compartir en redes sociales');
      expect(cleaned.description).toContain('Great job');
    });
  });

  describe('scrape() integration', () => {
    it('should handle scraping with no jobs found', async () => {
      // Mock empty page
      axios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });

      Job.updateOne.mockResolvedValue({
        upsertedCount: 0,
        matchedCount: 0
      });

      const result = await scraper.scrape({
        query: 'test',
        maxPages: 1
      });

      expect(result.success).toBe(true);
      expect(result.jobs).toHaveLength(0);
      expect(result.stats.saved).toBe(0);
    });

    it('should handle scraping errors gracefully', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await scraper.scrape({
        query: 'test',
        maxPages: 1
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
