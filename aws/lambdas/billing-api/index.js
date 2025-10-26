const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

exports.handler = async (event) => {
    const tenantId = await getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    try {
        const pool = getPool();
        // Get billing metrics (simplified)
        const { rows } = await pool.query(
            `SELECT SUM("amountCents") as total, COUNT(*) as count 
             FROM "Payment" 
             WHERE "tenantId" = $1 AND "status" = 'CAPTURED' AND "createdAt" >= NOW() - INTERVAL '30 days'`,
            [tenantId]
        );
        
        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({
                totalRevenueCents: parseInt(rows[0].total || 0),
                transactionCount: parseInt(rows[0].count || 0)
            })
        };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

