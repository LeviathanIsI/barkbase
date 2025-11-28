#!/usr/bin/env node
/**
 * BarkBase CDK App Entry Point
 * 
 * This file instantiates all CDK stacks for the BarkBase application.
 * The architecture splits service stacks by domain to stay under the 
 * CloudFormation 500 resource limit per stack.
 * 
 * Stack Hierarchy:
 * - NetworkStack: VPC, security groups
 * - DatabaseStack: RDS, secrets
 * - AuthStack: Cognito user pool (if configured)
 * - ApiCoreStack: Shared HTTP API Gateway v2 and authorizer
 * - Domain Service Stacks: Each owns its Lambdas and routes
 *   - AuthServicesStack
 *   - EntityServicesStack
 *   - OperationsServicesStack
 *   - FeaturesServicesStack
 *   - ConfigServicesStack
 *   - UserServicesStack
 *   - FinancialServicesStack
 *   - AnalyticsServicesStack
 *   - AdminServicesStack
 *   - PropertiesServicesStack
 * - RealtimeStack: WebSocket API
 * - JobsStack: Scheduled jobs
 * - Utility Stacks: Billing, Frontend, Monitoring
 */
import * as cdk from "aws-cdk-lib";
import "dotenv/config";

// Infrastructure stacks
import { NetworkStack } from "../lib/NetworkStack";
import { DatabaseStack } from "../lib/DatabaseStack";
import { AuthStack } from "../lib/AuthStack";
import { ApiCoreStack } from "../lib/ApiCoreStack";

// Domain service stacks
import { AuthServicesStack } from "../lib/AuthServicesStack";
import { EntityServicesStack } from "../lib/EntityServicesStack";
import { OperationsServicesStack } from "../lib/OperationsServicesStack";
import { FeaturesServicesStack } from "../lib/FeaturesServicesStack";
import { ConfigServicesStack } from "../lib/ConfigServicesStack";
import { UserServicesStack } from "../lib/UserServicesStack";
import { FinancialServicesStack } from "../lib/FinancialServicesStack";
import { AnalyticsServicesStack } from "../lib/AnalyticsServicesStack";
import { AdminServicesStack } from "../lib/AdminServicesStack";
import { PropertiesServicesStack } from "../lib/PropertiesServicesStack";

// Additional stacks
import { RealtimeStack } from "../lib/RealtimeStack";
import { JobsStack } from "../lib/JobsStack";
import { BillingAnalyticsStack } from "../lib/BillingAnalyticsStack";
import { FrontendStack } from "../lib/FrontendStack";
import { MonitoringStack } from "../lib/MonitoringStack";

const app = new cdk.App();

// Environment configuration
const account =
  process.env.CDK_DEFAULT_ACCOUNT ??
  process.env.AWS_ACCOUNT_ID ??
  app.node.tryGetContext("account") ??
  "";

const region =
  process.env.CDK_DEFAULT_REGION ??
  process.env.AWS_REGION ??
  app.node.tryGetContext("region") ??
  "us-east-2";

const env = { account, region };

const stage = process.env.STAGE ?? app.node.tryGetContext("stage") ?? "dev";

// Cognito configuration
const userPoolId =
  process.env.COGNITO_USER_POOL_ID ??
  app.node.tryGetContext("userPoolId") ??
  "";

const userPoolClientId =
  process.env.COGNITO_USER_POOL_CLIENT_ID ??
  app.node.tryGetContext("userPoolClientId") ??
  "";

const cognitoDomainPrefix =
  process.env.COGNITO_DOMAIN_PREFIX ??
  app.node.tryGetContext("cognitoDomainPrefix") ??
  undefined;

// ============================================================================
// Infrastructure Stacks
// ============================================================================

const networkStack = new NetworkStack(app, `Barkbase-NetworkStack-${stage}`, {
  env,
});

const databaseStack = new DatabaseStack(
  app,
  `Barkbase-DatabaseStack-${stage}`,
  {
    env,
    vpc: networkStack.vpc,
    lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
    rdsSecurityGroup: networkStack.rdsSecurityGroup,
  }
);

// Auth stack is optional - only created when Cognito IDs are provided
let authStack: AuthStack | undefined;
if (userPoolId && userPoolClientId) {
  authStack = new AuthStack(app, `Barkbase-AuthStack-${stage}`, {
    env,
    stage,
    userPoolId,
    userPoolClientId,
    cognitoDomainPrefix,
  });
} else {
  console.warn(
    "AuthStack: Skipping AuthStack synthesis because COGNITO_USER_POOL_ID / COGNITO_USER_POOL_CLIENT_ID were not provided in env or context."
  );
}

// ============================================================================
// API Core Stack (owns the shared HTTP API)
// ============================================================================

