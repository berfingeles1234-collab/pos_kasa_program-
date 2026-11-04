const licenseService = require('../services/license.service');

async function listLicenses(req, res, next) {
  try {
    const licenses = await licenseService.listLicenses({
      customer_id: req.query.customer_id,
      store_id: req.query.store_id,
      is_active:
        req.query.is_active !== undefined
          ? req.query.is_active === 'true'
          : undefined,
    });

    res.json(licenses);
  } catch (error) {
    next(error);
  }
}

async function createLicense(req, res, next) {
  try {
    const license = await licenseService.createLicense(
      req.body,
      req.user.user_id,
      req.ip
    );

    res.status(201).json({
      message: 'Lisans oluşturuldu',
      license,
    });
  } catch (error) {
    next(error);
  }
}

async function updateLicense(req, res, next) {
  try {
    const license = await licenseService.updateLicense(
      req.params.id,
      req.body,
      req.user.user_id,
      req.ip
    );

    res.json({
      message: 'Lisans güncellendi',
      license,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listLicenses,
  createLicense,
  updateLicense,
};
