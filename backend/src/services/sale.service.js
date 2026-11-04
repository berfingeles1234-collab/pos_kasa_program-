const { getPool } = require('../db/pool');
const { ProductRepository } = require('../repositories/product.repository');
const { SaleRepository } = require('../repositories/sale.repository');
const { StockRepository } = require('../repositories/stock.repository');
const { AuditRepository } = require('../repositories/audit.repository');
const { AppError } = require('../utils/appError');
const { resolveStoreId } = require('../utils/tenantStore');

const productRepository = new ProductRepository();
const saleRepository = new SaleRepository();
const stockRepository = new StockRepository();
const auditRepository = new AuditRepository();

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function trimOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed || null;
}

function resolveInvoiceFields(body) {
  const invoiceMode = Boolean(body.invoice_mode);

  if (!invoiceMode) {
    return {
      invoice_mode: false,
      invoice_customer_name: null,
      invoice_tax_no: null,
      invoice_tax_office: null,
      invoice_phone: null,
      invoice_address: null,
      invoice_email: null,
    };
  }

  const customer = body.invoice_customer || {};
  const customerName = trimOrNull(customer.name);

  if (!customerName) {
    throw new AppError('Fatura modunda müşteri adı / firma ünvanı zorunludur', 400);
  }

  return {
    invoice_mode: true,
    invoice_customer_name: customerName,
    invoice_tax_no: trimOrNull(customer.tax_no),
    invoice_tax_office: trimOrNull(customer.tax_office),
    invoice_phone: trimOrNull(customer.phone),
    invoice_address: trimOrNull(customer.address),
    invoice_email: trimOrNull(customer.email),
  };
}

async function createSale(tenant, body, ipAddress = null) {
  const storeId = resolveStoreId(tenant, body.store_id);
  const items = body.items;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Satış kalemleri gerekli', 400);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (body.client_sale_id) {
      const existing = await saleRepository.findByClientSaleId(
        client,
        tenant,
        storeId,
        body.client_sale_id
      );

      if (existing) {
        const existingItems = await saleRepository.getSaleItems(client, existing.id);
        await client.query('COMMIT');

        return {
          message: 'Satış zaten kayıtlı',
          sale: existing,
          items: existingItems,
          duplicate: true,
        };
      }
    }

    const preparedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const productId = item.product_id;
      const quantity = Number(item.quantity);

      if (!productId) {
        throw new AppError('product_id zorunlu', 400);
      }

      if (!quantity || quantity <= 0) {
        throw new AppError('quantity pozitif olmalıdır', 400);
      }

      const product = await productRepository.findByIdForUpdate(
        client,
        tenant,
        storeId,
        productId
      );

      if (!product) {
        throw new AppError(`Ürün bulunamadı: ${productId}`, 404);
      }

      if (Number(product.stock_quantity) < quantity) {
        throw new AppError(
          `Yetersiz stok: ${product.name} (mevcut: ${product.stock_quantity})`,
          400
        );
      }

      const unitPrice = Number(product.sale_price);
      const vatRate = Number(product.vat_rate);
      const purchasePrice = Number(product.purchase_price || 0);
      const lineTotal = roundMoney(unitPrice * quantity);

      preparedItems.push({
        product,
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        purchase_price: purchasePrice,
        vat_rate: vatRate,
        line_total: lineTotal,
      });

      totalAmount = roundMoney(totalAmount + lineTotal);
    }

    const receiptNo = await saleRepository.generateReceiptNo(client, storeId);
    const cashReceived = body.cash_received !== undefined ? Number(body.cash_received) : null;
    const changeAmount =
      cashReceived !== null ? roundMoney(cashReceived - totalAmount) : null;
    const invoiceFields = resolveInvoiceFields(body);

    const sale = await saleRepository.createSale(client, tenant, storeId, {
      receipt_no: receiptNo,
      status: 'completed',
      total_amount: totalAmount,
      item_count: preparedItems.length,
      cash_received: cashReceived,
      change_amount: changeAmount,
      client_sale_id: body.client_sale_id || null,
      ...invoiceFields,
    });

    const saleItems = [];

    for (const item of preparedItems) {
      const saleItem = await saleRepository.createSaleItem(
        client,
        tenant,
        storeId,
        sale.id,
        item
      );

      const newStock = roundMoney(Number(item.product.stock_quantity) - item.quantity);

      await productRepository.updateStockQuantity(
        client,
        tenant,
        storeId,
        item.product_id,
        newStock
      );

      await stockRepository.createMovement(client, tenant, storeId, {
        product_id: item.product_id,
        movement_type: 'sale',
        quantity_change: -item.quantity,
        quantity_after: newStock,
        reference_type: 'sale',
        reference_id: sale.id,
        note: `Satış fişi ${receiptNo}`,
      });

      saleItems.push(saleItem);
    }

    await auditRepository.create(client, {
      customerId: tenant.customerId,
      storeId,
      userId: tenant.userId,
      action: 'sale.created',
      entityType: 'sale',
      entityId: sale.id,
      metadata: {
        receipt_no: receiptNo,
        total_amount: totalAmount,
        item_count: preparedItems.length,
        client_sale_id: body.client_sale_id || null,
        invoice_mode: invoiceFields.invoice_mode,
      },
      ipAddress,
    });

    await client.query('COMMIT');

    return {
      message: 'Satış başarıyla kaydedildi',
      sale,
      items: saleItems,
      duplicate: false,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createSale,
};
