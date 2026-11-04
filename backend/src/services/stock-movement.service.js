const { StockRepository } = require('../repositories/stock.repository');
const { resolveAdminStoreFilter, parseDateRange } = require('../utils/tenantStore');
const { AppError } = require('../utils/appError');

const stockRepository = new StockRepository();

async function listStockMovements(tenant, query) {
  const storeFilter = resolveAdminStoreFilter(tenant, query.store_id);
  const { start, end } = parseDateRange(query.start_date, query.end_date);

  if (query.movement_type) {
    const allowed = ['sale', 'purchase', 'adjustment', 'return', 'transfer'];
    if (!allowed.includes(query.movement_type)) {
      throw new AppError('movement_type geçersiz', 400);
    }
  }

  const movements = await stockRepository.findAllMovements(tenant, {
    storeId: storeFilter.storeId,
    allStores: storeFilter.allStores,
    productId: query.product_id || null,
    movementType: query.movement_type || null,
    startDate: start,
    endDate: end,
    limit: query.limit ? Number(query.limit) : 100,
  });

  return movements.map((row) => ({
    id: row.id,
    customer_id: row.customer_id,
    store_id: row.store_id,
    product_id: row.product_id,
    barcode: row.barcode,
    product_name: row.product_name,
    movement_type: row.movement_type,
    quantity_change: Number(row.quantity_change),
    quantity_after: Number(row.quantity_after),
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    note: row.note,
    user_id: row.user_id,
    user_username: row.user_username,
    created_at: row.created_at,
  }));
}

module.exports = {
  listStockMovements,
};
