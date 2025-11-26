const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { validateRegistration, validateLogin } = require('../middleware/validation');

router.post('/register', validateRegistration, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password/:token', AuthController.resetPassword);
router.get('/verify-email/:token', AuthController.verifyEmail);

module.exports = router;