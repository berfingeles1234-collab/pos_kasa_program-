const STORE_REQUIRED_ROLES = new Set(['cashier', 'store_manager']);

function tenantMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
  }

  const customerId = req.user.customer_id;

  if (!customerId) {
    return res.status(403).json({ error: 'customer_id bulunamadı' });
  }

  const storeId = req.user.store_id || null;
  const role = req.user.role;

  if (STORE_REQUIRED_ROLES.has(role) && !storeId) {
    return res.status(403).json({ error: 'store_id zorunlu' });
  }

  req.tenant = {
    customerId,
    storeId,
    role,
    userId: req.user.user_id,
  };

  next();
}

module.exports = {
  tenantMiddleware,
};
