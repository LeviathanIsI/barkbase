const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = await getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { rows } = await pool.query(`SELECT "settings" FROM "Tenant" WHERE "recordId" = $1`, [tenantId]);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]?.settings || {}) };
        }
        if (httpMethod === 'PUT') {
            const settings = JSON.parse(event.body);
            await pool.query(`UPDATE "Tenant" SET "settings" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`, [JSON.stringify(settings), tenantId]);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(settings) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

