const express = require('express');
const platformLicenseController = require('../controllers/platform-license.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { platformAdminMiddleware } = require('../middlewares/platform.middleware');

const router = express.Router();

router.use(authenticateToken, platformAdminMiddleware);

router.get('/licenses', platformLicenseController.listLicenses);
router.post('/licenses', platformLicenseController.createLicense);
router.put('/licenses/:id', platformLicenseController.updateLicense);

module.exports = router;
