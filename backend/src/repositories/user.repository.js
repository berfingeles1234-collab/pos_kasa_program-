const { BaseRepository } = require('./base.repository');

class UserRepository extends BaseRepository {
  async findActiveByUsername(username) {
    const result = await this.query(
      `
        SELECT
          u.id,
          u.customer_id,
          u.store_id,
          u.username,
          u.password_hash,
          u.full_name,
          u.role,
          u.must_change_password,
          u.is_active,
          c.code AS customer_code,
          c.name AS customer_name,
          c.is_active AS customer_is_active
        FROM users u
        INNER JOIN customers c ON c.id = u.customer_id
        WHERE u.username = $1
          AND u.is_active = true
          AND c.is_active = true
      `,
      [username]
    );

    return result.rows;
  }

  async findByIdForTenant(userId, tenant) {
    this.setTenant(tenant).requireTenant();

    const { clause, params } = this.customerWhere(2);

    const result = await this.query(
      `
        SELECT
          id,
          customer_id,
          store_id,
          username,
          password_hash,
          role,
          must_change_password,
          is_active
        FROM users
        WHERE id = $1 AND ${clause}
      `,
      [userId, ...params]
    );

    return result.rows[0] || null;
  }

  async updatePassword(userId, tenant, passwordHash) {
    this.setTenant(tenant).requireTenant();

    const { clause, params } = this.customerWhere(3);

    const result = await this.query(
      `
        UPDATE users
        SET
          password_hash = $1,
          must_change_password = false,
          updated_at = now()
        WHERE id = $2 AND ${clause}
        RETURNING id, username, must_change_password
      `,
      [passwordHash, userId, ...params]
    );

    return result.rows[0] || null;
  }
}

module.exports = {
  UserRepository,
};
