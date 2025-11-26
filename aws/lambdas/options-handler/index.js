/**
 * OPTIONS Handler for CORS preflight requests
 * Self-contained to avoid deployment packaging issues
 */

// Environment-based CORS configuration
const ALLOWED_ORIGINS = {
  production: [
    'https://app.barkbase.com',
    'https://www.barkbase.com'
  ],
  staging: [
    'https://staging.barkbase.com',
    'https://staging-app.barkbase.com'
  ],
  development: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173'
  ]
};

/**
 * Get allowed CORS origin based on request origin and environment
 */
function getAllowedOrigin(requestOrigin, stage = process.env.STAGE || 'development') {
  const normalizedStage = stage === 'dev' ? 'development' :
                          stage === 'prod' ? 'production' :
                          stage;

  const stageOrigins = ALLOWED_ORIGINS[normalizedStage] || ALLOWED_ORIGINS.development;

  if (normalizedStage === 'development') {
    if (requestOrigin && stageOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return stageOrigins[0];
  }

  if (requestOrigin && stageOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  console.warn(`[CORS] Origin not in allowlist: ${requestOrigin} (stage: ${normalizedStage})`);
  return stageOrigins[0];
}

/**
 * Get CORS headers for preflight response
 */
function getCorsHeaders(requestOrigin, stage) {
  const allowedOrigin = getAllowedOrigin(requestOrigin, stage);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE',
    'Access-Control-Max-Age': '3600',
  };
}

exports.handler = async (event = {}) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const stage = process.env.STAGE || 'development';
  
  console.log(`[OPTIONS] Preflight request from origin: ${origin}, stage: ${stage}`);
  
  const headers = getCorsHeaders(origin, stage);

  return {
    statusCode: 200, // Use 200 instead of 204 for better browser compatibility
    headers,
    body: '',
  };
};
