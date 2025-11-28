/**
 * Financial Service Lambda Handler
 * 
 * Routes handled:
 * - POST /api/v1/payments
 * - GET /api/v1/payments
 * - POST /api/v1/invoices
 * - GET /api/v1/invoices
 * - POST /api/v1/invoices/generate/{bookingId}
 * - GET /api/v1/billing/metrics
 * 
 * This is a placeholder handler for BarkBase Dev v2 rebuild.
 * Real implementation will be added in a later phase.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Financial Service Lambda invoked', {
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
      service: 'financial-service',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};

