const paymentService = require('../services/payment.service');

const list = async (req, res, next) => {
  try {
    const payments = await paymentService.listPayments(req.tenantId, req.query);
    return res.json(payments);
  } catch (error) {
    return next(error);
  }
};

const summary = async (req, res, next) => {
  try {
    const data = await paymentService.getSummary(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const record = async (req, res, next) => {
  try {
    const payment = await paymentService.recordPayment(req.tenantId, req.body);
    return res.status(201).json(payment);
  } catch (error) {
    return next(error);
  }
};

const capture = async (req, res, next) => {
  try {
    const payment = await paymentService.capturePayment(req.tenantId, req.params.paymentId, req.body);
    return res.json(payment);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  list,
  summary,
  record,
  capture,
};
