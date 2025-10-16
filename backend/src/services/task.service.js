const { forTenant } = require('../lib/tenantPrisma');

/**
 * Create a new task
 */
async function createTask({ tenantId, type, relatedType, relatedId, assignedTo, scheduledFor, notes, priority = 'NORMAL' }) {
  const tenantDb = forTenant(tenantId);

  const task = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.task.create({
      data: {
        tenantId,
        type,
        relatedType,
        relatedId,
        assignedTo,
        scheduledFor: new Date(scheduledFor),
        notes,
        priority
      }
    });
  });

  return task;
}

/**
 * Get tasks for today
 */
async function getTodaysTasks(tenantId, filters = {}) {
  const tenantDb = forTenant(tenantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where = {
    scheduledFor: {
      gte: today,
      lt: tomorrow
    }
  };

  if (filters.assignedTo) {
    where.assignedTo = filters.assignedTo;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.completedOnly !== undefined) {
    if (filters.completedOnly) {
      where.completedAt = { not: null };
    } else {
      where.completedAt = null;
    }
  }

  const tasks = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { scheduledFor: 'asc' }
      ]
    });
  });

  return tasks;
}

/**
 * Get overdue tasks
 */
async function getOverdueTasks(tenantId) {
  const tenantDb = forTenant(tenantId);

  const now = new Date();

  const tasks = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.task.findMany({
      where: {
        scheduledFor: { lt: now },
        completedAt: null
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledFor: 'asc' }
      ]
    });
  });

  return tasks;
}

/**
 * Complete a task
 */
async function completeTask({ tenantId, taskId, completedBy, notes }) {
  const tenantDb = forTenant(tenantId);

  const task = await tenantDb.task.update({
    where: { recordId: taskId },
    data: {
      completedAt: new Date(),
      completedBy,
      notes: notes || task.notes
    }
  });

  return task;
}

/**
 * Get tasks for a pet
 */
async function getPetTasks(tenantId, petId, includeCompleted = false) {
  const tenantDb = forTenant(tenantId);

  const where = {
    relatedType: 'pet',
    relatedId: petId
  };

  if (!includeCompleted) {
    where.completedAt = null;
  }

  const tasks = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.task.findMany({
      where,
      orderBy: { scheduledFor: 'desc' }
    });
  });

  return tasks;
}

/**
 * Get tasks for a booking
 */
async function getBookingTasks(tenantId, bookingId, includeCompleted = false) {
  const tenantDb = forTenant(tenantId);

  const where = {
    relatedType: 'booking',
    relatedId: bookingId
  };

  if (!includeCompleted) {
    where.completedAt = null;
  }

  const tasks = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.task.findMany({
      where,
      orderBy: { scheduledFor: 'asc' }
    });
  });

  return tasks;
}

/**
 * Update a task
 */
async function updateTask(tenantId, taskId, updates) {
  const tenantDb = forTenant(tenantId);

  const task = await tenantDb.task.update({
    where: { recordId: taskId },
    data: updates
  });

  return task;
}

/**
 * Delete a task
 */
async function deleteTask(tenantId, taskId) {
  const tenantDb = forTenant(tenantId);

  await tenantDb.task.delete({
    where: { recordId: taskId }
  });

  return { success: true };
}

module.exports = {
  createTask,
  getTodaysTasks,
  getOverdueTasks,
  completeTask,
  getPetTasks,
  getBookingTasks,
  updateTask,
  deleteTask
};

