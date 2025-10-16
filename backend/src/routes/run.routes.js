const router = require('express').Router();
const runService = require('../services/run.service');
const { logger } = require('../lib/logger');

/**
 * Create a new run
 * POST /api/v1/runs
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { name, capacity, scheduleTime, color } = req.body;

    if (!name || !capacity || !scheduleTime) {
      return res.status(400).json({ error: 'Missing required fields: name, capacity, scheduleTime' });
    }

    const run = await runService.createRun({ tenantId, name, capacity, scheduleTime, color });

    logger.info({ runId: run.recordId, name }, 'Run created');

    res.status(201).json(run);
  } catch (err) {
    logger.error({ err }, 'Failed to create run');
    next(err);
  }
});

/**
 * Get all runs
 * GET /api/v1/runs
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const includeInactive = req.query.includeInactive === 'true';

    const runs = await runService.getRuns(tenantId, includeInactive);

    res.json(runs);
  } catch (err) {
    logger.error({ err }, 'Failed to get runs');
    next(err);
  }
});

/**
 * Get today's assignments
 * GET /api/v1/runs/today
 */
router.get('/today', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const assignments = await runService.getTodaysAssignments(tenantId, date);

    res.json(assignments);
  } catch (err) {
    logger.error({ err }, 'Failed to get today\'s assignments');
    next(err);
  }
});

/**
 * Get assignments for date range
 * GET /api/v1/runs/assignments
 */
router.get('/assignments', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required query params: startDate, endDate' });
    }

    const assignments = await runService.getAssignmentsForDateRange(tenantId, startDate, endDate);

    res.json(assignments);
  } catch (err) {
    logger.error({ err }, 'Failed to get assignments for date range');
    next(err);
  }
});

/**
 * Update a run
 * PUT /api/v1/runs/:runId
 */
router.put('/:runId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { runId } = req.params;
    const updates = req.body;

    const run = await runService.updateRun(runId, tenantId, updates);

    logger.info({ runId }, 'Run updated');

    res.json(run);
  } catch (err) {
    logger.error({ err, runId: req.params.runId }, 'Failed to update run');
    next(err);
  }
});

/**
 * Delete a run
 * DELETE /api/v1/runs/:runId
 */
router.delete('/:runId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { runId } = req.params;

    await runService.deleteRun(runId, tenantId);

    logger.info({ runId }, 'Run deleted');

    res.json({ success: true });
  } catch (err) {
    logger.error({ err, runId: req.params.runId }, 'Failed to delete run');
    next(err);
  }
});

/**
 * Assign pets to a run
 * PUT /api/v1/runs/:runId/assign
 */
router.put('/:runId/assign', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { runId } = req.params;
    const { petIds, date } = req.body;

    if (!Array.isArray(petIds)) {
      return res.status(400).json({ error: 'petIds must be an array' });
    }

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const assignments = await runService.assignPetsToRun({ tenantId, runId, petIds, date });

    logger.info({ runId, petCount: petIds.length, date }, 'Pets assigned to run');

    res.json(assignments);
  } catch (err) {
    logger.error({ err, runId: req.params.runId }, 'Failed to assign pets to run');
    next(err);
  }
});

/**
 * Remove a pet from a run
 * DELETE /api/v1/runs/:runId/pets/:petId
 */
router.delete('/:runId/pets/:petId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { runId, petId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required' });
    }

    await runService.removePetFromRun({ tenantId, runId, petId, date });

    logger.info({ runId, petId, date }, 'Pet removed from run');

    res.json({ success: true });
  } catch (err) {
    logger.error({ err, runId: req.params.runId, petId: req.params.petId }, 'Failed to remove pet from run');
    next(err);
  }
});

module.exports = router;

