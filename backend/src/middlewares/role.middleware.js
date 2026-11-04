function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Yetkiniz yok' });
    }

    next();
  };
}

module.exports = {
  requireRole,
};
