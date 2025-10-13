const prisma = require('../config/prisma');
const handlerFlowService = require('../services/handlerFlow.service');

describe('event ingestion idempotency', () => {
  let tenant;

  beforeEach(async () => {
    tenant = await prisma.tenant.findFirst({ where: { slug: 'acme' } });
  });

  it('deduplicates events by idempotency key', async () => {
    const definition = {
      meta: { name: 'Owner Created Flow' },
      trigger: {
        criteriaGroups: [
          {
            criteria: [
              {
                type: 'event-condition',
                eventName: 'owner.created',
              },
            ],
          },
        ],
      },
      nodes: [
        { id: 'trigger-node', type: 'trigger', data: {} },
        {
          id: 'action-node',
          type: 'action',
          data: { actionType: 'email.send', stepIndex: 1 },
        },
      ],
      edges: [
        { id: 'edge-1', source: 'trigger-node', target: 'action-node' },
      ],
    };

    const flow = await prisma.handlerFlow.create({
      data: {
        tenantId: tenant.id,
        name: 'Owner Event Flow',
        status: 'on',
        definition,
      },
    });

    const first = await handlerFlowService.handleEvent({
      tenantId: tenant.id,
      eventType: 'owner.created',
      payload: { ownerId: 'owner-123' },
    });

    expect(first.deduplicated).toBe(false);
    expect(first.runs).toHaveLength(1);

    const runCountAfterFirst = await prisma.handlerRun.count({ where: { flowId: flow.id } });

    const second = await handlerFlowService.handleEvent({
      tenantId: tenant.id,
      eventType: 'owner.created',
      payload: { ownerId: 'owner-123' },
    });

    expect(second.deduplicated).toBe(true);
    expect(second.runs).toEqual(first.runs);

    const runCountAfterSecond = await prisma.handlerRun.count({ where: { flowId: flow.id } });
    expect(runCountAfterSecond).toBe(runCountAfterFirst);

    const events = await prisma.handlerEvent.findMany({ where: { tenantId: tenant.id } });
    expect(events).toHaveLength(1);
    expect(events[0].runs).toEqual(first.runs);
  });
});
