const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { tenantMiddleware } = require('../middlewares/tenant.middleware');

const router = express.Router();

router.post('/login', authController.login);
router.post(
  '/change-password',
  authenticateToken,
  tenantMiddleware,
  authController.changePassword
);

module.exports = router;
