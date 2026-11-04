const { BaseRepository } = require('./base.repository');

class StockRepository extends BaseRepository {
  async createMovement(client, tenant, storeId, data) {
    this.setTenant(tenant).requireTenant();

    const result = await this.queryWithClient(
      client,
      `
        INSERT INTO stock_movements (
          customer_id, store_id, product_id, movement_type,
          quantity_change, quantity_after, reference_type, reference_id,
          note, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, product_id, movement_type, quantity_change, quantity_after, created_at
      `,
      [
        tenant.customerId,
        storeId,
        data.product_id,
        data.movement_type,
        data.quantity_change,
        data.quantity_after,
        data.reference_type || null,
        data.reference_id || null,
        data.note || null,
        tenant.userId || null,
      ]
    );

    return result.rows[0];
  }

  async findAllMovements(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['sm.customer_id = $1'];
    const params = [tenant.customerId];
    let paramIndex = 2;

    if (!filters.allStores && filters.storeId) {
      conditions.push(`sm.store_id = $${paramIndex}`);
      params.push(filters.storeId);
      paramIndex += 1;
    }

    if (filters.productId) {
      conditions.push(`sm.product_id = $${paramIndex}`);
      params.push(filters.productId);
      paramIndex += 1;
    }

    if (filters.movementType) {
      conditions.push(`sm.movement_type = $${paramIndex}`);
      params.push(filters.movementType);
      paramIndex += 1;
    }

    if (filters.startDate) {
      conditions.push(`sm.created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex += 1;
    }

    if (filters.endDate) {
      conditions.push(`sm.created_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex += 1;
    }

    const result = await this.query(
      `
        SELECT
          sm.id,
          sm.customer_id,
          sm.store_id,
          sm.product_id,
          p.barcode,
          p.name AS product_name,
          sm.movement_type,
          sm.quantity_change,
          sm.quantity_after,
          sm.reference_type,
          sm.reference_id,
          sm.note,
          sm.user_id,
          u.username AS user_username,
          sm.created_at
        FROM stock_movements sm
        INNER JOIN products p ON p.id = sm.product_id
        LEFT JOIN users u ON u.id = sm.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY sm.created_at DESC
        LIMIT $${paramIndex}
      `,
      [...params, filters.limit || 100]
    );

    return result.rows;
  }
}

module.exports = {
  StockRepository,
};
