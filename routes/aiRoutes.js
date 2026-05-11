const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/parse-sms', aiController.parseSms);
router.post('/insights', aiController.getInsights);
router.post('/chat', aiController.chat);

module.exports = router;
