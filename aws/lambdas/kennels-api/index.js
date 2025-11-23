// TODO (Decommission Phase):
// This Lambda is legacy. Its functionality has been superseded by operations-service (bookings/runs/check-ins).
// Do NOT add new endpoints or business logic here.
// This Lambda will be retired in a future decommission phase once all callers are migrated.

const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = await getTenantIdFromEvent(event);

    if (!tenantId) {
        return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };
    }

    try {
        // GET /api/v1/kennels/occupancy - Get kennels with real-time occupancy
        if (httpMethod === 'GET' && path.includes('/occupancy')) {
            const pool = getPool();
            const { rows } = await pool.query(
                `SELECT 
                    k.*,
                    COALESCE(COUNT(DISTINCT bs."bookingId"), 0)::int as occupied
                FROM "Kennel" k
                LEFT JOIN "BookingSegment" bs ON k."recordId" = bs."kennelId" 
                    AND bs."startDate" <= CURRENT_DATE 
                    AND bs."endDate" >= CURRENT_DATE
                    AND bs."status" NOT IN ('CANCELLED')
                WHERE k."tenantId" = $1
                GROUP BY k."recordId"
                ORDER BY k."name"`,
                [tenantId]
            );
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        
        if (httpMethod === 'GET' && (path === '/api/v1/kennels' || path.endsWith('/kennels'))) {
            const pool = getPool();
            const { rows } = await pool.query(`SELECT * FROM "Kennel" WHERE "tenantId" = $1 ORDER BY "name"`, [tenantId]);
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        if (httpMethod === 'POST' && path === '/api/v1/kennels') {
            const { name, type, capacity, amenities, notes } = JSON.parse(event.body);
            const pool = getPool();
            const { rows } = await pool.query(
                `INSERT INTO "Kennel" ("recordId", "tenantId", "name", "type", "capacity", "amenities", "notes", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
                [tenantId, name, type || 'KENNEL', capacity || 1, JSON.stringify(amenities || {}), notes]
            );
            return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'GET' && event.pathParameters?.kennelId) {
            const pool = getPool();
            const { rows } = await pool.query(`SELECT * FROM "Kennel" WHERE "recordId" = $1 AND "tenantId" = $2`, [event.pathParameters.kennelId, tenantId]);
            if (rows.length === 0) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not found' }) };
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'PUT' && event.pathParameters?.kennelId) {
            const body = JSON.parse(event.body);
            const pool = getPool();
            const { rows } = await pool.query(
                `UPDATE "Kennel" SET "name" = COALESCE($1, "name"), "type" = COALESCE($2, "type"), "capacity" = COALESCE($3, "capacity"), "updatedAt" = NOW()
                 WHERE "recordId" = $4 AND "tenantId" = $5 RETURNING *`,
                [body.name, body.type, body.capacity, event.pathParameters.kennelId, tenantId]
            );
            if (rows.length === 0) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not found' }) };
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows[0]) };
        }
        if (httpMethod === 'DELETE' && event.pathParameters?.kennelId) {
            const pool = getPool();
            const { rowCount } = await pool.query(`DELETE FROM "Kennel" WHERE "recordId" = $1 AND "tenantId" = $2`, [event.pathParameters.kennelId, tenantId]);
            if (rowCount === 0) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not found' }) };
            return { statusCode: 204, headers: HEADERS, body: '' };
        }
        return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

