const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const posRoutes = require('./pos.routes');
const adminRoutes = require('./admin.routes');
const licenseRoutes = require('./license.routes');
const platformRoutes = require('./platform.routes');

const router = express.Router();

router.use('/v1', healthRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/pos', posRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/license', licenseRoutes);
router.use('/v1/platform', platformRoutes);

module.exports = router;
