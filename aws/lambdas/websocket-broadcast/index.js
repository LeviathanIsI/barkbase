const { getPool } = require('/opt/nodejs');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

/**
 * Broadcast Lambda - can be invoked by other Lambdas to send real-time updates
 * Usage: Invoke this from bookings-api, messages-api, etc. when data changes
 */
exports.handler = async (event) => {
    const { tenantId, eventType, payload, websocketEndpoint } = event;

    if (!tenantId || !eventType || !websocketEndpoint) {
        console.error('Missing required parameters:', { tenantId, eventType, websocketEndpoint });
        return { statusCode: 400, body: 'Missing parameters' };
    }


    try {
        const pool = getPool();
        
        // Get all active connections for this tenant
        const { rows } = await pool.query(
            `SELECT "connectionId" FROM "WebSocketConnection" WHERE "tenantId" = $1`,
            [tenantId]
        );

        if (rows.length === 0) {
            return { statusCode: 200, body: 'No connections to broadcast to' };
        }

        // Create API Gateway client
        const apiGw = new ApiGatewayManagementApiClient({
            endpoint: websocketEndpoint
        });

        const message = JSON.stringify({
            type: eventType,
            data: payload,
            timestamp: new Date().toISOString()
        });

        // Send to all connections
        const results = await Promise.allSettled(
            rows.map(async (conn) => {
                try {
                    await apiGw.send(new PostToConnectionCommand({
                        ConnectionId: conn.connectionId,
                        Data: message
                    }));
                    return { success: true, connectionId: conn.connectionId };
                } catch (error) {
                    // If connection is gone (410), remove it from database
                    if (error.statusCode === 410 || error.$metadata?.httpStatusCode === 410) {
                        await pool.query(
                            `DELETE FROM "WebSocketConnection" WHERE "connectionId" = $1`,
                            [conn.connectionId]
                        );
                    }
                    throw error;
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;


        return {
            statusCode: 200,
            body: JSON.stringify({ successful, failed, total: rows.length })
        };
    } catch (error) {
        console.error('Broadcast error:', error);
        return { statusCode: 500, body: 'Failed to broadcast' };
    }
};

