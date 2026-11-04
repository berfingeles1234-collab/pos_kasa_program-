const settingsService = require('../services/settings.service');

async function getSettings(req, res, next) {
  try {
    const result = await settingsService.getSettings(req.tenant, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const result = await settingsService.updateSettings(
      req.tenant,
      req.body,
      req.ip
    );
    res.json({
      message: 'Ayarlar güncellendi',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
