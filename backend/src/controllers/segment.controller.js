const segmentService = require('../services/segment.service');
const { AppError } = require('../utils/errors');

/**
 * Create a segment
 */
const createSegment = async (req, res, next) => {
  try {
    const { name, description, conditions, isAutomatic } = req.body;

    if (!name) {
      throw new AppError('Segment name is required', 400);
    }

    const segment = await segmentService.createSegment(req.tenantId, {
      name,
      description,
      conditions,
      isAutomatic,
    });

    return res.status(201).json(segment);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update a segment
 */
const updateSegment = async (req, res, next) => {
  try {
    const { segmentId } = req.params;
    const { name, description, conditions, isActive } = req.body;

    const segment = await segmentService.updateSegment(req.tenantId, segmentId, {
      name,
      description,
      conditions,
      isActive,
    });

    return res.json(segment);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get all segments
 */
const getSegments = async (req, res, next) => {
  try {
    const { isActive } = req.query;

    const segments = await segmentService.getSegments(req.tenantId, {
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    return res.json(segments);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get segment members
 */
const getSegmentMembers = async (req, res, next) => {
  try {
    const { segmentId } = req.params;
    const { limit, offset } = req.query;

    const result = await segmentService.getSegmentMembers(req.tenantId, segmentId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Add members to segment
 */
const addSegmentMembers = async (req, res, next) => {
  try {
    const { segmentId } = req.params;
    const { ownerIds } = req.body;

    if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
      throw new AppError('ownerIds must be a non-empty array', 400);
    }

    const result = await segmentService.addSegmentMembers(req.tenantId, segmentId, ownerIds);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Remove members from segment
 */
const removeSegmentMembers = async (req, res, next) => {
  try {
    const { segmentId } = req.params;
    const { ownerIds } = req.body;

    if (!Array.isArray(ownerIds) || ownerIds.length === 0) {
      throw new AppError('ownerIds must be a non-empty array', 400);
    }

    const result = await segmentService.removeSegmentMembers(
      req.tenantId,
      segmentId,
      ownerIds
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete a segment
 */
const deleteSegment = async (req, res, next) => {
  try {
    const { segmentId } = req.params;

    await segmentService.deleteSegment(req.tenantId, segmentId);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

/**
 * Refresh automatic segments
 */
const refreshSegments = async (req, res, next) => {
  try {
    const result = await segmentService.refreshAutomaticSegments(req.tenantId);

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createSegment,
  updateSegment,
  getSegments,
  getSegmentMembers,
  addSegmentMembers,
  removeSegmentMembers,
  deleteSegment,
  refreshSegments,
};

