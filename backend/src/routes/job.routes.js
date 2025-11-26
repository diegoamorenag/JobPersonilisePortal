
const express = require('express');
const router = express.Router();
const JobController = require('../controllers/job.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get aggregated job listings
router.get('/', JobController.getJobs); // ?page=1&limit=20&source=indeed&keywords=developer
router.get('/saved', JobController.getSavedJobs);
router.get('/recent', JobController.getRecentJobs); // Last 24hrs
router.get('/:id', JobController.getJobById);

// Job actions
router.post('/:id/save', JobController.saveJob);
router.delete('/:id/save', JobController.unsaveJob);
router.get('/:id/redirect', JobController.redirectToOriginal);

// Search and filter
router.post('/search', JobController.searchJobs);

module.exports = router;