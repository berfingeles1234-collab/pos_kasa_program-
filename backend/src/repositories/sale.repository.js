const { BaseRepository } = require('./base.repository');

class SaleRepository extends BaseRepository {
  async findByClientSaleId(client, tenant, storeId, clientSaleId) {
    this.setTenant(tenant).requireTenant();

    const result = await this.queryWithClient(
      client,
      `
        SELECT
          id, customer_id, store_id, user_id, receipt_no, status,
          total_amount, item_count, cash_received, change_amount,
          invoice_mode, invoice_customer_name, invoice_tax_no,
          invoice_tax_office, invoice_phone, invoice_address, invoice_email,
          client_sale_id, sold_at, created_at
        FROM sales
        WHERE customer_id = $1
          AND store_id = $2
          AND client_sale_id = $3
      `,
      [tenant.customerId, storeId, clientSaleId]
    );

    return result.rows[0] || null;
  }

  async getSaleItems(client, saleId) {
    const result = await this.queryWithClient(
      client,
      `
        SELECT
          id, product_id, quantity, unit_price, purchase_price, vat_rate, line_total
        FROM sale_items
        WHERE sale_id = $1
        ORDER BY created_at ASC
      `,
      [saleId]
    );

    return result.rows;
  }

  async generateReceiptNo(client, storeId) {
    const result = await this.queryWithClient(
      client,
      `
        SELECT COALESCE(MAX(CAST(receipt_no AS BIGINT)), 0) + 1 AS next_no
        FROM sales
        WHERE store_id = $1
          AND receipt_no ~ '^[0-9]+$'
      `,
      [storeId]
    );

    return String(result.rows[0].next_no).padStart(6, '0');
  }

  async createSale(client, tenant, storeId, data) {
    this.setTenant(tenant).requireTenant();

    const result = await this.queryWithClient(
      client,
      `
        INSERT INTO sales (
          customer_id, store_id, user_id, receipt_no, status,
          total_amount, item_count, cash_received, change_amount,
          invoice_mode, invoice_customer_name, invoice_tax_no,
          invoice_tax_office, invoice_phone, invoice_address, invoice_email,
          client_sale_id, synced_at, sold_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now(), now())
        RETURNING
          id, customer_id, store_id, user_id, receipt_no, status,
          total_amount, item_count, cash_received, change_amount,
          invoice_mode, invoice_customer_name, invoice_tax_no,
          invoice_tax_office, invoice_phone, invoice_address, invoice_email,
          client_sale_id, sold_at, created_at
      `,
      [
        tenant.customerId,
        storeId,
        tenant.userId,
        data.receipt_no,
        data.status || 'completed',
        data.total_amount,
        data.item_count,
        data.cash_received ?? null,
        data.change_amount ?? null,
        data.invoice_mode ?? false,
        data.invoice_customer_name ?? null,
        data.invoice_tax_no ?? null,
        data.invoice_tax_office ?? null,
        data.invoice_phone ?? null,
        data.invoice_address ?? null,
        data.invoice_email ?? null,
        data.client_sale_id ?? null,
      ]
    );

    return result.rows[0];
  }

  async createSaleItem(client, tenant, storeId, saleId, item) {
    this.setTenant(tenant).requireTenant();

    const result = await this.queryWithClient(
      client,
      `
        INSERT INTO sale_items (
          customer_id, store_id, sale_id, product_id,
          quantity, unit_price, purchase_price, vat_rate, line_total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, product_id, quantity, unit_price, purchase_price, vat_rate, line_total
      `,
      [
        tenant.customerId,
        storeId,
        saleId,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.purchase_price ?? 0,
        item.vat_rate,
        item.line_total,
      ]
    );

    return result.rows[0];
  }
}

module.exports = {
  SaleRepository,
};
