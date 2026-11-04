const { BaseRepository } = require('./base.repository');

class ProductRepository extends BaseRepository {
  async findAll(tenant, storeId, filters = {}) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['customer_id = $1', 'store_id = $2', 'is_active = true'];
    const params = [tenant.customerId, storeId];
    let paramIndex = 3;

    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR barcode ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex += 1;
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex += 1;
    }

    const result = await this.query(
      `
        SELECT
          id, customer_id, store_id, barcode, name, category, unit, product_type,
          purchase_price, sale_price, vat_rate, stock_quantity, min_stock_level,
          is_active, created_at, updated_at
        FROM products
        WHERE ${conditions.join(' AND ')}
        ORDER BY name ASC
      `,
      params
    );

    return result.rows;
  }

  async findById(tenant, storeId, productId) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        SELECT
          id, customer_id, store_id, barcode, name, category, unit, product_type,
          purchase_price, sale_price, vat_rate, stock_quantity, min_stock_level,
          is_active, created_at, updated_at
        FROM products
        WHERE id = $1
          AND customer_id = $2
          AND store_id = $3
          AND is_active = true
      `,
      [productId, tenant.customerId, storeId]
    );

    return result.rows[0] || null;
  }

  async findByBarcode(tenant, storeId, barcode) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        SELECT
          id, customer_id, store_id, barcode, name, category, unit, product_type,
          purchase_price, sale_price, vat_rate, stock_quantity, min_stock_level,
          is_active, created_at, updated_at
        FROM products
        WHERE barcode = $1
          AND customer_id = $2
          AND store_id = $3
          AND is_active = true
      `,
      [barcode, tenant.customerId, storeId]
    );

    return result.rows[0] || null;
  }

  async findByIdForUpdate(client, tenant, storeId, productId) {
    this.setTenant(tenant).requireTenant();

    const result = await this.queryWithClient(
      client,
      `
        SELECT
          id, customer_id, store_id, barcode, name,
          purchase_price, sale_price, vat_rate, stock_quantity
        FROM products
        WHERE id = $1
          AND customer_id = $2
          AND store_id = $3
          AND is_active = true
        FOR UPDATE
      `,
      [productId, tenant.customerId, storeId]
    );

    return result.rows[0] || null;
  }

  async create(tenant, storeId, data) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        INSERT INTO products (
          customer_id, store_id, barcode, name, category, unit, product_type,
          purchase_price, sale_price, vat_rate, stock_quantity, min_stock_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id, customer_id, store_id, barcode, name, category, unit, product_type,
          purchase_price, sale_price, vat_rate, stock_quantity, min_stock_level,
          is_active, created_at, updated_at
      `,
      [
        tenant.customerId,
        storeId,
        data.barcode,
        data.name,
        data.category || null,
        data.unit || 'Adet',
        data.product_type || 'A',
        data.purchase_price ?? 0,
        data.sale_price,
        data.vat_rate ?? 0,
        data.stock_quantity ?? 0,
        data.min_stock_level ?? 0,
      ]
    );

    return result.rows[0];
  }

  async update(tenant, storeId, productId, data) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        UPDATE products
        SET
          barcode = COALESCE($4, barcode),
          name = COALESCE($5, name),
          category = COALESCE($6, category),
          unit = COALESCE($7, unit),
          product_type = COALESCE($8, product_type),
          purchase_price = COALESCE($9, purchase_price),
          sale_price = COALESCE($10, sale_price),
          vat_rate = COALESCE($11, vat_rate),
          stock_quantity = COALESCE($12, stock_quantity),
          min_stock_level = COALESCE($13, min_stock_level),
          updated_at = now()
        WHERE id = $1
          AND customer_id = $2
          AND store_id = $3
          AND is_active = true
        RETURNING
          id, customer_id, store_id, barcode, name, category, unit, product_type,
          purchase_price, sale_price, vat_rate, stock_quantity, min_stock_level,
          is_active, created_at, updated_at
      `,
      [
        productId,
        tenant.customerId,
        storeId,
        data.barcode,
        data.name,
        data.category,
        data.unit,
        data.product_type,
        data.purchase_price,
        data.sale_price,
        data.vat_rate,
        data.stock_quantity,
        data.min_stock_level,
      ]
    );

    return result.rows[0] || null;
  }

  async softDelete(tenant, storeId, productId) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        UPDATE products
        SET is_active = false, updated_at = now()
        WHERE id = $1
          AND customer_id = $2
          AND store_id = $3
          AND is_active = true
        RETURNING id, barcode, name, is_active
      `,
      [productId, tenant.customerId, storeId]
    );

    return result.rows[0] || null;
  }

  async updateStockQuantity(client, tenant, storeId, productId, newQuantity) {
    this.setTenant(tenant).requireTenant();

    const result = await this.queryWithClient(
      client,
      `
        UPDATE products
        SET stock_quantity = $4, updated_at = now()
        WHERE id = $1
          AND customer_id = $2
          AND store_id = $3
          AND is_active = true
        RETURNING id, stock_quantity
      `,
      [productId, tenant.customerId, storeId, newQuantity]
    );

    return result.rows[0] || null;
  }
}

module.exports = {
  ProductRepository,
};
