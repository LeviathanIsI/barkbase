/**
 * Features Service Lambda Handler
 * 
 * Routes handled:
 * - ANY /api/v1/tasks
 * - GET/PUT/DELETE /api/v1/tasks/{proxy+}
 * - ANY /api/v1/communications
 * - GET/PATCH /api/v1/communications/{proxy+}
 * - ANY /api/v1/incidents
 * - POST/DELETE /api/v1/incidents/{proxy+}
 * - ANY /api/v1/notes
 * - POST/DELETE /api/v1/notes/{proxy+}
 * - ANY /api/v1/messages
 * - GET/PUT /api/v1/messages/{proxy+}
 * - ANY /api/v1/invites
 * - POST/PATCH/GET /api/v1/invites/{proxy+}
 * - PUT/PATCH /api/v1/segments/{proxy+}
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Features Service Lambda invoked', {
    requestId: context.awsRequestId,
    path: event.path,
    method: event.httpMethod,
    stage: process.env.STAGE,
  });

  return {
    statusCode: 501,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Not implemented yet – BarkBase v2 rebuild.',
      service: 'features-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

