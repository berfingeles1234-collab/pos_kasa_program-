const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function buildCorsOptions() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const corsOrigin = process.env.CORS_ORIGIN;

  if (nodeEnv !== 'production') {
    return {
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error('CORS: yalnızca localhost origin izinli'));
      },
    };
  }

  if (!corsOrigin || corsOrigin === '*') {
    return {};
  }

  const allowedOrigins = corsOrigin
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS: origin izinli değil'));
    },
  };
}

module.exports = {
  port: parseInt(process.env.PORT || '4001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: buildCorsOptions(),
  jwt: {
    secret: process.env.JWT_SECRET || 'pos-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
  database: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'pos_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  },
};
