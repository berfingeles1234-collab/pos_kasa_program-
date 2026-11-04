const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { UserRepository } = require('../repositories/user.repository');

const userRepository = new UserRepository();

function buildTokenPayload(user) {
  return {
    sub: user.id,
    user_id: user.id,
    customer_id: user.customer_id,
    store_id: user.store_id || null,
    role: user.role,
  };
}

function signToken(user) {
  return jwt.sign(buildTokenPayload(user), config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

async function login({ username, password }) {
  if (!username || !password) {
    const error = new Error('Kullanıcı adı ve şifre gerekli');
    error.statusCode = 400;
    throw error;
  }

  const users = await userRepository.findActiveByUsername(username.trim());

  if (users.length === 0) {
    const error = new Error('Kullanıcı bulunamadı');
    error.statusCode = 401;
    throw error;
  }

  if (users.length > 1) {
    const error = new Error('Birden fazla hesap bulundu. Müşteri kodu belirtin.');
    error.statusCode = 409;
    throw error;
  }

  const user = users[0];

  if (!user.is_active || !user.customer_is_active) {
    const error = new Error('Hesap aktif değil');
    error.statusCode = 403;
    throw error;
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    const error = new Error('Yanlış şifre');
    error.statusCode = 401;
    throw error;
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      customer_id: user.customer_id,
      store_id: user.store_id,
      customer_code: user.customer_code,
      customer_name: user.customer_name,
      must_change_password: user.must_change_password,
    },
  };
}

async function changePassword(tenant, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    const error = new Error('Mevcut ve yeni şifre gerekli');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error('Yeni şifre en az 8 karakter olmalıdır');
    error.statusCode = 400;
    throw error;
  }

  const user = await userRepository.findByIdForTenant(tenant.userId, tenant);

  if (!user || !user.is_active) {
    const error = new Error('Kullanıcı bulunamadı');
    error.statusCode = 404;
    throw error;
  }

  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);

  if (!validPassword) {
    const error = new Error('Mevcut şifre yanlış');
    error.statusCode = 401;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await userRepository.updatePassword(tenant.userId, tenant, passwordHash);

  return {
    message: 'Şifreniz başarıyla değiştirildi',
    user: {
      id: updated.id,
      username: updated.username,
      must_change_password: updated.must_change_password,
    },
  };
}

module.exports = {
  login,
  changePassword,
};
