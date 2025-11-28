/**
 * Config Service Lambda Handler
 * 
 * Routes handled:
 * - ANY /api/v1/services
 * - DELETE /api/v1/services/{proxy+}
 * - POST/GET/PATCH /api/v1/facility/{proxy+}
 * - POST/PUT /api/v1/packages/{proxy+}
 * - PUT/DELETE /api/v1/account-defaults/{proxy+}
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Config Service Lambda invoked', {
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
      service: 'config-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

