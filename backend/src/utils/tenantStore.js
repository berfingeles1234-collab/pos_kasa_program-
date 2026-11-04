const { AppError } = require('./appError');

const STORE_BOUND_ROLES = new Set(['cashier', 'store_manager']);

function resolveStoreId(tenant, requestedStoreId) {
  if (STORE_BOUND_ROLES.has(tenant.role)) {
    if (!tenant.storeId) {
      throw new AppError('store_id zorunlu', 403);
    }
    return tenant.storeId;
  }

  const storeId = requestedStoreId || tenant.storeId;

  if (!storeId) {
    throw new AppError('store_id gerekli', 400);
  }

  return storeId;
}

/**
 * Admin rapor/stok endpointleri için mağaza filtresi.
 * store_manager → yalnızca kendi mağazası
 * customer_admin → store_id verilmezse tüm mağazalar
 */
function resolveAdminStoreFilter(tenant, requestedStoreId) {
  if (tenant.role === 'store_manager') {
    if (!tenant.storeId) {
      throw new AppError('store_id zorunlu', 403);
    }
    return { storeId: tenant.storeId, allStores: false };
  }

  if (tenant.role === 'customer_admin') {
    if (requestedStoreId) {
      return { storeId: requestedStoreId, allStores: false };
    }
    return { storeId: null, allStores: true };
  }

  throw new AppError('Yetkiniz yok', 403);
}

function parseDateRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (startDate && Number.isNaN(start.getTime())) {
    throw new AppError('start_date geçersiz', 400);
  }

  if (endDate && Number.isNaN(end.getTime())) {
    throw new AppError('end_date geçersiz', 400);
  }

  if (start && end && start > end) {
    throw new AppError('start_date end_date değerinden büyük olamaz', 400);
  }

  return { start, end };
}

function validateProductPayload(data, { partial = false } = {}) {
  if (!partial) {
    if (!data.barcode || !String(data.barcode).trim()) {
      throw new AppError('barcode zorunlu', 400);
    }
    if (!data.name || !String(data.name).trim()) {
      throw new AppError('name zorunlu', 400);
    }
    if (data.sale_price === undefined || data.sale_price === null) {
      throw new AppError('sale_price zorunlu', 400);
    }
  }

  if (data.sale_price !== undefined && Number(data.sale_price) < 0) {
    throw new AppError('sale_price negatif olamaz', 400);
  }

  if (data.stock_quantity !== undefined && Number(data.stock_quantity) < 0) {
    throw new AppError('stock_quantity negatif olamaz', 400);
  }

  if (data.vat_rate !== undefined) {
    const vatRate = Number(data.vat_rate);
    if (vatRate < 0 || vatRate > 100) {
      throw new AppError('vat_rate 0-100 arasında olmalıdır', 400);
    }
  }
}

function normalizeProductInput(data) {
  return {
    barcode: data.barcode ? String(data.barcode).trim() : undefined,
    name: data.name ? String(data.name).trim() : undefined,
    category: data.category ?? null,
    unit: data.unit || 'Adet',
    product_type: data.product_type || 'A',
    purchase_price: data.purchase_price !== undefined ? Number(data.purchase_price) : undefined,
    sale_price: data.sale_price !== undefined ? Number(data.sale_price) : undefined,
    vat_rate: data.vat_rate !== undefined ? Number(data.vat_rate) : undefined,
    stock_quantity: data.stock_quantity !== undefined ? Number(data.stock_quantity) : undefined,
    min_stock_level: data.min_stock_level !== undefined ? Number(data.min_stock_level) : undefined,
  };
}

module.exports = {
  resolveStoreId,
  resolveAdminStoreFilter,
  parseDateRange,
  validateProductPayload,
  normalizeProductInput,
  STORE_BOUND_ROLES,
};
