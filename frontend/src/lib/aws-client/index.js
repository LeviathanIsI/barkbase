import { LambdaAuthClient } from './lambda-auth-client';
import { CognitoPasswordClient } from './cognito-password-client';
import { DbAuthClient } from './db-auth-client';
import { S3Client } from './aws-s3-client';
import { ApiClient } from './aws-api-client';

/**
 * Factory function to create a new AWS client.
 * This client is designed to mimic the Supabase client's interface.
 * @param {object} config - Configuration for the AWS services.
 * @param {string} config.region - The AWS region.
 * @param {string} config.apiUrl - The base URL for the API Gateway.
 */
export const createAWSClient = (config) => {
  const mode = (import.meta.env.VITE_AUTH_MODE || 'hosted').toLowerCase();
  const auth = mode === 'password'
    ? new CognitoPasswordClient(config)
    : mode === 'db'
      ? new DbAuthClient(config)
      : new LambdaAuthClient(config);

  return {
    auth,
    storage: new S3Client(config, auth),
    from: (table) => new ApiClient(table, config, auth),
  };
};
