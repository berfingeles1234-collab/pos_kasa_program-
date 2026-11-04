const { BaseRepository } = require('./base.repository');

class AuditRepository extends BaseRepository {
  async create(client, entry) {
    const {
      customerId,
      storeId = null,
      userId = null,
      action,
      entityType = null,
      entityId = null,
      metadata = {},
      ipAddress = null,
    } = entry;

    const result = await this.queryWithClient(
      client,
      `
        INSERT INTO audit_logs (
          customer_id, store_id, user_id, action,
          entity_type, entity_id, metadata, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        RETURNING id, action, created_at
      `,
      [
        customerId,
        storeId,
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata),
        ipAddress,
      ]
    );

    return result.rows[0];
  }

  async createDirect(entry) {
    const {
      customerId,
      storeId = null,
      userId = null,
      action,
      entityType = null,
      entityId = null,
      metadata = {},
      ipAddress = null,
    } = entry;

    const result = await this.query(
      `
        INSERT INTO audit_logs (
          customer_id, store_id, user_id, action,
          entity_type, entity_id, metadata, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        RETURNING id, action, created_at
      `,
      [
        customerId,
        storeId,
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata),
        ipAddress,
      ]
    );

    return result.rows[0];
  }
}

module.exports = {
  AuditRepository,
};
