const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const UPLOAD_EXPIRATION_SECONDS = 300; // 5 minutes

const HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

exports.handler = async (event) => {
	console.log('Received event:', JSON.stringify(event, null, 2));

	try {
		const body = JSON.parse(event.body);
		const { fileName, fileType } = body;

		if (!fileName || !fileType) {
			return {
				statusCode: 400,
				headers: HEADERS,
				body: JSON.stringify({ message: 'fileName and fileType are required' }),
			};
		}

		// Add tenantId to the path for organization and security
		const tenantId = event.requestContext?.authorizer?.jwt?.claims?.tenantId
			|| event.requestContext?.authorizer?.jwt?.claims?.['custom:tenantId']
			|| event.headers['x-tenant-id']
			|| 'unauthenticated';
		
		// Generate a unique key for the file
		const timestamp = Date.now();
		const key = `uploads/${tenantId}/${timestamp}-${fileName}`;

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			ContentType: fileType,
			ServerSideEncryption: 'aws:kms',
			// Optional: if specific CMK is needed, pass SSEKMSKeyId via bucket policy default KMS key
		});

		const uploadUrl = await getSignedUrl(s3Client, command, {
			expiresIn: UPLOAD_EXPIRATION_SECONDS,
		});

		const publicUrl = CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : '';

		return {
			statusCode: 200,
			headers: HEADERS,
			body: JSON.stringify({
				uploadUrl,
				key,
				publicUrl,
			}),
		};

	} catch (error) {
		console.error('Error generating pre-signed URL:', error);
		return {
			statusCode: 500,
			headers: HEADERS,
			body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
		};
	}
};
