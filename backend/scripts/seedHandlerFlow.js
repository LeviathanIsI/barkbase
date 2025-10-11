#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const crypto = require('crypto');
const { getClientOrThrow } = require('../src/lib/supabaseAdmin');
const handlerFlowService = require('../src/services/handlerFlow.service');

(async () => {
  try {
    const supabase = getClientOrThrow();

    const { data: tenant } = await supabase
      .from('Tenant')
      .select('id, name')
      .limit(1)
      .single();

    if (!tenant) {
      console.error('No tenants found. Seed your tenants first.');
      process.exit(1);
    }

    const conditionId = crypto.randomUUID();
    const delayId = crypto.randomUUID();
    const emailId = crypto.randomUUID();

    const flow = await handlerFlowService.createDraftFlow({
      tenantId: tenant.id,
      name: 'Booking confirmation email',
      trigger: {
        type: 'event',
        config: { event: 'booking.created' },
      },
      steps: [
        {
          id: conditionId,
          kind: 'condition',
          name: 'Check booking total',
          config: { logic: { '>': [{ var: 'payload.booking.total' }, 0] } },
          nextId: delayId,
          altNextId: null,
        },
        {
          id: delayId,
          kind: 'delay',
          name: 'Wait 1 minute',
          config: { duration: 'PT1M' },
          nextId: emailId,
          altNextId: null,
        },
        {
          id: emailId,
          kind: 'action',
          name: 'Send confirmation email',
          config: {
            actionType: 'email.send',
            to: 'owner@example.com',
            subject: 'We received your booking',
            text: 'Automated handler flow confirmation for your booking.',
          },
          nextId: null,
          altNextId: null,
        },
      ],
      definition: {
        entryStepId: conditionId,
        version: 1,
      },
    });

    await handlerFlowService.publishFlow({ tenantId: tenant.id, flowId: flow.id });
    console.log(`Seeded handler flow for tenant ${tenant.name} (${tenant.id})`);

    const runResult = await handlerFlowService.manualRun({
      tenantId: tenant.id,
      flowId: flow.id,
      payload: {
        booking: { id: 'seed-booking', total: 120 },
        owner: { email: 'owner@example.com' },
      },
      idempotencyKey: `seed-${Date.now()}`,
    });

    console.log('Created run', runResult);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed handler flow:', error.message);
    process.exit(1);
  }
})();
