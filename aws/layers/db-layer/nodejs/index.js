const pg = require('pg');
const { Pool } = pg;
const jwt = require('jsonwebtoken');
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
			const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
			const parsed = JSON.parse(res.SecretString || '{}');
			cachedSecret = parsed;
			cachedSecretId = secretId;
		}
		user = cachedSecret.username || user;
		password = cachedSecret.password || password;
	}

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

// Use a self-invoking function to create a singleton pool
const getPool = (() => {
	let pool;

	return () => {
		if (!pool) {
			console.log('Creating new database connection pool.');
			pool = new Pool(async () => await getDbConfig());

			pool.on('error', (err, client) => {
				console.error('Unexpected error on idle client', err);
				// We don't exit here because the pool will attempt to recover.
			});
		}
		return pool;
	};
})();

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

module.exports = {
	getPool,
	testConnection,
	getTenantIdFromEvent,
};

/**
 * Extract tenantId from API Gateway HTTP API event.
 * Priority: JWT authorizer claims -> x-tenant-id header (temporary fallback).
 */
function getTenantIdFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
    const claimTenant = claims["tenantId"] || claims["custom:tenantId"] || null;
    return claimTenant;
}
