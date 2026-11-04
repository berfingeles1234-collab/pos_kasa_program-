const reportService = require('../services/report.service');

async function listSales(req, res, next) {
  try {
    const sales = await reportService.listSales(req.tenant, req.query);
    res.json(sales);
  } catch (error) {
    next(error);
  }
}

async function getSummary(req, res, next) {
  try {
    const summary = await reportService.getSummary(req.tenant, req.query);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

async function getCashTracking(req, res, next) {
  try {
    const data = await reportService.getCashTracking(req.tenant, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function getSaleDetails(req, res, next) {
  try {
    const details = await reportService.getSaleDetails(req.tenant, req.params.id);
    res.json(details);
  } catch (error) {
    next(error);
  }
}

async function getSalesAnalytics(req, res, next) {
  try {
    const data = await reportService.getSalesAnalytics(req.tenant, req.query);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSales,
  getSummary,
  getCashTracking,
  getSaleDetails,
  getSalesAnalytics,
};
