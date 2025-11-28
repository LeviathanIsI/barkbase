#!/usr/bin/env node
/**
 * BarkBase Dev v2 - CDK Application Entry Point
 * 
 * This file initializes the CDK application and instantiates all stacks.
 * 
 * IMPORTANT:
 * - Replace <AWS_ACCOUNT_ID> with your actual AWS account ID
 * - Replace <BARKBASE_ADMIN_PROFILE> with your local AWS profile name
 * - Never commit real credentials to source control
 * 
 * Stack Deployment Order (dependencies):
 * 1. NetworkStack - No dependencies, deploy first
 * 2. DatabaseStack - Depends on NetworkStack (VPC, dbSecurityGroup)
 * 3. TenantsServicesStack - TODO: wire to Network, Database
 * 4. IdentityServicesStack - TODO: wire to Network, Database
 * 5. EntityServicesStack - TODO: wire to Identity, Database
 * 6. FeaturesServicesStack - TODO: wire to Tenants, Database
 * 7. ConfigServicesStack - TODO: wire to Database
 * 8. PropertiesV2ServicesStack - TODO: wire to Tenants, Database
 * 9. OperationsServicesStack - TODO: wire to Entity, Properties
 * 10. FinancialServicesStack - TODO: wire to Entity, Config
 * 11. AnalyticsServicesStack - TODO: wire to Database (read replica)
 * 12. RealtimeStack - TODO: wire to Identity, Tenants
 * 13. JobsStack - TODO: wire to all service stacks
 * 14. ApiCoreStack - TODO: wire to Identity, all service stacks
 * 15. FrontendStack - TODO: wire to ApiCore
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

// Import all stack classes
import { NetworkStack } from '../lib/NetworkStack';
import { DatabaseStack } from '../lib/DatabaseStack';
import { IdentityServicesStack } from '../lib/IdentityServicesStack';
import { EntityServicesStack } from '../lib/EntityServicesStack';
import { OperationsServicesStack } from '../lib/OperationsServicesStack';
import { FeaturesServicesStack } from '../lib/FeaturesServicesStack';
import { ConfigServicesStack } from '../lib/ConfigServicesStack';
import { FinancialServicesStack } from '../lib/FinancialServicesStack';
import { TenantsServicesStack } from '../lib/TenantsServicesStack';
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
 * Set CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION before running cdk commands,
 * or use --profile flag with AWS CLI configuration.
 * 
 * Default region: us-east-2 (Ohio)
 */
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '<AWS_ACCOUNT_ID>',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-2',
};

/**
 * Stack naming convention: BarkBase-{Environment}-{StackName}
 * Environment will be injected via context or environment variable
 */
const stackPrefix = 'BarkBase-Dev';

// =============================================================================
// Initialize CDK App
// =============================================================================

const app = new cdk.App();

// =============================================================================
// Layer 1: Foundation (No dependencies)
// =============================================================================

/**
 * NetworkStack - VPC, subnets, security groups, VPC endpoints
 * 
 * IMPLEMENTED: Phase 2
 * 
 * Exports:
 * - vpc: The BarkBase VPC (10.0.0.0/16, 2 AZs)
 * - appSubnets: Private subnets for Lambdas and RDS
 * - publicSubnets: Public subnets for NAT gateway
 * - lambdaSecurityGroup: SG for Lambda functions
 * - dbSecurityGroup: SG for RDS (allows 5432 from lambdaSG)
 */
const networkStack = new NetworkStack(app, `${stackPrefix}-Network`, {
  env,
  description: 'BarkBase networking infrastructure - VPC, subnets, security groups',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'Foundation',
  },
  // NetworkStack-specific props (using defaults)
  // vpcCidr: '10.0.0.0/16',
  // maxAzs: 2,
  // natGateways: 1,
});

// =============================================================================
// Layer 2: Data (Depends on Network)
// =============================================================================

