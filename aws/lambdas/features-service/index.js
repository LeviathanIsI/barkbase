// Canonical Service:
// Domain: Tasks / Notes / Incidents / Messages / Communications / Invites
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const {
    getSecureHeaders,
    errorResponse,
    successResponse,
} = require('../shared/security-utils');

const ok = (event, statusCode, data = '', additionalHeaders = {}) => {
    if (statusCode === 204) {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode,
            headers: {
                ...getSecureHeaders(origin, stage),
                ...additionalHeaders,
            },
            body: '',
        };
    }
    return successResponse(statusCode, data, event, additionalHeaders);
};

const fail = (event, statusCode, errorCodeOrBody, message, additionalHeaders = {}) => {
    if (typeof errorCodeOrBody === 'object' && errorCodeOrBody !== null) {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode,
            headers: {
                ...getSecureHeaders(origin, stage),
                ...additionalHeaders,
            },
            body: JSON.stringify(errorCodeOrBody),
        };
    }
    const response = errorResponse(statusCode, errorCodeOrBody, message, event);
    return {
        ...response,
        headers: {
            ...response.headers,
            ...additionalHeaders,
        },
    };
};

function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        console.error('No JWT claims found in event');
        return null;
    }
    return {
        sub: claims.sub,
        username: claims.username,
        email: claims.email,
        tenantId: claims['custom:tenantId'] || claims.tenantId
    };
}

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    if (httpMethod === 'OPTIONS') {
        const origin = event?.headers?.origin || event?.headers?.Origin;
        const stage = process.env.STAGE || 'development';
        return {
            statusCode: 200,
            headers: getSecureHeaders(origin, stage),
            body: JSON.stringify({}),
        };
    }

    const userInfo = getUserInfoFromEvent(event);
    if (!userInfo) {
        return fail(event, 401, { message: 'Unauthorized' });
    }

    const tenantId = userInfo.tenantId || await getTenantIdFromEvent(event);
    if (!tenantId) {
        return fail(event, 401, { message: 'Missing tenant context' });
    }

    const pool = getPool();

    try {
        // ========== TASKS ROUTES (/api/v1/tasks) ==========
        if (path.startsWith('/api/v1/tasks')) {
            const rawPath = event.rawPath || event.path || '';

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
                return ok(event, 200, rows);
            }

            // GET /api/v1/tasks/{taskId} - Get single task
            if (httpMethod === 'GET' && event.pathParameters?.taskId) {
                const { taskId } = event.pathParameters;
                const { rows } = await pool.query(
                    `SELECT * FROM "Task" WHERE "recordId" = $1 AND "tenantId" = $2`,
                    [taskId, tenantId]
                );

                if (rows.length === 0) {
                    return fail(event, 404, { message: 'Task not found' });
                }

                return ok(event, 200, rows[0]);
            }

            // POST /api/v1/tasks - Create new task
            if (httpMethod === 'POST' && !rawPath.includes('/complete')) {
                const { type, relatedType, relatedId, assignedTo, scheduledFor, notes, priority } = JSON.parse(event.body);

                if (!type || !relatedType || !relatedId || !scheduledFor) {
                    return fail(event, 400, { message: 'Missing required fields: type, relatedType, relatedId, scheduledFor' });
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

                return ok(event, 201, rows[0]);
            }

            // POST /api/v1/tasks/{taskId}/complete - Complete a task
            if (httpMethod === 'POST' && rawPath.includes('/complete')) {
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
                    return fail(event, 404, { message: 'Task not found' });
                }

                return ok(event, 200, rows[0]);
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
                    return fail(event, 404, { message: 'Task not found' });
                }

                return ok(event, 200, rows[0]);
            }

            // DELETE /api/v1/tasks/{taskId} - Delete task
            if (httpMethod === 'DELETE' && event.pathParameters?.taskId) {
                const { taskId } = event.pathParameters;

                const { rowCount } = await pool.query(
                    `DELETE FROM "Task" WHERE "recordId" = $1 AND "tenantId" = $2`,
                    [taskId, tenantId]
                );

                if (rowCount === 0) {
                    return fail(event, 404, { message: 'Task not found' });
                }

                return ok(event, 204);
            }
        }

        // ========== NOTES ROUTES (/api/v1/notes) ==========
        if (path.startsWith('/api/v1/notes')) {
            // GET /api/v1/notes - List notes
            if (httpMethod === 'GET') {
                const { entityId } = event.queryStringParameters || {};
                let query = `SELECT * FROM "Note" WHERE "tenantId" = $1`;
                const params = [tenantId];
                if (entityId) { query += ` AND "entityId" = $2`; params.push(entityId); }
                query += ` ORDER BY "createdAt" DESC`;
                const { rows } = await pool.query(query, params);
                return ok(event, 200, rows);
            }

            // POST /api/v1/notes - Create note
            if (httpMethod === 'POST') {
                const { entityId, entityType, content, visibility } = JSON.parse(event.body);
                const { rows } = await pool.query(
                    `INSERT INTO "Note" ("recordId", "tenantId", "entityId", "entityType", "content", "visibility", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
                    [tenantId, entityId, entityType, content, visibility || 'ALL']
                );
                return ok(event, 201, rows[0]);
            }
        }

        // ========== INCIDENTS ROUTES (/api/v1/incidents) ==========
        if (path.startsWith('/api/v1/incidents')) {
            // GET /api/v1/incidents - List incident reports
            if (httpMethod === 'GET') {
                const { rows } = await pool.query(
                    `SELECT * FROM "IncidentReport" WHERE "tenantId" = $1 ORDER BY "timestamp" DESC`,
                    [tenantId]
                );
                return ok(event, 200, rows);
            }

            // POST /api/v1/incidents - Create incident report
            if (httpMethod === 'POST') {
                const { petId, description, severity, reportedBy } = JSON.parse(event.body);
                const { rows } = await pool.query(
                    `INSERT INTO "IncidentReport" ("recordId", "tenantId", "petId", "description", "severity", "reportedBy", "timestamp", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
                    [tenantId, petId, description, severity || 'MINOR', reportedBy]
                );
                return ok(event, 201, rows[0]);
            }
        }

        // ========== MESSAGES ROUTES (/api/v1/messages) ==========
        if (path.startsWith('/api/v1/messages')) {
            // GET /api/v1/messages - List messages
            if (httpMethod === 'GET') {
                const { since } = event.queryStringParameters || {};
                let query = `SELECT * FROM "Message" WHERE "tenantId" = $1`;
                const params = [tenantId];
                if (since) { query += ` AND "createdAt" > $2`; params.push(since); }
                query += ` ORDER BY "createdAt" DESC LIMIT 100`;
                const { rows } = await pool.query(query, params);
                return ok(event, 200, rows);
            }

            // POST /api/v1/messages - Create message
            if (httpMethod === 'POST') {
                const { content, senderId, recipientId } = JSON.parse(event.body);
                const { rows } = await pool.query(
                    `INSERT INTO "Message" ("recordId", "tenantId", "content", "senderId", "recipientId", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING *`,
                    [tenantId, content, senderId, recipientId]
                );
                return ok(event, 201, rows[0]);
            }
        }

        // ========== COMMUNICATIONS ROUTES (/api/v1/communications) ==========
        if (path.startsWith('/api/v1/communications')) {
            // GET /api/v1/communications - List communications
            if (httpMethod === 'GET') {
                const { rows } = await pool.query(
                    `SELECT * FROM "Communication" WHERE "tenantId" = $1 ORDER BY "timestamp" DESC LIMIT 100`,
                    [tenantId]
                );
                return ok(event, 200, rows);
            }

            // POST /api/v1/communications - Create communication
            if (httpMethod === 'POST') {
                const { ownerId, type, direction, content, metadata } = JSON.parse(event.body);
                const { rows } = await pool.query(
                    `INSERT INTO "Communication" ("recordId", "tenantId", "ownerId", "type", "direction", "content", "metadata", "timestamp", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
                    [tenantId, ownerId, type || 'NOTE', direction || 'OUTBOUND', content, JSON.stringify(metadata || {})]
                );
                return ok(event, 201, rows[0]);
            }
        }

        // ========== INVITES ROUTES (/api/v1/invites) ==========
        if (path.startsWith('/api/v1/invites')) {
            // GET /api/v1/invites - List invites
            if (httpMethod === 'GET') {
                const { rows } = await pool.query(
                    `SELECT * FROM "Invite" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC`,
                    [tenantId]
                );
                return ok(event, 200, rows);
            }

            // POST /api/v1/invites - Create invite
            if (httpMethod === 'POST') {
                const { email, role } = JSON.parse(event.body);
                const { rows } = await pool.query(
                    `INSERT INTO "Invite" ("recordId", "tenantId", "email", "role", "token", "expiresAt", "updatedAt")
                     VALUES (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), NOW() + INTERVAL '7 days', NOW()) RETURNING *`,
                    [tenantId, email, role || 'STAFF']
                );
                return ok(event, 201, rows[0]);
            }
        }

        return fail(event, 404, { message: 'Not Found' });

    } catch (error) {
        console.error('Features service error:', error);
        return fail(event, 500, { message: 'Internal Server Error', error: error.message });
    }
};
