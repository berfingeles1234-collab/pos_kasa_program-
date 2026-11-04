const { ReportRepository } = require('../repositories/report.repository');
const { resolveAdminStoreFilter, parseDateRange } = require('../utils/tenantStore');
const { AppError } = require('../utils/appError');

const reportRepository = new ReportRepository();

function buildReportFilters(tenant, query) {
  const storeFilter = resolveAdminStoreFilter(tenant, query.store_id);
  const { start, end } = parseDateRange(query.start_date, query.end_date);

  return {
    storeId: storeFilter.storeId,
    allStores: storeFilter.allStores,
    startDate: start,
    endDate: end,
    startDateStr: query.start_date || null,
    endDateStr: query.end_date || null,
    limit: query.limit ? Number(query.limit) : undefined,
  };
}

function mapSale(row) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    store_id: row.store_id,
    store_name: row.store_name,
    user_id: row.user_id,
    user_username: row.user_username,
    user_full_name: row.user_full_name,
    receipt_no: row.receipt_no,
    status: row.status,
    total_amount: Number(row.total_amount),
    item_count: row.item_count,
    cash_received: row.cash_received !== null ? Number(row.cash_received) : null,
    change_amount: row.change_amount !== null ? Number(row.change_amount) : null,
    client_sale_id: row.client_sale_id,
    sold_at: row.sold_at,
    created_at: row.created_at,
  };
}

function mapCashTrackingSale(row) {
  return {
    id: row.id,
    receipt_no: row.receipt_no,
    created_at: row.sold_at,
    sold_at: row.sold_at,
    cashier_name: row.cashier_name || row.cashier_username || '-',
    total_amount: Number(row.total_amount),
    total_cost: Number(row.total_cost),
    total_profit: Number(row.total_profit),
    invoice_mode: Boolean(row.invoice_mode),
  };
}

function mapSaleDetailItem(row) {
  const purchasePrice = Number(row.effective_purchase_price || 0);
  const salePrice = Number(row.unit_price);
  const quantity = Number(row.quantity);

  return {
    id: row.id,
    product_id: row.product_id,
    product_name: row.product_name,
    barcode: row.barcode,
    quantity,
    sale_price: salePrice,
    purchase_price: purchasePrice,
    vat_rate: Number(row.vat_rate || 0),
    line_total: Number(row.line_total),
    line_profit: Number(row.line_profit ?? (salePrice - purchasePrice) * quantity),
  };
}

async function listSales(tenant, query) {
  const filters = buildReportFilters(tenant, query);
  const sales = await reportRepository.findSales(tenant, filters);
  return sales.map(mapSale);
}

async function getSummary(tenant, query) {
  const filters = buildReportFilters(tenant, query);
  const result = await reportRepository.getSummary(tenant, filters);

  return {
    summary: {
      sale_count: result.summary.sale_count,
      total_revenue: Number(result.summary.total_revenue),
      average_basket: Number(result.summary.average_basket),
    },
    daily: result.daily.map((row) => ({
      date: row.date,
      sale_count: row.sale_count,
      total_revenue: Number(row.total_revenue),
      average_basket: Number(row.average_basket),
    })),
  };
}

async function getCashTracking(tenant, query) {
  const filters = buildReportFilters(tenant, query);
  const storeFilter = {
    storeId: filters.storeId,
    allStores: filters.allStores,
  };

  const [periods, summary, daily, sales] = await Promise.all([
    reportRepository.getPeriodProfitSummaries(tenant, storeFilter),
    reportRepository.getProfitSummary(tenant, filters),
    reportRepository.getDailyProfitSummary(tenant, filters),
    reportRepository.getSalesWithProfit(tenant, filters),
  ]);

  return {
    periods,
    summary,
    daily,
    sales: sales.map(mapCashTrackingSale),
  };
}

async function getSaleDetails(tenant, saleId) {
  if (!saleId) {
    throw new AppError('sale id gerekli', 400);
  }

  const details = await reportRepository.getSaleDetails(tenant, saleId);

  if (!details) {
    throw new AppError('Satış bulunamadı', 404);
  }

  const { sale, items, total_cost, total_profit } = details;

  return {
    sale: {
      id: sale.id,
      receipt_no: sale.receipt_no,
      total_amount: Number(sale.total_amount),
      item_count: sale.item_count,
      cash_received: sale.cash_received !== null ? Number(sale.cash_received) : null,
      change_amount: sale.change_amount !== null ? Number(sale.change_amount) : null,
      sold_at: sale.sold_at,
      created_at: sale.created_at,
      store_name: sale.store_name,
      cashier_name: sale.cashier_name || sale.cashier_username || '-',
      total_cost: Number(total_cost),
      total_profit: Number(total_profit),
      invoice_mode: Boolean(sale.invoice_mode),
      invoice_customer_name: sale.invoice_customer_name,
      invoice_tax_no: sale.invoice_tax_no,
      invoice_tax_office: sale.invoice_tax_office,
      invoice_phone: sale.invoice_phone,
      invoice_address: sale.invoice_address,
      invoice_email: sale.invoice_email,
    },
    items: items.map(mapSaleDetailItem),
  };
}

async function getSalesAnalytics(tenant, query) {
  const filters = buildReportFilters(tenant, query);

  const [dailyRows, topProducts, cashierSales] = await Promise.all([
    reportRepository.getDailyProfitSummary(tenant, filters),
    reportRepository.getTopProducts(tenant, filters, 10),
    reportRepository.getCashierSales(tenant, filters),
  ]);

  const daily = dailyRows
    .map((row) => ({
      date: row.date,
      total_revenue: Number(row.total_revenue),
      total_profit: Number(row.total_profit),
      sale_count: Number(row.sale_count),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    daily,
    top_products: topProducts.map((row) => ({
      product_name: row.product_name,
      total_quantity: Number(row.total_quantity),
      total_revenue: Number(row.total_revenue),
    })),
    cashier_sales: cashierSales.map((row) => ({
      cashier_name: row.cashier_name,
      total_revenue: Number(row.total_revenue),
      sale_count: Number(row.sale_count),
    })),
  };
}

module.exports = {
  listSales,
  getSummary,
  getCashTracking,
  getSaleDetails,
  getSalesAnalytics,
};
