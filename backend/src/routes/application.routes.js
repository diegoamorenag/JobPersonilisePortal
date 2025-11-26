
const express = require('express');
const router = express.Router();
const ApplicationController = require('../controllers/application.controller');
const { authenticate } = require('../middleware/auth');
const { validateApplication } = require('../middleware/validation');

router.use(authenticate);

router.get('/', ApplicationController.getApplications);
router.post('/', validateApplication, ApplicationController.createApplication);
router.get('/:id', ApplicationController.getApplicationById);
router.put('/:id', ApplicationController.updateApplication);
router.delete('/:id', ApplicationController.deleteApplication);

// Easy apply functionality
router.post('/easy-apply/:jobId', ApplicationController.easyApply);
router.get('/stats', ApplicationController.getApplicationStats);

module.exports = router;