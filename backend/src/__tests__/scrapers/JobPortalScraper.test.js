const JobPortalScraper = require('../../services/scrapers/JobPortalScraper');
const Job = require('../../models/Job');

// Mock Job model
jest.mock('../../models/Job');

describe('JobPortalScraper Base Class', () => {
  let scraper;

  beforeEach(() => {
    scraper = new JobPortalScraper({
      baseUrl: 'https://example.com',
      source: 'Test Scraper',
      timeout: 5000
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const defaultScraper = new JobPortalScraper();

      expect(defaultScraper.baseUrl).toBe('');
      expect(defaultScraper.source).toBe('Unknown');
      expect(defaultScraper.timeout).toBe(10000);
      expect(defaultScraper.maxRetries).toBe(3);
      expect(defaultScraper.jobs).toEqual([]);
      expect(defaultScraper.errors).toEqual([]);
    });

    it('should initialize with custom config', () => {
      expect(scraper.baseUrl).toBe('https://example.com');
      expect(scraper.source).toBe('Test Scraper');
      expect(scraper.timeout).toBe(5000);
    });
  });

  describe('scrape()', () => {
    it('should throw error if not implemented', async () => {
      await expect(scraper.scrape()).rejects.toThrow(
        'scrape() method must be implemented by child class'
      );
    });
  });

  describe('cleanText()', () => {
    it('should clean whitespace and newlines', () => {
      const text = '  Test   text\n\nwith   spaces  ';
      expect(scraper.cleanText(text)).toBe('Test text with spaces');
    });

    it('should handle empty text', () => {
      expect(scraper.cleanText('')).toBe('');
      expect(scraper.cleanText(null)).toBe('');
      expect(scraper.cleanText(undefined)).toBe('');
    });
  });

  describe('cleanJobData()', () => {
    it('should clean and normalize job data', () => {
      const rawJob = {
        title: '  Software Engineer  ',
        company: '  Tech Corp\n  ',
        location: 'San Francisco  ',
        description: 'Great opportunity',
        applyLink: 'https://example.com/job',
        externalId: 'job-123',
        tags: ['remote', 'full-time', null, ''],
        postedAt: new Date('2024-01-01')
      };

      const cleaned = scraper.cleanJobData(rawJob);

      expect(cleaned.title).toBe('Software Engineer');
      expect(cleaned.company).toBe('Tech Corp');
      expect(cleaned.location).toBe('San Francisco');
      expect(cleaned.source).toBe('Test Scraper');
      expect(cleaned.tags).toEqual(['remote', 'full-time']);
      expect(cleaned.externalId).toBe('job-123');
    });

    it('should generate external ID if missing', () => {
      const rawJob = {
        title: 'Developer',
        company: 'Company',
        location: 'Location',
        description: 'Desc',
        applyLink: 'https://example.com'
      };

      const cleaned = scraper.cleanJobData(rawJob);
      expect(cleaned.externalId).toContain('test-scraper-');
    });
  });

  describe('validateJobData()', () => {
    it('should validate complete job data', () => {
      const validJob = {
        title: 'Developer',
        company: 'Company',
        location: 'Location',
        applyLink: 'https://example.com',
        source: 'Test'
      };

      expect(scraper.validateJobData(validJob)).toBe(true);
    });

    it('should reject incomplete job data', () => {
      const invalidJob = {
        title: 'Developer',
        company: 'Company'
        // missing location, applyLink, source
      };

      expect(scraper.validateJobData(invalidJob)).toBe(false);
    });
  });

  describe('generateExternalId()', () => {
    it('should generate unique external ID', async () => {
      const job = {
        title: 'Software Engineer',
        company: 'Tech Corp'
      };

      const id1 = scraper.generateExternalId(job);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const id2 = scraper.generateExternalId(job);

      expect(id1).toContain('test-scraper-');
      expect(id1).toContain('tech-corp');
      expect(id1).toContain('software-engineer');
      expect(id1).not.toBe(id2); // Should be unique
    });
  });

  describe('saveJobs()', () => {
    beforeEach(() => {
      Job.updateOne = jest.fn();
    });

    it('should save valid jobs to database', async () => {
      const jobs = [
        {
          title: 'Developer',
          company: 'Company',
          location: 'Location',
          description: 'Desc',
          applyLink: 'https://example.com/1',
          externalId: 'job-1'
        }
      ];

      Job.updateOne.mockResolvedValue({
        upsertedCount: 1,
        matchedCount: 0
      });

      scraper.jobs = jobs;
      const result = await scraper.saveJobs();

      expect(result.saved).toBe(1);
      expect(result.failed).toBe(0);
      expect(Job.updateOne).toHaveBeenCalledTimes(1);
    });

    it('should count duplicates correctly', async () => {
      const jobs = [
        {
          title: 'Developer',
          company: 'Company',
          location: 'Location',
          description: 'Desc',
          applyLink: 'https://example.com/1',
          externalId: 'job-1'
        }
      ];

      Job.updateOne.mockResolvedValue({
        upsertedCount: 0,
        matchedCount: 1
      });

      scraper.jobs = jobs;
      const result = await scraper.saveJobs();

      expect(result.duplicates).toBe(1);
      expect(result.saved).toBe(0);
    });

    it('should handle invalid jobs', async () => {
      const jobs = [
        {
          title: 'Developer'
          // missing required fields
        }
      ];

      scraper.jobs = jobs;
      const result = await scraper.saveJobs();

      expect(result.failed).toBe(1);
      expect(result.saved).toBe(0);
      expect(Job.updateOne).not.toHaveBeenCalled();
    });

    it('should return zero counts for empty jobs array', async () => {
      scraper.jobs = [];
      const result = await scraper.saveJobs();

      expect(result.saved).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('extractText()', () => {
    it('should extract text from selector', () => {
      const $ = require('cheerio').load('<div class="test">Hello World</div>');
      const text = scraper.extractText($, '.test');

      expect(text).toBe('Hello World');
    });

    it('should return empty string if selector not found', () => {
      const $ = require('cheerio').load('<div>Content</div>');
      const text = scraper.extractText($, '.nonexistent');

      expect(text).toBe('');
    });
  });

  describe('extractAttribute()', () => {
    it('should extract attribute from selector', () => {
      const $ = require('cheerio').load('<a href="https://example.com">Link</a>');
      const href = scraper.extractAttribute($, 'a', 'href');

      expect(href).toBe('https://example.com');
    });

    it('should return empty string if not found', () => {
      const $ = require('cheerio').load('<div>Content</div>');
      const attr = scraper.extractAttribute($, 'a', 'href');

      expect(attr).toBe('');
    });
  });

  describe('delay()', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await scraper.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });

  describe('getStats()', () => {
    it('should return scraper statistics', () => {
      scraper.jobs = [{ title: 'Job 1' }, { title: 'Job 2' }];
      scraper.errors = [{ error: 'Error 1' }];

      const stats = scraper.getStats();

      expect(stats.source).toBe('Test Scraper');
      expect(stats.totalJobs).toBe(2);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errors).toHaveLength(1);
    });
  });

  describe('reset()', () => {
    it('should reset scraper state', () => {
      scraper.jobs = [{ title: 'Job 1' }];
      scraper.errors = [{ error: 'Error 1' }];

      scraper.reset();

      expect(scraper.jobs).toEqual([]);
      expect(scraper.errors).toEqual([]);
    });
  });
});
