const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { since } = event.queryStringParameters || {};
            let query = `SELECT * FROM "Message" WHERE "tenantId" = $1`;
            const params = [tenantId];
            if (since) { query += ` AND "createdAt" > $2`; params.push(since); }
            query += ` ORDER BY "createdAt" DESC LIMIT 100`;
            const { rows } = await pool.query(query, params);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST') {
            const { content, senderId, recipientId } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Message" ("recordId", "tenantId", "content", "senderId", "recipientId", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING *`,
                [tenantId, content, senderId, recipientId]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

