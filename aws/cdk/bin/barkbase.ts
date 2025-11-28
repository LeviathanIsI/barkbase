#!/usr/bin/env node
/**
 * =============================================================================
 * BarkBase CDK Application Entry Point
 * =============================================================================
 * 
 * This file defines the CDK application and instantiates all stacks.
 * 
 * DEPLOYMENT ORDER:
 * -----------------
 * Phase 1 (Foundation):
 *   1. NetworkStack - VPC, subnets, security groups
 *   2. DatabaseStack - RDS PostgreSQL, Secrets Manager
 * 
 * Phase 2 (Shared Resources):
 *   3. SharedResourcesStack - Lambda layers (DbLayer)
 * 
 * Phase 3 (Backend Services):
 *   4. BackendServicesStack - Unified backend Lambda + DB healthcheck
 * 
 * Phase 4 (API Gateway):
 *   5. ApiCoreStack - HTTP API routing to backend Lambda
 * 
 * Phase 5 (Identity - Future):
 *   6. IdentityStack - Cognito User Pool + API authorizers
 * 
 * USAGE:
 * ------
 * # Deploy all stacks
 * cdk deploy --all
 * 
 * # Deploy specific stack
 * cdk deploy Barkbase-NetworkStack-dev
 * cdk deploy Barkbase-DatabaseStack-dev
 * cdk deploy Barkbase-SharedResourcesStack-dev
 * cdk deploy Barkbase-BackendServicesStack-dev
 * cdk deploy Barkbase-ApiCoreStack-dev
 * 
 * # Diff before deploy
 * cdk diff
 * 
 * # Synthesize CloudFormation templates
 * cdk synth
 * 
 * =============================================================================
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/NetworkStack';
import { DatabaseStack } from '../lib/DatabaseStack';
import { SharedResourcesStack } from '../lib/SharedResourcesStack';
import { BackendServicesStack } from '../lib/BackendServicesStack';
import { ApiCoreStack } from '../lib/ApiCoreStack';
import { BarkBaseEnvironment } from '../lib/shared/ServiceStackProps';

// =============================================================================
// Configuration
// =============================================================================

// Get environment from context or default to 'dev'
const app = new cdk.App();
const envName = app.node.tryGetContext('env') || 'dev';

// AWS account and region - use CDK_DEFAULT_* env vars or specify explicitly
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-2';

if (!account) {
  console.warn('Warning: AWS account not specified. Set CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID.');
}

// Environment configuration
const environment: BarkBaseEnvironment = {
  envName,
  region,
  account: account || '',
};

// CDK environment
const cdkEnv: cdk.Environment = {
  account,
  region,
};

// Stack naming convention
const stackPrefix = `Barkbase`;
const stackSuffix = envName;

// =============================================================================
// Phase 1 Stacks: Network & Database
// =============================================================================

// Network Stack (no dependencies)
const networkStack = new NetworkStack(app, `${stackPrefix}-NetworkStack-${stackSuffix}`, {
  env: cdkEnv,
  environment,
  description: 'BarkBase Network Infrastructure - VPC, Subnets, Security Groups',
  terminationProtection: envName === 'prod',
});

// Database Stack (depends on NetworkStack)
const databaseStack = new DatabaseStack(app, `${stackPrefix}-DatabaseStack-${stackSuffix}`, {
  env: cdkEnv,
  environment,
  vpc: networkStack.vpc,
  databaseSecurityGroup: networkStack.databaseSecurityGroup,
  description: 'BarkBase Database Infrastructure - RDS PostgreSQL, Secrets Manager',
  terminationProtection: envName === 'prod',
});
databaseStack.addDependency(networkStack);

// =============================================================================
// Phase 2 Stacks: Shared Resources (Lambda Layers)
// =============================================================================

// Shared Resources Stack (DbLayer, etc.)
const sharedResourcesStack = new SharedResourcesStack(app, `${stackPrefix}-SharedResourcesStack-${stackSuffix}`, {
  env: cdkEnv,
  environment,
  description: 'BarkBase Shared Resources - Lambda Layers',
  terminationProtection: envName === 'prod',
});
// No explicit dependency - layers can be created independently

// =============================================================================
// Phase 3 Stacks: Backend Services (Lambdas)
// =============================================================================

// Backend Services Stack (unified backend + DB healthcheck)
const backendServicesStack = new BackendServicesStack(app, `${stackPrefix}-BackendServicesStack-${stackSuffix}`, {
  env: cdkEnv,
  environment,
  // Network dependencies (from NetworkStack)
  vpc: networkStack.vpc,
  appSecurityGroup: networkStack.appSecurityGroup,
  // Database dependencies (from DatabaseStack)
  database: databaseStack.database,
  databaseSecret: databaseStack.databaseSecret,
  databaseName: databaseStack.databaseName,
  // Shared resources (from SharedResourcesStack)
  dbLayer: sharedResourcesStack.dbLayer,
  description: 'BarkBase Backend Services - Unified Backend Lambda + DB Healthcheck',
  terminationProtection: envName === 'prod',
});
backendServicesStack.addDependency(networkStack);
backendServicesStack.addDependency(databaseStack);
backendServicesStack.addDependency(sharedResourcesStack);

// =============================================================================
// Phase 4 Stacks: API Gateway
// =============================================================================

// API Core Stack (HTTP API routing to backend Lambda)
const apiCoreStack = new ApiCoreStack(app, `${stackPrefix}-ApiCoreStack-${stackSuffix}`, {
  env: cdkEnv,
  environment,
  // Backend Lambda to route requests to
  backendFunction: backendServicesStack.backendFunction,
  description: 'BarkBase HTTP API Gateway - Routes to unified backend',
  terminationProtection: envName === 'prod',
});
apiCoreStack.addDependency(backendServicesStack);

// =============================================================================
// Future Phase Stacks (commented out until needed)
// =============================================================================

/*
// Phase 5: Identity (Cognito)

import { IdentityStack } from '../lib/IdentityStack';

const identityStack = new IdentityStack(app, `${stackPrefix}-IdentityStack-${stackSuffix}`, {
  env: cdkEnv,
  environment,
  httpApi: apiCoreStack.httpApi,
  description: 'BarkBase Identity - Cognito User Pool + API Authorizers',
});
*/

// =============================================================================
// App Tags
// =============================================================================

cdk.Tags.of(app).add('Application', 'BarkBase');
cdk.Tags.of(app).add('Environment', envName);
cdk.Tags.of(app).add('ManagedBy', 'CDK');

// Synthesize the app
app.synth();
