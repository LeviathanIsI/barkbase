const { getPool } = require('/opt/nodejs');

// NOTE: $connect expects query parameters tenantId=<UUID> and userId=<UUID>, matching the
// frontend RealtimeClient and RealtimeStack wiring. Always respond with { statusCode, body }.
exports.handler = async (event) => {
    const requestContext = event?.requestContext || {};
    const connectionId = requestContext.connectionId;
    const routeKey = requestContext.routeKey;
    const queryParams = event?.queryStringParameters || {};
    const tenantId = queryParams.tenantId;
    const userId = queryParams.userId;
    const safeParams = {
        ...queryParams,
        userId: userId ? `${String(userId).slice(0, 12)}...` : undefined,
    };

    console.log('[WebSocket][connect] requestContext', JSON.stringify(requestContext));
    console.log('[WebSocket][connect] query', JSON.stringify(safeParams));

    if (!tenantId || !userId) {
        console.error('[WebSocket][connect] Missing tenantId or userId', { tenantId, userId });
        return { statusCode: 400, body: 'Missing tenantId or userId' };
    }

    try {
        const pool = getPool();

        // Store connection in database
        await pool.query(
            `CREATE TABLE IF NOT EXISTS "WebSocketConnection" (
                "recordId" TEXT PRIMARY KEY,
                "tenantId" TEXT,
                "userId" TEXT,
                "connectionId" TEXT UNIQUE NOT NULL,
                "connectedAt" TIMESTAMP DEFAULT NOW(),
                "updatedAt" TIMESTAMP DEFAULT NOW()
            )`
        );

        await pool.query(
            `INSERT INTO "WebSocketConnection" ("recordId", "tenantId", "userId", "connectionId", "connectedAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
             ON CONFLICT ("connectionId") DO UPDATE SET "connectedAt" = NOW(), "updatedAt" = NOW()`,
            [tenantId, userId, connectionId]
        );

        console.log('[WebSocket][connect] stored connection', { connectionId, tenantId, userId: safeParams.userId });
        return { statusCode: 200, body: 'Connected' };
    } catch (error) {
        console.error('[WebSocket][connect] error', { connectionId, routeKey, error });
        return { statusCode: 500, body: 'Failed to connect' };
    }
};

