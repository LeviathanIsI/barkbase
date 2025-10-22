const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

exports.handler = async (event) => {
    const tenantId = getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        const stats = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1`, [tenantId]),
            pool.query(`SELECT COUNT(*) FROM "Owner" WHERE "tenantId" = $1`, [tenantId]),
            pool.query(`SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1`, [tenantId]),
            pool.query(`SELECT COUNT(*) FROM "Membership" WHERE "tenantId" = $1`, [tenantId])
        ]);
        
        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({
                bookings: parseInt(stats[0].rows[0].count),
                owners: parseInt(stats[1].rows[0].count),
                pets: parseInt(stats[2].rows[0].count),
                members: parseInt(stats[3].rows[0].count)
            })
        };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

