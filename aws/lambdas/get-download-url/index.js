const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET;
const DOWNLOAD_EXPIRATION_SECONDS = 300; // 5 minutes

const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
};

exports.handler = async (event) => {
    try {
        // Validate bucket configuration
        if (!BUCKET_NAME) {
            console.error('S3_BUCKET environment variable is not configured');
            return {
                statusCode: 500,
                headers: HEADERS,
                body: JSON.stringify({ error: 'CONFIGURATION_ERROR', message: 'Download service is not configured correctly' }),
            };
        }

        // Support both GET (query params) and POST (body)
        let fileKey;
        let forceDownload = false;
        
        if (event.httpMethod === 'POST' || event.requestContext?.http?.method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            fileKey = body.key;
            forceDownload = body.forceDownload === true;
        } else {
            fileKey = event.queryStringParameters?.key;
            forceDownload = event.queryStringParameters?.forceDownload === 'true';
        }

        if (!fileKey) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ error: 'INVALID_INPUT', message: 'File key is required' }),
            };
        }

        // Authorization check: Ensure the requested key belongs to the user's tenant.
        const tenantId = event.requestContext?.authorizer?.jwt?.claims?.tenantId
            || event.requestContext?.authorizer?.jwt?.claims?.['custom:tenantId']
            || event.headers['x-tenant-id']
            || event.headers['X-Tenant-Id'];

        if (!tenantId) {
            return {
                statusCode: 401,
                headers: HEADERS,
                body: JSON.stringify({ error: 'UNAUTHORIZED', message: 'Missing tenant information' }),
            };
        }

        // Verify tenant ownership of the file
        // Key format: `uploads/{tenantId}/...`
        if (!fileKey.startsWith(`uploads/${tenantId}/`)) {
            console.warn(`[SECURITY] Tenant ${tenantId} attempted to access file: ${fileKey}`);
            return {
                statusCode: 403,
                headers: HEADERS,
                body: JSON.stringify({ error: 'FORBIDDEN', message: 'You do not have access to this file' }),
            };
        }

        // Extract filename from key for Content-Disposition header
        const fileName = fileKey.split('/').pop();
        
        const commandOptions = {
            Bucket: BUCKET_NAME,
            Key: fileKey,
        };
        
        // If forceDownload, set Content-Disposition to attachment to trigger browser download
        if (forceDownload && fileName) {
            commandOptions.ResponseContentDisposition = `attachment; filename="${fileName}"`;
        }
        
        const command = new GetObjectCommand(commandOptions);

        const downloadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: DOWNLOAD_EXPIRATION_SECONDS,
        });

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({ downloadUrl }),
        };

    } catch (error) {
        console.error('Error generating pre-signed download URL:', error);

        // Handle cases where the file doesn't exist
        if (error.name === 'NoSuchKey') {
            return {
                statusCode: 404,
                headers: HEADERS,
                body: JSON.stringify({ error: 'NOT_FOUND', message: 'File not found' }),
            };
        }

        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Failed to generate download URL' }),
        };
    }
};
