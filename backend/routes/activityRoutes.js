const express = require('express');
const router = express.Router();
const { getActivityLogs, markAllAsRead } = require('../controllers/activityController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', getActivityLogs);
router.post('/mark-read', markAllAsRead);

module.exports = router;
