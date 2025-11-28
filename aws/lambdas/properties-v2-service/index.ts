/**
 * Properties V2 Service Lambda Handler
 * 
 * Routes handled:
 * - GET /api/v2/properties
 * - GET /api/v2/properties/{id}
 * - DELETE /api/v2/properties/{propertyId}
 * - POST /api/v2/properties/{propertyId}/archive
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Properties V2 Service Lambda invoked', {
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
      service: 'properties-v2-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

