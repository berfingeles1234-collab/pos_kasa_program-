const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);

    req.user = {
      user_id: payload.user_id || payload.sub,
      customer_id: payload.customer_id,
      store_id: payload.store_id || null,
      role: payload.role,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Geçersiz token' });
  }
}

module.exports = {
  authenticateToken,
};
