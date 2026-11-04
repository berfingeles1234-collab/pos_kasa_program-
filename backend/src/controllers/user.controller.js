const userService = require('../services/user.service');

async function listUsers(req, res, next) {
  try {
    const users = await userService.listUsers(req.tenant, req.query);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.tenant, req.body, req.ip);
    res.status(201).json({
      message: 'Kullanıcı oluşturuldu',
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(
      req.tenant,
      req.params.id,
      req.body,
      req.ip
    );
    res.json({
      message: 'Kullanıcı güncellendi',
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const result = await userService.deleteUser(
      req.tenant,
      req.params.id,
      req.ip
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
