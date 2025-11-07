const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET;
const DOWNLOAD_EXPIRATION_SECONDS = 300; // 5 minutes

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,GET'
};

exports.handler = async (event) => {

    try {
        const fileKey = event.queryStringParameters?.key;
        if (!fileKey) {
            return {
                statusCode: 400,
                headers: HEADERS,
                body: JSON.stringify({ message: 'File key is required' }),
            };
        }

        // Authorization check: Ensure the requested key belongs to the user's tenant.
        const tenantId = event.requestContext?.authorizer?.jwt?.claims?.tenantId
            || event.requestContext?.authorizer?.jwt?.claims?.['custom:tenantId']
            || event.headers['x-tenant-id'];
        if (!tenantId) {
             return {
                statusCode: 401,
                headers: HEADERS,
                body: JSON.stringify({ message: 'Unauthorized: Missing tenant information' }),
            };
        }

        // Example key format: `uploads/tenant-id/timestamp-filename.jpg`
        if (!fileKey.startsWith(`uploads/${tenantId}/`)) {
             return {
                statusCode: 403,
                headers: HEADERS,
                body: JSON.stringify({ message: 'Forbidden: You do not have access to this file' }),
            };
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileKey,
        });

        const downloadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: DOWNLOAD_EXPIRATION_SECONDS,
        });

        return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({
                downloadUrl,
            }),
        };

    } catch (error) {
        console.error('Error generating pre-signed download URL:', error);
        // Handle cases where the file doesn't exist
        if (error.name === 'NoSuchKey') {
            return {
                statusCode: 404,
                headers: HEADERS,
                body: JSON.stringify({ message: 'File not found' }),
            };
        }
        return {
            statusCode: 500,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};
