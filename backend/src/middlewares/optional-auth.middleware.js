const jwt = require('jsonwebtoken');
const config = require('../config');

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);

    req.user = {
      user_id: payload.user_id || payload.sub,
      customer_id: payload.customer_id,
      store_id: payload.store_id || null,
      role: payload.role,
    };
  } catch (error) {
    return res.status(403).json({ error: 'Geçersiz token' });
  }

  return next();
}

module.exports = {
  optionalAuthenticateToken,
};
