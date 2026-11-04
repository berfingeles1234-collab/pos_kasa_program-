const saleService = require('../services/sale.service');

async function createSale(req, res, next) {
  try {
    const result = await saleService.createSale(
      req.tenant,
      req.body,
      req.ip
    );
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSale,
};
