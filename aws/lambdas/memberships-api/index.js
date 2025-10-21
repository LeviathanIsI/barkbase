const { getPool } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id', 'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,DELETE' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = event.headers['x-tenant-id'];
    if (!tenantId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };

    try {
        const pool = getPool();
        if (httpMethod === 'GET') {
            const { rows } = await pool.query(
                `SELECT m.*, u."name", u."email" FROM "Membership" m LEFT JOIN "User" u ON m."userId" = u."recordId" WHERE m."tenantId" = $1`,
                [tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'PUT' && event.pathParameters?.membershipId) {
            const { role } = JSON.parse(event.body);
            const { rows } = await pool.query(
                `UPDATE "Membership" SET "role" = $1, "updatedAt" = NOW() WHERE "recordId" = $2 AND "tenantId" = $3 RETURNING *`,
                [role, event.pathParameters.membershipId, tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