/**
 * DatabaseStack - RDS PostgreSQL 15, Secrets Manager
 * 
 * IMPLEMENTED: Phase 2
 * 
 * Depends on: NetworkStack
 * 
 * Exports:
 * - instance: RDS DatabaseInstance
 * - dbSecret: Secrets Manager secret with credentials
 * - hostname: Database endpoint
 * - port: Database port (5432)
 * - dbName: Database name ('barkbase')
 */
const databaseStack = new DatabaseStack(app, `${stackPrefix}-Database`, {
  env,
  description: 'BarkBase database infrastructure - PostgreSQL 15',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'Data',
  },
  // Wire to NetworkStack
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSecurityGroup,
  appSubnets: networkStack.appSubnets,
  // DatabaseStack-specific props (using defaults)
  // databaseName: 'barkbase',
  // instanceClass: ec2.InstanceClass.T3,
  // instanceSize: ec2.InstanceSize.MICRO,
  // allocatedStorageGiB: 20,
});

// Explicit dependency (CDK usually infers this, but be explicit)
databaseStack.addDependency(networkStack);

// =============================================================================
// Layer 3: Core Services (Depends on Network, Database)
// =============================================================================

/**
 * TenantsServicesStack - Multi-tenant management
 * 
 * TODO: Wire to NetworkStack and DatabaseStack in later phases
 * 
 * Future props needed:
 * - vpc, lambdaSecurityGroup from NetworkStack
 * - dbSecret, hostname, port, dbName from DatabaseStack
 */
