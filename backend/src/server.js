require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { fetchAndStoreJobs } = require('./services/jobFetcher');
const Job = require('./models/Job');

const app = express();
app.use(cors());
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));

// --- Routes ---

// 1. GET /jobs - Retrieve jobs with filters
app.get('/jobs', async (req, res) => {
  try {
    const { skills, source } = req.query;
    let filter = {};

    // Simple Regex filter for skills (e.g., ?skills=Node)
    if (skills) {
      filter.title = { $regex: skills, $options: 'i' };
    }
    // Filter by source (e.g., ?source=LinkedIn)
    if (source) {
      filter.source = { $regex: source, $options: 'i' };
    }

    const jobs = await Job.find(filter).sort({ postedAt: -1 }).limit(50);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST /sync - Trigger the scraper manually
app.post('/sync', async (req, res) => {
  const { query } = req.body; // e.g. { "query": "Node JS Uruguay" }
  try {
    const count = await fetchAndStoreJobs(query || "developer");
    res.json({ success: true, message: `Sync complete. Processed ${count} jobs.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to sync jobs" });
  }
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));