const bcrypt = require('bcryptjs');
const { getPool, closePool } = require('./pool');

async function seed() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM customers WHERE code = 'DEMO-001' LIMIT 1"
    );

    if (existing.rows.length > 0) {
      console.log('Demo veri zaten mevcut. Seed atlandı.');
      return;
    }

    const adminPasswordHash = await bcrypt.hash('Admin1234', 10);
    const cashierPasswordHash = await bcrypt.hash('Kasiyer1234', 10);

    await client.query('BEGIN');

    const customerResult = await client.query(
      `
        INSERT INTO customers (
          code, name, email, phone, license_status, max_stores, max_users
        ) VALUES (
          'DEMO-001',
          'Demo Market',
          'demo@example.com',
          '05550000000',
          'active',
          3,
          10
        )
        RETURNING id
      `
    );

    const customerId = customerResult.rows[0].id;

    const storeResult = await client.query(
      `
        INSERT INTO stores (
          customer_id, code, name, address, phone
        ) VALUES (
          $1, 'STORE-001', 'Demo Ana Mağaza', 'İstanbul', '02120000000'
        )
        RETURNING id
      `,
      [customerId]
    );

    const storeId = storeResult.rows[0].id;

    await client.query(
      `
        INSERT INTO users (
          customer_id, store_id, username, password_hash, full_name, role, must_change_password
        ) VALUES
          ($1, NULL, 'admin', $2, 'Demo Admin', 'customer_admin', false),
          ($1, $3, 'kasiyer', $4, 'Demo Kasiyer', 'cashier', false)
      `,
      [customerId, adminPasswordHash, storeId, cashierPasswordHash]
    );

    await client.query(
      `
        INSERT INTO products (
          customer_id, store_id, barcode, name, category, unit, product_type,
          purchase_price, sale_price, vat_rate, stock_quantity
        ) VALUES
          ($1, $2, '12345', 'Süt 1L', 'Gıda', 'Adet', 'A', 12.00, 15.00, 1.00, 50),
          ($1, $2, '67890', 'Ekmek', 'Gıda', 'Adet', 'A', 5.00, 7.00, 1.00, 100),
          ($1, $2, '11111', 'Su 0.5L', 'İçecek', 'Adet', 'A', 2.00, 4.00, 1.00, 200),
          ($1, $2, '22222', 'Deterjan 1kg', 'Temizlik', 'Adet', 'A', 45.00, 59.90, 20.00, 30)
      `,
      [customerId, storeId]
    );

    await client.query(
      `
        INSERT INTO app_settings (customer_id, store_id, setting_key, setting_value)
        VALUES
          ($1, $2, 'store_profile', $3::jsonb),
          ($1, NULL, 'company_profile', $4::jsonb)
      `,
      [
        customerId,
        storeId,
        JSON.stringify({
          display_name: 'Demo Ana Mağaza',
          receipt_footer: 'Bizi tercih ettiğiniz için teşekkürler.',
        }),
        JSON.stringify({
          company_name: 'Demo Market',
        }),
      ]
    );

    await client.query('COMMIT');

    console.log('Demo seed başarıyla uygulandı.');
    console.log('Customer code: DEMO-001');
    console.log('Admin      -> username: admin    | password: Admin1234');
    console.log('Cashier    -> username: kasiyer  | password: Kasiyer1234');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

seed().catch((error) => {
  console.error('Seed hatası:', error.message);
  process.exit(1);
});
