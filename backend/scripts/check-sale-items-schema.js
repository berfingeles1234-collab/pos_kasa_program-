const { getPool, closePool } = require('../src/db/pool');

async function main() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      column_name,
      data_type,
      numeric_precision,
      numeric_scale,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sale_items'
    ORDER BY ordinal_position
  `);

  console.log('sale_items columns:');
  console.table(result.rows);

  const purchasePrice = result.rows.find((row) => row.column_name === 'purchase_price');
  if (!purchasePrice) {
    console.error('ERROR: purchase_price column missing');
    process.exit(1);
  }

  console.log('\npurchase_price OK:', purchasePrice);
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
