const router = require('express').Router();
const invoiceService = require('../services/invoice.service');
const { logger } = require('../lib/logger');

/**
 * Generate invoice from booking
 * POST /api/invoices/generate/:bookingId
 */
router.post('/generate/:bookingId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { bookingId } = req.params;

    const invoice = await invoiceService.generateInvoiceFromBooking(bookingId, tenantId);

    logger.info({ invoiceId: invoice.recordId, bookingId }, 'Invoice generated');

    res.json(invoice);
  } catch (err) {
    logger.error({ err, bookingId: req.params.bookingId }, 'Failed to generate invoice');
    next(err);
  }
});

/**
 * Send invoice email
 * POST /api/invoices/:invoiceId/send-email
 */
router.post('/:invoiceId/send-email', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { invoiceId } = req.params;

    await invoiceService.sendInvoiceEmail(invoiceId, tenantId);

    logger.info({ invoiceId }, 'Invoice email sent');

    res.json({ success: true, message: 'Invoice email sent successfully' });
  } catch (err) {
    logger.error({ err, invoiceId: req.params.invoiceId }, 'Failed to send invoice email');
    next(err);
  }
});

/**
 * Get all invoices
 * GET /api/invoices
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const filters = {
      status: req.query.status,
      ownerId: req.query.ownerId,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const invoices = await invoiceService.getInvoices(tenantId, filters);

    res.json(invoices);
  } catch (err) {
    logger.error({ err }, 'Failed to get invoices');
    next(err);
  }
});

/**
 * Get single invoice
 * GET /api/invoices/:invoiceId
 */
router.get('/:invoiceId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { invoiceId } = req.params;

    const { prisma } = require('../lib/prisma');
    const invoice = await prisma.invoice.findUnique({
      where: { recordId: invoiceId },
      include: {
        owner: true,
        booking: { include: { pet: true } }
      }
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err) {
    logger.error({ err, invoiceId: req.params.invoiceId }, 'Failed to get invoice');
    next(err);
  }
});

/**
 * Mark invoice as paid
 * PUT /api/invoices/:invoiceId/paid
 */
router.put('/:invoiceId/paid', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { invoiceId } = req.params;
    const { paymentCents } = req.body;

    if (!paymentCents || paymentCents < 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const invoice = await invoiceService.markInvoiceAsPaid(invoiceId, tenantId, paymentCents);

    logger.info({ invoiceId, paymentCents }, 'Invoice marked as paid');

    res.json(invoice);
  } catch (err) {
    logger.error({ err, invoiceId: req.params.invoiceId }, 'Failed to mark invoice as paid');
    next(err);
  }
});

module.exports = router;

