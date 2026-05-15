const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Protect AI mutation routes (chat still needs auth for Gemini proxy)
router.use(protect);

router.post('/parse-sms', aiController.parseSms);
router.post('/insights', aiController.getInsights);
router.post('/chat', aiController.chat);

module.exports = router;
