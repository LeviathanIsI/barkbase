#!/usr/bin/env node
/**
 * BarkBase Dev v2 - CDK Application Entry Point
 * 
 * This file initializes the CDK application and instantiates all stacks.
 * 
 * IMPORTANT:
 * - Replace <AWS_ACCOUNT_ID> with your actual AWS account ID
 * - Never commit real credentials to source control
 * 
 * Stack Deployment Order (dependencies):
 * 1. NetworkStack - No dependencies, deploy first
 * 2. DatabaseStack - Depends on NetworkStack (VPC, dbSecurityGroup)
 * 3. IdentityServicesStack - Depends on Network, Database
 * 4. TenantsServicesStack - Depends on Network, Database
 * 5. EntityServicesStack - Depends on Network, Database
 * 6. OperationsServicesStack - Depends on Network, Database
 * 7. ConfigServicesStack - Depends on Network, Database
 * 8. FeaturesServicesStack - Depends on Network, Database
 * 9. FinancialServicesStack - Depends on Network, Database
 * 10. AnalyticsServicesStack - Depends on Network, Database
 * 11. PropertiesV2ServicesStack - Depends on Network, Database
 * 12. ApiCoreStack - Depends on all service stacks (HTTP API routes)
 * 13. RealtimeStack - TODO: Later phase (WebSocket)
 * 14. JobsStack - TODO: Later phase (scheduled tasks)
 * 15. FrontendStack - TODO: Later phase (S3/CloudFront)
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

// Import all stack classes
import { NetworkStack } from '../lib/NetworkStack';
import { DatabaseStack } from '../lib/DatabaseStack';
import { IdentityServicesStack } from '../lib/IdentityServicesStack';
import { TenantsServicesStack } from '../lib/TenantsServicesStack';
import { EntityServicesStack } from '../lib/EntityServicesStack';
import { OperationsServicesStack } from '../lib/OperationsServicesStack';
import { ConfigServicesStack } from '../lib/ConfigServicesStack';
import { FeaturesServicesStack } from '../lib/FeaturesServicesStack';
import { FinancialServicesStack } from '../lib/FinancialServicesStack';
import { AnalyticsServicesStack } from '../lib/AnalyticsServicesStack';
import { PropertiesV2ServicesStack } from '../lib/PropertiesV2ServicesStack';
import { ApiCoreStack } from '../lib/ApiCoreStack';
import { RealtimeStack } from '../lib/RealtimeStack';
import { JobsStack } from '../lib/JobsStack';
import { FrontendStack } from '../lib/FrontendStack';

// =============================================================================
// Configuration
// =============================================================================

/**
 * AWS Account Configuration
 * 
 * Values are read from environment variables or fallback to placeholders.
 * Set CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION before running cdk commands.
 */
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '<AWS_ACCOUNT_ID>',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-2',
};

/**
 * Stack naming convention: BarkBase-{Environment}-{StackName}
 */
const stackPrefix = 'BarkBase-Dev';

/**
 * Stage configuration - read from context or env
 */
const stage = process.env.STAGE || 'dev';
const environment = process.env.ENVIRONMENT || 'dev';

/**
 * Cognito configuration - from existing deployed resources
 * See: docs/INFRA_REBUILD_RECON.md for current values
 */
const userPoolId = process.env.USER_POOL_ID || 'us-east-2_v94gByGOq';
const clientId = process.env.CLIENT_ID || '2csen8hj7b53ec2q9bc0siubja';

/**
 * Optional S3/CloudFront configuration (to be wired in later phases)
 */
const s3BucketName = process.env.S3_BUCKET;
const s3KmsKeyId = process.env.S3_KMS_KEY_ID;
const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

// =============================================================================
// Initialize CDK App
// =============================================================================

const app = new cdk.App();

// =============================================================================
// Layer 1: Foundation (No dependencies)
// =============================================================================

/**
 * NetworkStack - VPC, subnets, security groups, VPC endpoints
 */
const networkStack = new NetworkStack(app, `${stackPrefix}-Network`, {
  env,
  description: 'BarkBase networking infrastructure - VPC, subnets, security groups',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'Foundation',
  },
});

// =============================================================================
// Layer 2: Data (Depends on Network)
// =============================================================================

/**
 * DatabaseStack - RDS PostgreSQL 15, Secrets Manager
 */
const databaseStack = new DatabaseStack(app, `${stackPrefix}-Database`, {
  env,
  description: 'BarkBase database infrastructure - PostgreSQL 15',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'Data',
  },
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSecurityGroup,
  appSubnets: networkStack.appSubnets,
});
databaseStack.addDependency(networkStack);

