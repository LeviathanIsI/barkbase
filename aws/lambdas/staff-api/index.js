// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by entity-service (pets/owners/staff).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = await getTenantIdFromEvent(event);

    if (!tenantId) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };
    }

    try {
        if (httpMethod === 'GET' && path === '/api/v1/staff') {
            const pool = getPool();
            const { rows } = await pool.query(
                `SELECT s.*, m."role", u."name", u."email" 
                 FROM "Staff" s
                 LEFT JOIN "Membership" m ON s."membershipId" = m."recordId"
                 LEFT JOIN "User" u ON m."userId" = u."recordId"
                 WHERE s."tenantId" = $1`,
                [tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST' && path === '/api/v1/staff') {
            const { membershipId, position, phone, emergencyContact } = JSON.parse(event.body);
            const pool = getPool();
            const { rows } = await pool.query(
                `INSERT INTO "Staff" ("recordId", "tenantId", "membershipId", "position", "phone", "emergencyContact", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
                [tenantId, membershipId, position, phone, emergencyContact]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'GET' && event.pathParameters?.staffId) {
            const pool = getPool();
            const { rows } = await pool.query(`SELECT * FROM "Staff" WHERE "recordId" = $1 AND "tenantId" = $2`, [event.pathParameters.staffId, tenantId]);
            if (rows.length === 0) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not found' }) };
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

