const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function buildPoolConfig() {
  const { database } = config;

  if (database.connectionString) {
    return {
      connectionString: database.connectionString,
      ssl: database.ssl,
      max: database.max,
      idleTimeoutMillis: database.idleTimeoutMillis,
    };
  }

  return {
    host: database.host,
    port: database.port,
    database: database.database,
    user: database.user,
    password: database.password,
    ssl: database.ssl,
    max: database.max,
    idleTimeoutMillis: database.idleTimeoutMillis,
  };
}

function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());

    pool.on('error', (err) => {
      console.error('PostgreSQL pool hatası:', err.message);
    });
  }

  return pool;
}

async function testConnection() {
  const client = await getPool().connect();

  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  testConnection,
  closePool,
};
