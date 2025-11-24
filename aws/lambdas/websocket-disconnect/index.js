const { getPool } = require('/opt/nodejs');

exports.handler = async (event) => {
    const connectionId = event.requestContext?.connectionId;
    const routeKey = event.requestContext?.routeKey;

    console.log('[WebSocket][disconnect] incoming', { routeKey, connectionId });

    try {
        const pool = getPool();
        
        // Remove connection from database
        await pool.query(
            `DELETE FROM "WebSocketConnection" WHERE "connectionId" = $1`,
            [connectionId]
        );

        console.log('[WebSocket][disconnect] removed connection', { connectionId });
        return { statusCode: 200, body: 'Disconnected' };
    } catch (error) {
        console.error('[WebSocket][disconnect] error', { connectionId, error });
        return { statusCode: 500, body: 'Failed to disconnect' };
    }
};