// =============================================================================
// Common Service Props Builder
// =============================================================================

/**
 * Build common props for all service stacks.
 * This ensures consistency across all Lambda-hosting stacks.
 */
const buildServiceStackProps = (description: string, layer: string) => ({
  env,
  description,
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: layer,
    Stage: stage,
  },
  // Network
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  appSubnets: networkStack.appSubnets,
  // Database
  dbSecret: databaseStack.dbSecret,
  dbHost: databaseStack.hostname,
  dbPort: databaseStack.port,
  dbName: databaseStack.dbName,
  // Stage/Environment
  stage,
  environment,
  // Cognito
  userPoolId,
  clientId,
  // Optional S3/CloudFront
  s3BucketName,
  s3KmsKeyId,
  cloudfrontDomain,
});

// =============================================================================
// Layer 3: Core Services (Depends on Network, Database)
// =============================================================================

/**
 * IdentityServicesStack - Auth, User Profile, Roles/Permissions
 * 
 * Lambdas:
 * - AuthApiFunction
 * - UserProfileServiceFunction
 * - RolesConfigServiceFunction
 */
const identityServicesStack = new IdentityServicesStack(app, `${stackPrefix}-Identity`, {
  ...buildServiceStackProps('BarkBase identity services - auth, profile, roles', 'CoreServices'),
});
identityServicesStack.addDependency(networkStack);
identityServicesStack.addDependency(databaseStack);

/**
 * TenantsServicesStack - Tenant & Membership Management
 * 
 * Lambdas:
 * - TenantsMembershipsServiceFunction
 */
const tenantsServicesStack = new TenantsServicesStack(app, `${stackPrefix}-Tenants`, {
  ...buildServiceStackProps('BarkBase tenant management services', 'CoreServices'),
});
tenantsServicesStack.addDependency(networkStack);
tenantsServicesStack.addDependency(databaseStack);

// =============================================================================
// Layer 4: Domain Services (Depends on Core Services)
// =============================================================================

/**
 * EntityServicesStack - Pets, Owners, Staff
 * 
 * Lambdas:
 * - EntityServiceFunction
 */
const entityServicesStack = new EntityServicesStack(app, `${stackPrefix}-Entity`, {
  ...buildServiceStackProps('BarkBase entity services - pets, owners, staff', 'DomainServices'),
});
entityServicesStack.addDependency(networkStack);
entityServicesStack.addDependency(databaseStack);

/**
 * OperationsServicesStack - Bookings, Check-ins, Kennels, Runs
 * 
 * Lambdas:
 * - OperationsServiceFunction
 */
const operationsServicesStack = new OperationsServicesStack(app, `${stackPrefix}-Operations`, {
  ...buildServiceStackProps('BarkBase operations services - bookings, kennels', 'DomainServices'),
});
operationsServicesStack.addDependency(networkStack);
operationsServicesStack.addDependency(databaseStack);

/**
 * ConfigServicesStack - Services, Facility, Packages
 * 
 * Lambdas:
 * - ConfigServiceFunction
 */
const configServicesStack = new ConfigServicesStack(app, `${stackPrefix}-Config`, {
  ...buildServiceStackProps('BarkBase config services - facility, packages', 'DomainServices'),
});
configServicesStack.addDependency(networkStack);
configServicesStack.addDependency(databaseStack);

/**
 * FeaturesServicesStack - Tasks, Communications, Notes, etc.
 * 
 * Lambdas:
 * - FeaturesServiceFunction
 */
const featuresServicesStack = new FeaturesServicesStack(app, `${stackPrefix}-Features`, {
  ...buildServiceStackProps('BarkBase features services - tasks, communications', 'DomainServices'),
});
featuresServicesStack.addDependency(networkStack);
featuresServicesStack.addDependency(databaseStack);

/**
 * PropertiesV2ServicesStack - Properties API v2
 * 
 * Lambdas:
 * - PropertiesApiV2Function
 */
const propertiesV2ServicesStack = new PropertiesV2ServicesStack(app, `${stackPrefix}-PropertiesV2`, {
  ...buildServiceStackProps('BarkBase properties v2 services', 'DomainServices'),
});
propertiesV2ServicesStack.addDependency(networkStack);
propertiesV2ServicesStack.addDependency(databaseStack);

// =============================================================================
// Layer 5: Business Services (Depends on Domain Services)
// =============================================================================

