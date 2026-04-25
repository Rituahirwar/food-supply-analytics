const express = require('express');
const { register, login, getMe, getLoginHistory } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.get('/login-history', authMiddleware, getLoginHistory);

module.exports = router;