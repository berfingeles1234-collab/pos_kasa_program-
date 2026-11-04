const licenseService = require('../services/license.service');

async function activate(req, res, next) {
  try {
    const result = await licenseService.activate(req.body, req.ip);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function validate(req, res, next) {
  try {
    const deviceId = req.headers['x-device-id'] || req.query.device_id;
    const deviceFingerprint =
      req.headers['x-device-fingerprint'] || req.query.device_fingerprint;

    const result = await licenseService.validate({
      deviceId,
      deviceFingerprint,
      tenant: req.tenant || null,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  activate,
  validate,
};
