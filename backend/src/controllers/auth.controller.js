const authService = require('../services/auth.service');

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const result = await authService.login({ username, password });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Giriş işlemi başarısız',
    });
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    const result = await authService.changePassword(req.tenant, {
      currentPassword: current_password,
      newPassword: new_password,
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.message || 'Şifre değiştirme başarısız',
    });
  }
}

module.exports = {
  login,
  changePassword,
};
