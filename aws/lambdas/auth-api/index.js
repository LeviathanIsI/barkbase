const { getPool } = require("/opt/nodejs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  ChangePasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const {
  getSecureHeaders,
  auditLog,
  securityEvent,
  getRequestMetadata,
  errorResponse: createErrorResponse,
  successResponse: createSuccessResponse,
} = require("./security-utils");

const BUILD_TAG = "auth-api-build-2025-11-25-1";
console.log(`[AuthApi] Bootstrapped ${BUILD_TAG}`);

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-2",
});

// Cognito configuration from environment
const COGNITO_USER_POOL_ID =
  process.env.USER_POOL_ID || process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID =
  process.env.CLIENT_ID || process.env.COGNITO_CLIENT_ID;

// SECURITY: Fail fast if JWT_SECRET is not configured
// This prevents deployment with weak default secrets
if (!process.env.JWT_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable must be set. Generate using: openssl rand -base64 64"
  );
}

// SECURITY: Support multiple JWT secrets for rotation
// Primary secret is used for signing new tokens
// Secondary secrets support validation of tokens signed with old secrets during rotation
const JWT_SECRET_PRIMARY = process.env.JWT_SECRET;
const JWT_SECRET_SECONDARY = process.env.JWT_SECRET_OLD || null; // Old secret during rotation
const JWT_SECRETS = [JWT_SECRET_PRIMARY, JWT_SECRET_SECONDARY].filter(Boolean);

const JWT_ACCESS_TTL = "15m";
const JWT_REFRESH_TTL = "30d";
const BCRYPT_ROUNDS = 12; // OWASP recommended minimum

/**
 * Parse cookies from Cookie header string
 * @param {string} cookieHeader - Cookie header value
 * @returns {Object} Parsed cookies as key-value pairs
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
    return cookies;
  }, {});
}

/**
 * Create Set-Cookie header for JWT tokens
 * Implements httpOnly, secure, sameSite for XSS/CSRF protection
 *
 * SECURITY NOTE: SameSite=Lax allows cookies to work cross-origin (frontend/backend on different domains)
 * while still providing CSRF protection. SameSite=Strict would block all cross-origin cookies.
 *
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} maxAge - Max age in seconds
 * @returns {string} Set-Cookie header value
 */
function createCookieHeader(name, value, maxAge) {
  const environment = process.env.ENVIRONMENT || "production";
  const isProduction =
    environment === "production" || environment === "staging";

  // Cookie options for security
  const options = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly", // Prevents JavaScript access (XSS protection)
    "SameSite=Lax", // CSRF protection + cross-origin support
  ];

  // Only set Secure flag in production (requires HTTPS)
  if (isProduction) {
    options.push("Secure");
  }

  // Set domain for production (allows cookies across subdomains)
  if (isProduction && process.env.COOKIE_DOMAIN) {
    options.push(`Domain=${process.env.COOKIE_DOMAIN}`);
  }

  console.log(
    `[COOKIE] Creating ${name} cookie: HttpOnly, SameSite=Lax, MaxAge=${maxAge}s, Secure=${isProduction}`
  );

  return options.join("; ");
}

/**
 * Create cookie headers for clearing tokens on logout
 * @returns {string[]} Array of Set-Cookie headers to clear tokens
 */
function createClearCookieHeaders() {
  return [
    createCookieHeader("accessToken", "", 0),
    createCookieHeader("refreshToken", "", 0),
  ];
}

/**
 * Extract access token from cookies or Authorization header
 * Supports both cookie-based (new) and header-based (legacy) auth
 *
 * @param {Object} event - Lambda event object
 * @returns {string|null} Access token or null if not found
 */
function extractAccessToken(event) {
  // Try Authorization header first (for API clients, backward compatibility)
  const authHeader =
    event.headers?.authorization || event.headers?.Authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookies (for browser clients)
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies.accessToken) {
      return cookies.accessToken;
    }
  }

  return null;
}

/**
 * Verify JWT token with support for multiple secrets (rotation)
 * Tries primary secret first, falls back to secondary if available
 *
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid with all secrets
 */
function verifyJWT(token) {
  let lastError;

  // Try each secret in order
  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
      // Continue to next secret
    }
  }

  // All secrets failed
  throw lastError || new Error("Invalid token");
}

// Error codes for client responses
const ERROR_CODES = {
  INVALID_CREDENTIALS: "AUTH_001",
  MISSING_FIELDS: "AUTH_002",
  DUPLICATE_USER: "AUTH_003",
  DUPLICATE_TENANT: "AUTH_004",
  INVALID_TOKEN: "AUTH_005",
  UNAUTHORIZED: "AUTH_006",
  INSUFFICIENT_PERMISSIONS: "AUTH_007",
  DATABASE_ERROR: "SYS_001",
  INTERNAL_ERROR: "SYS_002",
};

/**
 * Extract user info from API Gateway JWT authorizer
 * @param {Object} event - Lambda event object
 * @returns {Object|null} User info with sub, tenantId, role, membershipId
 */
function getUserInfoFromEvent(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims) {
    console.error("[AUTH] No JWT claims found in event");
    return null;
  }

  return {
    sub: claims.sub, // User ID (Cognito sub or custom)
    username: claims.username,
    email: claims.email,
    tenantId: claims["custom:tenantId"] || claims.tenantId,
    role: claims["custom:role"] || claims.role,
    membershipId: claims.membershipId,
  };
}

/**
 * Create standardized error response with security headers
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Application error code
 * @param {string} message - User-facing error message
 * @param {Object} details - Additional details (server-side logging only)
 * @param {Object} event - Lambda event for CORS origin
 * @returns {Object} Lambda response object
 */
function errorResponse(
  statusCode,
  errorCode,
  message,
  details = {},
  event = null
) {
  // Log detailed error server-side for debugging
  if (details.error) {
    console.error(`[AUTH_ERROR] ${errorCode}: ${message}`, {
      error: details.error.message,
      stack: details.error.stack,
      context: details.context,
    });
  }

  // Use shared security utilities for response
  return createErrorResponse(
    statusCode,
    errorCode,
    message,
    event || details.event
  );
}

// auditLog function now imported from security-utils

