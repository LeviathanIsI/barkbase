const { getPool } = require('/opt/nodejs');

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const queryParams = event.queryStringParameters || {};
    const tenantId = queryParams.tenantId;
    const userId = queryParams.userId;


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

        return { statusCode: 200, body: 'Connected' };
    } catch (error) {
        console.error('Connect error:', error);
        return { statusCode: 500, body: 'Failed to connect' };
    }
};

