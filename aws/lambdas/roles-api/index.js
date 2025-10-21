const { getPool } = require('/opt/nodejs');
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id', 'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT' };

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const tenantId = event.headers['x-tenant-id'];
    if (!tenantId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Missing x-tenant-id' }) };

    try {
        // Return predefined roles (OWNER, ADMIN, STAFF, READONLY)
        const roles = [
            { recordId: 'OWNER', name: 'Owner', permissions: ['*'] },
            { recordId: 'ADMIN', name: 'Admin', permissions: ['bookings:*', 'pets:*', 'owners:*'] },
            { recordId: 'STAFF', name: 'Staff', permissions: ['bookings:read', 'pets:read'] },
            { recordId: 'READONLY', name: 'Read Only', permissions: ['*:read'] }
        ];
        
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify(roles) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};

