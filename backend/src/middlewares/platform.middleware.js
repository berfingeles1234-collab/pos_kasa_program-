function platformAdminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
  }

  if (req.user.role !== 'platform_admin') {
    return res.status(403).json({ error: 'Yetkiniz yok' });
  }

  req.platformAdmin = {
    userId: req.user.user_id,
    customerId: req.user.customer_id || null,
  };

  return next();
}

module.exports = {
  platformAdminMiddleware,
};
