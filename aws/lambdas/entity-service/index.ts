/**
 * Entity Service Lambda Handler
 * 
 * Routes handled:
 * - ANY /api/v1/pets
 * - GET/PUT/DELETE /api/v1/pets/{proxy+}
 * - GET /api/v1/pets/{id}/vaccinations
 * - GET /api/v1/pets/vaccinations/expiring
 * - GET /api/v1/pets/medical-alerts
 * - POST /api/v1/pets/owners (link pet to owner)
 * - ANY /api/v1/owners
 * - GET/PUT/DELETE /api/v1/owners/{proxy+}
 * - GET /api/v1/owners/{id}/pets
 * - ANY /api/v1/staff
 * - GET/PUT/DELETE /api/v1/staff/{proxy+}
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Entity Service Lambda invoked', {
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
      service: 'entity-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

