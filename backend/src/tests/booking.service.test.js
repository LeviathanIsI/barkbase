jest.mock('../lib/tenantPrisma', () => ({
  forTenant: jest.fn(),
}));

const { forTenant } = require('../lib/tenantPrisma');

describe('booking.service tenant scoping', () => {
  it('prevents deleting bookings from another tenant', async () => {
    forTenant.mockReset();
    const deleteFn = jest.fn();

    forTenant.mockReturnValue({
      booking: {
        findFirst: jest.fn().mockResolvedValue(null),
        delete: deleteFn,
      },
    });

    const bookingService = require('../services/booking.service');

    await expect(bookingService.deleteBooking('tenant-a', 'booking-1')).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(deleteFn).not.toHaveBeenCalled();
    expect(forTenant).toHaveBeenCalledWith('tenant-a');
  });
});
