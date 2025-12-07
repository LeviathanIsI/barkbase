/**
 * =============================================================================
 * BarkBase CDK Configuration
 * =============================================================================
 * 
 * Centralized configuration for all CDK stacks.
 * Supports dev and prod environments with appropriate sizing.
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';

export type Environment = 'dev' | 'prod';

export interface BarkbaseConfig {
  readonly env: Environment;
  readonly account: string;
  readonly region: string;
  readonly stackPrefix: string;
  readonly dbInstanceClass: string;
  readonly dbMultiAz: boolean;
  readonly natGateways: number;
  readonly corsOrigins: string[];
}

/**
 * Get configuration for the specified environment
 */
export function getConfig(app: cdk.App): BarkbaseConfig {
  const env = (app.node.tryGetContext('env') as Environment) || 'dev';
  const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID || '';
  const region = 'us-east-2';

  const baseConfig = {
    account,
    region,
    env,
    stackPrefix: `barkbase-${env}`,
  };

  if (env === 'prod') {
    return {
      ...baseConfig,
      dbInstanceClass: 'r5.large',
      dbMultiAz: true,
      natGateways: 2,
      corsOrigins: [
        'https://barkbase.io',
        'https://www.barkbase.io',
        'https://app.barkbase.io',
      ],
    };
  }

  // Dev environment
  const devCorsOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://dpje7tx2bkwa2.cloudfront.net', // Dev frontend CloudFront
  ];

  return {
    ...baseConfig,
    dbInstanceClass: 't3.micro',
    dbMultiAz: false,
    natGateways: 1,
    corsOrigins: devCorsOrigins,
  };
}

/**
 * Get CDK environment for stack deployment
 * Returns undefined for environment-agnostic stacks if account is not set
 */
export function getCdkEnv(config: BarkbaseConfig): cdk.Environment | undefined {
  // If account is not set, return undefined for environment-agnostic deployment
  // This allows CDK to use the CLI's configured credentials
  if (!config.account) {
    return undefined;
  }
  
  return {
    account: config.account,
    region: config.region,
  };
}

