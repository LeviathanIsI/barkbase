const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = await getTenantIdFromEvent(event);

    if (!tenantId) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };
    }

    try {
        if (httpMethod === 'GET' && path === '/api/v1/reports/dashboard') {
            return await getDashboardMetrics(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/reports/revenue') {
            return await getRevenueReport(event, tenantId);
        }
        if (httpMethod === 'GET' && path === '/api/v1/reports/occupancy') {
            return await getOccupancyReport(event, tenantId);
        }

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Reports error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

async function getDashboardMetrics(event, tenantId) {
    const pool = getPool();

    const metrics = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1 AND "status" = 'CONFIRMED'`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Pet" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT COUNT(*) FROM "Owner" WHERE "tenantId" = $1`, [tenantId]),
        pool.query(`SELECT SUM("amountCents") FROM "Payment" WHERE "tenantId" = $1 AND "status" = 'CAPTURED'`, [tenantId])
    ]);

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
            activeBookings: parseInt(metrics[0].rows[0].count),
            totalPets: parseInt(metrics[1].rows[0].count),
            totalOwners: parseInt(metrics[2].rows[0].count),
            totalRevenueCents: parseInt(metrics[3].rows[0].sum || 0)
        })
    };
}

async function getRevenueReport(event, tenantId) {
    const { startDate, endDate } = event.queryStringParameters || {};
    const pool = getPool();

    let query = `SELECT DATE("createdAt") as date, SUM("amountCents") as revenue 
                 FROM "Payment" 
                 WHERE "tenantId" = $1 AND "status" = 'CAPTURED'`;
    const params = [tenantId];
    let paramCount = 2;

    if (startDate) {
        query += ` AND "createdAt" >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
    }

    if (endDate) {
        query += ` AND "createdAt" <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
    }

    query += ` GROUP BY DATE("createdAt") ORDER BY date DESC`;

    const { rows } = await pool.query(query, params);

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows)
    };
}

async function getOccupancyReport(event, tenantId) {
    const { startDate, endDate } = event.queryStringParameters || {};
    const pool = getPool();

    const query = `
        SELECT DATE(bs."startDate") as date, COUNT(*) as occupied_kennels
        FROM "BookingSegment" bs
        WHERE bs."tenantId" = $1
        AND bs."startDate" >= $2
        AND bs."endDate" <= $3
        GROUP BY DATE(bs."startDate")
        ORDER BY date
    `;

    const { rows } = await pool.query(query, [tenantId, startDate || '2020-01-01', endDate || '2099-12-31']);

    return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify(rows)
    };
}

