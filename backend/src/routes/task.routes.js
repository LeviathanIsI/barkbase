const router = require('express').Router();
const taskService = require('../services/task.service');
const { logger } = require('../lib/logger');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');

// Ensure requests have tenant context and authenticated user
router.use(tenantContext, requireAuth());

/**
 * Create a task
 * POST /api/v1/tasks
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId, recordId: creatorId } = req.user;
    const { type, relatedType, relatedId, assignedTo, scheduledFor, notes, priority } = req.body;

    if (!type || !relatedType || !relatedId || !scheduledFor) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, relatedType, relatedId, scheduledFor' 
      });
    }

    const task = await taskService.createTask({
      tenantId,
      type,
      relatedType,
      relatedId,
      assignedTo,
      scheduledFor,
      notes,
      priority
    });

    logger.info({ taskId: task.recordId, type }, 'Task created');

    res.status(201).json(task);
  } catch (err) {
    logger.error({ err }, 'Failed to create task');
    next(err);
  }
});

/**
 * Get today's tasks
 * GET /api/v1/tasks/today
 */
router.get('/today', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const filters = {
      assignedTo: req.query.assignedTo,
      type: req.query.type,
      completedOnly: req.query.completedOnly === 'true'
    };

    const tasks = await taskService.getTodaysTasks(tenantId, filters);

    res.json(tasks);
  } catch (err) {
    logger.error({ err }, 'Failed to get today\'s tasks');
    next(err);
  }
});

/**
 * Get overdue tasks
 * GET /api/v1/tasks/overdue
 */
router.get('/overdue', async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const tasks = await taskService.getOverdueTasks(tenantId);

    res.json(tasks);
  } catch (err) {
    logger.error({ err }, 'Failed to get overdue tasks');
    next(err);
  }
});

/**
 * Get tasks for a pet
 * GET /api/v1/tasks/pet/:petId
 */
router.get('/pet/:petId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { petId } = req.params;
    const includeCompleted = req.query.includeCompleted === 'true';

    const tasks = await taskService.getPetTasks(tenantId, petId, includeCompleted);

    res.json(tasks);
  } catch (err) {
    logger.error({ err, petId: req.params.petId }, 'Failed to get pet tasks');
    next(err);
  }
});

/**
 * Get tasks for a booking
 * GET /api/v1/tasks/booking/:bookingId
 */
router.get('/booking/:bookingId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { bookingId } = req.params;
    const includeCompleted = req.query.includeCompleted === 'true';

    const tasks = await taskService.getBookingTasks(tenantId, bookingId, includeCompleted);

    res.json(tasks);
  } catch (err) {
    logger.error({ err, bookingId: req.params.bookingId }, 'Failed to get booking tasks');
    next(err);
  }
});

/**
 * Complete a task
 * PUT /api/v1/tasks/:taskId/complete
 */
router.put('/:taskId/complete', async (req, res, next) => {
  try {
    const { tenantId, recordId: userId } = req.user;
    const { taskId } = req.params;
    const { notes } = req.body;

    const task = await taskService.completeTask({
      tenantId,
      taskId,
      completedBy: userId,
      notes
    });

    logger.info({ taskId }, 'Task completed');

    res.json(task);
  } catch (err) {
    logger.error({ err, taskId: req.params.taskId }, 'Failed to complete task');
    next(err);
  }
});

/**
 * Update a task
 * PUT /api/v1/tasks/:taskId
 */
router.put('/:taskId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { taskId } = req.params;
    const updates = req.body;

    const task = await taskService.updateTask(tenantId, taskId, updates);

    logger.info({ taskId }, 'Task updated');

    res.json(task);
  } catch (err) {
    logger.error({ err, taskId: req.params.taskId }, 'Failed to update task');
    next(err);
  }
});

/**
 * Delete a task
 * DELETE /api/v1/tasks/:taskId
 */
router.delete('/:taskId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { taskId } = req.params;

    await taskService.deleteTask(tenantId, taskId);

    logger.info({ taskId }, 'Task deleted');

    res.json({ success: true });
  } catch (err) {
    logger.error({ err, taskId: req.params.taskId }, 'Failed to delete task');
    next(err);
  }
});

module.exports = router;

