const pg = require('pg');
const { Pool } = pg;
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');
const path = require('path');

const secretsClient = new SecretsManagerClient({});
let cachedSecret = null;
let cachedSecretId = null;

async function getDbConfig() {
	// Prefer explicit environment for proxy endpoint
	const host = process.env.DB_HOST;
	const port = process.env.DB_PORT || '5432';
	const database = process.env.DB_NAME;
	let user = process.env.DB_USER;
	let password = process.env.DB_PASSWORD;

	// Optional: if DB_SECRET_ID provided, pull latest creds (supports rotation)
	const secretId = process.env.DB_SECRET_ID || null;
	if (secretId) {
		if (!cachedSecret || cachedSecretId !== secretId) {
			console.log('[db-layer] Fetching DB secret from Secrets Manager:', secretId);
			const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
			const parsed = JSON.parse(res.SecretString || '{}');
			cachedSecret = parsed;
			cachedSecretId = secretId;
		}
		user = cachedSecret.username || user;
		password = cachedSecret.password || password;
	}

	console.log('[db-layer] DB config resolved', {
		host,
		port,
		database,
		usingSecret: !!secretId,
		userPresent: !!user,
	});

	// SECURITY: Configure SSL based on environment
	const environment = process.env.ENVIRONMENT || 'production';
	const isProduction = environment === 'production' || environment === 'staging';

	let sslConfig;
	if (isProduction) {
		// Production: Enable SSL certificate validation
		const caPath = path.join(__dirname, 'rds-ca-bundle.pem');

		if (fs.existsSync(caPath)) {
			// Use RDS CA bundle for certificate validation
			sslConfig = {
				rejectUnauthorized: true,
				ca: fs.readFileSync(caPath).toString()
			};
			console.log('[DB] SSL enabled with certificate validation');
		} else {
			// CA bundle missing - log warning but allow connection
			console.warn('[DB] WARNING: RDS CA bundle not found, SSL validation disabled!');
			console.warn('[DB] Download from: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem');
			sslConfig = { rejectUnauthorized: false };
		}
	} else {
		// Development: Disable SSL validation for local development
		sslConfig = { rejectUnauthorized: false };
		console.log('[DB] SSL validation disabled (development mode)');
	}

	return {
		host,
		port,
		database,
		user,
		password,
		ssl: sslConfig,
		max: 10,  // Increased from 5 for better performance
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 10000,
		statement_timeout: 30000,  // 30 second query timeout
	};
}

// Singleton pool with lazy async initialization compatible with existing callers
let poolInstance = null;
let poolInitPromise = null;

async function ensurePool() {
    if (poolInstance) return poolInstance;
    if (!poolInitPromise) {
        poolInitPromise = (async () => {
            console.log('Initializing database connection pool...');
            const config = await getDbConfig();
            const created = new Pool(config);
            created.on('error', (err) => {
                console.error('Unexpected error on idle client', err);
            });
            poolInstance = created;
            return created;
        })();
    }
    return await poolInitPromise;
}

function getPool() {
    // Return a light wrapper that awaits the real pool under the hood.
    // This keeps existing call sites unchanged: await pool.query(...)
    return {
        query: async (...args) => (await ensurePool()).query(...args),
        connect: async () => (await ensurePool()).connect(),
        end: async () => (await ensurePool()).end(),
    };
}

async function testConnection() {
	const pool = getPool();
	let client = null;
	try {
		console.log('Acquiring client from pool...');
		client = await pool.connect();
		console.log('Successfully connected to the database!');
		const res = await client.query('SELECT NOW()');
		console.log('Current time from DB:', res.rows[0].now);
		return { success: true };
	} catch (err) {
		console.error('Failed to connect to the database:', err);
		return { success: false, error: err.message };
	} finally {
		if (client) {
			client.release();
			console.log('Client released back to the pool.');
		}
	}
}

// Lazy-load JWT validator to avoid circular dependency issues
// At Lambda runtime, both auth-layer and db-layer are merged in /opt/nodejs
let jwtValidator = null;
let JWTValidator = null;

const getJWTValidator = () => {
    if (!jwtValidator) {
        try {
            // Load JWTValidator from auth-layer's jwt-validator.js
            // IMPORTANT: Don't use require('/opt/nodejs') as that returns this file's exports!
            // The auth-layer files are at /opt/nodejs/jwt-validator.js when layers are merged
            if (!JWTValidator) {
                try {
                    // Direct path to jwt-validator in merged layers
                    const jwtValidatorModule = require('/opt/nodejs/jwt-validator');
                    JWTValidator = jwtValidatorModule.JWTValidator;
                    console.log('[JWT] Successfully loaded JWTValidator from /opt/nodejs/jwt-validator');
                } catch (e) {
                    console.error('[JWT] Failed to load JWTValidator:', e.message);
                    throw new Error('JWTValidator module not found. Ensure auth-layer is attached to this Lambda.');
                }
            }

            const userPoolId = process.env.USER_POOL_ID || process.env.COGNITO_USER_POOL_ID;
            const clientId = process.env.CLIENT_ID || process.env.COGNITO_CLIENT_ID;

            if (!userPoolId || !clientId) {
                console.error('[JWT] Missing USER_POOL_ID or CLIENT_ID environment variables');
                console.error('[JWT] USER_POOL_ID:', userPoolId);
                console.error('[JWT] CLIENT_ID:', clientId);
                throw new Error('JWT configuration missing: USER_POOL_ID and CLIENT_ID required');
            }

            console.log('[JWT] Creating JWTValidator with userPoolId:', userPoolId);
            jwtValidator = new JWTValidator({
                region: process.env.AWS_REGION || 'us-east-1',
                userPoolId: userPoolId,
                clientId: clientId
            });
        } catch (error) {
            console.error('[JWT] Failed to initialize JWTValidator:', error.message);
            throw error;
        }
    }
    return jwtValidator;
};

