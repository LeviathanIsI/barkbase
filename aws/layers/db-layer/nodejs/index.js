const pg = require('pg');
const { Pool } = pg;
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

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

	return {
		host,
		port,
		database,
		user,
		password,
		ssl: { rejectUnauthorized: false },
		max: 5,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 10000,
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

// Import JWT validator from auth layer
const { JWTValidator } = require('/opt/auth/nodejs/jwt-validator');

// Create a singleton JWT validator instance
let jwtValidator = null;
const getJWTValidator = () => {
    if (!jwtValidator) {
        jwtValidator = new JWTValidator({
            region: process.env.AWS_REGION || 'us-east-1',
            userPoolId: process.env.USER_POOL_ID,
            clientId: process.env.CLIENT_ID
        });
    }
    return jwtValidator;
};

module.exports = {
	getPool,
	testConnection,
	getTenantIdFromEvent,
	getJWTValidator,
};

// Cache for Cognito sub -> tenantId lookups (in-memory per Lambda instance)
const tenantIdCache = new Map();

/**
 * Extract tenantId from API Gateway HTTP API event.
 * Priority: JWT claims -> Database lookup by Cognito sub
 */
async function getTenantIdFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
    
    // First check if tenantId is in JWT claims (for custom attributes)
    const claimTenant = claims["tenantId"] || claims["custom:tenantId"] || null;
    if (claimTenant) {
        return claimTenant;
    }

    // Extract Cognito sub (user ID) from JWT
    const cognitoSub = claims["sub"] || null;
    if (!cognitoSub) {
        console.warn('[getTenantIdFromEvent] No tenantId in claims and no Cognito sub found');
        return null;
    }

    // Check cache first
    if (tenantIdCache.has(cognitoSub)) {
        return tenantIdCache.get(cognitoSub);
    }

    // Query database to get tenantId
    try {
        const pool = getPool();
        const result = await pool.query(
            `SELECT m."tenantId" 
             FROM "Membership" m
             INNER JOIN "User" u ON u."recordId" = m."userId"
             WHERE u."cognitoSub" = $1
             LIMIT 1`,
            [cognitoSub]
        );

        if (result.rows.length === 0) {
            console.warn(`[getTenantIdFromEvent] No tenant found for Cognito sub: ${cognitoSub}`);
            return null;
        }

        const tenantId = result.rows[0].tenantId;
        tenantIdCache.set(cognitoSub, tenantId); // Cache for future requests
        console.log(`[getTenantIdFromEvent] Found tenantId ${tenantId} for Cognito sub ${cognitoSub}`);
        return tenantId;
    } catch (error) {
        console.error('[getTenantIdFromEvent] Database query failed:', error);
        return null;
    }
}
