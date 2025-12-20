require('dotenv').config({ path: '.env.development' });
const { initPool, getPool } = require('./src/lib/db');

async function executeStep() {
  await initPool();
  const pool = getPool();

  const tenantId = '038db85c-4c00-4547-ba36-616db24151da';
  const executionId = '5811c965-dd87-4ed9-a29b-603d9ac35c58';
  const stepId = 'a52c49f2-5c69-47e3-aae6-ba82f6f8e631';
  const recordId = 'e0ce3132-d813-4d4c-b4dd-d1083522813a';

  // Get the step config
  const { rows: steps } = await pool.query(
    'SELECT * FROM "WorkflowStep" WHERE id = $1',
    [stepId]
  );
  const step = steps[0];
  console.log('Step:', JSON.stringify(step, null, 2));

  // Get the record data
  const { rows: pets } = await pool.query(
    'SELECT * FROM "Pet" WHERE id = $1',
    [recordId]
  );
  const record = pets[0];
  console.log('Pet record:', { id: record.id, name: record.name });

  // Interpolate the template
  const title = step.config.title.replace('{{record.name}}', record.name);
  const description = step.config.description || '';
  const priorityMap = { low: 1, medium: 2, high: 3 };
  const priority = priorityMap[step.config.priority] || 2;

  console.log('Creating task with title:', title);

  // Create the task
  const dueAt = new Date();
  dueAt.setHours(dueAt.getHours() + 24);

  try {
    const { rows: taskRows } = await pool.query(
      `INSERT INTO "Task"
         (id, tenant_id, title, description, priority, status, due_at, pet_id, task_type, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'PENDING', $5, $6, 'GENERAL', NOW(), NOW())
       RETURNING id, title`,
      [tenantId, title, description, priority, dueAt.toISOString(), recordId]
    );
    console.log('Task created:', taskRows[0]);

    // Update workflow execution status
    await pool.query(
      `UPDATE "WorkflowExecution" SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [executionId]
    );
    console.log('Workflow execution marked as completed');

    // Update workflow counts
    await pool.query(
      `UPDATE "Workflow" SET completed_count = completed_count + 1, active_count = active_count - 1 WHERE id = (SELECT workflow_id FROM "WorkflowExecution" WHERE id = $1)`,
      [executionId]
    );
    console.log('Workflow counts updated');

  } catch (error) {
    console.error('Error creating task:', error);
  }

  process.exit(0);
}

executeStep();
