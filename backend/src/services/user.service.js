const { AdminUserRepository } = require('../repositories/admin-user.repository');
const { AuditRepository } = require('../repositories/audit.repository');
const { AppError } = require('../utils/appError');
const { resolveAdminStoreFilter } = require('../utils/tenantStore');

const adminUserRepository = new AdminUserRepository();
const auditRepository = new AuditRepository();

const MANAGER_CREATABLE_ROLES = new Set(['cashier']);
const ADMIN_CREATABLE_ROLES = new Set([
  'customer_admin',
  'store_manager',
  'cashier',
]);

function mapUser(row) {
  return {
    id: row.id,
    customer_id: row.customer_id,
    store_id: row.store_id,
    store_name: row.store_name || null,
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    must_change_password: row.must_change_password,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function assertCanManageUsers(tenant) {
  if (!['customer_admin', 'store_manager'].includes(tenant.role)) {
    throw new AppError('Yetkiniz yok', 403);
  }
}

function validateCreatePermissions(tenant, payload) {
  assertCanManageUsers(tenant);

  if (tenant.role === 'store_manager') {
    if (!MANAGER_CREATABLE_ROLES.has(payload.role)) {
      throw new AppError('Mağaza yöneticisi yalnızca kasiyer oluşturabilir', 403);
    }

    if (payload.store_id !== tenant.storeId) {
      throw new AppError('Yalnızca kendi mağazanıza kullanıcı ekleyebilirsiniz', 403);
    }
  }

  if (tenant.role === 'customer_admin') {
    if (!ADMIN_CREATABLE_ROLES.has(payload.role)) {
      throw new AppError('Geçersiz rol', 400);
    }

    if (['store_manager', 'cashier'].includes(payload.role) && !payload.store_id) {
      throw new AppError('store_id gerekli', 400);
    }
  }
}

function validateUpdatePermissions(tenant, existingUser, payload) {
  assertCanManageUsers(tenant);

  if (tenant.role === 'store_manager') {
    if (existingUser.store_id !== tenant.storeId) {
      throw new AppError('Bu kullanıcıyı yönetme yetkiniz yok', 403);
    }

    if (payload.role && !MANAGER_CREATABLE_ROLES.has(payload.role)) {
      throw new AppError('Mağaza yöneticisi yalnızca kasiyer rolü atayabilir', 403);
    }

    if (payload.store_id && payload.store_id !== tenant.storeId) {
      throw new AppError('Kullanıcıyı başka mağazaya taşıyamazsınız', 403);
    }
  }
}

async function listUsers(tenant, query) {
  assertCanManageUsers(tenant);

  const storeFilter = resolveAdminStoreFilter(tenant, query.store_id);
  const users = await adminUserRepository.findAll(tenant, {
    storeId: storeFilter.storeId,
    allStores: storeFilter.allStores,
  });

  return users.map(mapUser);
}

async function createUser(tenant, body, ipAddress = null) {
  if (!body.username || !body.password || !body.role) {
    throw new AppError('username, password ve role zorunlu', 400);
  }

  if (body.password.length < 8) {
    throw new AppError('Şifre en az 8 karakter olmalıdır', 400);
  }

  const payload = {
    username: String(body.username).trim(),
    password: body.password,
    full_name: body.full_name || null,
    role: body.role,
    store_id: body.store_id || null,
    must_change_password: body.must_change_password ?? true,
  };

  validateCreatePermissions(tenant, payload);

  const existing = await adminUserRepository.findByUsername(tenant, payload.username);
  if (existing) {
    throw new AppError('Bu kullanıcı adı zaten mevcut', 400);
  }

  const passwordHash = await adminUserRepository.hashPassword(payload.password);

  try {
    const user = await adminUserRepository.create(tenant, {
      ...payload,
      password_hash: passwordHash,
    });

    await auditRepository.createDirect({
      customerId: tenant.customerId,
      storeId: user.store_id,
      userId: tenant.userId,
      action: 'user.created',
      entityType: 'user',
      entityId: user.id,
      metadata: { username: user.username, role: user.role },
      ipAddress,
    });

    return mapUser(user);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Bu kullanıcı adı zaten mevcut', 400);
    }
    throw error;
  }
}

async function updateUser(tenant, userId, body, ipAddress = null) {
  assertCanManageUsers(tenant);

  const existingUser = await adminUserRepository.findById(tenant, userId);
  if (!existingUser || !existingUser.is_active) {
    throw new AppError('Kullanıcı bulunamadı', 404);
  }

  if (existingUser.id === tenant.userId && body.is_active === false) {
    throw new AppError('Kendi hesabınızı pasifleştiremezsiniz', 400);
  }

  validateUpdatePermissions(tenant, existingUser, body);

  let passwordHash;
  if (body.password) {
    if (body.password.length < 8) {
      throw new AppError('Şifre en az 8 karakter olmalıdır', 400);
    }
    passwordHash = await adminUserRepository.hashPassword(body.password);
  }

  const updated = await adminUserRepository.update(tenant, userId, {
    store_id: body.store_id,
    full_name: body.full_name,
    role: body.role,
    password_hash: passwordHash,
    must_change_password: body.must_change_password,
  });

  if (!updated) {
    throw new AppError('Kullanıcı bulunamadı', 404);
  }

  await auditRepository.createDirect({
    customerId: tenant.customerId,
    storeId: updated.store_id,
    userId: tenant.userId,
    action: 'user.updated',
    entityType: 'user',
    entityId: updated.id,
    metadata: {
      username: updated.username,
      role: updated.role,
      password_changed: Boolean(passwordHash),
    },
    ipAddress,
  });

  return mapUser(updated);
}

async function deleteUser(tenant, userId, ipAddress = null) {
  assertCanManageUsers(tenant);

  if (userId === tenant.userId) {
    throw new AppError('Kendi hesabınızı silemezsiniz', 400);
  }

  const existingUser = await adminUserRepository.findById(tenant, userId);
  if (!existingUser || !existingUser.is_active) {
    throw new AppError('Kullanıcı bulunamadı', 404);
  }

  if (tenant.role === 'store_manager' && existingUser.store_id !== tenant.storeId) {
    throw new AppError('Bu kullanıcıyı silme yetkiniz yok', 403);
  }

  if (tenant.role === 'store_manager' && existingUser.role !== 'cashier') {
    throw new AppError('Yalnızca kasiyer hesabını pasifleştirebilirsiniz', 403);
  }

  const deleted = await adminUserRepository.softDelete(tenant, userId);
  if (!deleted) {
    throw new AppError('Kullanıcı bulunamadı', 404);
  }

  await auditRepository.createDirect({
    customerId: tenant.customerId,
    storeId: existingUser.store_id,
    userId: tenant.userId,
    action: 'user.deactivated',
    entityType: 'user',
    entityId: deleted.id,
    metadata: { username: deleted.username },
    ipAddress,
  });

  return {
    message: 'Kullanıcı pasif hale getirildi',
    user: deleted,
  };
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
