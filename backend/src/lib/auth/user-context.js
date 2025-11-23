const { getPool, getTenantIdFromEvent, getJWTValidator } = require('../../lib/db');

async function getUserInfoFromEvent(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;

  if (claims) {
    console.log('[AUTH] Using API Gateway JWT claims');

    let tenantId = claims['custom:tenantId'] || claims.tenantId;

    if (!tenantId && claims.sub) {
      console.log('[AUTH] Fetching tenantId from database for Cognito user:', claims.sub);
      const pool = getPool();

      try {
        const result = await pool.query(
          `SELECT m."tenantId"
           FROM public."Membership" m
           JOIN public."User" u ON m."userId" = u."recordId"
           WHERE (u."cognitoSub" = $1 OR u."email" = $2)
           AND m."deletedAt" IS NULL
           ORDER BY m."updatedAt" DESC
           LIMIT 1`,
          [claims.sub, claims.email || claims['cognito:username']],
        );

        if (result.rows.length > 0) {
          tenantId = result.rows[0].tenantId;
          console.log('[AUTH] Found tenantId from database:', tenantId);
        } else {
          console.error('[AUTH] No tenant found for user:', claims.sub);
        }
      } catch (error) {
        console.error('[AUTH] Error fetching tenantId from database:', error.message);
      }
    }

    return {
      sub: claims.sub,
      username: claims.username || claims['cognito:username'],
      email: claims.email,
      tenantId,
      userId: claims.sub,
      role: claims['custom:role'] || 'USER',
    };
  }

  console.log('[AUTH] No API Gateway claims found, falling back to manual JWT validation');

  try {
    const authHeader = event?.headers?.Authorization || event?.headers?.authorization;

    if (!authHeader) {
      console.error('[AUTH] No Authorization header found');
      return null;
    }

    const jwtValidator = getJWTValidator();
    const userInfo = await jwtValidator.validateRequest(event);

    if (!userInfo) {
      console.error('[AUTH] JWT validation failed');
      return null;
    }

    console.log('[AUTH] Manual JWT validation successful');

    const tenantId = userInfo.tenantId
      || userInfo['custom:tenantId']
      || await getTenantIdFromEvent(event);

    return {
      sub: userInfo.sub,
      username: userInfo.username || userInfo['cognito:username'],
      email: userInfo.email,
      tenantId,
      userId: userInfo.sub,
      role: userInfo.role || userInfo['custom:role'] || 'USER',
    };
  } catch (error) {
    console.error('[AUTH] Manual JWT validation error:', error.message);
    return null;
  }
}

module.exports = {
  getUserInfoFromEvent,
};

