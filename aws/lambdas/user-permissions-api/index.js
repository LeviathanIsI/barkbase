const { getPool } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id', 'Access-Control-Allow-Methods': 'OPTIONS,GET' };

exports.handler = async (event) => {
    const tenantId = event.headers['x-tenant-id'];
    if (!tenantId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };

    try {
        // Return default permissions based on role
        const permissions = {
            OWNER: ['*'],
            ADMIN: ['bookings:*', 'pets:*', 'owners:*', 'kennels:*', 'staff:*'],
            STAFF: ['bookings:read', 'bookings:update', 'pets:read', 'owners:read'],
            READONLY: ['*:read']
        };
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify(permissions) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

