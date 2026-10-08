const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { login, getMe, logout } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Rate limiting on login per PRD FR-AUTH-5
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // max 10 attempts per IP
  message: { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 5 menit.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, login);
router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logout);

module.exports = router;
