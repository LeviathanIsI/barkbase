/**
 * Roles Config Service Lambda Handler
 * 
 * Routes handled:
 * - ANY /api/v1/roles
 * - GET/POST /api/v1/roles/{proxy+}
 * - GET/POST/PATCH /api/v1/user-permissions/{proxy+}
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Roles Config Service Lambda invoked', {
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
      service: 'roles-config-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

