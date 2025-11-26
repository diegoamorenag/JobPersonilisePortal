const express = require('express');
const router = express.Router();
const PreferenceController = require('../controllers/preference.controller');
const { authenticate } = require('../middleware/auth');
const { validatePreferences } = require('../middleware/validation');

router.use(authenticate);

router.get('/', PreferenceController.getPreferences);
router.put('/', validatePreferences, PreferenceController.updatePreferences);
router.put('/notifications', PreferenceController.updateNotificationSettings);
router.put('/filters', PreferenceController.updateFilterSettings);
router.put('/keywords', PreferenceController.updateKeywords);

module.exports = router;