const { ProductRepository } = require('../repositories/product.repository');
const { AppError } = require('../utils/appError');
const {
  resolveStoreId,
  validateProductPayload,
  normalizeProductInput,
} = require('../utils/tenantStore');

const productRepository = new ProductRepository();

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    customer_id: row.customer_id,
    store_id: row.store_id,
    barcode: row.barcode,
    name: row.name,
    category: row.category,
    unit: row.unit,
    product_type: row.product_type,
    purchase_price: Number(row.purchase_price),
    sale_price: Number(row.sale_price),
    vat_rate: Number(row.vat_rate),
    stock_quantity: Number(row.stock_quantity),
    min_stock_level: Number(row.min_stock_level),
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listProducts(tenant, query = {}) {
  const storeId = resolveStoreId(tenant, query.store_id);
  const products = await productRepository.findAll(tenant, storeId, {
    search: query.search,
    category: query.category,
  });

  return products.map(mapProduct);
}

async function getProductByBarcode(tenant, barcode, requestedStoreId) {
  if (!barcode) {
    throw new AppError('barcode zorunlu', 400);
  }

  const storeId = resolveStoreId(tenant, requestedStoreId);
  const product = await productRepository.findByBarcode(tenant, storeId, barcode.trim());

  if (!product) {
    throw new AppError('Ürün bulunamadı', 404);
  }

  return mapProduct(product);
}

async function createProduct(tenant, body) {
  const storeId = resolveStoreId(tenant, body.store_id);
  const payload = normalizeProductInput(body);

  validateProductPayload(payload);

  try {
    const product = await productRepository.create(tenant, storeId, payload);
    return mapProduct(product);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Bu barkod zaten mevcut', 400);
    }
    throw error;
  }
}

async function updateProduct(tenant, productId, body) {
  const storeId = resolveStoreId(tenant, body.store_id);
  const payload = normalizeProductInput(body);

  validateProductPayload(payload, { partial: true });

  try {
    const product = await productRepository.update(tenant, storeId, productId, payload);

    if (!product) {
      throw new AppError('Ürün bulunamadı', 404);
    }

    return mapProduct(product);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Bu barkod zaten mevcut', 400);
    }
    throw error;
  }
}

async function deleteProduct(tenant, productId, requestedStoreId) {
  const storeId = resolveStoreId(tenant, requestedStoreId);
  const product = await productRepository.softDelete(tenant, storeId, productId);

  if (!product) {
    throw new AppError('Ürün bulunamadı', 404);
  }

  return {
    message: 'Ürün pasif hale getirildi',
    product,
  };
}

module.exports = {
  listProducts,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
};
