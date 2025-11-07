const { getPool } = require('/opt/nodejs');

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;


    try {
        const pool = getPool();
        
        // Remove connection from database
        await pool.query(
            `DELETE FROM "WebSocketConnection" WHERE "connectionId" = $1`,
            [connectionId]
        );

        return { statusCode: 200, body: 'Disconnected' };
    } catch (error) {
        console.error('Disconnect error:', error);
        return { statusCode: 500, body: 'Failed to disconnect' };
    }
};

