const { getPool, getTenantIdFromEvent } = require('/opt/nodejs');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

exports.handler = async (event) => {
    const tenantId = await getTenantIdFromEvent(event);
    if (!tenantId) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ message: 'Missing tenant context' }) };

    const path = event.rawPath || event.path || '';
    const pool = getPool();

    try {
        // Handle /api/v1/schedule/capacity - get capacity data for each day in range
        if (path.includes('/capacity')) {
            const { startDate, endDate } = event.queryStringParameters || {};
            console.log('[schedule-api/capacity] Params:', { tenantId, startDate, endDate });
            
            // Generate all dates in range and count bookings staying on each day
            const { rows } = await pool.query(
                `WITH date_series AS (
                    SELECT generate_series(
                        $2::date,
                        $3::date,
                        '1 day'::interval
                    )::date AS date
                ),
                total_capacity AS (
                    SELECT COUNT(*) as count FROM "Kennel" WHERE "tenantId" = $1
                )
                SELECT 
                    ds.date,
                    COUNT(DISTINCT b."recordId") as "bookedCount",
                    tc.count as "totalCapacity",
                    ROUND(
                        COALESCE(COUNT(DISTINCT b."recordId")::numeric / NULLIF(tc.count, 0) * 100, 0),
                        2
                    ) as "utilizationPercent"
                FROM date_series ds
                CROSS JOIN total_capacity tc
                LEFT JOIN "Booking" b ON 
                    b."tenantId" = $1 
                    AND b."checkIn"::date <= ds.date 
                    AND b."checkOut"::date >= ds.date
                    AND b."status" != 'CANCELLED'
                GROUP BY ds.date, tc.count
                ORDER BY ds.date`,
                [tenantId, startDate || '2020-01-01', endDate || '2099-12-31']
            );
            
            console.log('[schedule-api/capacity] Returned rows:', rows.length, 'First row:', rows[0]);
            
            return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
        }
        
        // Handle /api/v1/schedule - get bookings for schedule view
        const { from, to, startDate, endDate } = event.queryStringParameters || {};
        const dateFrom = from || startDate || '2020-01-01';
        const dateTo = to || endDate || '2099-12-31';
        
        const { rows } = await pool.query(
            `SELECT 
                b."recordId",
                b."checkIn",
                b."checkOut",
                b."status",
                b."serviceType",
                p."name" as "petName",
                p."recordId" as "petId",
                o."firstName" || ' ' || o."lastName" as "ownerName",
                o."recordId" as "ownerId",
                json_agg(
                    json_build_object(
                        'kennelId', bs."kennelId",
                        'kennel', json_build_object('recordId', k."recordId", 'name', k."name")
                    )
                ) FILTER (WHERE bs."kennelId" IS NOT NULL) as segments
             FROM "Booking" b
             LEFT JOIN "Pet" p ON b."petId" = p."recordId"
             LEFT JOIN "Owner" o ON p."ownerId" = o."recordId"
             LEFT JOIN "BookingSegment" bs ON b."recordId" = bs."bookingId"
             LEFT JOIN "Kennel" k ON bs."kennelId" = k."recordId"
             WHERE b."tenantId" = $1 
               AND b."checkIn" <= $3 
               AND b."checkOut" >= $2
             GROUP BY b."recordId", b."checkIn", b."checkOut", b."status", b."serviceType", 
                      p."name", p."recordId", o."firstName", o."lastName", o."recordId"
             ORDER BY b."checkIn"`,
            [tenantId, dateFrom, dateTo]
        );
        
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
    } catch (error) {
        console.error('[schedule-api] Error:', error);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

