const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    // This Lambda ONLY handles OPTIONS requests
    // Always return 200 OK with CORS headers
    return {
        statusCode: 200,
        headers: HEADERS,
        body: ''
    };
};
