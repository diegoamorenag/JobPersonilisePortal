const axios = require('axios');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { fetchAndStoreJobs } = require('../../services/jobFetcher');
const Job = require('../../models/Job');

jest.mock('axios');

describe('jobFetcher Service', () => {
  let mongoServer;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.env.SERP_API_KEY = 'test-api-key';
  });

  afterEach(async () => {
    await Job.deleteMany({});
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.SERP_API_KEY;
  });

  describe('Successful job fetching', () => {
    test('should fetch and store jobs successfully', async () => {
      const mockJobs = [
        {
          title: 'Software Engineer',
          company_name: 'Tech Corp',
          location: 'Remote',
          description: 'Great opportunity',
          via: 'LinkedIn',
          related_links: [{ link: 'https://example.com/apply' }],
          job_id: 'job-123',
          extensions: ['Full-time', '$100k-$150k'],
        },
      ];

      axios.get.mockResolvedValue({
        data: { jobs_results: mockJobs },
      });

      const count = await fetchAndStoreJobs('Node.js developer');

      expect(count).toBe(1);
      expect(axios.get).toHaveBeenCalledWith(
        'https://serpapi.com/search.json',
        expect.objectContaining({
          params: expect.objectContaining({
            engine: 'google_jobs',
            q: 'Node.js developer',
            hl: 'en',
            api_key: 'test-api-key',
          }),
        })
      );

      const savedJob = await Job.findOne({ externalId: 'job-123' });
      expect(savedJob).toBeDefined();
      expect(savedJob.title).toBe('Software Engineer');
      expect(savedJob.company).toBe('Tech Corp');
      expect(savedJob.location).toBe('Remote');
    });

    test('should use default query if none provided', async () => {
      axios.get.mockResolvedValue({
        data: { jobs_results: [] },
      });

      await fetchAndStoreJobs();

      expect(axios.get).toHaveBeenCalledWith(
        'https://serpapi.com/search.json',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'software developer node js',
          }),
        })
      );
    });

    test('should handle custom query parameter', async () => {
      axios.get.mockResolvedValue({
        data: { jobs_results: [] },
      });

      await fetchAndStoreJobs('Python developer Uruguay');

      expect(axios.get).toHaveBeenCalledWith(
        'https://serpapi.com/search.json',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'Python developer Uruguay',
          }),
        })
      );
    });

    test('should store multiple jobs', async () => {
      const mockJobs = [
        {
          title: 'Job 1',
          company_name: 'Company 1',
          location: 'Location 1',
          via: 'LinkedIn',
          share_link: 'https://example.com/1',
          job_id: 'job-1',
        },
        {
          title: 'Job 2',
          company_name: 'Company 2',
          location: 'Location 2',
          via: 'Indeed',
          share_link: 'https://example.com/2',
          job_id: 'job-2',
        },
        {
          title: 'Job 3',
          company_name: 'Company 3',
          location: 'Location 3',
          via: 'Glassdoor',
          share_link: 'https://example.com/3',
          job_id: 'job-3',
        },
      ];

      axios.get.mockResolvedValue({
        data: { jobs_results: mockJobs },
      });

      const count = await fetchAndStoreJobs('test query');

      expect(count).toBe(3);

      const jobCount = await Job.countDocuments();
      expect(jobCount).toBe(3);
    });

    test('should log fetching progress', async () => {
      axios.get.mockResolvedValue({
        data: { jobs_results: [{ job_id: 'test' }] },
      });

      await fetchAndStoreJobs('test query');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Fetcher] Searching for: test query')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Fetcher] Found')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Fetcher] Database updated')
      );
    });
  });

  describe('Job normalization', () => {
    test('should normalize job with all fields', async () => {
      const mockJob = {
        title: 'Full Stack Developer',
        company_name: 'Startup Inc',
        location: 'San Francisco, CA',
        description: 'Exciting startup opportunity',
        via: 'LinkedIn',
        related_links: [{ link: 'https://example.com/apply' }],
        job_id: 'job-456',
        extensions: ['Remote', '$120k-$180k', 'Health insurance'],
      };

      axios.get.mockResolvedValue({
        data: { jobs_results: [mockJob] },
      });

      await fetchAndStoreJobs();

      const savedJob = await Job.findOne({ externalId: 'job-456' });

      expect(savedJob.title).toBe('Full Stack Developer');
      expect(savedJob.company).toBe('Startup Inc');
      expect(savedJob.location).toBe('San Francisco, CA');
      expect(savedJob.description).toBe('Exciting startup opportunity');
      expect(savedJob.source).toBe('LinkedIn');
      expect(savedJob.applyLink).toBe('https://example.com/apply');
      expect(savedJob.externalId).toBe('job-456');
      expect(savedJob.tags).toEqual(['Remote', '$120k-$180k', 'Health insurance']);
    });

    test('should handle job with missing related_links', async () => {
      const mockJob = {
        title: 'Developer',
        company_name: 'Company',
        location: 'Location',
        via: 'Source',
        share_link: 'https://example.com/share',
        job_id: 'job-789',
      };

      axios.get.mockResolvedValue({
        data: { jobs_results: [mockJob] },
      });

      await fetchAndStoreJobs();

      const savedJob = await Job.findOne({ externalId: 'job-789' });

      expect(savedJob.applyLink).toBe('https://example.com/share');
    });

    test('should handle job with missing via field', async () => {
      const mockJob = {
        title: 'Developer',
        company_name: 'Company',
        location: 'Location',
        share_link: 'https://example.com/share',
        job_id: 'job-101',
      };

      axios.get.mockResolvedValue({
        data: { jobs_results: [mockJob] },
      });

      await fetchAndStoreJobs();

      const savedJob = await Job.findOne({ externalId: 'job-101' });

      expect(savedJob.source).toBe('Unknown');
    });

    test('should handle job without extensions', async () => {
      const mockJob = {
        title: 'Developer',
        company_name: 'Company',
        location: 'Location',
        via: 'Source',
        share_link: 'https://example.com/apply',
        job_id: 'job-202',
      };

      axios.get.mockResolvedValue({
        data: { jobs_results: [mockJob] },
      });

      await fetchAndStoreJobs();

      const savedJob = await Job.findOne({ externalId: 'job-202' });

      expect(savedJob.tags).toEqual([]);
    });
  });

  describe('Upsert behavior', () => {
    test('should not create duplicate jobs with same externalId', async () => {
      const mockJob = {
        title: 'Developer',
        company_name: 'Company',
        location: 'Location',
        via: 'LinkedIn',
        share_link: 'https://example.com/apply',
        job_id: 'duplicate-job',
      };

      axios.get.mockResolvedValue({
        data: { jobs_results: [mockJob] },
      });

      await fetchAndStoreJobs();
      await fetchAndStoreJobs();

      const count = await Job.countDocuments({ externalId: 'duplicate-job' });
      expect(count).toBe(1);
    });

    test('should update existing job with same externalId', async () => {
      const originalJob = {
        title: 'Original Title',
        company_name: 'Company',
        location: 'Location',
        via: 'LinkedIn',
        share_link: 'https://example.com/apply',
        job_id: 'update-job',
      };

      const updatedJob = {
        title: 'Updated Title',
        company_name: 'Company',
        location: 'Location',
        via: 'LinkedIn',
        share_link: 'https://example.com/apply',
        job_id: 'update-job',
      };

      axios.get.mockResolvedValueOnce({
        data: { jobs_results: [originalJob] },
      });

      await fetchAndStoreJobs();

      axios.get.mockResolvedValueOnce({
        data: { jobs_results: [updatedJob] },
      });

      await fetchAndStoreJobs();

      const job = await Job.findOne({ externalId: 'update-job' });
      expect(job.title).toBe('Updated Title');

      const count = await Job.countDocuments({ externalId: 'update-job' });
      expect(count).toBe(1);
    });

    test('should track new jobs count correctly', async () => {
      const job1 = {
        title: 'Job 1',
        company_name: 'Company',
        location: 'Location',
        via: 'LinkedIn',
        share_link: 'https://example.com/1',
        job_id: 'new-1',
      };

      const job2 = {
        title: 'Job 2',
        company_name: 'Company',
        location: 'Location',
        via: 'LinkedIn',
        share_link: 'https://example.com/2',
        job_id: 'new-2',
      };

      axios.get.mockResolvedValueOnce({
        data: { jobs_results: [job1] },
      });

      await fetchAndStoreJobs();

      axios.get.mockResolvedValueOnce({
        data: { jobs_results: [job1, job2] },
      });

      const result = await fetchAndStoreJobs();

      const totalJobs = await Job.countDocuments();
      expect(totalJobs).toBe(2);
      expect(result).toBe(2);
    });
  });

  describe('Error handling', () => {
    test('should throw error when API request fails', async () => {
      axios.get.mockRejectedValue(new Error('API Error'));

      await expect(fetchAndStoreJobs()).rejects.toThrow('API Error');
    });

    test('should log error when API request fails', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(fetchAndStoreJobs()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Fetcher] Error:',
        'Network error'
      );
    });

    test('should handle empty jobs_results array', async () => {
      axios.get.mockResolvedValue({
        data: { jobs_results: [] },
      });

      const count = await fetchAndStoreJobs();

      expect(count).toBe(0);

      const jobCount = await Job.countDocuments();
      expect(jobCount).toBe(0);
    });

    test('should handle missing jobs_results in response', async () => {
      axios.get.mockResolvedValue({
        data: {},
      });

      const count = await fetchAndStoreJobs();

      expect(count).toBe(0);
    });

    test('should handle API timeout', async () => {
      axios.get.mockRejectedValue(new Error('ECONNABORTED'));

      await expect(fetchAndStoreJobs()).rejects.toThrow('ECONNABORTED');
    });
  });

  describe('API parameters', () => {
    test('should use correct API endpoint', async () => {
      axios.get.mockResolvedValue({
        data: { jobs_results: [] },
      });

      await fetchAndStoreJobs();

      expect(axios.get).toHaveBeenCalledWith(
        'https://serpapi.com/search.json',
        expect.any(Object)
      );
    });

    test('should include correct query parameters', async () => {
      axios.get.mockResolvedValue({
        data: { jobs_results: [] },
      });

      await fetchAndStoreJobs('test query');

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        {
          params: {
            engine: 'google_jobs',
            q: 'test query',
            hl: 'en',
            api_key: 'test-api-key',
          },
        }
      );
    });

    test('should use API key from environment variable', async () => {
      process.env.SERP_API_KEY = 'custom-api-key';

      axios.get.mockResolvedValue({
        data: { jobs_results: [] },
      });

      await fetchAndStoreJobs();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            api_key: 'custom-api-key',
          }),
        })
      );
    });
  });
});
