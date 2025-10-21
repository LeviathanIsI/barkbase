const pg = require('pg');
const { Pool } = pg;

// Use a self-invoking function to create a singleton pool
const getPool = (() => {
    let pool;

    return () => {
        if (!pool) {
            console.log('Creating new database connection pool.');
            pool = new Pool({
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                database: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                // SSL is required for most managed PostgreSQL instances
                ssl: {
                    rejectUnauthorized: false // Required for RDS/managed databases
                },
                // Free Tier RDS instances can handle a few connections, but we'll be conservative.
                // Lambda's concurrency model means we might have several containers running.
                max: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
            });

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
};
