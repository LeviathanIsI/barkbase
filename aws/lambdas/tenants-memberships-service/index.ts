/**
 * Tenants & Memberships Service Lambda Handler
 * 
 * Routes handled:
 * - POST /api/v1/tenants/{proxy+}
 * - GET/POST/PUT /api/v1/memberships/{proxy+}
 * - GET /api/v1/tenants?slug={slug}
 * - GET /api/v1/tenants/current
 * - GET /api/v1/tenants/current/plan
 * - GET /api/v1/tenants/current/onboarding
 * - GET /api/v1/tenants/current/theme
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Tenants & Memberships Service Lambda invoked', {
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
      service: 'tenants-memberships-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

