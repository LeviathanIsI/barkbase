const { getPool } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = event.headers['x-tenant-id'];
    if (!tenantId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET' && path === '/api/v1/services') {
            const { rows } = await pool.query(`SELECT * FROM "Service" WHERE "tenantId" = $1 ORDER BY "name"`, [tenantId]);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST' && path === '/api/v1/services') {
            const { name, category, description, priceCents, durationMinutes } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Service" ("recordId", "tenantId", "name", "category", "description", "priceCents", "durationMinutes", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
                [tenantId, name, category || 'OTHER', description, priceCents || 0, durationMinutes || 0]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'GET' && event.pathParameters?.serviceId) {
            const { rows } = await pool.query(`SELECT * FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2`, [event.pathParameters.serviceId, tenantId]);
            if (rows.length === 0) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not found' }) };
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'PUT' && event.pathParameters?.serviceId) {
            const body = JSON.parse(event.body);
            const { rows } = await pool.query(
                `UPDATE "Service" SET "name" = COALESCE($1, "name"), "priceCents" = COALESCE($2, "priceCents"), "updatedAt" = NOW()
                 WHERE "recordId" = $3 AND "tenantId" = $4 RETURNING *`,
                [body.name, body.priceCents, event.pathParameters.serviceId, tenantId]
            );
            if (rows.length === 0) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not found' }) };
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.serviceId) {
            const { rowCount } = await pool.query(`DELETE FROM "Service" WHERE "recordId" = $1 AND "tenantId" = $2`, [event.pathParameters.serviceId, tenantId]);
            if (rowCount === 0) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not found' }) };
            return { statusCode: 204, headers: HEADERS, body: '' };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

