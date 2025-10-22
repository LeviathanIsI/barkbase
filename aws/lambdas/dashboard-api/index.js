const { getPool } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = event.requestContext?.authorizer?.jwt?.claims?.tenantId
        || event.requestContext?.authorizer?.jwt?.claims?.['custom:tenantId']
        || null;

    if (!tenantId) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };
    }

    try {
        if (httpMethod === 'GET' && path === '/api/v1/dashboard/overview') {
            const pool = getPool();
            const today = new Date().toISOString().split('T')[0];
            
            const metrics = await Promise.all([
                pool.query(`SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1 AND "startDate" <= $2 AND "endDate" >= $2`, [tenantId, today]),
                pool.query(`SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1 AND DATE("startDate") = $2`, [tenantId, today]),
                pool.query(`SELECT COUNT(*) FROM "Booking" WHERE "tenantId" = $1 AND DATE("endDate") = $2`, [tenantId, today]),
                pool.query(`SELECT COUNT(*) FROM "Kennel" WHERE "tenantId" = $1`, [tenantId])
            ]);

            return {
                statusCode: 200,
                headers: HEADERS,
                body: JSON.stringify({
                    currentlyStaying: parseInt(metrics[0].rows[0].count),
                    checkInsToday: parseInt(metrics[1].rows[0].count),
                    checkOutsToday: parseInt(metrics[2].rows[0].count),
                    totalKennels: parseInt(metrics[3].rows[0].count)
                })
            };
        }

        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

