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
 * =============================================================================
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/NetworkStack';
import { DatabaseStack } from '../lib/DatabaseStack';
import { AuthStack } from '../lib/AuthStack';
import { ServicesStack } from '../lib/ServicesStack';
import { ApiCoreStack } from '../lib/ApiCoreStack';
import { getConfig, getCdkEnv } from '../lib/shared/config';

const app = new cdk.App();
const config = getConfig(app);
const cdkEnv = getCdkEnv(config);

console.log(`\n🚀 Deploying BarkBase infrastructure for: ${config.env.toUpperCase()}`);
console.log(`📍 Region: ${config.region}`);
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
  description: 'BarkBase Database Infrastructure - PostgreSQL RDS',
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
const servicesStack = new ServicesStack(app, `${config.stackPrefix}-services`, {
  config,
  env: cdkEnv,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  dbSecretArn: databaseStack.dbSecret.secretArn,
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
servicesStack.addDependency(databaseStack);
servicesStack.addDependency(authStack);

// =============================================================================
// Stack 5: API Gateway
// =============================================================================
const apiCoreStack = new ApiCoreStack(app, `${config.stackPrefix}-api`, {
  config,
  env: cdkEnv,
  authApiFunction: servicesStack.authApiFunction,
  userProfileFunction: servicesStack.userProfileFunction,
  description: 'BarkBase API Gateway - HTTP API with Lambda Integrations',
  tags: {
    Environment: config.env,
    Project: 'barkbase',
    ManagedBy: 'cdk',
  },
});
apiCoreStack.addDependency(servicesStack);

// =============================================================================
// Deployment Summary
// =============================================================================
console.log('📋 Stack Deployment Order:');
console.log(`  1. ${config.stackPrefix}-network`);
console.log(`  2. ${config.stackPrefix}-database`);
console.log(`  3. ${config.stackPrefix}-auth`);
console.log(`  4. ${config.stackPrefix}-services`);
console.log(`  5. ${config.stackPrefix}-api\n`);

app.synth();

