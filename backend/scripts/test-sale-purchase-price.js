const { getPool, closePool } = require('../src/db/pool');

async function login() {
  const res = await fetch('http://localhost:4001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'kasiyer', password: 'Kasiyer1234' }),
  });

  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function getFirstProduct(token, storeId) {
  const url = `http://localhost:4001/api/v1/pos/products?store_id=${encodeURIComponent(storeId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Products failed: ${res.status} ${await res.text()}`);
  }

  const products = await res.json();
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('No products found for sale test');
  }

  return products[0];
}

async function createSale(token, storeId, productId) {
  const res = await fetch('http://localhost:4001/api/v1/pos/sales', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      store_id: storeId,
      items: [{ product_id: productId, quantity: 1 }],
      cash_received: 100,
      client_sale_id: crypto.randomUUID(),
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Sale failed: ${res.status} ${JSON.stringify(body)}`);
  }

  return body;
}

async function verifySaleItem(saleId) {
  const pool = getPool();
  const result = await pool.query(
    `
      SELECT id, product_id, quantity, unit_price, purchase_price, line_total
      FROM sale_items
      WHERE sale_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [saleId]
  );

  return result.rows[0] || null;
}

async function main() {
  const health = await fetch('http://localhost:4001/api/v1/health');
  if (!health.ok) {
    throw new Error('Backend not running on port 4001');
  }

  const session = await login();
  const storeId = session.user.store_id;
  const product = await getFirstProduct(session.token, storeId);

  console.log('Test product:', product.name, 'purchase_price=', product.purchase_price);

  const saleResult = await createSale(session.token, storeId, product.id);
  const saleId = saleResult.sale?.id || saleResult.sale_id;

  if (!saleId) {
    throw new Error('Sale response missing sale id: ' + JSON.stringify(saleResult));
  }

  console.log('Sale created:', saleResult.message || 'OK', 'sale_id=', saleId);

  const item = await verifySaleItem(saleId);
  if (!item) {
    throw new Error('sale_items row not found');
  }

  if (item.purchase_price === null || item.purchase_price === undefined) {
    throw new Error('purchase_price not saved on sale_items');
  }

  console.log('sale_items row OK:', item);
  await closePool();
}

main().catch(async (error) => {
  console.error('SALE TEST FAILED:', error.message);
  try {
    await closePool();
  } catch (e) {
    // ignore
  }
  process.exit(1);
});
