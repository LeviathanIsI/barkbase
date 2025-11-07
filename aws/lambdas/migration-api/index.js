const { getPool } = require('/opt/nodejs');

exports.handler = async (event) => {
    const HEADERS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    };

    try {
        if (event.requestContext.http.method === 'POST') {
            const pool = getPool();


            // Add SUCCESSFUL to PaymentStatus enum if it doesn't exist
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'PaymentStatus'
                        AND e.enumlabel = 'SUCCESSFUL'
                    ) THEN
                        ALTER TYPE "PaymentStatus" ADD VALUE 'SUCCESSFUL' BEFORE 'REFUNDED';
                        RAISE NOTICE 'Added SUCCESSFUL to PaymentStatus enum';
                    ELSE
                        RAISE NOTICE 'SUCCESSFUL already exists in PaymentStatus enum';
                    END IF;
                END
                $$;
            `);


            return {
                statusCode: 200,
                headers: HEADERS,
                body: JSON.stringify({
                    message: 'Migration completed successfully',
                    changes: 'Added SUCCESSFUL to PaymentStatus enum'
                })
            };
        }

        return {
            statusCode: 405,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Method not allowed' })
        };
    } catch (error) {
        console.error('Migration error:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({
                message: 'Migration failed',
                error: error.message
            })
        };
    }
};
