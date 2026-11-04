const fs = require('fs');
const path = require('path');
const { getPool, closePool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY filename'
  );

  return new Set(result.rows.map((row) => row.filename));
}

async function runMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migration klasörü bulunamadı: ${MIGRATIONS_DIR}`);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('Uygulanacak migration dosyası bulunamadı.');
      return;
    }

    let appliedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Atlandı (zaten uygulandı): ${file}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Uygulanıyor: ${file}`);

      await client.query('BEGIN');

      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        appliedCount += 1;
        console.log(`Tamamlandı: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    if (appliedCount === 0) {
      console.log('Yeni migration uygulanmadı. Veritabanı güncel.');
    } else {
      console.log(`${appliedCount} migration başarıyla uygulandı.`);
    }
  } finally {
    client.release();
    await closePool();
  }
}

runMigrations().catch((error) => {
  console.error('Migration hatası:', error.message);
  process.exit(1);
});
