/**
 * Operations Service Lambda Handler
 * 
 * Routes handled:
 * - ANY /api/v1/bookings
 * - POST/PUT/DELETE /api/v1/bookings/{proxy+}
 * - POST /api/v1/bookings/{id}/check-in
 * - POST /api/v1/bookings/{id}/check-out
 * - ANY /api/v1/check-ins
 * - GET/PATCH/DELETE /api/v1/check-ins/{proxy+}
 * - ANY /api/v1/check-outs
 * - GET/PATCH/DELETE /api/v1/check-outs/{proxy+}
 * - ANY /api/v1/kennels
 * - GET/PUT /api/v1/kennels/{proxy+}
 * - GET /api/v1/kennels/occupancy
 * - ANY /api/v1/runs
 * - POST/GET/DELETE /api/v1/runs/{proxy+}
 * - GET /api/v1/runs/assignments
 * - POST /api/v1/run-templates/{proxy+}
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Operations Service Lambda invoked', {
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
      service: 'operations-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

