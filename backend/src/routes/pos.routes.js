const express = require('express');
const productController = require('../controllers/product.controller');
const saleController = require('../controllers/sale.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { tenantMiddleware } = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');

const router = express.Router();

const readProductRoles = ['customer_admin', 'store_manager', 'cashier'];
const createProductRoles = ['customer_admin', 'store_manager', 'cashier'];
const manageProductRoles = ['customer_admin', 'store_manager'];
const saleRoles = ['customer_admin', 'store_manager', 'cashier'];

router.use(authenticateToken, tenantMiddleware);

router.get(
  '/products',
  requireRole(...readProductRoles),
  productController.listProducts
);

router.get(
  '/products/barcode/:barcode',
  requireRole(...readProductRoles),
  productController.getProductByBarcode
);

router.post(
  '/products',
  requireRole(...createProductRoles),
  productController.createProduct
);

router.put(
  '/products/:id',
  requireRole(...manageProductRoles),
  productController.updateProduct
);

router.delete(
  '/products/:id',
  requireRole(...manageProductRoles),
  productController.deleteProduct
);

router.post(
  '/sales',
  requireRole(...saleRoles),
  saleController.createSale
);

module.exports = router;
