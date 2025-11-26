const express = require('express');
const router = express.Router();
const UserController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validation');

router.use(authenticate); // All routes require authentication

router.get('/profile', UserController.getProfile);
router.put('/profile', validateProfileUpdate, UserController.updateProfile);
router.delete('/account', UserController.deleteAccount);
router.put('/password', UserController.changePassword);

module.exports = router;