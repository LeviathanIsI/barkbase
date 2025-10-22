const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,DELETE' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { rows } = await pool.query(`SELECT * FROM "Invite" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC`, [tenantId]);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST') {
            const { email, role } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Invite" ("recordId", "tenantId", "email", "role", "token", "expiresAt", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), NOW() + INTERVAL '7 days', NOW()) RETURNING *`,
                [tenantId, email, role || 'STAFF']
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