/**
 * FinancialServicesStack - Payments, Invoices, Billing
 * 
 * Lambdas:
 * - FinancialServiceFunction
 */
const financialServicesStack = new FinancialServicesStack(app, `${stackPrefix}-Financial`, {
  ...buildServiceStackProps('BarkBase financial services - payments, invoices', 'BusinessServices'),
});
financialServicesStack.addDependency(networkStack);
financialServicesStack.addDependency(databaseStack);

/**
 * AnalyticsServicesStack - Dashboard, Reports, Schedule
 * 
 * Lambdas:
 * - AnalyticsServiceFunction
 */
const analyticsServicesStack = new AnalyticsServicesStack(app, `${stackPrefix}-Analytics`, {
  ...buildServiceStackProps('BarkBase analytics services - dashboard, reports', 'BusinessServices'),
});
analyticsServicesStack.addDependency(networkStack);
analyticsServicesStack.addDependency(databaseStack);

// =============================================================================
// Layer 6: Communication Services - TODO: Phase 4
// =============================================================================

/**
 * RealtimeStack - WebSocket, push notifications
 * 
 * TODO: Implement in Phase 4
 */
const realtimeStack = new RealtimeStack(app, `${stackPrefix}-Realtime`, {
  env,
  description: 'BarkBase real-time communication services',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'Communication',
  },
});
// TODO: Wire dependencies in Phase 4

// =============================================================================
// Layer 7: Background Processing - TODO: Phase 4
// =============================================================================

/**
 * JobsStack - Scheduled tasks, async processing
 * 
 * TODO: Implement in Phase 4
 */
const jobsStack = new JobsStack(app, `${stackPrefix}-Jobs`, {
  env,
  description: 'BarkBase background jobs and scheduled tasks',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'Background',
  },
});
// TODO: Wire dependencies in Phase 4

// =============================================================================
// Layer 8: API Gateway (Depends on all service stacks)
// =============================================================================

/**
 * ApiCoreStack - HTTP API Gateway
 * 
 * IMPLEMENTED: Phase 4
 * 
 * Wires all service Lambda functions to HTTP API routes.
 * See docs/API_AND_ROUTING_DESIGN.md for route mapping.
 */
const apiCoreStack = new ApiCoreStack(app, `${stackPrefix}-ApiCore`, {
  env,
  description: 'BarkBase API Gateway - HTTP API with all routes',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'API',
    Stage: stage,
  },
  // Configuration
  stage,
  environment,
  // Lambda function references from service stacks
  authApiFunction: identityServicesStack.authApiFunction,
  userProfileServiceFunction: identityServicesStack.userProfileServiceFunction,
  rolesConfigServiceFunction: identityServicesStack.rolesConfigServiceFunction,
  tenantsMembershipsServiceFunction: tenantsServicesStack.tenantsMembershipsServiceFunction,
  entityServiceFunction: entityServicesStack.entityServiceFunction,
  operationsServiceFunction: operationsServicesStack.operationsServiceFunction,
  configServiceFunction: configServicesStack.configServiceFunction,
  featuresServiceFunction: featuresServicesStack.featuresServiceFunction,
  financialServiceFunction: financialServicesStack.financialServiceFunction,
  analyticsServiceFunction: analyticsServicesStack.analyticsServiceFunction,
  propertiesApiV2Function: propertiesV2ServicesStack.propertiesApiV2Function,
});

// Add dependencies on all service stacks
apiCoreStack.addDependency(identityServicesStack);
apiCoreStack.addDependency(tenantsServicesStack);
apiCoreStack.addDependency(entityServicesStack);
apiCoreStack.addDependency(operationsServicesStack);
apiCoreStack.addDependency(configServicesStack);
apiCoreStack.addDependency(featuresServicesStack);
apiCoreStack.addDependency(financialServicesStack);
apiCoreStack.addDependency(analyticsServicesStack);
apiCoreStack.addDependency(propertiesV2ServicesStack);

// =============================================================================
// Layer 9: Frontend - TODO: Phase 5
// =============================================================================

/**
 * FrontendStack - S3, CloudFront
 * 
 * TODO: Implement in Phase 5
 */
const frontendStack = new FrontendStack(app, `${stackPrefix}-Frontend`, {
  env,
  description: 'BarkBase frontend hosting - S3, CloudFront',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'Frontend',
  },
});
// TODO: Wire dependencies in Phase 5

// =============================================================================
// Synthesize
// =============================================================================

app.synth();
