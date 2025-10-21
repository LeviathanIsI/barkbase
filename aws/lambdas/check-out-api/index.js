const { getPool } = require('/opt/nodejs');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

exports.handler = async (event) => {
    const bookingId = event.pathParameters?.id;
    const tenantId = event.headers['x-tenant-id'];
    
    if (!bookingId || !tenantId) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Booking ID and Tenant ID are required' }),
        };
    }

    const body = JSON.parse(event.body || '{}');
    const { staffId, extraCharges, signatureUrl } = body;

    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Update the booking status to CHECKED_OUT or COMPLETED
        // The exact status might depend on whether payment is settled.
        // For now, we'll use CHECKED_OUT.
        const bookingUpdateResult = await client.query(
            'UPDATE "Booking" SET "status" = \'CHECKED_OUT\' WHERE "recordId" = $1 AND "tenantId" = $2 RETURNING "recordId"',
            [bookingId, tenantId]
        );

        if (bookingUpdateResult.rowCount === 0) {
            throw new Error('Booking not found or you do not have permission to update it.');
        }

        // 2. Create a new record in the CheckOut table
        const checkOutInsertResult = await client.query(
            `INSERT INTO "CheckOut" ("recordId", "tenantId", "bookingId", "staffId", "extraCharges", "signatureUrl", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW()) RETURNING *`,
            [tenantId, bookingId, staffId, JSON.stringify(extraCharges || {}), signatureUrl]
        );

        // TODO: Handle payment processing logic here (e.g., capturing final payment)

        await client.query('COMMIT');

        return {
            statusCode: 201,
            headers: HEADERS,
            body: JSON.stringify(checkOutInsertResult.rows[0]),
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during check-out process:', error);
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    } finally {
        client.release();
    }
};
