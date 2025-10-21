const { getPool } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

exports.handler = async (event) => {
    const tenantId = event.headers['x-tenant-id'];
    if (!tenantId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };

    try {
        const pool = getPool();
        // Return kennel/facility overview
        const { rows } = await pool.query(
            `SELECT "type", COUNT(*) as count, SUM("capacity") as total_capacity 
             FROM "Kennel" WHERE "tenantId" = $1 GROUP BY "type"`,
            [tenantId]
        );
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