const tenantsServicesStack = new TenantsServicesStack(app, `${stackPrefix}-Tenants`, {
  env,
  description: 'BarkBase tenant management services',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'CoreServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// tenantsServicesStack.addDependency(networkStack);
// tenantsServicesStack.addDependency(databaseStack);

/**
 * IdentityServicesStack - Cognito, authentication
 * 
 * TODO: Wire to NetworkStack and DatabaseStack in later phases
 * 
 * Future props needed:
 * - vpc, lambdaSecurityGroup from NetworkStack
 * - dbSecret from DatabaseStack
 */
const identityServicesStack = new IdentityServicesStack(app, `${stackPrefix}-Identity`, {
  env,
  description: 'BarkBase authentication and identity services',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'CoreServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// identityServicesStack.addDependency(networkStack);
// identityServicesStack.addDependency(databaseStack);

// =============================================================================
// Layer 4: Domain Services (Depends on Core Services)
// =============================================================================

/**
 * EntityServicesStack - Pets, Owners, Vaccinations
 * 
 * TODO: Wire to NetworkStack, DatabaseStack, IdentityServicesStack in later phases
 */
const entityServicesStack = new EntityServicesStack(app, `${stackPrefix}-Entity`, {
  env,
  description: 'BarkBase entity services - pets, owners, vaccinations',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'DomainServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// entityServicesStack.addDependency(identityServicesStack);
// entityServicesStack.addDependency(databaseStack);

/**
 * FeaturesServicesStack - Feature flags
 * 
 * TODO: Wire to NetworkStack, DatabaseStack, TenantsServicesStack in later phases
 */
const featuresServicesStack = new FeaturesServicesStack(app, `${stackPrefix}-Features`, {
  env,
  description: 'BarkBase feature flag management',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'DomainServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// featuresServicesStack.addDependency(tenantsServicesStack);
// featuresServicesStack.addDependency(databaseStack);

/**
 * ConfigServicesStack - Settings, services, packages
 * 
 * TODO: Wire to NetworkStack, DatabaseStack in later phases
 */
const configServicesStack = new ConfigServicesStack(app, `${stackPrefix}-Config`, {
  env,
  description: 'BarkBase configuration and settings services',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'DomainServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// configServicesStack.addDependency(databaseStack);

/**
 * PropertiesV2ServicesStack - Facilities, locations
 * 
 * TODO: Wire to NetworkStack, DatabaseStack, TenantsServicesStack in later phases
 */
const propertiesV2ServicesStack = new PropertiesV2ServicesStack(app, `${stackPrefix}-PropertiesV2`, {
  env,
  description: 'BarkBase property and facility management',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'DomainServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// propertiesV2ServicesStack.addDependency(tenantsServicesStack);
// propertiesV2ServicesStack.addDependency(databaseStack);

// =============================================================================
// Layer 5: Business Services (Depends on Domain Services)
// =============================================================================

/**
 * OperationsServicesStack - Kennels, scheduling, daily ops
 * 
 * TODO: Wire to EntityServicesStack, PropertiesV2ServicesStack in later phases
 */
const operationsServicesStack = new OperationsServicesStack(app, `${stackPrefix}-Operations`, {
  env,
  description: 'BarkBase operations services - kennels, scheduling',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'BusinessServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// operationsServicesStack.addDependency(entityServicesStack);
// operationsServicesStack.addDependency(propertiesV2ServicesStack);

/**
 * FinancialServicesStack - Invoices, payments
 * 
 * TODO: Wire to EntityServicesStack, ConfigServicesStack in later phases
 */
const financialServicesStack = new FinancialServicesStack(app, `${stackPrefix}-Financial`, {
  env,
  description: 'BarkBase financial services - invoices, payments',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'BusinessServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// financialServicesStack.addDependency(entityServicesStack);
// financialServicesStack.addDependency(configServicesStack);

/**
 * AnalyticsServicesStack - Reports, dashboards
 * 
 * TODO: Wire to DatabaseStack (read replica) in later phases
 */
const analyticsServicesStack = new AnalyticsServicesStack(app, `${stackPrefix}-Analytics`, {
  env,
  description: 'BarkBase analytics and reporting services',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'BusinessServices',
  },
});
// TODO: Wire dependencies in Phase 3+
// analyticsServicesStack.addDependency(databaseStack);

// =============================================================================
// Layer 6: Communication Services (Depends on Core Services)
// =============================================================================

/**
 * RealtimeStack - WebSocket, push notifications
 * 
 * TODO: Wire to IdentityServicesStack, TenantsServicesStack in later phases
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
// TODO: Wire dependencies in Phase 3+
// realtimeStack.addDependency(identityServicesStack);
// realtimeStack.addDependency(tenantsServicesStack);

// =============================================================================
// Layer 7: Background Processing (Depends on all service stacks)
// =============================================================================

/**
 * JobsStack - Scheduled tasks, async processing
 * 
 * TODO: Wire to all service stacks in later phases
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
// TODO: Wire dependencies in Phase 3+
// jobsStack.addDependency(entityServicesStack);
// jobsStack.addDependency(operationsServicesStack);
// jobsStack.addDependency(financialServicesStack);

// =============================================================================
// Layer 8: API Gateway (Depends on all service stacks)
// =============================================================================

/**
 * ApiCoreStack - REST API Gateway
 * 
 * TODO: Wire to IdentityServicesStack, all service Lambda functions in later phases
 */
const apiCoreStack = new ApiCoreStack(app, `${stackPrefix}-ApiCore`, {
  env,
  description: 'BarkBase API Gateway - REST API',
  tags: {
    Project: 'BarkBase',
    Environment: 'Dev',
    Layer: 'API',
  },
});
// TODO: Wire dependencies in Phase 3+
// apiCoreStack.addDependency(identityServicesStack);
// apiCoreStack.addDependency(entityServicesStack);
// apiCoreStack.addDependency(operationsServicesStack);
// ... add all service stack dependencies

// =============================================================================
// Layer 9: Frontend (Depends on API)
// =============================================================================

/**
 * FrontendStack - S3, CloudFront, custom domain
 * 
 * TODO: Wire to ApiCoreStack in later phases
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
// TODO: Wire dependencies in Phase 3+
// frontendStack.addDependency(apiCoreStack);

// =============================================================================
// Synthesize
// =============================================================================

app.synth();
