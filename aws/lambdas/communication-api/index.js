const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { rows } = await pool.query(`SELECT * FROM "Communication" WHERE "tenantId" = $1 ORDER BY "timestamp" DESC LIMIT 100`, [tenantId]);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST') {
            const { ownerId, type, direction, content, metadata } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Communication" ("recordId", "tenantId", "ownerId", "type", "direction", "content", "metadata", "timestamp", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
                [tenantId, ownerId, type || 'NOTE', direction || 'OUTBOUND', content, JSON.stringify(metadata || {})]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

