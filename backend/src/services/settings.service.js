const { SettingsRepository } = require('../repositories/settings.repository');
const { AuditRepository } = require('../repositories/audit.repository');
const { AppError } = require('../utils/appError');
const { resolveStoreId } = require('../utils/tenantStore');

const settingsRepository = new SettingsRepository();
const auditRepository = new AuditRepository();

const DEFAULT_SETTINGS = {
  store_profile: {
    display_name: '',
    logo_url: '',
    receipt_footer: '',
  },
  company_profile: {
    company_name: '',
    tax_number: '',
    address: '',
  },
  pos_rules: {
    allow_negative_stock: false,
    default_vat: 1,
    receipt_prefix: '',
  },
  printer: {
    type: 'browser',
    width_mm: 80,
    auto_print: false,
  },
};

function mapSettingsRows(rows) {
  const settings = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    settings[row.setting_key] = row.setting_value;
  }

  return settings;
}

async function getSettings(tenant, query) {
  const storeId = resolveStoreId(tenant, query.store_id);
  const rows = await settingsRepository.findAllForScope(tenant, storeId);

  return {
    store_id: storeId,
    settings: mapSettingsRows(rows),
  };
}

async function updateSettings(tenant, body, ipAddress = null) {
  const storeId = resolveStoreId(tenant, body.store_id);
  const incoming = body.settings;

  if (!incoming || typeof incoming !== 'object') {
    throw new AppError('settings alanı gerekli', 400);
  }

  const updatedKeys = [];

  for (const [key, value] of Object.entries(incoming)) {
    if (!SettingsRepository.getAllowedKeys().includes(key)) {
      throw new AppError(`Geçersiz ayar anahtarı: ${key}`, 400);
    }

    if (SettingsRepository.isStoreSetting(key)) {
      await settingsRepository.upsertSetting(tenant, storeId, key, value);
    } else if (SettingsRepository.isCompanySetting(key)) {
      await settingsRepository.upsertSetting(tenant, null, key, value);
    }

    updatedKeys.push(key);
  }

  if (updatedKeys.length > 0) {
    await auditRepository.createDirect({
      customerId: tenant.customerId,
      storeId,
      userId: tenant.userId,
      action: 'settings.updated',
      entityType: 'app_settings',
      entityId: null,
      metadata: { updated_keys: updatedKeys },
      ipAddress,
    });
  }

  return getSettings(tenant, { store_id: storeId });
}

module.exports = {
  getSettings,
  updateSettings,
};
