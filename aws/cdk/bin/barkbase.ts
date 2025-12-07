#!/usr/bin/env node
/**
 * =============================================================================
 * BarkBase CDK Application Entry Point
 * =============================================================================
 *
 * Orchestrates the deployment of all BarkBase infrastructure stacks.
 *
 * Usage:
 *   cdk deploy --all -c env=dev   # Deploy development environment
 *   cdk deploy --all -c env=prod  # Deploy production environment
 *
 * ARCHITECTURE NOTE:
 *   Most stacks deploy to us-east-2 (primary region)
 *   ApiCloudFrontStack deploys to us-east-1 (required for CloudFront WAF)
 *
 * =============================================================================
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/NetworkStack';
import { DatabaseStack } from '../lib/DatabaseStack';
import { AuthStack } from '../lib/AuthStack';
import { ServicesStack } from '../lib/ServicesStack';
import { ApiCoreStack } from '../lib/ApiCoreStack';
import { ApiCloudFrontStack } from '../lib/ApiCloudFrontStack';
import { FrontendStack } from '../lib/FrontendStack';
import { MonitoringStack } from '../lib/MonitoringStack';
import { getConfig, getCdkEnv } from '../lib/shared/config';

const app = new cdk.App();
const config = getConfig(app);
const cdkEnv = getCdkEnv(config);

// Environment for CloudFront/WAF stack (MUST be us-east-1)
const usEast1Env: cdk.Environment | undefined = config.account ? {
  account: config.account,
  region: 'us-east-1',
} : undefined;

console.log(`\n🚀 Deploying BarkBase infrastructure for: ${config.env.toUpperCase()}`);
console.log(`📍 Primary Region: ${config.region}`);
console.log(`📍 CloudFront/WAF Region: us-east-1 (required for WAF)`);
console.log(`📦 Stack Prefix: ${config.stackPrefix}\n`);

// =============================================================================
// Stack 1: Network Infrastructure
// =============================================================================
const networkStack = new NetworkStack(app, `${config.stackPrefix}-network`, {
  config,
  env: cdkEnv,
  description: 'BarkBase Network Infrastructure - VPC, Subnets, Security Groups',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});

// =============================================================================
// Stack 2: Database Infrastructure
// =============================================================================
const databaseStack = new DatabaseStack(app, `${config.stackPrefix}-database`, {
  config,
  env: cdkEnv,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  bastionSecurityGroup: networkStack.bastionSecurityGroup,
  dbSecurityGroup: networkStack.dbSecurityGroup,
  description: 'BarkBase Database Infrastructure - PostgreSQL RDS (imported)',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});
databaseStack.addDependency(networkStack);

// =============================================================================
// Stack 3: Authentication Infrastructure
// =============================================================================
const authStack = new AuthStack(app, `${config.stackPrefix}-auth`, {
  config,
  env: cdkEnv,
  description: 'BarkBase Authentication Infrastructure - Cognito User Pool',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});

// =============================================================================
// Stack 4: Services (Lambda Functions & Layers)
// =============================================================================
// NOTE: DATABASE_URL is NOT set here - it must be set via:
// 1. AWS Console Lambda environment variables, OR
// 2. Deployment script that reads from backend/.env.development or .env.production
const servicesStack = new ServicesStack(app, `${config.stackPrefix}-services`, {
  config,
  env: cdkEnv,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  lambdaSubnets: networkStack.privateSubnets,
  userPoolId: authStack.userPool.userPoolId,
  userPoolClientId: authStack.userPoolClient.userPoolClientId,
  jwksUrl: authStack.jwksUrl,
  description: 'BarkBase Services - Lambda Functions and Layers',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});
servicesStack.addDependency(networkStack);
servicesStack.addDependency(authStack);

// =============================================================================
// Stack 5: API Gateway
// =============================================================================
const apiCoreStack = new ApiCoreStack(app, `${config.stackPrefix}-api`, {
  config,
  env: cdkEnv,
  authApiFunction: servicesStack.authApiFunction,
  userProfileFunction: servicesStack.userProfileFunction,
  entityServiceFunction: servicesStack.entityServiceFunction,
  analyticsServiceFunction: servicesStack.analyticsServiceFunction,
  operationsServiceFunction: servicesStack.operationsServiceFunction,
  configServiceFunction: servicesStack.configServiceFunction,
  financialServiceFunction: servicesStack.financialServiceFunction,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
  description: 'BarkBase API Gateway - HTTP API with Lambda Integrations',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});
apiCoreStack.addDependency(servicesStack);

// =============================================================================
// Stack 6: API CloudFront + WAF (DEPLOYED TO us-east-1)
// =============================================================================
// IMPORTANT: This stack MUST be deployed to us-east-1 because:
//   - AWS WAF for CloudFront distributions MUST be in us-east-1
//   - CloudFront is a global service but WAF association requires us-east-1
//
// This stack creates:
//   - CloudFront distribution in front of HTTP API
//   - WAF WebACL with rate limiting and security rules
//   - Properly configured cache/origin policies for API traffic
//
// After deployment, use the CloudFront URL instead of the direct API URL
// for production traffic to benefit from WAF protection.
// =============================================================================

const apiCloudFrontStack = new ApiCloudFrontStack(app, `${config.stackPrefix}-api-cloudfront`, {
  config,
  env: usEast1Env, // MUST be us-east-1 for CloudFront WAF
  // Pass the HTTP API ID - the stack will construct the endpoint URL
  httpApiId: apiCoreStack.httpApi.apiId,
  apiRegion: config.region,
  description: 'BarkBase API CloudFront + WAF - Edge protection for HTTP API',
  crossRegionReferences: true, // Enable cross-region references
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});
apiCloudFrontStack.addDependency(apiCoreStack);

// =============================================================================
// Stack 7: Frontend Hosting (S3 + CloudFront)
// =============================================================================
const frontendStack = new FrontendStack(app, `${config.stackPrefix}-frontend`, {
  config,
  env: cdkEnv,
  apiUrl: apiCoreStack.apiUrl, // Direct API URL for now; update to CloudFront URL after deployment
  description: 'BarkBase Frontend - S3 and CloudFront for React app hosting',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});
frontendStack.addDependency(apiCoreStack);

// =============================================================================
// Stack 8: Monitoring (CloudWatch & X-Ray)
// =============================================================================
const monitoringStack = new MonitoringStack(app, `${config.stackPrefix}-monitoring`, {
  config,
  env: cdkEnv,
  httpApi: apiCoreStack.httpApi,
  authApiFunction: servicesStack.authApiFunction,
  userProfileFunction: servicesStack.userProfileFunction,
  entityServiceFunction: servicesStack.entityServiceFunction,
  analyticsServiceFunction: servicesStack.analyticsServiceFunction,
  operationsServiceFunction: servicesStack.operationsServiceFunction,
  configServiceFunction: servicesStack.configServiceFunction,
  financialServiceFunction: servicesStack.financialServiceFunction,
  // notificationEmail: 'alerts@barkbase.io', // Uncomment and set email for notifications
  description: 'BarkBase Monitoring - CloudWatch dashboards, alarms, and X-Ray tracing',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});
monitoringStack.addDependency(apiCoreStack);
monitoringStack.addDependency(servicesStack);

// =============================================================================
// Deployment Summary
// =============================================================================
console.log('📋 Stack Deployment Order:');
console.log(`  1. ${config.stackPrefix}-network          (${config.region})`);
console.log(`  2. ${config.stackPrefix}-database         (${config.region})`);
console.log(`  3. ${config.stackPrefix}-auth             (${config.region})`);
console.log(`  4. ${config.stackPrefix}-services         (${config.region})`);
console.log(`  5. ${config.stackPrefix}-api              (${config.region})`);
console.log(`  6. ${config.stackPrefix}-api-cloudfront   (us-east-1) ← WAF + CloudFront`);
console.log(`  7. ${config.stackPrefix}-frontend         (${config.region})`);
console.log(`  8. ${config.stackPrefix}-monitoring       (${config.region})\n`);

console.log('⚠️  NOTE: After deployment, update your frontend to use the CloudFront URL');
console.log('    instead of the direct API Gateway URL for WAF protection.\n');

app.synth();
