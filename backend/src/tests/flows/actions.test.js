const mockAuditLogCreate = jest.fn();
const mockBookingFindFirst = jest.fn();

jest.mock('../../lib/mailer', () => ({
  sendMail: jest.fn(),
}));

jest.mock('../../lib/tenantPrisma', () => ({
  forTenant: () => ({
    auditLog: { create: mockAuditLogCreate },
    booking: { findFirst: mockBookingFindFirst },
  }),
}));

jest.mock('../../lib/http', () => ({
  request: jest.fn(),
}));

const { sendMail } = require('../../lib/mailer');
const http = require('../../lib/http');
const emailActions = require('../../flows/actions/email');
const tagActions = require('../../flows/actions/tags');
const financeActions = require('../../flows/actions/finance');
const httpActions = require('../../flows/actions/http');

const baseArgs = {
  tenantId: 'tenant-1',
  context: {
    owner: {
      id: 'owner-1',
      email: 'owner@example.com',
      phone: '+15551234567',
      firstName: 'Sam',
    },
  },
  log: jest.fn(),
};

describe('flow actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingFindFirst.mockResolvedValue(null);
  });

  describe('email actions', () => {
    it('renders variables in email template and sends mail', async () => {
      await emailActions.sendEmail({
        ...baseArgs,
        config: {
          emailTemplate: 'Hello {{owner.firstName}}',
          to: 'owner',
        },
      });

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owner@example.com',
          subject: 'Hello Sam',
          text: 'Hello Sam',
        }),
      );
    });

    it('returns stubbed SMS result', async () => {
      const result = await emailActions.sendSms({
        ...baseArgs,
        config: {
          smsMessage: 'Hi {{owner.firstName}}',
          to: 'owner',
        },
      });

      expect(result).toEqual({
        result: {
          to: '+15551234567',
          message: 'Hi Sam',
          sent: true,
          provider: 'stub',
        },
      });
    });
  });

  describe('tag actions', () => {
    it('records tag updates in audit log', async () => {
      await tagActions.addTag({
        ...baseArgs,
        config: { object: 'owner', add: ['VIP'] },
      });

      expect(mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'workflow.tags.updated',
            entityId: 'owner-1',
            diff: expect.objectContaining({ add: ['VIP'] }),
          }),
        }),
      );
    });
  });

  describe('finance actions', () => {
    it('applies fee audit log', async () => {
      await financeActions.addFee({
        ...baseArgs,
        context: {
          ...baseArgs.context,
          booking: { id: 'booking-1' },
        },
        config: { amount: 2000, reason: 'Late pickup' },
      });

      expect(mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'workflow.fee.add.applied',
            entityId: 'booking-1',
          }),
        }),
      );
    });

    it('creates invoice for latest booking when requested', async () => {
      mockBookingFindFirst.mockResolvedValue({ id: 'recent-booking' });

      const result = await financeActions.createInvoice({
        ...baseArgs,
        context: {
          ...baseArgs.context,
          owner: { id: 'owner-1' },
        },
        config: { reservationIdSource: 'latest' },
      });

      expect(mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'workflow.invoice.created',
            entityId: 'recent-booking',
          }),
        }),
      );
      expect(result).toEqual({
        result: expect.objectContaining({
          invoiceCreated: true,
          bookingId: 'recent-booking',
        }),
      });
    });
  });

  describe('http actions', () => {
    it('delegates to HTTP client with correlation ID and returns payload', async () => {
      http.request.mockResolvedValue({
        status: 200,
        data: { ok: true },
        attempt: 2,
      });

      const result = await httpActions.sendWebhook({
        ...baseArgs,
        config: {
          url: 'https://example.com/webhook',
          method: 'POST',
        },
        correlationId: 'corr-123',
      });

      expect(http.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://example.com/webhook',
          correlationId: 'corr-123',
        }),
      );
      expect(result).toEqual({
        result: {
          url: 'https://example.com/webhook',
          method: 'POST',
          status: 200,
          response: { ok: true },
          attempts: 2,
        },
      });
    });
  });
});
