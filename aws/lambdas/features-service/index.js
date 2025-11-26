// Canonical Service:
// Domain: Tasks / Notes / Incidents / Messages / Communications / Invites
// This Lambda is the authoritative backend for this domain.
// All NEW endpoints for this domain must be implemented here.
// Do NOT add new logic or endpoints to legacy Lambdas for this domain.

const { getPool, getTenantIdFromEvent, validateJWTFromEvent } = require('/opt/nodejs');
const {
    getSecureHeaders,
    errorResponse,
    successResponse,
} = require('/opt/nodejs/security-utils');

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

async function getUserInfoFromEvent(event) {
    // First try API Gateway JWT authorizer claims
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (claims && claims.sub) {
        return {
            sub: claims.sub,
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            tenantId: claims['custom:tenantId'] || claims.tenantId
        };
    }

    // Fallback to manual JWT validation
    console.log('[AUTH] No API Gateway claims, trying manual JWT validation...');
    const userInfo = await validateJWTFromEvent(event);
    if (userInfo) {
        return {
            sub: userInfo.sub || userInfo.userId,
            username: userInfo.username,
            email: userInfo.email,
            tenantId: userInfo.tenantId
        };
    }

    console.error('[AUTH] No valid authentication found');
    return null;
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

    const userInfo = await getUserInfoFromEvent(event);
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
            // Parse proxy path for owner-specific routes
            const proxyPath = event.pathParameters?.proxy || '';
            const ownerStatsMatch = proxyPath.match(/^owner\/([^\/]+)\/stats$/);
            const ownerTimelineMatch = proxyPath.match(/^owner\/([^\/]+)\/timeline$/);
            
            // GET /api/v1/communications/owner/{ownerId}/stats - Communication stats for owner
            if (httpMethod === 'GET' && ownerStatsMatch) {
                const ownerId = ownerStatsMatch[1];
                try {
                    // Try to get communication stats
                    const { rows } = await pool.query(
                        `SELECT 
                            COUNT(*) as "total",
                            COUNT(CASE WHEN "type" = 'EMAIL' THEN 1 END) as "emails",
                            COUNT(CASE WHEN "type" = 'SMS' THEN 1 END) as "sms",
                            COUNT(CASE WHEN "type" = 'PHONE' THEN 1 END) as "phone",
                            COUNT(CASE WHEN "type" = 'NOTE' THEN 1 END) as "notes",
                            COUNT(CASE WHEN "direction" = 'INBOUND' THEN 1 END) as "inbound",
                            COUNT(CASE WHEN "direction" = 'OUTBOUND' THEN 1 END) as "outbound"
                         FROM "Communication" 
                         WHERE "tenantId" = $1 AND "ownerId" = $2`,
                        [tenantId, ownerId]
                    );
                    return ok(event, 200, rows[0] || { total: 0, emails: 0, sms: 0, phone: 0, notes: 0, inbound: 0, outbound: 0 });
                } catch (e) {
                    // Communication table may not exist - return empty stats
                    console.log('[COMMUNICATIONS] Stats query failed (table may not exist):', e.message);
                    return ok(event, 200, { total: 0, emails: 0, sms: 0, phone: 0, notes: 0, inbound: 0, outbound: 0 });
                }
            }
            
            // GET /api/v1/communications/owner/{ownerId}/timeline - Communication timeline for owner
            if (httpMethod === 'GET' && ownerTimelineMatch) {
                const ownerId = ownerTimelineMatch[1];
                const { offset = '0', limit = '50' } = event.queryStringParameters || {};
                try {
                    const { rows } = await pool.query(
                        `SELECT * FROM "Communication" 
                         WHERE "tenantId" = $1 AND "ownerId" = $2 
                         ORDER BY "timestamp" DESC 
                         LIMIT $3 OFFSET $4`,
                        [tenantId, ownerId, parseInt(limit), parseInt(offset)]
                    );
                    const countResult = await pool.query(
                        `SELECT COUNT(*) FROM "Communication" WHERE "tenantId" = $1 AND "ownerId" = $2`,
                        [tenantId, ownerId]
                    );
                    const total = parseInt(countResult.rows[0]?.count || '0');
                    return ok(event, 200, { 
                        data: rows, 
                        offset: parseInt(offset), 
                        limit: parseInt(limit), 
                        total 
                    });
                } catch (e) {
                    // Communication table may not exist - return empty timeline
                    console.log('[COMMUNICATIONS] Timeline query failed (table may not exist):', e.message);
                    return ok(event, 200, { 
                        data: [], 
                        offset: parseInt(offset), 
                        limit: parseInt(limit), 
                        total: 0 
                    });
                }
            }
            
            // GET /api/v1/communications - List communications
            if (httpMethod === 'GET') {
                try {
                    const { rows } = await pool.query(
                        `SELECT * FROM "Communication" WHERE "tenantId" = $1 ORDER BY "timestamp" DESC LIMIT 100`,
                        [tenantId]
                    );
                    return ok(event, 200, rows);
                } catch (e) {
                    console.log('[COMMUNICATIONS] List query failed (table may not exist):', e.message);
                    return ok(event, 200, []);
                }
            }

            // POST /api/v1/communications - Create communication
            if (httpMethod === 'POST') {
                try {
                    const { ownerId, type, direction, content, metadata } = JSON.parse(event.body);
                    const { rows } = await pool.query(
                        `INSERT INTO "Communication" ("recordId", "tenantId", "ownerId", "type", "direction", "content", "metadata", "timestamp", "updatedAt")
                         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
                        [tenantId, ownerId, type || 'NOTE', direction || 'OUTBOUND', content, JSON.stringify(metadata || {})]
                    );
                    return ok(event, 201, rows[0]);
                } catch (e) {
                    console.error('[COMMUNICATIONS] Create failed:', e.message);
                    return fail(event, 500, { message: 'Failed to create communication. Communication table may not exist.' });
                }
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

        // ========== SEGMENTS ROUTES (/api/v1/segments) ==========
        if (path.startsWith('/api/v1/segments')) {
            const segmentId = event.pathParameters?.proxy || event.pathParameters?.segmentId;
            
            // GET /api/v1/segments - List all segments
            if (httpMethod === 'GET' && !segmentId) {
                try {
                    const { rows } = await pool.query(
                        `SELECT s.*, 
                            (SELECT COUNT(*) FROM "SegmentMember" sm WHERE sm."segmentId" = s."recordId")::int as "memberCount"
                         FROM "Segment" s 
                         WHERE s."tenantId" = $1 
                         ORDER BY s."createdAt" DESC`,
                        [tenantId]
                    );
                    // Format with _count for frontend compatibility
                    const formatted = rows.map(seg => ({
                        ...seg,
                        _count: { members: seg.memberCount || 0, campaigns: 0 }
                    }));
                    return ok(event, 200, formatted);
                } catch (e) {
                    // Table might not exist - return empty array
                    console.log('[SEGMENTS] Table may not exist, returning empty:', e.message);
                    return ok(event, 200, []);
                }
            }

            // GET /api/v1/segments/{segmentId}/members - Get segment members
            if (httpMethod === 'GET' && segmentId && path.includes('/members')) {
                const actualSegmentId = segmentId.replace('/members', '');
                try {
                    const { rows } = await pool.query(
                        `SELECT o.* FROM "Owner" o
                         INNER JOIN "SegmentMember" sm ON o."recordId" = sm."ownerId"
                         WHERE sm."segmentId" = $1 AND o."tenantId" = $2
                         ORDER BY o."name" ASC`,
                        [actualSegmentId, tenantId]
                    );
                    return ok(event, 200, { data: rows, hasMore: false });
                } catch (e) {
                    console.log('[SEGMENTS] Members query failed:', e.message);
                    return ok(event, 200, { data: [], hasMore: false });
                }
            }

            // GET /api/v1/segments/{segmentId} - Get single segment
            if (httpMethod === 'GET' && segmentId) {
                try {
                    const { rows } = await pool.query(
                        `SELECT s.*, 
                            (SELECT COUNT(*) FROM "SegmentMember" sm WHERE sm."segmentId" = s."recordId")::int as "memberCount"
                         FROM "Segment" s 
                         WHERE s."recordId" = $1 AND s."tenantId" = $2`,
                        [segmentId, tenantId]
                    );
                    if (rows.length === 0) {
                        return fail(event, 404, { message: 'Segment not found' });
                    }
                    return ok(event, 200, { ...rows[0], _count: { members: rows[0].memberCount || 0, campaigns: 0 } });
                } catch (e) {
                    return fail(event, 404, { message: 'Segment not found' });
                }
            }

            // POST /api/v1/segments - Create segment
            if (httpMethod === 'POST' && !path.includes('/members') && !path.includes('/refresh')) {
                const { name, description, isAutomatic, criteria, isActive } = JSON.parse(event.body || '{}');
                if (!name) {
                    return fail(event, 400, { message: 'Name is required' });
                }
                try {
                    const { rows } = await pool.query(
                        `INSERT INTO "Segment" ("recordId", "tenantId", "name", "description", "isAutomatic", "criteria", "isActive", "createdAt", "updatedAt")
                         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
                        [tenantId, name, description || '', isAutomatic || false, JSON.stringify(criteria || {}), isActive !== false]
                    );
                    return ok(event, 201, { ...rows[0], _count: { members: 0, campaigns: 0 } });
                } catch (e) {
                    console.error('[SEGMENTS] Create failed:', e.message);
                    return fail(event, 500, { message: 'Failed to create segment' });
                }
            }

            // POST /api/v1/segments/refresh - Refresh auto segments
            if (httpMethod === 'POST' && path.includes('/refresh')) {
                // Stub - auto-segment refresh not implemented
                return ok(event, 200, { message: 'Segments refreshed', updated: 0 });
            }

            // PUT /api/v1/segments/{segmentId} - Update segment
            if (httpMethod === 'PUT' && segmentId) {
                const { name, description, isAutomatic, criteria, isActive } = JSON.parse(event.body || '{}');
                try {
                    const { rows } = await pool.query(
                        `UPDATE "Segment" SET 
                            "name" = COALESCE($3, "name"),
                            "description" = COALESCE($4, "description"),
                            "isAutomatic" = COALESCE($5, "isAutomatic"),
                            "criteria" = COALESCE($6, "criteria"),
                            "isActive" = COALESCE($7, "isActive"),
                            "updatedAt" = NOW()
                         WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING *`,
                        [segmentId, tenantId, name, description, isAutomatic, criteria ? JSON.stringify(criteria) : null, isActive]
                    );
                    if (rows.length === 0) {
                        return fail(event, 404, { message: 'Segment not found' });
                    }
                    return ok(event, 200, rows[0]);
                } catch (e) {
                    return fail(event, 500, { message: 'Failed to update segment' });
                }
            }

            // DELETE /api/v1/segments/{segmentId} - Delete segment
            if (httpMethod === 'DELETE' && segmentId && !path.includes('/members')) {
                try {
                    await pool.query(`DELETE FROM "SegmentMember" WHERE "segmentId" = $1`, [segmentId]);
                    const result = await pool.query(
                        `DELETE FROM "Segment" WHERE "recordId" = $1 AND "tenantId" = $2`,
                        [segmentId, tenantId]
                    );
                    if (result.rowCount === 0) {
                        return fail(event, 404, { message: 'Segment not found' });
                    }
                    return ok(event, 204);
                } catch (e) {
                    return fail(event, 500, { message: 'Failed to delete segment' });
                }
            }

            // POST /api/v1/segments/{segmentId}/members - Add members to segment
            if (httpMethod === 'POST' && segmentId && path.includes('/members')) {
                const actualSegmentId = segmentId.replace('/members', '');
                const { ownerIds } = JSON.parse(event.body || '{}');
                if (!ownerIds?.length) {
                    return fail(event, 400, { message: 'ownerIds is required' });
                }
                try {
                    for (const ownerId of ownerIds) {
                        await pool.query(
                            `INSERT INTO "SegmentMember" ("recordId", "segmentId", "ownerId", "createdAt")
                             VALUES (gen_random_uuid(), $1, $2, NOW()) ON CONFLICT DO NOTHING`,
                            [actualSegmentId, ownerId]
                        );
                    }
                    return ok(event, 200, { added: ownerIds.length });
                } catch (e) {
                    return fail(event, 500, { message: 'Failed to add members' });
                }
            }

            // DELETE /api/v1/segments/{segmentId}/members - Remove members from segment
            if (httpMethod === 'DELETE' && segmentId && path.includes('/members')) {
                const actualSegmentId = segmentId.replace('/members', '');
                const { ownerIds } = JSON.parse(event.body || '{}');
                if (!ownerIds?.length) {
                    return fail(event, 400, { message: 'ownerIds is required' });
                }
                try {
                    await pool.query(
                        `DELETE FROM "SegmentMember" WHERE "segmentId" = $1 AND "ownerId" = ANY($2)`,
                        [actualSegmentId, ownerIds]
                    );
                    return ok(event, 200, { removed: ownerIds.length });
                } catch (e) {
                    return fail(event, 500, { message: 'Failed to remove members' });
                }
            }
        }

        return fail(event, 404, { message: 'Not Found' });

    } catch (error) {
        console.error('Features service error:', error);
        return fail(event, 500, { message: 'Internal Server Error', error: error.message });
    }
};
