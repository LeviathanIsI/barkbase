const { prisma } = require('../lib/prisma');
const { mailer } = require('../lib/mailer');

/**
 * Generate an invoice from a completed booking
 */
async function generateInvoiceFromBooking(bookingId, tenantId) {
  const booking = await prisma.booking.findUnique({
    where: { recordId: bookingId },
    include: {
      services: { include: { service: true } },
      pet: { select: { name: true } },
      owner: { select: { recordId: true, firstName: true, lastName: true, email: true } }
    }
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.tenantId !== tenantId) {
    throw new Error('Unauthorized');
  }

  // Check if invoice already exists for this booking
  const existingInvoice = await prisma.invoice.findFirst({
    where: { bookingId, tenantId }
  });

  if (existingInvoice) {
    return existingInvoice;
  }

  // Calculate line items
  const lineItems = [];

  // Base boarding/daycare service
  const nights = Math.ceil(
    (new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)
  );
  
  if (booking.totalCents > 0) {
    lineItems.push({
      description: `Boarding - ${booking.pet.name} (${nights} night${nights > 1 ? 's' : ''})`,
      quantity: nights,
      unitPriceCents: Math.round(booking.totalCents / nights),
      totalCents: booking.totalCents
    });
  }

  // Add-on services
  if (booking.services && booking.services.length > 0) {
    booking.services.forEach(svc => {
      lineItems.push({
        description: svc.service.name,
        quantity: 1,
        unitPriceCents: svc.service.priceCents,
        totalCents: svc.service.priceCents
      });
    });
  }

  // Late fees
  if (booking.lateFeeCents && booking.lateFeeCents > 0) {
    lineItems.push({
      description: 'Late Checkout Fee',
      quantity: 1,
      unitPriceCents: booking.lateFeeCents,
      totalCents: booking.lateFeeCents
    });
  }

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const taxCents = Math.round(subtotalCents * 0.07); // 7% tax (configurable per tenant)
  const totalCents = subtotalCents + taxCents;

  // Generate invoice number
  const invoiceCount = await prisma.invoice.count({ where: { tenantId } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      ownerId: booking.ownerId,
      bookingId,
      invoiceNumber,
      lineItems: JSON.stringify(lineItems),
      subtotalCents,
      taxCents,
      totalCents,
      paidCents: booking.amountPaidCents || 0,
      status: (booking.amountPaidCents || 0) >= totalCents ? 'paid' : 'finalized',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
    },
    include: {
      owner: true,
      booking: { include: { pet: true } }
    }
  });

  return invoice;
}

/**
 * Send invoice email to owner
 */
async function sendInvoiceEmail(invoiceId, tenantId) {
  const invoice = await prisma.invoice.findUnique({
    where: { recordId: invoiceId },
    include: {
      owner: true,
      booking: { include: { pet: true } }
    }
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.tenantId !== tenantId) {
    throw new Error('Unauthorized');
  }

  const lineItems = JSON.parse(invoice.lineItems);

  await mailer.send({
    to: invoice.owner.email,
    subject: `Invoice ${invoice.invoiceNumber} from BarkBase`,
    template: 'invoice',
    data: {
      invoiceNumber: invoice.invoiceNumber,
      ownerName: `${invoice.owner.firstName} ${invoice.owner.lastName}`,
      petName: invoice.booking?.pet?.name,
      lineItems,
      subtotalCents: invoice.subtotalCents,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      paidCents: invoice.paidCents,
      dueDate: invoice.dueDate,
      status: invoice.status
    }
  });

  return invoice;
}

/**
 * Get all invoices for a tenant
 */
async function getInvoices(tenantId, filters = {}) {
  const where = { tenantId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      owner: { select: { recordId: true, firstName: true, lastName: true, email: true } },
      booking: { select: { recordId: true, checkIn: true, checkOut: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 50,
    skip: filters.offset || 0
  });

  return invoices;
}

/**
 * Mark invoice as paid
 */
async function markInvoiceAsPaid(invoiceId, tenantId, paymentCents) {
  const invoice = await prisma.invoice.findUnique({
    where: { recordId: invoiceId }
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.tenantId !== tenantId) {
    throw new Error('Unauthorized');
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { recordId: invoiceId },
    data: {
      paidCents: invoice.paidCents + paymentCents,
      status: (invoice.paidCents + paymentCents) >= invoice.totalCents ? 'paid' : invoice.status
    }
  });

  return updatedInvoice;
}

module.exports = {
  generateInvoiceFromBooking,
  sendInvoiceEmail,
  getInvoices,
  markInvoiceAsPaid
};

