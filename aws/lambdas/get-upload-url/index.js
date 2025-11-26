const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
	successResponse,
	errorResponse,
	auditLog,
	getRequestMetadata,
} = require('../shared/security-utils');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const UPLOAD_EXPIRATION_SECONDS = 300; // 5 minutes

exports.handler = async (event) => {
	const requestMetadata = getRequestMetadata(event);

	try {
		const body = JSON.parse(event.body || '{}');
		const { fileName, fileType, category } = body;

		if (!fileName || !fileType) {
			auditLog('UPLOAD_URL_REQUEST', {
				...requestMetadata,
				result: 'FAILURE',
			}, { reason: 'Missing required fields' });

			return errorResponse(400, 'INVALID_INPUT', 'fileName and fileType are required', event);
		}

		// Extract tenantId from JWT claims or headers
		const tenantId = event.requestContext?.authorizer?.jwt?.claims?.tenantId
			|| event.requestContext?.authorizer?.jwt?.claims?.['custom:tenantId']
			|| event.headers['x-tenant-id']
			|| event.headers['X-Tenant-Id'];

		if (!tenantId) {
			auditLog('UPLOAD_URL_REQUEST', {
				...requestMetadata,
				result: 'FAILURE',
			}, { reason: 'Missing tenant ID' });

			return errorResponse(401, 'UNAUTHORIZED', 'Missing tenant information', event);
		}

		// Generate a unique key for the file with optional category
		const timestamp = Date.now();
		const categoryPath = category ? `${category}/` : '';
		const key = `uploads/${tenantId}/${categoryPath}${timestamp}-${fileName}`;

		const command = new PutObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
			ContentType: fileType,
			ServerSideEncryption: 'aws:kms',
		});

		const uploadUrl = await getSignedUrl(s3Client, command, {
			expiresIn: UPLOAD_EXPIRATION_SECONDS,
		});

		const publicUrl = CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : '';

		auditLog('UPLOAD_URL_REQUEST', {
			...requestMetadata,
			tenantId,
			result: 'SUCCESS',
		}, { 
			fileName,
			fileType,
			category: category || 'general',
			key,
		});

		return successResponse(200, {
			uploadUrl,
			key,
			publicUrl,
			method: 'PUT',
			expiresIn: UPLOAD_EXPIRATION_SECONDS,
		}, event);

	} catch (error) {
		console.error('Error generating pre-signed URL:', error);

		auditLog('UPLOAD_URL_REQUEST', {
			...requestMetadata,
			result: 'ERROR',
		}, { error: error.message });

		return errorResponse(500, 'INTERNAL_ERROR', 'Failed to generate upload URL', event);
	}
};
