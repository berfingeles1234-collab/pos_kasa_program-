const { testConnection } = require('../db/pool');

async function getHealth(req, res) {
  let database = {
    status: 'disconnected',
    message: 'PostgreSQL bağlantısı kurulamadı',
  };

  try {
    await testConnection();
    database = {
      status: 'connected',
      message: 'PostgreSQL bağlantısı başarılı',
    };
  } catch (error) {
    database = {
      status: 'error',
      message: error.message,
    };
  }

  const isHealthy = database.status === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    message: 'POS API çalışıyor',
    database,
  });
}

module.exports = {
  getHealth,
};
