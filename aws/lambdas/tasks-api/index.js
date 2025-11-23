// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by features-service (tasks/notes/messages/incidents).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type,Authorization', 
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE' 
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.rawPath || event.path || '';
    const tenantId = await getTenantIdFromEvent(event);
    
    if (!tenantId) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };
    }

    const pool = getPool();

    try {
        // GET /api/v1/tasks - List all tasks
        if (httpMethod === 'GET' && !event.pathParameters?.taskId) {
            const { type, date, status } = event.queryStringParameters || {};
            let query = `SELECT * FROM "Task" WHERE "tenantId" = $1`;
            const params = [tenantId];
            let paramCount = 2;

            if (type) { 
                query += ` AND "type" = $${paramCount}`; 
                params.push(type); 
                paramCount++; 
            }
            if (status) { 
                query += ` AND "completedAt" ${status === 'completed' ? 'IS NOT NULL' : 'IS NULL'}`; 
            }
            if (date) { 
                query += ` AND DATE("scheduledFor") = $${paramCount}`; 
                params.push(date); 
                paramCount++; 
            }
            
            query += ` ORDER BY "scheduledFor" ASC`;
            
            const { rows } = await pool.query(query, params);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }

        // GET /api/v1/tasks/{taskId} - Get single task
        if (httpMethod === 'GET' && event.pathParameters?.taskId) {
            const { taskId } = event.pathParameters;
            const { rows } = await pool.query(
                `SELECT * FROM "Task" WHERE "recordId" = $1 AND "tenantId" = $2`,
                [taskId, tenantId]
            );
            
            if (rows.length === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Task not found' }) };
            }
            
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }

        // POST /api/v1/tasks - Create new task
        if (httpMethod === 'POST' && !path.includes('/complete')) {
            const { type, relatedType, relatedId, assignedTo, scheduledFor, notes, priority } = JSON.parse(event.body);
            
            if (!type || !relatedType || !relatedId || !scheduledFor) {
                return { 
                    statusCode: 400, 
                    headers: HEADERS, 
                    body: JSON.stringify({ message: 'Missing required fields: type, relatedType, relatedId, scheduledFor' }) 
                };
            }

            const { rows } = await pool.query(
                `INSERT INTO "Task" (
                    "recordId", "tenantId", "type", "relatedType", "relatedId", 
                    "assignedTo", "scheduledFor", "notes", "priority", "createdAt", "updatedAt"
                )
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
                RETURNING *`,
                [tenantId, type, relatedType, relatedId, assignedTo, scheduledFor, notes, priority || 'NORMAL']
            );
            
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }

        // POST /api/v1/tasks/{taskId}/complete - Complete a task
        if (httpMethod === 'POST' && path.includes('/complete')) {
            const { taskId } = event.pathParameters;
            const body = event.body ? JSON.parse(event.body) : {};
            const { notes, completedBy } = body;

            const { rows } = await pool.query(
                `UPDATE "Task" 
                 SET "completedAt" = NOW(), 
                     "completedBy" = $1, 
                     "notes" = COALESCE($2, "notes"), 
                     "updatedAt" = NOW() 
                 WHERE "recordId" = $3 AND "tenantId" = $4 
                 RETURNING *`,
                [completedBy, notes, taskId, tenantId]
            );
            
            if (rows.length === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Task not found' }) };
            }
            
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }

        // PUT /api/v1/tasks/{taskId} - Update task
        if (httpMethod === 'PUT' && event.pathParameters?.taskId) {
            const { taskId } = event.pathParameters;
            const { type, relatedType, relatedId, assignedTo, scheduledFor, notes, priority } = JSON.parse(event.body);

            let updateQuery = `UPDATE "Task" SET "updatedAt" = NOW()`;
            const params = [];
            let paramCount = 1;

            if (type) { updateQuery += `, "type" = $${paramCount}`; params.push(type); paramCount++; }
            if (relatedType) { updateQuery += `, "relatedType" = $${paramCount}`; params.push(relatedType); paramCount++; }
            if (relatedId) { updateQuery += `, "relatedId" = $${paramCount}`; params.push(relatedId); paramCount++; }
            if (assignedTo !== undefined) { updateQuery += `, "assignedTo" = $${paramCount}`; params.push(assignedTo); paramCount++; }
            if (scheduledFor) { updateQuery += `, "scheduledFor" = $${paramCount}`; params.push(scheduledFor); paramCount++; }
            if (notes !== undefined) { updateQuery += `, "notes" = $${paramCount}`; params.push(notes); paramCount++; }
            if (priority) { updateQuery += `, "priority" = $${paramCount}`; params.push(priority); paramCount++; }

            updateQuery += ` WHERE "recordId" = $${paramCount} AND "tenantId" = $${paramCount + 1} RETURNING *`;
            params.push(taskId, tenantId);

            const { rows } = await pool.query(updateQuery, params);
            
            if (rows.length === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Task not found' }) };
            }
            
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }

        // DELETE /api/v1/tasks/{taskId} - Delete task
        if (httpMethod === 'DELETE' && event.pathParameters?.taskId) {
            const { taskId } = event.pathParameters;
            
            const { rowCount } = await pool.query(
                `DELETE FROM "Task" WHERE "recordId" = $1 AND "tenantId" = $2`,
                [taskId, tenantId]
            );
            
            if (rowCount === 0) {
                return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Task not found' }) };
            }
            
            return { statusCode: 204, headers: HEADERS, body: null };
        }

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
        
    } catch (error) {
        console.error('[tasks-api] Error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

