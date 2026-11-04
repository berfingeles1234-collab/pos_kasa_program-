const { BaseRepository } = require('./base.repository');

const STORE_SETTING_KEYS = new Set(['store_profile', 'pos_rules', 'printer']);
const COMPANY_SETTING_KEYS = new Set(['company_profile']);

class SettingsRepository extends BaseRepository {
  async findAllForScope(tenant, storeId) {
    this.setTenant(tenant).requireTenant();

    const result = await this.query(
      `
        SELECT id, customer_id, store_id, setting_key, setting_value, updated_at
        FROM app_settings
        WHERE customer_id = $1
          AND (store_id = $2 OR store_id IS NULL)
        ORDER BY setting_key ASC
      `,
      [tenant.customerId, storeId]
    );

    return result.rows;
  }

  async upsertSetting(tenant, storeId, settingKey, settingValue) {
    this.setTenant(tenant).requireTenant();

    const existing = await this.query(
      `
        SELECT id
        FROM app_settings
        WHERE customer_id = $1
          AND setting_key = $2
          AND (
            ($3::uuid IS NULL AND store_id IS NULL)
            OR store_id = $3
          )
        LIMIT 1
      `,
      [tenant.customerId, settingKey, storeId]
    );

    if (existing.rows.length > 0) {
      const result = await this.query(
        `
          UPDATE app_settings
          SET setting_value = $2::jsonb, updated_at = now()
          WHERE id = $1
          RETURNING id, customer_id, store_id, setting_key, setting_value, updated_at
        `,
        [existing.rows[0].id, JSON.stringify(settingValue)]
      );

      return result.rows[0];
    }

    const result = await this.query(
      `
        INSERT INTO app_settings (customer_id, store_id, setting_key, setting_value)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING id, customer_id, store_id, setting_key, setting_value, updated_at
      `,
      [tenant.customerId, storeId, settingKey, JSON.stringify(settingValue)]
    );

    return result.rows[0];
  }

  static isStoreSetting(key) {
    return STORE_SETTING_KEYS.has(key);
  }

  static isCompanySetting(key) {
    return COMPANY_SETTING_KEYS.has(key);
  }

  static getAllowedKeys() {
    return [...STORE_SETTING_KEYS, ...COMPANY_SETTING_KEYS];
  }
}

module.exports = {
  SettingsRepository,
};
