const { getPool } = require('../db/pool');
const { LicenseRepository } = require('../repositories/license.repository');
const { AuditRepository } = require('../repositories/audit.repository');
const { AppError } = require('../utils/appError');

const licenseRepository = new LicenseRepository();
const auditRepository = new AuditRepository();

function resolveLicenseStatus(license, customerLicenseStatus) {
  if (!license || !license.is_active) {
    return 'suspended';
  }

  const expiresAt = license.expires_at ? new Date(license.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return 'expired';
  }

  if (customerLicenseStatus === 'suspended' || customerLicenseStatus === 'expired') {
    return customerLicenseStatus;
  }

  return 'active';
}

function assertLicenseActivatable(license) {
  if (!license) {
    throw new AppError('Geçersiz lisans anahtarı', 400);
  }

  if (!license.is_active) {
    throw new AppError('Lisans aktif değil', 403);
  }

  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
    throw new AppError('Lisans süresi dolmuş', 403);
  }

  if (!license.store_id) {
    throw new AppError('Lisans mağaza bilgisi içermiyor', 400);
  }
}

async function activate(payload, ipAddress = null) {
  const {
    license_key: licenseKey,
    device_fingerprint: deviceFingerprint,
    device_name: deviceName,
    app_version: appVersion,
  } = payload;

  if (!licenseKey || !deviceFingerprint) {
    throw new AppError('license_key ve device_fingerprint zorunlu', 400);
  }

  const license = await licenseRepository.findLicenseByKey(licenseKey.trim());
  assertLicenseActivatable(license);

  const existingDevice = await licenseRepository.findDeviceByFingerprint(
    license.customer_id,
    deviceFingerprint
  );

  if (existingDevice && existingDevice.store_id !== license.store_id) {
    throw new AppError('Bu cihaz farklı bir mağazada kayıtlı', 403);
  }

  if (license.device_fingerprint && license.device_fingerprint !== deviceFingerprint) {
    throw new AppError('Lisans başka bir cihazda aktif', 403);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updatedLicense = await licenseRepository.activateLicense(client, license.id, {
      device_fingerprint: deviceFingerprint,
    });

    const device = await licenseRepository.upsertDevice(client, {
      customer_id: license.customer_id,
      store_id: license.store_id,
      device_name: deviceName || null,
      device_fingerprint: deviceFingerprint,
      app_version: appVersion || null,
    });

    await auditRepository.create(client, {
      customerId: license.customer_id,
      storeId: license.store_id,
      userId: null,
      action: 'license.activated',
      entityType: 'license',
      entityId: license.id,
      metadata: {
        license_key: license.license_key,
        device_id: device.id,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName || null,
      },
      ipAddress,
    });

    await client.query('COMMIT');

    return {
      device_id: device.id,
      customer_id: license.customer_id,
      store_id: license.store_id,
      license_status: resolveLicenseStatus(updatedLicense, license.customer_license_status),
      expires_at: updatedLicense.expires_at,
      message: 'Aktivasyon başarılı',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function validate({ deviceId, deviceFingerprint, tenant = null }) {
  if (deviceId && deviceFingerprint) {
    const record = await licenseRepository.validateDevice(deviceId, deviceFingerprint);

    if (!record) {
      throw new AppError('Cihaz doğrulanamadı', 403);
    }

    if (!record.customer_is_active) {
      throw new AppError('Müşteri hesabı aktif değil', 403);
    }

    if (record.license_is_active === false) {
      throw new AppError('Lisans aktif değil', 403);
    }

    if (record.license_expires_at && new Date(record.license_expires_at).getTime() < Date.now()) {
      throw new AppError('Lisans süresi dolmuş', 403);
    }

    if (
      record.customer_license_expires_at &&
      new Date(record.customer_license_expires_at).getTime() < Date.now()
    ) {
      throw new AppError('Müşteri lisans süresi dolmuş', 403);
    }

    await licenseRepository.updateDeviceLastSeen(deviceId);

    return {
      valid: true,
      device_id: record.id,
      customer_id: record.customer_id,
      store_id: record.store_id,
      license_status: resolveLicenseStatus(
        {
          is_active: record.license_is_active !== false,
          expires_at: record.license_expires_at,
        },
        record.customer_license_status
      ),
      expires_at: record.license_expires_at || record.customer_license_expires_at,
      message: 'Lisans geçerli',
    };
  }

  if (tenant && tenant.customerId) {
    const licenses = await licenseRepository.listLicenses({
      customer_id: tenant.customerId,
      is_active: true,
    });

    const activeLicense = licenses.find((item) => {
      if (item.expires_at && new Date(item.expires_at).getTime() < Date.now()) {
        return false;
      }

      if (tenant.storeId && item.store_id && item.store_id !== tenant.storeId) {
        return false;
      }

      return true;
    });

    if (!activeLicense) {
      throw new AppError('Geçerli lisans bulunamadı', 403);
    }

    return {
      valid: true,
      customer_id: tenant.customerId,
      store_id: activeLicense.store_id,
      license_status: resolveLicenseStatus(activeLicense, 'active'),
      expires_at: activeLicense.expires_at,
      message: 'Lisans geçerli',
    };
  }

  throw new AppError('device_id + device_fingerprint veya geçerli oturum gerekli', 400);
}

async function listLicenses(filters = {}) {
  return licenseRepository.listLicenses(filters);
}

async function createLicense(payload, userId = null, ipAddress = null) {
  if (!payload.customer_id) {
    throw new AppError('customer_id zorunlu', 400);
  }

  const license = await licenseRepository.createLicense(payload);

  await auditRepository.createDirect({
    customerId: license.customer_id,
    storeId: license.store_id,
    userId,
    action: 'license.created',
    entityType: 'license',
    entityId: license.id,
    metadata: {
      license_key: license.license_key,
      expires_at: license.expires_at,
      is_active: license.is_active,
    },
    ipAddress,
  });

  return license;
}

async function updateLicense(licenseId, payload, userId = null, ipAddress = null) {
  const existing = await licenseRepository.findLicenseById(licenseId);

  if (!existing) {
    throw new AppError('Lisans bulunamadı', 404);
  }

  const license = await licenseRepository.updateLicense(licenseId, payload);
  const fullLicense = await licenseRepository.findLicenseById(license.id);

  await auditRepository.createDirect({
    customerId: fullLicense.customer_id,
    storeId: fullLicense.store_id,
    userId,
    action: 'license.updated',
    entityType: 'license',
    entityId: fullLicense.id,
    metadata: {
      license_key: fullLicense.license_key,
      expires_at: fullLicense.expires_at,
      is_active: fullLicense.is_active,
      store_id: fullLicense.store_id,
    },
    ipAddress,
  });

  return fullLicense;
}

module.exports = {
  activate,
  validate,
  listLicenses,
  createLicense,
  updateLicense,
};
