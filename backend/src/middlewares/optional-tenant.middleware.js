function optionalTenantMiddleware(req, res, next) {
  if (!req.user) {
    return next();
  }

  const customerId = req.user.customer_id;

  if (!customerId) {
    return res.status(403).json({ error: 'customer_id bulunamadı' });
  }

  req.tenant = {
    customerId,
    storeId: req.user.store_id || null,
    role: req.user.role,
    userId: req.user.user_id,
  };

  return next();
}

module.exports = {
  optionalTenantMiddleware,
};