function normalizeResponse(response) {
  if (!response || typeof response !== "object") {
    return {
      statusCode: 500,
      headers: commonHeaders,
      body: JSON.stringify({
        message: "AuthApi not wired to login handler yet",
      }),
    };
  }

  return {
    ...response,
    isBase64Encoded: response.isBase64Encoded ?? false,
    headers: {
      ...commonHeaders,
      ...(response.headers || {}),
    },
  };
}

function withCookies(response, cookies) {
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return response;
  }

  const normalized = { ...response };
  normalized.cookies = cookies;
  normalized.multiValueHeaders = normalized.multiValueHeaders || {};
  normalized.multiValueHeaders["Set-Cookie"] = [...cookies];
  return normalized;
}

async function handleAuthEvent(event) {
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path;

  console.log(`[AuthApiRouter] ${httpMethod} ${path}`);

  if (httpMethod === "POST" && path === "/api/v1/auth/login") {
    console.log("[AuthApiRouter] -> login");
    return await login(event);
  }
  if (httpMethod === "POST" && path === "/api/v1/auth/signup") {
    console.log("[AuthApiRouter] -> signup");
    return await signup(event);
  }
  if (httpMethod === "POST" && path === "/api/v1/auth/refresh") {
    console.log("[AuthApiRouter] -> refresh");
    return await refresh(event);
  }
  if (httpMethod === "POST" && path === "/api/v1/auth/logout") {
    console.log("[AuthApiRouter] -> logout");
    return await logout(event);
  }
  if (httpMethod === "POST" && path === "/api/v1/auth/register") {
    console.log("[AuthApiRouter] -> register");
    return await register(event);
  }
  if (httpMethod === "POST" && path === "/api/v1/auth/resend-verification") {
    console.log("[AuthApiRouter] -> resendVerification");
    return await resendVerification(event);
  }
  if (httpMethod === "POST" && path === "/api/v1/auth/change-password") {
    console.log("[AuthApiRouter] -> changePassword");
    return await changePassword(event);
  }
  if (httpMethod === "GET" && path === "/api/v1/auth/sessions") {
    console.log("[AuthApiRouter] -> getSessions");
    return await getSessions(event);
  }
  if (httpMethod === "DELETE" && path === "/api/v1/auth/sessions/all") {
    console.log("[AuthApiRouter] -> revokeAllSessions");
    return await revokeAllSessions(event);
  }
  if (httpMethod === "DELETE" && path.startsWith("/api/v1/auth/sessions/")) {
    console.log("[AuthApiRouter] -> revokeSession");
    return await revokeSession(event);
  }

  console.warn(`[AuthApiRouter] No route for ${httpMethod} ${path}`);
  return createErrorResponse(404, "NOT_FOUND", "Not Found", event);
}

