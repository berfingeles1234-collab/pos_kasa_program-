const stockMovementService = require('../services/stock-movement.service');

async function listStockMovements(req, res, next) {
  try {
    const movements = await stockMovementService.listStockMovements(
      req.tenant,
      req.query
    );
    res.json(movements);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStockMovements,
};
