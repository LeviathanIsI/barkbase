const { getPool } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = event.headers['x-tenant-id'];
    if (!tenantId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { entityId } = event.queryStringParameters || {};
            let query = `SELECT * FROM "Note" WHERE "tenantId" = $1`;
            const params = [tenantId];
            if (entityId) { query += ` AND "entityId" = $2`; params.push(entityId); }
            query += ` ORDER BY "createdAt" DESC`;
            const { rows } = await pool.query(query, params);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST') {
            const { entityId, entityType, content, visibility } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Note" ("recordId", "tenantId", "entityId", "entityType", "content", "visibility", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
                [tenantId, entityId, entityType, content, visibility || 'ALL']
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

