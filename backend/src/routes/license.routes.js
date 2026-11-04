const express = require('express');
const licenseController = require('../controllers/license.controller');
const { optionalAuthenticateToken } = require('../middlewares/optional-auth.middleware');
const { optionalTenantMiddleware } = require('../middlewares/optional-tenant.middleware');

const router = express.Router();

router.post('/activate', licenseController.activate);

router.get(
  '/validate',
  optionalAuthenticateToken,
  optionalTenantMiddleware,
  licenseController.validate
);

module.exports = router;
