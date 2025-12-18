/**
 * Remove from Segment Action Executor
 *
 * Removes a record from a static segment (list).
 */

/**
 * Execute the remove_from_segment action
 * @param {Object} config - Action configuration
 * @param {string} config.segmentId - The segment ID to remove from
 * @param {Object} context - Execution context
 * @returns {Promise<Object>}
 */
async function execute(config, context) {
  const { record, tenantId, prisma, workflowId, executionId, stepId } = context;
  const { segmentId } = config;

  if (!segmentId) {
    throw new Error('Segment ID is required');
  }

  // Verify segment exists
  const segment = await prisma.segment.findUnique({
    where: {
      id: segmentId,
      tenant_id: tenantId,
    },
  });

  if (!segment) {
    throw new Error(`Segment not found: ${segmentId}`);
  }

  if (segment.segment_type !== 'static') {
    throw new Error('Cannot remove from dynamic segments. Segment must be static.');
  }

  // Check if record is in segment
  const existingMembership = await prisma.segmentMember.findUnique({
    where: {
      segment_id_record_type_record_id: {
        segment_id: segmentId,
        record_type: record._type,
        record_id: record.id,
      },
    },
  });

  if (!existingMembership) {
    return {
      skipped: true,
      reason: 'Record not in segment',
      segmentId,
      segmentName: segment.name,
    };
  }

  // Remove record from segment
  await prisma.segmentMember.delete({
    where: {
      segment_id_record_type_record_id: {
        segment_id: segmentId,
        record_type: record._type,
        record_id: record.id,
      },
    },
  });

  // Update segment member count
  await prisma.segment.update({
    where: { id: segmentId },
    data: {
      member_count: { decrement: 1 },
      updated_at: new Date(),
    },
  });

  return {
    segmentId,
    segmentName: segment.name,
    recordId: record.id,
    recordType: record._type,
  };
}

/**
 * Validate the action configuration
 */
function validate(config) {
  const errors = [];

  if (!config.segmentId) {
    errors.push('Segment ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  execute,
  validate,
};