exports.handler = async (event) => {
  const httpMethod = event.requestContext?.http?.method || event.httpMethod || "UNKNOWN";
  const path = event.rawPath || event.path || "/";
  const requestId = event.requestContext?.requestId || "unknown";
  const startTimeMs = Date.now();

  console.log(
    `[AuthApi] Request ${httpMethod} ${path} (requestId=${requestId})`
  );

  try {
    const response = await handleAuthEvent(event);
    console.log(
      `[AuthApi] Response ${response?.statusCode ?? "n/a"} for requestId=${requestId} in ${
        Date.now() - startTimeMs
      }ms`
    );
    return normalizeResponse(response);
  } catch (err) {
    console.error(`[AuthApi] Unhandled error for requestId=${requestId}:`, err);

    return {
      statusCode: 500,
      headers: commonHeaders,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

async function login(event) {
    const requestId = event.requestContext?.requestId || 'unknown';
    const requestMeta = getRequestMetadata(event);

    console.log(`[AUTH][login] requestId=${requestId}`, JSON.stringify({
        sourceIp: requestMeta.ip,
        userAgent: requestMeta.userAgent,
        path: event.rawPath,
        method: event.requestContext?.http?.method,
    }));

    // --- SAFE BODY PARSE START ---
    let rawBody = event.body;
    let body = {};

    console.log('[AUTH][login] event.body RAW:', rawBody, '(type:', typeof rawBody, ')');

    try {
        if (typeof rawBody === 'object' && rawBody !== null) {
            // Already parsed by API Gateway or tests
            body = rawBody;
        } else if (typeof rawBody === 'string') {
            // First, try strict JSON
            try {
                body = JSON.parse(rawBody);
            } catch (jsonErr) {
                console.warn('[AUTH][login] strict JSON.parse failed, attempting loose parse', {
                    message: jsonErr.message,
                });

                // DEV-FRIENDLY FALLBACK:
                // Handles bodies that look like:
                // {
                //   email:  josh@example.com,
                //   password:  mypass,
                //   password_b64:  Sm9z...
                // }
                const loose = {};

                const emailMatch = rawBody.match(/email:\s*([^,\n]+)/i);
                const passwordMatch = rawBody.match(/password:\s*([^,\n]+)/i);
                const passwordB64Match = rawBody.match(/password_b64:\s*([^,\n]+)/i);

                if (emailMatch) {
                    loose.email = emailMatch[1].trim().replace(/^["']|["']$/g, '');
                }
                if (passwordMatch) {
                    // Avoid grabbing the password_b64 value if present on the next line
                    const val = passwordMatch[1].trim();
                    if (!val.toLowerCase().startsWith('sm9z')) { // crude guard to avoid the base64 line
                        loose.password = val.replace(/^["']|["']$/g, '');
                    }
                }
                if (passwordB64Match) {
                    loose.password_b64 = passwordB64Match[1].trim().replace(/^["']|["']$/g, '');
                }

                console.log('[AUTH][login] loose-parsed body:', loose);

                body = loose;
            }
        } else {
            console.warn('[AUTH][login] unexpected body type, defaulting to {}', typeof rawBody);
            body = {};
        }
    } catch (err) {
        console.error('[AUTH][login] BODY PARSE FAILED HARD', {
            error: err.message,
            stack: err.stack,
            rawBody,
            type: typeof rawBody,
        });

        return {
            statusCode: 400,
            headers: getSecureHeaders(event),
            body: JSON.stringify({
                error: 'Invalid request body',
                errorCode: ERROR_CODES.MISSING_FIELDS,
            }),
        };
    }
    // --- SAFE BODY PARSE END ---

    const { email, password, password_b64 } = body || {};

    if (!email || (!password && !password_b64)) {
        console.warn('[AUTH][login] Missing required fields', { emailPresent: !!email, passwordPresent: !!password, passwordB64Present: !!password_b64 });
        return {
            statusCode: 400,
            headers: getSecureHeaders(event),
            body: JSON.stringify({
                error: 'Email and password are required',
                errorCode: ERROR_CODES.MISSING_FIELDS,
            }),
        };
    }

    // Decode base64 password if provided
    let finalPassword = password;

    if (password_b64) {
        try {
            const buff = Buffer.from(password_b64, 'base64');
            finalPassword = buff.toString('utf8');
            console.log('[AUTH][login] decoded base64 password OK');
        } catch (err) {
            console.error('[AUTH][login] base64 decode failed:', err);
            return {
                statusCode: 400,
                headers: getSecureHeaders(event),
                body: JSON.stringify({
                    error: 'Invalid base64 password',
                    errorCode: ERROR_CODES.MISSING_FIELDS,
                }),
            };
        }
    }

  // Keep metadata alias for compatibility with rest of function
  const metadata = requestMeta;

  try {
    const pool = getPool();

    // Smoke test the DB first to surface connectivity issues clearly
    try {
      await pool.query("SELECT 1");
    } catch (dbErr) {
      console.error(
        "[AUTH] DB connectivity check failed:",
        dbErr?.message || dbErr
      );
      securityEvent("DATABASE_CONNECTION_FAILURE", "HIGH", { ...metadata });
      return errorResponse(
        500,
        ERROR_CODES.DATABASE_ERROR,
        "Service temporarily unavailable",
        { event }
      );
    }

    const userResult = await pool.query(
      `SELECT u."recordId", u."email", u."passwordHash", u."name",
                    m."recordId" as "membershipId", m."role", m."tenantId",
                    t."recordId" as "tenantRecordId", t."slug", t."name" as "tenantName", t."plan"
             FROM public."User" u
             INNER JOIN public."Membership" m ON u."recordId" = m."userId"
             INNER JOIN public."Tenant" t ON m."tenantId" = t."recordId"
             WHERE LOWER(u."email") = LOWER($1)
             ORDER BY m."updatedAt" DESC
             LIMIT 1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      auditLog("LOGIN_FAILED", {
        reason: "invalid_credentials",
        email,
        result: "FAILURE",
        ...metadata,
      });
      securityEvent("LOGIN_FAILED_USER_NOT_FOUND", "MEDIUM", {
        email,
        ...metadata,
      });
      return errorResponse(
        401,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Invalid email or password",
        { event }
      );
    }

    const user = userResult.rows[0];
    const tenant = {
      recordId: user.tenantRecordId,
      slug: user.slug,
      name: user.tenantName,
      plan: user.plan,
    };

    // Check if user is a Cognito OAuth user
    let validPassword = false;
    let cognitoTokens = null;
    if (user.passwordHash === "COGNITO_AUTH") {
      // User is authenticated through Cognito
      console.log(`[AUTH] User ${email} uses Cognito authentication`);

      try {
        // Authenticate through AWS Cognito
        const authCommand = new InitiateAuthCommand({
          ClientId: COGNITO_CLIENT_ID,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: email,
            PASSWORD: finalPassword,
          },
        });

        const cognitoResponse = await cognitoClient.send(authCommand);

        if (cognitoResponse.AuthenticationResult) {
          // Cognito authentication successful - SAVE THE REAL TOKENS
          validPassword = true;
          cognitoTokens = cognitoResponse.AuthenticationResult;
          console.log(
            `[AUTH] Cognito authentication successful for ${email} - using Cognito RS256 tokens`
          );
        }
      } catch (cognitoError) {
        console.error(
          "[AUTH] Cognito authentication failed:",
          cognitoError.message
        );
        auditLog("LOGIN_FAILED", {
          reason: "cognito_auth_failed",
          email,
          userId: user.recordId,
          error: cognitoError.message,
          result: "FAILURE",
          ...metadata,
        });
        securityEvent("LOGIN_FAILED_COGNITO_AUTH", "MEDIUM", {
          email,
          userId: user.recordId,
          error: cognitoError.message,
          ...metadata,
        });
        return errorResponse(
          401,
          ERROR_CODES.INVALID_CREDENTIALS,
          "Invalid email or password",
          { event }
        );
      }
    } else {
      // Traditional database password authentication
      validPassword = await bcrypt.compare(finalPassword, user.passwordHash || "");

      if (validPassword) {
        // SECURITY: Check if password hash needs upgrading (for backward compatibility)
        const needsRehash =
          (await bcrypt.getRounds(user.passwordHash)) < BCRYPT_ROUNDS;
        if (needsRehash) {
          const newHash = await bcrypt.hash(finalPassword, BCRYPT_ROUNDS);
          await pool.query(
            `UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
            [newHash, user.recordId]
          );
          console.log(
            `[AUTH] Password hash upgraded for user ${user.recordId}`
          );
        }
      }
    }

    if (!validPassword) {
      auditLog("LOGIN_FAILED", {
        reason: "invalid_password",
        email,
        userId: user.recordId,
        result: "FAILURE",
        ...metadata,
      });
      securityEvent("LOGIN_FAILED_INVALID_PASSWORD", "MEDIUM", {
        email,
        userId: user.recordId,
        ...metadata,
      });
      return errorResponse(
        401,
        ERROR_CODES.INVALID_CREDENTIALS,
        "Invalid email or password",
        { event }
      );
    }

    // Generate a session ID for tracking
    const sessionId = crypto.randomUUID();

    // Create session record in database
    try {
      await pool.query(
        `INSERT INTO "AuthSession" ("sessionId", "userId", "userAgent", "ipAddress", "createdAt", "lastActive", "isRevoked")
         VALUES ($1, $2, $3, $4, NOW(), NOW(), FALSE)`,
        [sessionId, user.recordId, metadata.userAgent || null, metadata.ip || null]
      );
      console.log(`[AUTH] Created session ${sessionId} for user ${user.recordId}`);
    } catch (sessionErr) {
      // Log but don't fail login if session tracking fails
      console.error("[AUTH] Failed to create session record:", sessionErr.message);
    }

    // Use Cognito tokens if available (RS256), otherwise create custom tokens (HS256)
    let accessToken, refreshToken;

    if (cognitoTokens) {
      // Use real Cognito RS256 tokens for API Gateway
      accessToken = cognitoTokens.AccessToken || cognitoTokens.IdToken;
      refreshToken = cognitoTokens.RefreshToken;
      console.log(
        "[AUTH] Using Cognito RS256 tokens for API Gateway compatibility"
      );
    } else {
      // Fallback to custom HS256 tokens for non-Cognito users
      // Include sessionId in JWT claims for session tracking
      accessToken = jwt.sign(
        {
          sub: user.recordId,
          tenantId: tenant.recordId,
          membershipId: user.membershipId,
          role: user.role,
          sessionId: sessionId,
        },
        JWT_SECRET_PRIMARY,
        { expiresIn: JWT_ACCESS_TTL }
      );

      refreshToken = jwt.sign(
        {
          sub: user.recordId,
          tenantId: tenant.recordId,
          membershipId: user.membershipId,
          sessionId: sessionId,
        },
        JWT_SECRET_PRIMARY,
        { expiresIn: JWT_REFRESH_TTL }
      );
      console.log(
        "[AUTH] Using custom HS256 tokens for backward compatibility"
      );
    }

    await pool.query(
      `UPDATE "Membership" SET "refreshToken" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
      [refreshToken, user.membershipId]
    );

    // metadata already declared at line 242, no need to redeclare
    auditLog("LOGIN_SUCCESS", {
      userId: user.recordId,
      tenantId: tenant.recordId,
      email,
      result: "SUCCESS",
      ...metadata,
    });

    // SECURITY: Set JWT tokens as httpOnly cookies (XSS protection)
    const accessTokenCookie = createCookieHeader(
      "accessToken",
      accessToken,
      900
    ); // 15 minutes
    const refreshTokenCookie = createCookieHeader(
      "refreshToken",
      refreshToken,
      2592000
    ); // 30 days

    console.log("[LOGIN] Setting cookies in response headers");

    // Create response with accessToken in body (needed for API Gateway Authorization header)
    // refreshToken stays in httpOnly cookie for security
    const response = createSuccessResponse(
      200,
      {
        user: { recordId: user.recordId, email: user.email, role: user.role },
        tenant: {
          recordId: tenant.recordId,
          slug: tenant.slug,
          name: tenant.name,
          plan: tenant.plan,
        },
        accessToken: accessToken, // Include for API Gateway Authorization header
        sessionId: sessionId, // Include for session tracking
      },
      event
    );

    // Add sessionId header for session tracking
    response.headers = {
      ...response.headers,
      "x-session-id": sessionId,
    };

    const responseWithCookies = withCookies(response, [
      accessTokenCookie,
      refreshTokenCookie,
    ]);

    // Parse body to verify structure
    const bodyData = JSON.parse(response.body);
    console.log("[LOGIN] Response structure:", {
      statusCode: response.statusCode,
      cookieCount: responseWithCookies.cookies?.length || 0,
      bodyHasUser: !!bodyData.user,
      bodyHasTenant: !!bodyData.tenant,
      userRecordId: bodyData.user?.recordId,
      tenantRecordId: bodyData.tenant?.recordId,
      headers: Object.keys(response.headers),
    });

    console.log("[LOGIN] Full response body:", response.body);

    return responseWithCookies;
  } catch (err) {
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Internal Server Error",
      {
        error: err,
        context: { action: "login", sourceIp: requestMeta?.ip || 'unknown' },
      }
    );
  }
}

async function signup(event) {
  const metadata = getRequestMetadata(event);

  try {
    const { email, password, tenantName, tenantSlug, name } = JSON.parse(
      event.body || "{}"
    );

    if (!email || !password || !tenantName || !tenantSlug) {
      auditLog("SIGNUP_FAILED", {
        reason: "missing_fields",
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Missing required fields",
        {},
        event
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Invalid email format",
        {},
        event
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Password must be at least 8 characters",
        {},
        event
      );
    }

    const pool = getPool();

    // Check if tenant slug exists
    const existingTenant = await pool.query(
      `SELECT "recordId" FROM "Tenant" WHERE "slug" = $1`,
      [tenantSlug]
    );
    if (existingTenant.rows.length > 0) {
      auditLog("SIGNUP_FAILED", {
        reason: "tenant_slug_taken",
        tenantSlug,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        409,
        ERROR_CODES.DUPLICATE_TENANT,
        "Tenant slug already taken",
        {},
        event
      );
    }

    // Check if user exists
    const existingUser = await pool.query(
      `SELECT "recordId" FROM "User" WHERE "email" = $1`,
      [email.toLowerCase()]
    );
    if (existingUser.rows.length > 0) {
      auditLog("SIGNUP_FAILED", {
        reason: "user_exists",
        email,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        409,
        ERROR_CODES.DUPLICATE_USER,
        "User already exists",
        {},
        event
      );
    }

    // Hash password with OWASP recommended rounds
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create tenant
    const tenantResult = await pool.query(
      `INSERT INTO "Tenant" ("recordId", "slug", "name", "plan", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'FREE', NOW())
             RETURNING "recordId", "slug", "name", "plan"`,
      [tenantSlug, tenantName]
    );
    const tenant = tenantResult.rows[0];

    // Create user
    const userResult = await pool.query(
      `INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             RETURNING "recordId", "email", "name"`,
      [email.toLowerCase(), passwordHash, name]
    );
    const user = userResult.rows[0];

    // Create membership
    const membershipResult = await pool.query(
      `INSERT INTO "Membership" ("recordId", "userId", "tenantId", "role", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW())
             RETURNING "recordId", "role"`,
      [user.recordId, tenant.recordId]
    );
    const membership = membershipResult.rows[0];

    // Generate tokens
    const accessToken = jwt.sign(
      {
        sub: user.recordId,
        tenantId: tenant.recordId,
        membershipId: membership.recordId,
        role: "OWNER",
      },
      JWT_SECRET_PRIMARY,
      { expiresIn: JWT_ACCESS_TTL }
    );

    const refreshToken = jwt.sign(
      {
        sub: user.recordId,
        tenantId: tenant.recordId,
        membershipId: membership.recordId,
      },
      JWT_SECRET_PRIMARY,
      { expiresIn: JWT_REFRESH_TTL }
    );

    // Store refresh token
    await pool.query(
      `UPDATE "Membership" SET "refreshToken" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
      [refreshToken, membership.recordId]
    );

    auditLog("SIGNUP_SUCCESS", {
      userId: user.recordId,
      tenantId: tenant.recordId,
      email,
      result: "SUCCESS",
      ...metadata,
    });

    // SECURITY: Set JWT tokens as httpOnly cookies (XSS protection)
    const accessTokenCookie = createCookieHeader(
      "accessToken",
      accessToken,
      900
    ); // 15 minutes
    const refreshTokenCookie = createCookieHeader(
      "refreshToken",
      refreshToken,
      2592000
    ); // 30 days

    // Create response without tokens in body
    const response = createSuccessResponse(
      201,
      {
        message: "Workspace created successfully",
        user,
        tenant,
      },
      event
    );

    const responseWithCookies = withCookies(response, [
      accessTokenCookie,
      refreshTokenCookie,
    ]);

    // Parse body to verify structure
    const bodyData = JSON.parse(response.body);
    console.log("[SIGNUP] Response structure:", {
      statusCode: response.statusCode,
      cookieCount: responseWithCookies.cookies?.length || 0,
      bodyHasUser: !!bodyData.user,
      bodyHasTenant: !!bodyData.tenant,
      userRecordId: bodyData.user?.recordId,
      tenantRecordId: bodyData.tenant?.recordId,
    });

    return responseWithCookies;
  } catch (err) {
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Internal Server Error",
      {
        error: err,
        context: { action: "signup" },
        event,
      }
    );
  }
}

async function refresh(event) {
  // SECURITY: Extract refresh token from cookies first, fallback to body for backward compatibility
  let refreshToken = null;

  // Try cookies first (new method)
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    refreshToken = cookies.refreshToken;
  }

  // Fallback to body (legacy method)
  if (!refreshToken) {
    const body = JSON.parse(event.body || "{}");
    refreshToken = body.refreshToken;
  }

  if (!refreshToken) {
    return errorResponse(
      400,
      ERROR_CODES.MISSING_FIELDS,
      "Missing refresh token",
      {},
      event
    );
  }

  try {
    // SECURITY: Use verifyJWT to support token rotation
    const payload = verifyJWT(refreshToken);
    const pool = getPool();

    // Verify refresh token in database
    const result = await pool.query(
      `SELECT "recordId", "role", "userId" FROM "Membership"
             WHERE "recordId" = $1 AND "tenantId" = $2 AND "refreshToken" = $3`,
      [payload.membershipId, payload.tenantId, refreshToken]
    );

    if (result.rows.length === 0) {
      return errorResponse(
        401,
        ERROR_CODES.INVALID_TOKEN,
        "Invalid refresh token",
        {},
        event
      );
    }

    const membership = result.rows[0];

    // Update session lastActive if sessionId exists in payload
    const sessionId = payload.sessionId;
    if (sessionId) {
      try {
        await pool.query(
          `UPDATE "AuthSession" SET "lastActive" = NOW() WHERE "sessionId" = $1 AND "isRevoked" = FALSE`,
          [sessionId]
        );
      } catch (sessionErr) {
        console.error("[AUTH] Failed to update session lastActive:", sessionErr.message);
      }
    }

    // Issue new access token with sessionId preserved
    const accessToken = jwt.sign(
      {
        sub: membership.userId,
        tenantId: payload.tenantId,
        membershipId: membership.recordId,
        role: membership.role,
        sessionId: sessionId || undefined,
      },
      JWT_SECRET_PRIMARY,
      { expiresIn: JWT_ACCESS_TTL }
    );

    // SECURITY: Set new access token as httpOnly cookie
    const accessTokenCookie = createCookieHeader(
      "accessToken",
      accessToken,
      900
    ); // 15 minutes

    const response = createSuccessResponse(
      200,
      {
        role: membership.role,
        accessToken: accessToken, // Include for API Gateway Authorization header
      },
      event
    );

    return withCookies(response, [accessTokenCookie]);

  } catch (error) {
    return errorResponse(
      401,
      ERROR_CODES.INVALID_TOKEN,
      "Invalid or expired token",
      {},
      event
    );
  }
}

async function logout(event) {
  // SECURITY: Extract token from cookies or Authorization header
  const token = extractAccessToken(event);

  if (token) {
    try {
      // SECURITY: Use verifyJWT to support token rotation
      const payload = verifyJWT(token);

      const pool = getPool();
      await pool.query(
        `UPDATE "Membership" SET "refreshToken" = NULL, "updatedAt" = NOW() WHERE "recordId" = $1`,
        [payload.membershipId]
      );

      const metadata = getRequestMetadata(event);
      auditLog("LOGOUT_SUCCESS", {
        userId: payload.sub,
        tenantId: payload.tenantId,
        result: "SUCCESS",
        ...metadata,
      });
    } catch (error) {
      console.error("[AUTH] Logout error:", error.message);
      // Continue with logout even if token validation fails
    }
  }

  // SECURITY: Clear httpOnly cookies
  const clearCookies = createClearCookieHeaders();

  const response = createSuccessResponse(204, "", event);

  return withCookies(response, clearCookies);
}

/**
 * CRITICAL SECURITY FIX: Register new user to tenant
 *
 * SECURITY REQUIREMENTS:
 * 1. Extract tenantId from JWT claims only (NEVER from headers)
 * 2. Verify requesting user has OWNER or ADMIN role in their tenant
 * 3. Only allow registration within requesting user's own tenant
 * 4. Audit all registration attempts
 *
 * @param {Object} event - Lambda event with JWT claims
 * @returns {Object} Lambda response
 */
async function register(event) {
  const metadata = getRequestMetadata(event);

  try {
    // SECURITY: Extract user info from JWT claims (validated by API Gateway)
    const requestingUser = getUserInfoFromEvent(event);

    if (!requestingUser || !requestingUser.sub || !requestingUser.tenantId) {
      auditLog("REGISTER_FAILED", {
        reason: "missing_jwt_claims",
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    const { email, password, name, role } = JSON.parse(event.body || "{}");

    // Input validation
    if (!email || !password || !name) {
      auditLog("REGISTER_FAILED", {
        reason: "missing_fields",
        requestingUserId: requestingUser.sub,
        tenantId: requestingUser.tenantId,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Email, password, and name are required",
        {},
        event
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Invalid email format",
        {},
        event
      );
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Password must be at least 8 characters",
        {},
        event
      );
    }

    const pool = getPool();

    // SECURITY: Verify requesting user has OWNER or ADMIN role in their tenant
    const authCheck = await pool.query(
      `SELECT m."role"
             FROM "Membership" m
             WHERE m."userId" = $1 AND m."tenantId" = $2`,
      [requestingUser.sub, requestingUser.tenantId]
    );

    if (authCheck.rows.length === 0) {
      auditLog("REGISTER_FAILED", {
        reason: "no_membership",
        requestingUserId: requestingUser.sub,
        tenantId: requestingUser.tenantId,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        403,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    const requestingUserRole = authCheck.rows[0].role;

    // SECURITY: Only OWNER and ADMIN can register new users
    if (!["OWNER", "ADMIN"].includes(requestingUserRole)) {
      auditLog("REGISTER_FAILED", {
        reason: "insufficient_permissions",
        requestingUserId: requestingUser.sub,
        requestingUserRole,
        tenantId: requestingUser.tenantId,
        targetEmail: email,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        403,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        "Only account owners and administrators can invite users",
        {},
        event
      );
    }

    // SECURITY: Use tenantId from JWT claims only (never from headers)
    const tenantId = requestingUser.tenantId;

    // Validate role assignment
    const validRoles = ["OWNER", "ADMIN", "STAFF", "MEMBER"];
    const assignedRole = role || "STAFF";

    if (!validRoles.includes(assignedRole)) {
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        {},
        event
      );
    }

    // SECURITY: Only OWNER can create other OWNERs
    if (assignedRole === "OWNER" && requestingUserRole !== "OWNER") {
      auditLog("REGISTER_FAILED", {
        reason: "cannot_assign_owner_role",
        requestingUserId: requestingUser.sub,
        requestingUserRole,
        tenantId,
        targetEmail: email,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        403,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        "Only account owners can assign OWNER role",
        {},
        event
      );
    }

    // Hash password with OWASP recommended rounds
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Check if user exists
    let userResult = await pool.query(
      `SELECT "recordId" FROM "User" WHERE LOWER("email") = LOWER($1)`,
      [email]
    );
    let userId;

    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].recordId;

      // Check if user already has membership in this tenant
      const existingMembership = await pool.query(
        `SELECT "recordId" FROM "Membership" WHERE "userId" = $1 AND "tenantId" = $2`,
        [userId, tenantId]
      );

      if (existingMembership.rows.length > 0) {
        auditLog("REGISTER_FAILED", {
          reason: "user_already_member",
          requestingUserId: requestingUser.sub,
          targetUserId: userId,
          tenantId,
          result: "FAILURE",
          ...metadata,
        });
        return errorResponse(
          409,
          ERROR_CODES.DUPLICATE_USER,
          "User already exists in this workspace",
          {},
          event
        );
      }
    } else {
      // Create new user
      const newUser = await pool.query(
        `INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "updatedAt")
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                 RETURNING "recordId"`,
        [email.toLowerCase(), passwordHash, name]
      );
      userId = newUser.rows[0].recordId;
    }

    // Create membership in requesting user's tenant only
    const membershipResult = await pool.query(
      `INSERT INTO "Membership" ("recordId", "userId", "tenantId", "role", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             RETURNING "recordId", "role"`,
      [userId, tenantId, assignedRole]
    );

    const metadata = getRequestMetadata(event);
    auditLog("REGISTER_SUCCESS", {
      requestingUserId: requestingUser.sub,
      requestingUserRole,
      newUserId: userId,
      newUserEmail: email,
      assignedRole,
      tenantId,
      result: "SUCCESS",
      ...metadata,
    });

    return createSuccessResponse(
      201,
      {
        message: "User registered successfully",
        membership: membershipResult.rows[0],
      },
      event
    );
  } catch (err) {
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Internal Server Error",
      {
        error: err,
        context: { action: "register" },
        event,
      }
    );
  }
}

/**
 * Resend email verification for the current user
 * Uses Cognito's ResendConfirmationCode API
 *
 * @param {Object} event - Lambda event with JWT token
 * @returns {Object} Lambda response
 */
async function resendVerification(event) {
  const metadata = getRequestMetadata(event);

  try {
    // Extract access token to identify the user
    const token = extractAccessToken(event);

    if (!token) {
      auditLog("RESEND_VERIFICATION_FAILED", {
        reason: "missing_token",
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Verify the token and extract user info
    let payload;
    try {
      payload = verifyJWT(token);
    } catch (tokenError) {
      auditLog("RESEND_VERIFICATION_FAILED", {
        reason: "invalid_token",
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        401,
        ERROR_CODES.INVALID_TOKEN,
        "Invalid or expired token",
        {},
        event
      );
    }

    const userId = payload.sub;

    if (!userId) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Get user email from database
    const pool = getPool();
    const userResult = await pool.query(
      `SELECT "email" FROM "User" WHERE "recordId" = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      auditLog("RESEND_VERIFICATION_FAILED", {
        reason: "user_not_found",
        userId,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        404,
        ERROR_CODES.INVALID_CREDENTIALS,
        "User not found",
        {},
        event
      );
    }

    const userEmail = userResult.rows[0].email;

    // Call Cognito to resend the confirmation code
    const command = new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: userEmail,
    });

    await cognitoClient.send(command);

    auditLog("RESEND_VERIFICATION_SUCCESS", {
      userId,
      email: userEmail,
      result: "SUCCESS",
      ...metadata,
    });

    console.log(`[AUTH] Resent verification email to ${userEmail}`);

    return createSuccessResponse(
      200,
      { success: true },
      event
    );
  } catch (err) {
    // Handle specific Cognito errors
    const errorName = err.name || err.code;

    // UserNotFoundException - user doesn't exist in Cognito
    if (errorName === "UserNotFoundException") {
      console.log("[AUTH] User not found in Cognito, may be a database-only user");
      return errorResponse(
        400,
        "AUTH_008",
        "Email verification is not available for this account type",
        { error: err, context: { action: "resendVerification" } },
        event
      );
    }

    // InvalidParameterException - user might already be confirmed
    if (errorName === "InvalidParameterException") {
      console.log("[AUTH] User already confirmed or invalid state");
      return errorResponse(
        400,
        "AUTH_009",
        "Email is already verified or verification is not required",
        { error: err, context: { action: "resendVerification" } },
        event
      );
    }

    // LimitExceededException - too many attempts
    if (errorName === "LimitExceededException") {
      console.log("[AUTH] Rate limit exceeded for resend verification");
      return errorResponse(
        429,
        "AUTH_010",
        "Too many attempts. Please try again later.",
        { error: err, context: { action: "resendVerification" } },
        event
      );
    }

    console.error("[AUTH] Resend verification error:", err);
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to resend verification email",
      {
        error: err,
        context: { action: "resendVerification" },
        event,
      }
    );
  }
}

/**
 * Change password for the current user
 * Uses Cognito's ChangePassword API
 *
 * @param {Object} event - Lambda event with JWT token
 * @returns {Object} Lambda response
 */
async function changePassword(event) {
  const metadata = getRequestMetadata(event);

  try {
    // Parse request body
    const { currentPassword, newPassword } = JSON.parse(event.body || "{}");

    // Validate required fields
    if (!currentPassword || !newPassword) {
      auditLog("CHANGE_PASSWORD_FAILED", {
        reason: "missing_fields",
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Current password and new password are required",
        {},
        event
      );
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "New password must be at least 8 characters",
        {},
        event
      );
    }

    // Extract access token to identify the user
    const accessToken = extractAccessToken(event);

    if (!accessToken) {
      auditLog("CHANGE_PASSWORD_FAILED", {
        reason: "missing_token",
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Verify the token and extract user info
    let payload;
    try {
      payload = verifyJWT(accessToken);
    } catch (tokenError) {
      auditLog("CHANGE_PASSWORD_FAILED", {
        reason: "invalid_token",
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        401,
        ERROR_CODES.INVALID_TOKEN,
        "Invalid or expired token",
        {},
        event
      );
    }

    const userId = payload.sub;

    if (!userId) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Get user from database to check auth type
    const pool = getPool();
    const userResult = await pool.query(
      `SELECT "email", "passwordHash" FROM "User" WHERE "recordId" = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      auditLog("CHANGE_PASSWORD_FAILED", {
        reason: "user_not_found",
        userId,
        result: "FAILURE",
        ...metadata,
      });
      return errorResponse(
        404,
        ERROR_CODES.INVALID_CREDENTIALS,
        "User not found",
        {},
        event
      );
    }

    const user = userResult.rows[0];

    // Check if user is a Cognito user
    if (user.passwordHash === "COGNITO_AUTH") {
      // For Cognito users, we need to use Cognito's ChangePassword API
      // This requires the user's current access token from Cognito
      // First, authenticate to get a fresh Cognito access token
      try {
        const authCommand = new InitiateAuthCommand({
          ClientId: COGNITO_CLIENT_ID,
          AuthFlow: "USER_PASSWORD_AUTH",
          AuthParameters: {
            USERNAME: user.email,
            PASSWORD: currentPassword,
          },
        });

        const cognitoAuthResponse = await cognitoClient.send(authCommand);
        const cognitoAccessToken = cognitoAuthResponse.AuthenticationResult?.AccessToken;

        if (!cognitoAccessToken) {
          throw new Error("Failed to get Cognito access token");
        }

        // Now change the password using Cognito
        const changeCommand = new ChangePasswordCommand({
          AccessToken: cognitoAccessToken,
          PreviousPassword: currentPassword,
          ProposedPassword: newPassword,
        });

        await cognitoClient.send(changeCommand);

        auditLog("CHANGE_PASSWORD_SUCCESS", {
          userId,
          email: user.email,
          authType: "cognito",
          result: "SUCCESS",
          ...metadata,
        });

        console.log(`[AUTH] Password changed successfully for Cognito user ${user.email}`);

        return createSuccessResponse(
          200,
          { success: true },
          event
        );
      } catch (cognitoError) {
        const errorName = cognitoError.name || cognitoError.code;

        // NotAuthorizedException - incorrect current password
        if (errorName === "NotAuthorizedException") {
          auditLog("CHANGE_PASSWORD_FAILED", {
            reason: "incorrect_current_password",
            userId,
            result: "FAILURE",
            ...metadata,
          });
          return errorResponse(
            401,
            ERROR_CODES.INVALID_CREDENTIALS,
            "Current password is incorrect",
            {},
            event
          );
        }

        // InvalidPasswordException - new password doesn't meet requirements
        if (errorName === "InvalidPasswordException") {
          return errorResponse(
            400,
            "AUTH_011",
            "New password does not meet requirements",
            {},
            event
          );
        }

        // LimitExceededException - too many attempts
        if (errorName === "LimitExceededException") {
          return errorResponse(
            429,
            "AUTH_012",
            "Too many attempts. Please try again later.",
            {},
            event
          );
        }

        console.error("[AUTH] Cognito change password error:", cognitoError);
        throw cognitoError;
      }
    } else {
      // For database users, verify current password and update hash
      const validCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash || "");

      if (!validCurrentPassword) {
        auditLog("CHANGE_PASSWORD_FAILED", {
          reason: "incorrect_current_password",
          userId,
          result: "FAILURE",
          ...metadata,
        });
        return errorResponse(
          401,
          ERROR_CODES.INVALID_CREDENTIALS,
          "Current password is incorrect",
          {},
          event
        );
      }

      // Hash and store new password
      const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await pool.query(
        `UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE "recordId" = $2`,
        [newPasswordHash, userId]
      );

      auditLog("CHANGE_PASSWORD_SUCCESS", {
        userId,
        email: user.email,
        authType: "database",
        result: "SUCCESS",
        ...metadata,
      });

      console.log(`[AUTH] Password changed successfully for database user ${user.email}`);

      return createSuccessResponse(
        200,
        { success: true },
        event
      );
    }
  } catch (err) {
    console.error("[AUTH] Change password error:", err);
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to change password",
      {
        error: err,
        context: { action: "changePassword" },
        event,
      }
    );
  }
}

/**
 * Get all active sessions for the current user
 *
 * @param {Object} event - Lambda event with JWT token
 * @returns {Object} Lambda response with sessions array
 */
async function getSessions(event) {
  const metadata = getRequestMetadata(event);

  try {
    // Extract access token to identify the user
    const accessToken = extractAccessToken(event);

    if (!accessToken) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Verify the token and extract user info
    let payload;
    try {
      payload = verifyJWT(accessToken);
    } catch (tokenError) {
      return errorResponse(
        401,
        ERROR_CODES.INVALID_TOKEN,
        "Invalid or expired token",
        {},
        event
      );
    }

    const userId = payload.sub;
    const currentSessionId = payload.sessionId;

    if (!userId) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    const pool = getPool();

    // Get all active sessions for this user
    // Handle case where auth_session table may not exist yet
    let sessions = [];
    try {
      const result = await pool.query(
        `SELECT "sessionId", "userAgent", "ipAddress", "createdAt", "lastActive"
         FROM "AuthSession"
         WHERE "userId" = $1 AND "isRevoked" = FALSE
         ORDER BY "lastActive" DESC`,
        [userId]
      );

      sessions = result.rows.map((row) => ({
        sessionId: row.sessionId,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
        lastActive: row.lastActive,
        isCurrentSession: row.sessionId === currentSessionId,
      }));
    } catch (queryErr) {
      // Table may not exist yet - return empty array
      console.warn("[AUTH] Could not query auth_session table:", queryErr.message);
      sessions = [];
    }

    console.log(`[AUTH] Retrieved ${sessions.length} sessions for user ${userId}`);

    return createSuccessResponse(200, sessions, event);
  } catch (err) {
    console.error("[AUTH] Get sessions error:", err);
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to retrieve sessions",
      {
        error: err,
        context: { action: "getSessions" },
        event,
      }
    );
  }
}

/**
 * Revoke a specific session by ID
 *
 * @param {Object} event - Lambda event with JWT token and session ID in path
 * @returns {Object} Lambda response
 */
async function revokeSession(event) {
  const metadata = getRequestMetadata(event);

  try {
    // Extract session ID from path
    const path = event.rawPath || event.path;
    const sessionIdToRevoke = path.split("/").pop();

    if (!sessionIdToRevoke || sessionIdToRevoke === "sessions") {
      return errorResponse(
        400,
        ERROR_CODES.MISSING_FIELDS,
        "Session ID is required",
        {},
        event
      );
    }

    // Extract access token to identify the user
    const accessToken = extractAccessToken(event);

    if (!accessToken) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Verify the token and extract user info
    let payload;
    try {
      payload = verifyJWT(accessToken);
    } catch (tokenError) {
      return errorResponse(
        401,
        ERROR_CODES.INVALID_TOKEN,
        "Invalid or expired token",
        {},
        event
      );
    }

    const userId = payload.sub;
    const currentSessionId = payload.sessionId;

    if (!userId) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Prevent revoking the current session
    if (sessionIdToRevoke === currentSessionId) {
      return errorResponse(
        400,
        "AUTH_013",
        "Cannot revoke your current session. Use logout instead.",
        {},
        event
      );
    }

    const pool = getPool();

    // Verify session belongs to user and revoke it
    const result = await pool.query(
      `UPDATE "AuthSession"
       SET "isRevoked" = TRUE
       WHERE "sessionId" = $1 AND "userId" = $2 AND "isRevoked" = FALSE
       RETURNING "sessionId"`,
      [sessionIdToRevoke, userId]
    );

    if (result.rowCount === 0) {
      return errorResponse(
        404,
        "AUTH_014",
        "Session not found or already revoked",
        {},
        event
      );
    }

    auditLog("SESSION_REVOKED", {
      userId,
      revokedSessionId: sessionIdToRevoke,
      result: "SUCCESS",
      ...metadata,
    });

    console.log(`[AUTH] Revoked session ${sessionIdToRevoke} for user ${userId}`);

    return createSuccessResponse(200, { success: true }, event);
  } catch (err) {
    console.error("[AUTH] Revoke session error:", err);
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to revoke session",
      {
        error: err,
        context: { action: "revokeSession" },
        event,
      }
    );
  }
}

/**
 * Revoke all sessions except the current one
 *
 * @param {Object} event - Lambda event with JWT token
 * @returns {Object} Lambda response
 */
async function revokeAllSessions(event) {
  const metadata = getRequestMetadata(event);

  try {
    // Extract access token to identify the user
    const accessToken = extractAccessToken(event);

    if (!accessToken) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    // Verify the token and extract user info
    let payload;
    try {
      payload = verifyJWT(accessToken);
    } catch (tokenError) {
      return errorResponse(
        401,
        ERROR_CODES.INVALID_TOKEN,
        "Invalid or expired token",
        {},
        event
      );
    }

    const userId = payload.sub;
    const currentSessionId = payload.sessionId;

    if (!userId) {
      return errorResponse(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Unauthorized",
        {},
        event
      );
    }

    const pool = getPool();

    // Revoke all sessions except the current one
    let result;
    if (currentSessionId) {
      result = await pool.query(
        `UPDATE "AuthSession"
         SET "isRevoked" = TRUE
         WHERE "userId" = $1 AND "sessionId" != $2 AND "isRevoked" = FALSE
         RETURNING "sessionId"`,
        [userId, currentSessionId]
      );
    } else {
      // If no current session ID, revoke all sessions
      result = await pool.query(
        `UPDATE "AuthSession"
         SET "isRevoked" = TRUE
         WHERE "userId" = $1 AND "isRevoked" = FALSE
         RETURNING "sessionId"`,
        [userId]
      );
    }

    const revokedCount = result.rowCount;

    auditLog("ALL_SESSIONS_REVOKED", {
      userId,
      revokedCount,
      currentSessionId,
      result: "SUCCESS",
      ...metadata,
    });

    console.log(`[AUTH] Revoked ${revokedCount} sessions for user ${userId}`);

    return createSuccessResponse(200, { success: true, revokedCount }, event);
  } catch (err) {
    console.error("[AUTH] Revoke all sessions error:", err);
    return errorResponse(
      500,
      ERROR_CODES.INTERNAL_ERROR,
      "Failed to revoke sessions",
      {
        error: err,
        context: { action: "revokeAllSessions" },
        event,
      }
    );
  }
}
