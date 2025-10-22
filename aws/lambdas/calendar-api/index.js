const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

exports.handler = async (event) => {
    const tenantId = getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const { startDate, endDate } = event.queryStringParameters || {};
        const pool = getPool();
        const { rows } = await pool.query(
            `SELECT b.*, p."name" as "petName", o."name" as "ownerName"
             FROM "Booking" b
             LEFT JOIN "Pet" p ON b."petId" = p."recordId"
             LEFT JOIN "Owner" o ON b."ownerId" = o."recordId"
             WHERE b."tenantId" = $1 AND b."startDate" >= $2 AND b."endDate" <= $3
             ORDER BY b."startDate"`,
            [tenantId, startDate || '2020-01-01', endDate || '2099-12-31']
        );
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

