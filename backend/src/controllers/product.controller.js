const productService = require('../services/product.service');

async function listProducts(req, res, next) {
  try {
    const products = await productService.listProducts(req.tenant, req.query);
    res.json(products);
  } catch (error) {
    next(error);
  }
}

async function getProductByBarcode(req, res, next) {
  try {
    const product = await productService.getProductByBarcode(
      req.tenant,
      req.params.barcode,
      req.query.store_id
    );
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.tenant, req.body);
    res.status(201).json({
      message: 'Ürün başarıyla eklendi',
      product,
    });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await productService.updateProduct(
      req.tenant,
      req.params.id,
      req.body
    );
    res.json({
      message: 'Ürün başarıyla güncellendi',
      product,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const result = await productService.deleteProduct(
      req.tenant,
      req.params.id,
      req.query.store_id || req.body.store_id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
};
