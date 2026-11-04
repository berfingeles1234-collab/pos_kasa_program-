const express = require('express');
const reportController = require('../controllers/report.controller');
const settingsController = require('../controllers/settings.controller');
const stockMovementController = require('../controllers/stock-movement.controller');
const userController = require('../controllers/user.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { tenantMiddleware } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const router = express.Router();

const reportRoles = ['customer_admin', 'store_manager'];
const settingsRoles = ['customer_admin', 'store_manager'];
const userAdminRoles = ['customer_admin', 'store_manager'];

router.use(authenticateToken, tenantMiddleware);

router.get(
  '/sales',
  requireRole(...reportRoles),
  reportController.listSales
);

router.get(
  '/reports/summary',
  requireRole(...reportRoles),
  reportController.getSummary
);

router.get(
  '/reports/cash-tracking',
  requireRole(...reportRoles),
  reportController.getCashTracking
);

router.get(
  '/reports/sales-analytics',
  requireRole(...reportRoles),
  reportController.getSalesAnalytics
);

router.get(
  '/sales/:id/details',
  requireRole(...reportRoles),
  reportController.getSaleDetails
);

router.get(
  '/settings',
  requireRole(...settingsRoles),
  settingsController.getSettings
);

router.put(
  '/settings',
  requireRole(...settingsRoles),
  settingsController.updateSettings
);

router.get(
  '/stock-movements',
  requireRole(...reportRoles),
  stockMovementController.listStockMovements
);

router.get(
  '/users',
  requireRole(...userAdminRoles),
  userController.listUsers
);

router.post(
  '/users',
  requireRole(...userAdminRoles),
  userController.createUser
);

router.put(
  '/users/:id',
  requireRole(...userAdminRoles),
  userController.updateUser
);

router.delete(
  '/users/:id',
  requireRole(...userAdminRoles),
  userController.deleteUser
);

module.exports = router;
