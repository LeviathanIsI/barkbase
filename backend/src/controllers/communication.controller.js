const communicationService = require('../services/communication.service');
const { AppError } = require('../utils/errors');

/**
 * Create a communication
 */
const createCommunication = async (req, res, next) => {
  try {
    const { type, direction, ownerId, subject, content, metadata, attachments } = req.body;

    if (!type || !direction || !ownerId || !content) {
      throw new AppError('Missing required fields', 400);
    }

    const communication = await communicationService.createCommunication(req.tenantId, {
      type,
      direction,
      ownerId,
      userId: req.user?.recordId,
      subject,
      content,
      metadata,
      attachments,
    });

    return res.status(201).json(communication);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get communications for a customer
 */
const getCustomerCommunications = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { limit, offset, type, direction } = req.query;

    const result = await communicationService.getCustomerCommunications(
      req.tenantId,
      ownerId,
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
        type,
        direction,
      }
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get customer timeline
 */
const getCustomerTimeline = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { limit, offset } = req.query;

    const result = await communicationService.getCustomerTimeline(req.tenantId, ownerId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get communication statistics
 */
const getCommunicationStats = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    const stats = await communicationService.getCustomerCommunicationStats(
      req.tenantId,
      ownerId
    );

    return res.json(stats);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCommunication,
  getCustomerCommunications,
  getCustomerTimeline,
  getCommunicationStats,
};

