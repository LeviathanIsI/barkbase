const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = await getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { date } = event.queryStringParameters || {};
            const { rows } = await pool.query(
                `SELECT * FROM "Run" WHERE "tenantId" = $1 AND DATE("date") = $2 ORDER BY "name"`,
                [tenantId, date || new Date().toISOString().split('T')[0]]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST') {
            const { name, date, capacity, assignedPets } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `INSERT INTO "Run" ("recordId", "tenantId", "name", "date", "capacity", "assignedPets", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
                [tenantId, name, date, capacity || 10, JSON.stringify(assignedPets || [])]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'PUT' && event.pathParameters?.runId) {
            const { assignedPets } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `UPDATE "Run" SET "assignedPets" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
                [JSON.stringify(assignedPets), event.pathParameters.runId, tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