const apiCoreStack = new ApiCoreStack(app, `Barkbase-ApiCoreStack-${stage}`, {
  env,
  stage,
  userPool: authStack?.userPool,
  userPoolClient: authStack?.userPoolClient,
});

// ============================================================================
// Domain Service Stacks
// Each stack owns its Lambdas and attaches routes to the shared HttpApi
// ============================================================================

// Common props for all service stacks
const baseServiceProps = {
  env,
  stage,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  dbSecret: databaseStack.dbSecret,
  dbHost: databaseStack.dbHost ?? "",
  dbPort: databaseStack.dbPort ?? 5432,
  dbName: databaseStack.dbName,
  httpApi: apiCoreStack.httpApi,
  userPool: authStack?.userPool,
  userPoolClient: authStack?.userPoolClient,
  authorizer: apiCoreStack.authorizer,
};

// Auth Services - /api/v1/auth/*
const authServicesStack = new AuthServicesStack(
  app,
  `Barkbase-AuthServicesStack-${stage}`,
  baseServiceProps
);
authServicesStack.addDependency(apiCoreStack);

// Entity Services - /api/v1/pets/*, /api/v1/owners/*, /api/v1/staff/*
const entityServicesStack = new EntityServicesStack(
  app,
  `Barkbase-EntityServicesStack-${stage}`,
  baseServiceProps
);
entityServicesStack.addDependency(apiCoreStack);

// Operations Services - /api/v1/bookings/*, /api/v1/runs/*, /api/v1/kennels/*, etc.
const operationsServicesStack = new OperationsServicesStack(
  app,
  `Barkbase-OperationsServicesStack-${stage}`,
  baseServiceProps
);
operationsServicesStack.addDependency(apiCoreStack);

// Features Services - /api/v1/tasks/*, /api/v1/notes/*, /api/v1/incidents/*, etc.
const featuresServicesStack = new FeaturesServicesStack(
  app,
  `Barkbase-FeaturesServicesStack-${stage}`,
  baseServiceProps
);
featuresServicesStack.addDependency(apiCoreStack);

// Config Services - /api/v1/roles/*, /api/v1/tenants/*, /api/v1/facility/*, etc.
const configServicesStack = new ConfigServicesStack(
  app,
  `Barkbase-ConfigServicesStack-${stage}`,
  baseServiceProps
);
configServicesStack.addDependency(apiCoreStack);

// User Services - /api/v1/profiles/*, /api/v1/users/*
const userServicesStack = new UserServicesStack(
  app,
  `Barkbase-UserServicesStack-${stage}`,
  baseServiceProps
);
userServicesStack.addDependency(apiCoreStack);

// Financial Services - /api/v1/payments/*, /api/v1/invoices/*, /api/v1/billing/*
const financialServicesStack = new FinancialServicesStack(
  app,
  `Barkbase-FinancialServicesStack-${stage}`,
  baseServiceProps
);
financialServicesStack.addDependency(apiCoreStack);

// Analytics Services - /api/v1/dashboard/*, /api/v1/reports/*, /api/v1/calendar/*
const analyticsServicesStack = new AnalyticsServicesStack(
  app,
  `Barkbase-AnalyticsServicesStack-${stage}`,
  baseServiceProps
);
analyticsServicesStack.addDependency(apiCoreStack);

// Admin Services - /api/v1/admin/*, /api/v1/upload-url, /api/v1/download-url
const adminServicesStack = new AdminServicesStack(
  app,
  `Barkbase-AdminServicesStack-${stage}`,
  baseServiceProps
);
adminServicesStack.addDependency(apiCoreStack);

// Properties Services - /api/v2/properties/*
const propertiesServicesStack = new PropertiesServicesStack(
  app,
  `Barkbase-PropertiesServicesStack-${stage}`,
  baseServiceProps
);
propertiesServicesStack.addDependency(apiCoreStack);

// ============================================================================
// Additional Stacks
// ============================================================================

// Realtime Stack (WebSocket API)
new RealtimeStack(app, `Barkbase-RealtimeStack-${stage}`, {
  env,
  stage,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  dbSecret: databaseStack.dbSecret,
  dbHost: databaseStack.dbHost ?? "",
  dbPort: databaseStack.dbPort ?? 5432,
  dbName: databaseStack.dbName,
});

// Jobs Stack (Scheduled jobs)
new JobsStack(app, `Barkbase-JobsStack-${stage}`, {
  env,
  stage,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  dbSecret: databaseStack.dbSecret,
  dbHost: databaseStack.dbHost ?? "",
  dbPort: databaseStack.dbPort ?? 5432,
  dbName: databaseStack.dbName,
});

// Utility Stacks (these may be independent of stage suffix)
new BillingAnalyticsStack(app, "Barkbase-BillingAnalyticsStack");
new FrontendStack(app, "Barkbase-FrontendStack");
new MonitoringStack(app, "Barkbase-MonitoringStack");
