const axios = require('axios');
const Job = require('../models/Job');

const API_KEY = process.env.SERP_API_KEY; // Put this in your .env file

// Helper: Standardize job data into our DB format
const normalizeJob = (rawJob) => {
  return {
    title: rawJob.title,
    company: rawJob.company_name,
    location: rawJob.location,
    description: rawJob.description,
    source: rawJob.via || "Unknown", // e.g., "via LinkedIn"
    applyLink: rawJob.related_links?.[0]?.link || rawJob.share_link,
    externalId: rawJob.job_id, // Google's unique ID for this job
    tags: rawJob.extensions ? rawJob.extensions : [] // Capture salary/schedule tags if available
  };
};

const fetchAndStoreJobs = async (query = "software developer node js") => {
  try {
    console.log(`[Fetcher] Searching for: ${query}...`);
    
    // 1. Fetch data from the Aggregator API (Google Jobs via SerpApi)
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_jobs',
        q: query,
        hl: 'en',
        api_key: API_KEY
      }
    });

    const rawJobs = response.data.jobs_results || [];
    console.log(`[Fetcher] Found ${rawJobs.length} jobs.`);

    // 2. Process and Upsert (Update if exists, Insert if new)
    let newCount = 0;
    for (const job of rawJobs) {
      const normalized = normalizeJob(job);
      
      // 'upsert: true' prevents duplicates based on the unique externalId
      const result = await Job.updateOne(
        { externalId: normalized.externalId }, 
        { $set: normalized }, 
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) newCount++;
    }

    console.log(`[Fetcher] Database updated. ${newCount} new jobs added.`);
    return rawJobs.length;

  } catch (error) {
    console.error("[Fetcher] Error:", error.message);
    throw error;
  }
};

module.exports = { fetchAndStoreJobs };