module.exports = {
	getPool,
	testConnection,
	getTenantIdFromEvent,
	getJWTValidator,
	validateJWTFromEvent,
};

// Cache for Cognito sub -> tenantId lookups (in-memory per Lambda instance)
const tenantIdCache = new Map();

/**
 * Extract user info from event by validating JWT token.
 * This is used when API Gateway authorizer is not configured.
 * Returns { sub, tenantId, email, role } or null if validation fails.
 */
async function validateJWTFromEvent(event) {
    const authHeader = event?.headers?.Authorization || event?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[validateJWTFromEvent] No Authorization header found');
        return null;
    }

    try {
        const jwtValidator = getJWTValidator();
        const userInfo = await jwtValidator.validateRequest(event);
        console.log('[validateJWTFromEvent] JWT validated successfully:', {
            sub: userInfo.sub,
            tenantId: userInfo.tenantId,
            tokenType: userInfo.tokenType
        });
        return userInfo;
    } catch (error) {
        console.error('[validateJWTFromEvent] JWT validation failed:', error.message);
        return null;
    }
}

/**
 * Extract tenantId from API Gateway HTTP API event.
 * Priority: 
 * 1. API Gateway JWT authorizer claims
 * 2. Manual JWT validation (when no authorizer)
 * 3. X-Tenant-Id header (fallback)
 * 4. Database lookup by user sub
 */
async function getTenantIdFromEvent(event) {
    // 1. Try API Gateway JWT authorizer claims first
    const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
    
    let claimTenant = claims["tenantId"] || claims["custom:tenantId"] || null;
    let cognitoSub = claims["sub"] || null;

    // 2. If no API Gateway claims, try manual JWT validation
    if (!claimTenant && !cognitoSub) {
        console.log('[getTenantIdFromEvent] No API Gateway claims, trying manual JWT validation...');
        const userInfo = await validateJWTFromEvent(event);
        if (userInfo) {
            claimTenant = userInfo.tenantId;
            cognitoSub = userInfo.sub || userInfo.userId;
            console.log('[getTenantIdFromEvent] Got user info from JWT:', { tenantId: claimTenant, sub: cognitoSub });
        }
    }

    // Return tenant from claims/JWT if found
    if (claimTenant) {
        return claimTenant;
    }

    // 3. Try X-Tenant-Id header as fallback
    const headerTenant = event?.headers?.['x-tenant-id'] || event?.headers?.['X-Tenant-Id'];
    if (headerTenant && cognitoSub) {
        // We have a user but no tenant in token - trust the header
        console.log('[getTenantIdFromEvent] Using X-Tenant-Id header:', headerTenant);
        return headerTenant;
    }

    if (!cognitoSub) {
        console.warn('[getTenantIdFromEvent] No tenantId and no user sub found');
        return null;
    }

    // 4. Check cache
    if (tenantIdCache.has(cognitoSub)) {
        return tenantIdCache.get(cognitoSub);
    }

    // 5. Query database to get tenantId
    try {
        const pool = getPool();
        const result = await pool.query(
            `SELECT m."tenantId" 
             FROM "Membership" m
             INNER JOIN "User" u ON u."recordId" = m."userId"
             WHERE u."cognitoSub" = $1 OR u."recordId" = $1
             LIMIT 1`,
            [cognitoSub]
        );

        if (result.rows.length === 0) {
            console.warn(`[getTenantIdFromEvent] No tenant found for user: ${cognitoSub}`);
            // Fall back to header if available
            if (headerTenant) {
                console.log('[getTenantIdFromEvent] Falling back to X-Tenant-Id header:', headerTenant);
                return headerTenant;
            }
            return null;
        }

        const tenantId = result.rows[0].tenantId;
        tenantIdCache.set(cognitoSub, tenantId); // Cache for future requests
        console.log(`[getTenantIdFromEvent] Found tenantId ${tenantId} for user ${cognitoSub}`);
        return tenantId;
    } catch (error) {
        console.error('[getTenantIdFromEvent] Database query failed:', error);
        // Fall back to header on DB error
        if (headerTenant) {
            console.log('[getTenantIdFromEvent] DB failed, using X-Tenant-Id header:', headerTenant);
            return headerTenant;
        }
        return null;
    }
}
