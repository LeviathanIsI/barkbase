const bookingService = require('../services/booking.service');

const list = async (req, res, next) => {
  try {
    const { status, startDate, endDate } = req.query;
    const bookings = await bookingService.listBookings(req.tenantId, { status, startDate, endDate });
    return res.json(bookings);
  } catch (error) {
    return next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking(req.tenantId, req.body);
    return res.status(201).json(booking);
  } catch (error) {
    return next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.tenantId, req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    return res.json(booking);
  } catch (error) {
    return next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const booking = await bookingService.updateBooking(req.tenantId, req.params.bookingId, req.body);
    return res.json(booking);
  } catch (error) {
    return next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const booking = await bookingService.updateBookingStatus(req.tenantId, req.params.bookingId, req.body.status);
    return res.json(booking);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await bookingService.deleteBooking(req.tenantId, req.params.bookingId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const quickCheckIn = async (req, res, next) => {
  try {
    const booking = await bookingService.quickCheckIn(req.tenantId, req.body);
    return res.json(booking);
  } catch (error) {
    return next(error);
  }
};

const promoteWaitlist = async (req, res, next) => {
  try {
    const booking = await bookingService.promoteWaitlistBooking(
      req.tenantId,
      req.params.bookingId,
      req.body,
    );
    return res.json(booking);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  list,
  create,
  getById,
  update,
  updateStatus,
  remove,
  quickCheckIn,
  promoteWaitlist,
};
