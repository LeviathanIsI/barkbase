const { prisma } = require('../lib/prisma');

/**
 * Create a new run/group for daycare
 */
async function createRun({ tenantId, name, capacity, scheduleTime, color }) {
  const run = await prisma.run.create({
    data: {
      tenantId,
      name,
      capacity,
      scheduleTime,
      color,
      isActive: true
    }
  });

  return run;
}

/**
 * Get all runs for a tenant
 */
async function getRuns(tenantId, includeInactive = false) {
  const where = { tenantId };
  
  if (!includeInactive) {
    where.isActive = true;
  }

  const runs = await prisma.run.findMany({
    where,
    orderBy: { scheduleTime: 'asc' },
    include: {
      _count: {
        select: { assignments: true }
      }
    }
  });

  return runs;
}

/**
 * Update a run
 */
async function updateRun(runId, tenantId, updates) {
  const run = await prisma.run.findUnique({
    where: { recordId: runId }
  });

  if (!run || run.tenantId !== tenantId) {
    throw new Error('Run not found');
  }

  const updatedRun = await prisma.run.update({
    where: { recordId: runId },
    data: updates
  });

  return updatedRun;
}

/**
 * Delete/deactivate a run
 */
async function deleteRun(runId, tenantId) {
  const run = await prisma.run.findUnique({
    where: { recordId: runId }
  });

  if (!run || run.tenantId !== tenantId) {
    throw new Error('Run not found');
  }

  // Soft delete by marking as inactive
  const updatedRun = await prisma.run.update({
    where: { recordId: runId },
    data: { isActive: false }
  });

  return updatedRun;
}

/**
 * Assign pets to a run for a specific date
 */
async function assignPetsToRun({ tenantId, runId, petIds, date }) {
  const run = await prisma.run.findUnique({
    where: { recordId: runId }
  });

  if (!run || run.tenantId !== tenantId) {
    throw new Error('Run not found');
  }

  // Check capacity
  if (petIds.length > run.capacity) {
    throw new Error(`Cannot assign ${petIds.length} pets to run with capacity ${run.capacity}`);
  }

  // Delete existing assignments for this run/date
  await prisma.runAssignment.deleteMany({
    where: {
      tenantId,
      runId,
      date: new Date(date)
    }
  });

  // Create new assignments
  const assignments = await prisma.runAssignment.createMany({
    data: petIds.map(petId => ({
      tenantId,
      runId,
      petId,
      date: new Date(date)
    }))
  });

  return assignments;
}

/**
 * Get today's run assignments
 */
async function getTodaysAssignments(tenantId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const runs = await prisma.run.findMany({
    where: {
      tenantId,
      isActive: true
    },
    include: {
      assignments: {
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          pet: {
            include: {
              owners: {
                include: {
                  owner: {
                    select: {
                      recordId: true,
                      firstName: true,
                      lastName: true,
                      phone: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { scheduleTime: 'asc' }
  });

  return runs;
}

/**
 * Get assignments for a date range
 */
async function getAssignmentsForDateRange(tenantId, startDate, endDate) {
  const assignments = await prisma.runAssignment.findMany({
    where: {
      tenantId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    },
    include: {
      run: true,
      pet: {
        include: {
          owners: {
            include: {
              owner: {
                select: {
                  recordId: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { run: { scheduleTime: 'asc' } }
    ]
  });

  return assignments;
}

/**
 * Remove a pet from a run assignment
 */
async function removePetFromRun({ tenantId, runId, petId, date }) {
  await prisma.runAssignment.deleteMany({
    where: {
      tenantId,
      runId,
      petId,
      date: new Date(date)
    }
  });

  return { success: true };
}

module.exports = {
  createRun,
  getRuns,
  updateRun,
  deleteRun,
  assignPetsToRun,
  getTodaysAssignments,
  getAssignmentsForDateRange,
  removePetFromRun
};

