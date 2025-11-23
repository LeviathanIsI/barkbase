// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by config-service (tenants/account defaults/services).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

exports.handler = async (event) => {
    const tenantId = await getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

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

