const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

router.get('/health', (req, res, next) => {
  getHealth(req, res).catch(next);
});

module.exports = router;
