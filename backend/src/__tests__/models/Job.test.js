const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Job = require('../../models/Job');

describe('Job Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Job.deleteMany({});
  });

  describe('Schema validation', () => {
    test('should create a job with all required fields', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        description: 'Great job opportunity',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-12345',
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      expect(savedJob._id).toBeDefined();
      expect(savedJob.title).toBe(jobData.title);
      expect(savedJob.company).toBe(jobData.company);
      expect(savedJob.location).toBe(jobData.location);
      expect(savedJob.description).toBe(jobData.description);
      expect(savedJob.source).toBe(jobData.source);
      expect(savedJob.applyLink).toBe(jobData.applyLink);
      expect(savedJob.externalId).toBe(jobData.externalId);
    });

    test('should fail validation without title', async () => {
      const jobData = {
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
      };

      const job = new Job(jobData);

      await expect(job.save()).rejects.toThrow();
    });

    test('should fail validation without company', async () => {
      const jobData = {
        title: 'Software Engineer',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
      };

      const job = new Job(jobData);

      await expect(job.save()).rejects.toThrow();
    });

    test('should fail validation without location', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
      };

      const job = new Job(jobData);

      await expect(job.save()).rejects.toThrow();
    });

    test('should fail validation without source', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        applyLink: 'https://example.com/apply',
      };

      const job = new Job(jobData);

      await expect(job.save()).rejects.toThrow();
    });

    test('should fail validation without applyLink', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
      };

      const job = new Job(jobData);

      await expect(job.save()).rejects.toThrow();
    });

    test('should allow job without description', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      expect(savedJob).toBeDefined();
      expect(savedJob.description).toBeUndefined();
    });

    test('should allow job without externalId', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      expect(savedJob).toBeDefined();
      expect(savedJob.externalId).toBeUndefined();
    });
  });

  describe('Tags field', () => {
    test('should accept array of tags', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
        tags: ['JavaScript', 'Node.js', 'Remote'],
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      expect(savedJob.tags).toEqual(['JavaScript', 'Node.js', 'Remote']);
      expect(savedJob.tags).toHaveLength(3);
    });

    test('should accept empty tags array', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
        tags: [],
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      expect(savedJob.tags).toEqual([]);
    });

    test('should work without tags field', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      expect(savedJob.tags).toBeUndefined();
    });
  });

  describe('ExternalId uniqueness', () => {
    test('should enforce unique externalId', async () => {
      const jobData1 = {
        title: 'Job 1',
        company: 'Company 1',
        location: 'Location 1',
        source: 'Source 1',
        applyLink: 'https://example.com/1',
        externalId: 'duplicate-id',
      };

      const jobData2 = {
        title: 'Job 2',
        company: 'Company 2',
        location: 'Location 2',
        source: 'Source 2',
        applyLink: 'https://example.com/2',
        externalId: 'duplicate-id',
      };

      const job1 = new Job(jobData1);
      await job1.save();

      const job2 = new Job(jobData2);
      await expect(job2.save()).rejects.toThrow();
    });

    test('should allow multiple jobs without externalId', async () => {
      const jobData1 = {
        title: 'Job 1',
        company: 'Company 1',
        location: 'Location 1',
        source: 'Source 1',
        applyLink: 'https://example.com/1',
      };

      const jobData2 = {
        title: 'Job 2',
        company: 'Company 2',
        location: 'Location 2',
        source: 'Source 2',
        applyLink: 'https://example.com/2',
      };

      const job1 = new Job(jobData1);
      const job2 = new Job(jobData2);

      await job1.save();
      await job2.save();

      const count = await Job.countDocuments();
      expect(count).toBe(2);
    });
  });

  describe('PostedAt field', () => {
    test('should set default postedAt date', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
      };

      const beforeSave = new Date();
      const job = new Job(jobData);
      const savedJob = await job.save();
      const afterSave = new Date();

      expect(savedJob.postedAt).toBeDefined();
      expect(savedJob.postedAt).toBeInstanceOf(Date);
      expect(savedJob.postedAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(savedJob.postedAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    test('should accept custom postedAt date', async () => {
      const customDate = new Date('2024-01-01');
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
        postedAt: customDate,
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      expect(savedJob.postedAt.toISOString()).toBe(customDate.toISOString());
    });
  });

  describe('CRUD operations', () => {
    test('should find job by id', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      const foundJob = await Job.findById(savedJob._id);

      expect(foundJob).toBeDefined();
      expect(foundJob.title).toBe(jobData.title);
    });

    test('should update job', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      savedJob.title = 'Senior Software Engineer';
      const updatedJob = await savedJob.save();

      expect(updatedJob.title).toBe('Senior Software Engineer');
    });

    test('should delete job', async () => {
      const jobData = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        source: 'LinkedIn',
        applyLink: 'https://example.com/apply',
        externalId: 'job-123',
      };

      const job = new Job(jobData);
      const savedJob = await job.save();

      await Job.findByIdAndDelete(savedJob._id);

      const foundJob = await Job.findById(savedJob._id);
      expect(foundJob).toBeNull();
    });

    test('should find jobs by source', async () => {
      await Job.create([
        {
          title: 'Job 1',
          company: 'Company 1',
          location: 'Location 1',
          source: 'LinkedIn',
          applyLink: 'https://example.com/1',
        },
        {
          title: 'Job 2',
          company: 'Company 2',
          location: 'Location 2',
          source: 'Indeed',
          applyLink: 'https://example.com/2',
        },
        {
          title: 'Job 3',
          company: 'Company 3',
          location: 'Location 3',
          source: 'LinkedIn',
          applyLink: 'https://example.com/3',
        },
      ]);

      const linkedInJobs = await Job.find({ source: 'LinkedIn' });

      expect(linkedInJobs).toHaveLength(2);
    });
  });
});
