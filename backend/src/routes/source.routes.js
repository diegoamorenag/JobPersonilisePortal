
const express = require('express');
const router = express.Router();
const SourceController = require('../controllers/source.controller');
const { authenticate } = require('../middleware/auth');
const { validateSource } = require('../middleware/validation');

router.use(authenticate);

// Get all supported/available job sites
router.get('/available', SourceController.getAvailableSources);

// User's configured sources
router.get('/', SourceController.getUserSources);
router.post('/', validateSource, SourceController.addSource);
router.get('/:id', SourceController.getSourceById);
router.put('/:id', validateSource, SourceController.updateSource);
router.delete('/:id', SourceController.deleteSource);
router.patch('/:id/toggle', SourceController.toggleSourceStatus); // Enable/disable

module.exports = router;