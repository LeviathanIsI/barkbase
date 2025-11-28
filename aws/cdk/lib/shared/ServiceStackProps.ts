/**
 * Shared Props Interface for BarkBase Service Stacks
 * 
 * This interface defines the common properties required by all service stacks
 * that contain Lambda functions needing VPC access, database connectivity,
 * and Cognito authentication.
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Common props for all service stacks that host Lambda functions.
 */
export interface ServiceStackProps extends cdk.StackProps {
  /**
   * VPC where Lambdas will be deployed for RDS access.
   */
  vpc: ec2.IVpc;

  /**
   * Security group for Lambda functions.
   * Must allow outbound to RDS security group on port 5432.
   */
  lambdaSecurityGroup: ec2.ISecurityGroup;

  /**
   * Private subnets for Lambda VPC placement.
   */
  appSubnets: ec2.ISubnet[];

  /**
   * Secrets Manager secret containing database credentials.
   * Format: { username, password, host, port, dbname, engine }
   */
  dbSecret: secretsmanager.ISecret;

  /**
   * Database hostname (RDS endpoint).
   */
  dbHost: string;

  /**
   * Database port (typically 5432 for PostgreSQL).
   */
  dbPort: string;

  /**
   * Database name (typically 'barkbase').
   */
  dbName: string;

  /**
   * Deployment stage (dev, staging, prod).
   */
  stage: string;

  /**
   * Environment name (dev, staging, prod).
   * Often same as stage but can differ.
   */
  environment: string;

  /**
   * Cognito User Pool ID for authentication.
   */
  userPoolId: string;

  /**
   * Cognito App Client ID.
   */
  clientId: string;

  /**
   * Optional: S3 bucket name for file uploads.
   */
  s3BucketName?: string;

  /**
   * Optional: KMS key ID for S3 encryption.
   */
  s3KmsKeyId?: string;

  /**
   * Optional: CloudFront distribution domain.
   */
  cloudfrontDomain?: string;
}

/**
 * Build the standard Lambda environment variables object.
 * All service Lambdas should use the same env var names for consistency.
 */
export function buildLambdaEnvironment(props: ServiceStackProps): Record<string, string> {
  const env: Record<string, string> = {
    // Database
    DB_HOST: props.dbHost,
    DB_PORT: props.dbPort,
    DB_NAME: props.dbName,
    DB_SECRET_ID: props.dbSecret.secretName,
    DB_SECRET_ARN: props.dbSecret.secretArn,
    
    // Stage/Environment
    STAGE: props.stage,
    ENVIRONMENT: props.environment,
    
    // Cognito
    USER_POOL_ID: props.userPoolId,
    CLIENT_ID: props.clientId,
  };

  // Optional S3/CloudFront
  if (props.s3BucketName) {
    env.S3_BUCKET = props.s3BucketName;
  }
  if (props.s3KmsKeyId) {
    env.S3_KMS_KEY_ID = props.s3KmsKeyId;
  }
  if (props.cloudfrontDomain) {
    env.CLOUDFRONT_DOMAIN = props.cloudfrontDomain;
  }

  return env;
}

