const bcrypt = require('bcryptjs');
const { BaseRepository } = require('./base.repository');

class AdminUserRepository extends BaseRepository {
  async findAll(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['u.customer_id = $1', 'u.is_active = true'];
    const params = [tenant.customerId];
    let paramIndex = 2;

    if (!filters.allStores && filters.storeId) {
      conditions.push(`u.store_id = $${paramIndex}`);
      params.push(filters.storeId);
      paramIndex += 1;
    }

    const result = await this.query(
      `
        SELECT
          u.id,
          u.customer_id,
          u.store_id,
          st.name AS store_name,
          u.username,
          u.full_name,
          u.role,
          u.must_change_password,
          u.is_active,
          u.last_login_at,
          u.created_at,
          u.updated_at
        FROM users u
        LEFT JOIN stores st ON st.id = u.store_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY u.username ASC
      `,
      params
    );

    return result.rows;
  }

  async findById(tenant, userId) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        SELECT
          u.id,
          u.customer_id,
          u.store_id,
          u.username,
          u.full_name,
          u.role,
          u.must_change_password,
          u.is_active,
          u.last_login_at,
          u.created_at,
          u.updated_at
        FROM users u
        WHERE u.id = $1 AND u.customer_id = $2
      `,
      [userId, tenant.customerId]
    );

    return result.rows[0] || null;
  }

  async findByUsername(tenant, username) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        SELECT id, username
        FROM users
        WHERE customer_id = $1 AND username = $2
      `,
      [tenant.customerId, username]
    );

    return result.rows[0] || null;
  }

  async create(tenant, data) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        INSERT INTO users (
          customer_id, store_id, username, password_hash,
          full_name, role, must_change_password, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING
          id, customer_id, store_id, username, full_name, role,
          must_change_password, is_active, created_at, updated_at
      `,
      [
        tenant.customerId,
        data.store_id || null,
        data.username,
        data.password_hash,
        data.full_name || null,
        data.role,
        data.must_change_password ?? true,
      ]
    );

    return result.rows[0];
  }

  async update(tenant, userId, data) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        UPDATE users
        SET
          store_id = COALESCE($3, store_id),
          full_name = COALESCE($4, full_name),
          role = COALESCE($5, role),
          password_hash = COALESCE($6, password_hash),
          must_change_password = COALESCE($7, must_change_password),
          updated_at = now()
        WHERE id = $1 AND customer_id = $2 AND is_active = true
        RETURNING
          id, customer_id, store_id, username, full_name, role,
          must_change_password, is_active, created_at, updated_at
      `,
      [
        userId,
        tenant.customerId,
        data.store_id,
        data.full_name,
        data.role,
        data.password_hash,
        data.must_change_password,
      ]
    );

    return result.rows[0] || null;
  }

  async softDelete(tenant, userId) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        UPDATE users
        SET is_active = false, updated_at = now()
        WHERE id = $1 AND customer_id = $2 AND is_active = true
        RETURNING id, username, is_active
      `,
      [userId, tenant.customerId]
    );

    return result.rows[0] || null;
  }

  async hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, 10);
  }
}

module.exports = {
  AdminUserRepository,
};
