const crypto = require('crypto');
const { BaseRepository } = require('./base.repository');

function mapLicense(row) {
  if (!row) return null;

  return {
    id: row.id,
    customer_id: row.customer_id,
    store_id: row.store_id,
    license_key: row.license_key,
    device_fingerprint: row.device_fingerprint,
    activated_at: row.activated_at,
    expires_at: row.expires_at,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer_code: row.customer_code || null,
    customer_name: row.customer_name || null,
    customer_license_status: row.customer_license_status || null,
    store_name: row.store_name || null,
  };
}

function mapDevice(row) {
  if (!row) return null;

  return {
    id: row.id,
    customer_id: row.customer_id,
    store_id: row.store_id,
    device_name: row.device_name,
    device_fingerprint: row.device_fingerprint,
    app_version: row.app_version,
    last_seen_at: row.last_seen_at,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

class LicenseRepository extends BaseRepository {
  async findLicenseByKey(licenseKey) {
    const result = await this.query(
      `
        SELECT
          l.*,
          c.code AS customer_code,
          c.name AS customer_name,
          c.license_status AS customer_license_status,
          s.name AS store_name
        FROM licenses l
        INNER JOIN customers c ON c.id = l.customer_id
        LEFT JOIN stores s ON s.id = l.store_id
        WHERE l.license_key = $1
        LIMIT 1
      `,
      [licenseKey]
    );

    return mapLicense(result.rows[0]);
  }

  async findLicenseById(licenseId) {
    const result = await this.query(
      `
        SELECT
          l.*,
          c.code AS customer_code,
          c.name AS customer_name,
          s.name AS store_name
        FROM licenses l
        INNER JOIN customers c ON c.id = l.customer_id
        LEFT JOIN stores s ON s.id = l.store_id
        WHERE l.id = $1
        LIMIT 1
      `,
      [licenseId]
    );

    return mapLicense(result.rows[0]);
  }

  async createLicense(data) {
    const licenseKey = data.license_key || crypto.randomBytes(16).toString('hex').toUpperCase();

    const result = await this.query(
      `
        INSERT INTO licenses (
          customer_id, store_id, license_key, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        data.customer_id,
        data.store_id || null,
        licenseKey,
        data.expires_at || null,
        data.is_active !== undefined ? data.is_active : true,
      ]
    );

    return mapLicense(result.rows[0]);
  }

  async updateLicense(licenseId, data) {
    const fields = [];
    const params = [licenseId];
    let paramIndex = 2;

    if (data.store_id !== undefined) {
      fields.push(`store_id = $${paramIndex}`);
      params.push(data.store_id);
      paramIndex += 1;
    }

    if (data.expires_at !== undefined) {
      fields.push(`expires_at = $${paramIndex}`);
      params.push(data.expires_at);
      paramIndex += 1;
    }

    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex}`);
      params.push(data.is_active);
      paramIndex += 1;
    }

    if (fields.length === 0) {
      return this.findLicenseById(licenseId);
    }

    fields.push('updated_at = now()');

    const result = await this.query(
      `
        UPDATE licenses
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING *
      `,
      params
    );

    return mapLicense(result.rows[0]);
  }

  async listLicenses(filters = {}) {
    const conditions = ['1=1'];
    const params = [];
    let paramIndex = 1;

    if (filters.customer_id) {
      conditions.push(`l.customer_id = $${paramIndex}`);
      params.push(filters.customer_id);
      paramIndex += 1;
    }

    if (filters.store_id) {
      conditions.push(`l.store_id = $${paramIndex}`);
      params.push(filters.store_id);
      paramIndex += 1;
    }

    if (filters.is_active !== undefined) {
      conditions.push(`l.is_active = $${paramIndex}`);
      params.push(filters.is_active);
      paramIndex += 1;
    }

    const result = await this.query(
      `
        SELECT
          l.*,
          c.code AS customer_code,
          c.name AS customer_name,
          s.name AS store_name
        FROM licenses l
        INNER JOIN customers c ON c.id = l.customer_id
        LEFT JOIN stores s ON s.id = l.store_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY l.created_at DESC
      `,
      params
    );

    return result.rows.map(mapLicense);
  }

  async findDeviceByFingerprint(customerId, deviceFingerprint) {
    const result = await this.query(
      `
        SELECT *
        FROM devices
        WHERE customer_id = $1
          AND device_fingerprint = $2
        LIMIT 1
      `,
      [customerId, deviceFingerprint]
    );

    return mapDevice(result.rows[0]);
  }

  async findDeviceById(deviceId) {
    const result = await this.query(
      `
        SELECT *
        FROM devices
        WHERE id = $1
        LIMIT 1
      `,
      [deviceId]
    );

    return mapDevice(result.rows[0]);
  }

  async validateDevice(deviceId, deviceFingerprint) {
    const result = await this.query(
      `
        SELECT
          d.*,
          c.license_status AS customer_license_status,
          c.license_expires_at AS customer_license_expires_at,
          c.is_active AS customer_is_active,
          l.id AS license_id,
          l.expires_at AS license_expires_at,
          l.is_active AS license_is_active
        FROM devices d
        INNER JOIN customers c ON c.id = d.customer_id
        LEFT JOIN licenses l ON l.customer_id = d.customer_id
          AND (l.store_id = d.store_id OR l.store_id IS NULL)
          AND l.is_active = true
        WHERE d.id = $1
          AND d.device_fingerprint = $2
          AND d.is_active = true
        ORDER BY l.store_id NULLS LAST, l.created_at DESC
        LIMIT 1
      `,
      [deviceId, deviceFingerprint]
    );

    return result.rows[0] || null;
  }

  async updateDeviceLastSeen(deviceId) {
    const result = await this.query(
      `
        UPDATE devices
        SET last_seen_at = now(), updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [deviceId]
    );

    return mapDevice(result.rows[0]);
  }

  async activateLicense(client, licenseId, deviceInfo) {
    const result = await this.queryWithClient(
      client,
      `
        UPDATE licenses
        SET
          device_fingerprint = $2,
          activated_at = COALESCE(activated_at, now()),
          updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [licenseId, deviceInfo.device_fingerprint]
    );

    return mapLicense(result.rows[0]);
  }

  async upsertDevice(client, data) {
    const result = await this.queryWithClient(
      client,
      `
        INSERT INTO devices (
          customer_id, store_id, device_name, device_fingerprint, app_version, last_seen_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, now(), true)
        ON CONFLICT (customer_id, device_fingerprint)
        DO UPDATE SET
          store_id = EXCLUDED.store_id,
          device_name = COALESCE(EXCLUDED.device_name, devices.device_name),
          app_version = COALESCE(EXCLUDED.app_version, devices.app_version),
          last_seen_at = now(),
          is_active = true,
          updated_at = now()
        RETURNING *
      `,
      [
        data.customer_id,
        data.store_id,
        data.device_name || null,
        data.device_fingerprint,
        data.app_version || null,
      ]
    );

    return mapDevice(result.rows[0]);
  }
}

module.exports = {
  LicenseRepository,
};
