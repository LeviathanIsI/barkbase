const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PATCH' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = await getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { status, date } = event.queryStringParameters || {};
            let query = `SELECT * FROM "Task" WHERE "tenantId" = $1`;
            const params = [tenantId];
            if (status) { query += ` AND "status" = $2`; params.push(status); }
            if (date) { query += ` AND DATE("dueAt") = $${params.length + 1}`; params.push(date); }
            query += ` ORDER BY "dueAt"`;
            const { rows } = await pool.query(query, params);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST') {
            const { title, description, type, petId, dueAt, assignedTo } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Task" ("recordId", "tenantId", "title", "description", "type", "petId", "dueAt", "assignedTo", "status", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'PENDING', NOW()) RETURNING *`,
                [tenantId, title, description, type || 'FEEDING', petId, dueAt, assignedTo]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'PATCH' && event.pathParameters?.taskId) {
            const { status } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `UPDATE "Task" SET "status" = $1, "completedAt" = NOW(), "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
                [status, event.pathParameters.taskId, tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

