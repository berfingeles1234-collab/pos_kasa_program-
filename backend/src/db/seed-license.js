const bcrypt = require('bcryptjs');
const { getPool, closePool } = require('./pool');

async function seedLicense() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const customerResult = await client.query(
      "SELECT id FROM customers WHERE code = 'DEMO-001' LIMIT 1"
    );

    if (customerResult.rows.length === 0) {
      console.log('DEMO-001 müşterisi bulunamadı. Önce npm run db:seed çalıştırın.');
      return;
    }

    const customerId = customerResult.rows[0].id;

    const storeResult = await client.query(
      "SELECT id FROM stores WHERE customer_id = $1 AND code = 'STORE-001' LIMIT 1",
      [customerId]
    );

    if (storeResult.rows.length === 0) {
      console.log('Demo mağaza bulunamadı.');
      return;
    }

    const storeId = storeResult.rows[0].id;
    const demoLicenseKey = 'DEMO-POS-LICENSE-2025';

    await client.query('BEGIN');

    const existingLicense = await client.query(
      'SELECT id, license_key FROM licenses WHERE license_key = $1 LIMIT 1',
      [demoLicenseKey]
    );

    if (existingLicense.rows.length === 0) {
      await client.query(
        `
          INSERT INTO licenses (
            customer_id, store_id, license_key, expires_at, is_active
          ) VALUES ($1, $2, $3, now() + interval '1 year', true)
        `,
        [customerId, storeId, demoLicenseKey]
      );
      console.log(`Demo lisans oluşturuldu: ${demoLicenseKey}`);
    } else {
      console.log(`Demo lisans zaten mevcut: ${demoLicenseKey}`);
    }

    const platformPasswordHash = await bcrypt.hash('Platform1234', 10);
    const existingPlatformUser = await client.query(
      `
        SELECT id FROM users
        WHERE customer_id = $1 AND username = 'platform' AND role = 'platform_admin'
        LIMIT 1
      `,
      [customerId]
    );

    if (existingPlatformUser.rows.length === 0) {
      await client.query(
        `
          INSERT INTO users (
            customer_id, store_id, username, password_hash, full_name, role, must_change_password
          ) VALUES ($1, NULL, 'platform', $2, 'Platform Admin', 'platform_admin', false)
        `,
        [customerId, platformPasswordHash]
      );
      console.log('Platform admin oluşturuldu -> username: platform | password: Platform1234');
    } else {
      console.log('Platform admin zaten mevcut -> username: platform');
    }

    await client.query('COMMIT');

    console.log('');
    console.log('Aktivasyon testi:');
    console.log(`POST /api/v1/license/activate`);
    console.log(JSON.stringify({
      license_key: demoLicenseKey,
      device_fingerprint: '564f2de2-65ab-4c50-9422-55f2c431d323',
      device_name: 'Demo Kasa PC',
      app_version: '1.0.0',
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

seedLicense().catch((error) => {
  console.error('Seed license hatası:', error.message);
  process.exit(1);
});
