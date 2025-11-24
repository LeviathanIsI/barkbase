#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "dotenv/config";
import { ApiCoreStack } from "../lib/ApiCoreStack";
import { AuthStack } from "../lib/AuthStack";
import { BillingAnalyticsStack } from "../lib/BillingAnalyticsStack";
import { DatabaseStack } from "../lib/DatabaseStack";
import { FrontendStack } from "../lib/FrontendStack";
import { JobsStack } from "../lib/JobsStack";
import { MonitoringStack } from "../lib/MonitoringStack";
import { NetworkStack } from "../lib/NetworkStack";
import { RealtimeStack } from "../lib/RealtimeStack";
import { ServicesStack } from "../lib/ServicesStack";

const app = new cdk.App();

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
const apiCoreStack = new ApiCoreStack(app, `Barkbase-ApiCoreStack-${stage}`, {
  env,
  stage,
  userPool: authStack?.userPool,
  userPoolClient: authStack?.userPoolClient,
});
const servicesStack = new ServicesStack(app, `Barkbase-ServicesStack-${stage}`, {
  env,
  stage,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  dbSecret: databaseStack.dbSecret,
  dbHost: databaseStack.dbHost ?? '',
  dbPort: databaseStack.dbPort ?? 5432,
  dbName: databaseStack.dbName,
  httpApi: apiCoreStack.httpApi,
  userPool: authStack?.userPool,
  userPoolClient: authStack?.userPoolClient,
  authorizer: apiCoreStack.authorizer,
});
const realtimeStack = new RealtimeStack(app, `Barkbase-RealtimeStack-${stage}`, {
  env,
  stage,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  dbSecret: databaseStack.dbSecret,
  dbHost: databaseStack.dbHost ?? '',
  dbPort: databaseStack.dbPort ?? 5432,
  dbName: databaseStack.dbName,
});
const jobsStack = new JobsStack(app, `Barkbase-JobsStack-${stage}`, {
  env,
  stage,
  vpc: networkStack.vpc,
  lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
  dbSecret: databaseStack.dbSecret,
  dbHost: databaseStack.dbHost ?? '',
  dbPort: databaseStack.dbPort ?? 5432,
  dbName: databaseStack.dbName,
});
new BillingAnalyticsStack(app, "Barkbase-BillingAnalyticsStack");
new FrontendStack(app, "Barkbase-FrontendStack");
new MonitoringStack(app, "Barkbase-MonitoringStack");
