const { getPool } = require('/opt/nodejs');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

// Initialize API Gateway Management API client for sending messages
const createApiGwClient = (endpoint) => {
    return new ApiGatewayManagementApiClient({
        endpoint: endpoint
    });
};

exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const domainName = event.requestContext.domainName;
    const stage = event.requestContext.stage;
    const endpoint = `https://${domainName}/${stage}`;

    console.log('WebSocket Message received:', { connectionId, endpoint });

    try {
        const body = JSON.parse(event.body || '{}');
        const { action, data } = body;

        const pool = getPool();

        // Get sender's connection info
        const senderResult = await pool.query(
            `SELECT "tenantId", "userId" FROM "WebSocketConnection" WHERE "connectionId" = $1`,
            [connectionId]
        );

        if (senderResult.rows.length === 0) {
            return { statusCode: 400, body: 'Connection not found' };
        }

        const sender = senderResult.rows[0];

        // Handle different message types
        if (action === 'message' || action === 'chat') {
            // Save message to database
            await pool.query(
                `INSERT INTO "Message" ("recordId", "tenantId", "content", "senderId", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
                [sender.tenantId, data.content, sender.userId]
            );

            // Get all connections for this tenant
            const connectionsResult = await pool.query(
                `SELECT "connectionId" FROM "WebSocketConnection" WHERE "tenantId" = $1`,
                [sender.tenantId]
            );

            // Broadcast to all tenant connections
            const apiGw = createApiGwClient(endpoint);
            
            const broadcastData = JSON.stringify({
                type: 'message',
                data: {
                    content: data.content,
                    senderId: sender.userId,
                    timestamp: new Date().toISOString()
                }
            });

            await Promise.allSettled(
                connectionsResult.rows.map(async (conn) => {
                    try {
                        await apiGw.send(new PostToConnectionCommand({
                            ConnectionId: conn.connectionId,
                            Data: broadcastData
                        }));
                    } catch (error) {
                        // Connection is stale, remove it
                        if (error.statusCode === 410) {
                            await pool.query(
                                `DELETE FROM "WebSocketConnection" WHERE "connectionId" = $1`,
                                [conn.connectionId]
                            );
                        }
                    }
                })
            );
        }

        return { statusCode: 200, body: 'Message sent' };
    } catch (error) {
        console.error('Message error:', error);
        return { statusCode: 500, body: 'Failed to process message' };
    }
};

