/**
 * =============================================================================
 * BarkBase Services Stack
 * =============================================================================
 * 
 * Creates Lambda functions and layers:
 * - db-layer: PostgreSQL client and connection management
 * - shared-layer: Auth handler, security utils, JWT validation
 * - AuthApiFunction: Authentication API endpoints
 * - UserProfileServiceFunction: User profile management
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface ServicesStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly lambdaSubnets: ec2.ISubnet[];
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly jwksUrl: string;
}

export class ServicesStack extends cdk.Stack {
  public readonly dbLayer: lambda.ILayerVersion;
  public readonly sharedLayer: lambda.ILayerVersion;
  public readonly authApiFunction: lambda.IFunction;
  public readonly userProfileFunction: lambda.IFunction;
  public readonly entityServiceFunction: lambda.IFunction;
  public readonly analyticsServiceFunction: lambda.IFunction;
  public readonly operationsServiceFunction: lambda.IFunction;
  public readonly configServiceFunction: lambda.IFunction;
  public readonly financialServiceFunction: lambda.IFunction;
  public readonly reminderServiceFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);

    const {
      config,
      vpc,
      lambdaSecurityGroup,
      lambdaSubnets,
      userPoolId,
      userPoolClientId,
      jwksUrl
    } = props;

    // =========================================================================
    // Lambda Layers
    // =========================================================================

    // DB Layer - PostgreSQL client and connection logic
    this.dbLayer = new lambda.LayerVersion(this, 'DbLayer', {
      layerVersionName: `${config.stackPrefix}-db-layer`,
      description: 'PostgreSQL client and Secrets Manager connection logic',
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      code: lambda.Code.fromAsset(path.join(__dirname, '../../layers/db-layer')),
    });

    // Shared Layer - Auth utilities, JWT validation, security
    this.sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      layerVersionName: `${config.stackPrefix}-shared-layer`,
      description: 'Auth handler, security utils, JWT validation',
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      code: lambda.Code.fromAsset(path.join(__dirname, '../../layers/shared-layer')),
    });

    // =========================================================================
    // IAM Role for Lambda Functions
    // =========================================================================

    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${config.stackPrefix}-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for BarkBase Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // NOTE: No Secrets Manager access needed - DATABASE_URL is set via environment variables
    // from .env files during deployment

    // Grant SES permissions for sending emails
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ses:SendEmail',
        'ses:SendRawEmail',
        'ses:SendTemplatedEmail',
      ],
      resources: ['*'], // SES doesn't support resource-level permissions well
    }));

    // =========================================================================
    // Environment Variables
    // =========================================================================
    // DATABASE_URL is loaded from backend/.env.development or backend/.env.production
    // based on the deployment environment (dev or prod)
    // =========================================================================

    // Determine which .env file to load based on environment
    const envFileName = config.env === 'prod' ? '.env.production' : '.env.development';
    const envFilePath = path.join(__dirname, '../../../backend', envFileName);

    // Load environment variables from .env file
    if (!fs.existsSync(envFilePath)) {
      throw new Error(`Environment file not found: ${envFilePath}\nPlease create ${envFileName} in the backend directory.`);
    }

    const envConfig = dotenv.parse(fs.readFileSync(envFilePath));

    // Validate required environment variables
    if (!envConfig.DATABASE_URL) {
      throw new Error(`DATABASE_URL not found in ${envFilePath}`);
    }

    const commonEnvironment: Record<string, string> = {
      NODE_ENV: config.env === 'prod' ? 'production' : 'development',
      AWS_REGION_DEPLOY: config.region,
      COGNITO_USER_POOL_ID: userPoolId,
      COGNITO_CLIENT_ID: userPoolClientId,
      COGNITO_JWKS_URL: jwksUrl,
      COGNITO_ISSUER_URL: `https://cognito-idp.${config.region}.amazonaws.com/${userPoolId}`,
      DATABASE_URL: envConfig.DATABASE_URL,
    };

    // Common Lambda configuration
    // Lambdas run in private subnets with no internet access.
    // They only need RDS access via VPC internal routing.
    const commonLambdaConfig = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc,
      vpcSubnets: { subnets: lambdaSubnets },
      securityGroups: [lambdaSecurityGroup],
      layers: [this.dbLayer, this.sharedLayer],
      environment: commonEnvironment,
      tracing: lambda.Tracing.ACTIVE,
    };

    // =========================================================================
    // Lambda Functions
    // =========================================================================

    // Auth API Function
    this.authApiFunction = new lambda.Function(this, 'AuthApiFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-auth-api`,
      description: 'BarkBase Authentication API - login, register, token refresh',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/auth-api')),
    });

    // User Profile Service Function
    this.userProfileFunction = new lambda.Function(this, 'UserProfileFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-user-profile`,
      description: 'BarkBase User Profile Service - profile management',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/user-profile-service')),
    });

    // Entity Service Function
    this.entityServiceFunction = new lambda.Function(this, 'EntityServiceFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-entity-service`,
      description: 'BarkBase Entity Service - CRUD operations for core business entities',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/entity-service')),
    });

    // Analytics Service Function
    this.analyticsServiceFunction = new lambda.Function(this, 'AnalyticsServiceFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-analytics-service`,
      description: 'BarkBase Analytics Service - reporting and metrics',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/analytics-service')),
    });

    // Operations Service Function
    this.operationsServiceFunction = new lambda.Function(this, 'OperationsServiceFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-operations-service`,
      description: 'BarkBase Operations Service - bookings, scheduling, tasks, batch operations',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/operations-service')),
    });

    // Config Service Function
    this.configServiceFunction = new lambda.Function(this, 'ConfigServiceFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-config-service`,
      description: 'BarkBase Config Service - configuration, settings, feature flags',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/config-service')),
    });

    // Financial Service Function
    // Includes Stripe environment variables for payment processing
    this.financialServiceFunction = new lambda.Function(this, 'FinancialServiceFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-financial-service`,
      description: 'BarkBase Financial Service - billing, invoices, payments, pricing, Stripe integration',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/financial-service')),
      environment: {
        ...commonEnvironment,
        // Stripe configuration - values should be set via AWS Console or CI/CD secrets
        // STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '', // Set via AWS Console
        // STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '', // Set via AWS Console
        STRIPE_API_VERSION: '2023-10-16',
      },
    });

    // =========================================================================
    // Reminder Service Function (EventBridge-only, NOT exposed via API Gateway)
    // =========================================================================
    // This service is INTENTIONALLY not exposed via HTTP API.
    // It is invoked exclusively via EventBridge scheduled rules.
    // Sends booking reminders and vaccination expiry notifications to owners.
    this.reminderServiceFunction = new lambda.Function(this, 'ReminderServiceFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-reminder-service`,
      description: 'BarkBase Reminder Service - Scheduled email reminders for bookings and vaccinations',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/reminder-service')),
      timeout: cdk.Duration.minutes(5), // Allow more time for processing all tenants
    });

    // EventBridge rule to trigger reminder service daily at 8am UTC
    const reminderScheduleRule = new events.Rule(this, 'ReminderScheduleRule', {
      ruleName: `${config.stackPrefix}-daily-reminders`,
      description: 'Triggers reminder service daily at 8am UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '8',
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    // Add Lambda as target for the EventBridge rule
    reminderScheduleRule.addTarget(new targets.LambdaFunction(this.reminderServiceFunction, {
      retryAttempts: 2,
    }));

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'DbLayerArn', {
      value: this.dbLayer.layerVersionArn,
      description: 'DB Layer ARN',
      exportName: `${config.stackPrefix}-db-layer-arn`,
    });

    new cdk.CfnOutput(this, 'SharedLayerArn', {
      value: this.sharedLayer.layerVersionArn,
      description: 'Shared Layer ARN',
      exportName: `${config.stackPrefix}-shared-layer-arn`,
    });

    new cdk.CfnOutput(this, 'AuthApiFunctionArn', {
      value: this.authApiFunction.functionArn,
      description: 'Auth API Lambda ARN',
      exportName: `${config.stackPrefix}-auth-api-arn`,
    });

    new cdk.CfnOutput(this, 'UserProfileFunctionArn', {
      value: this.userProfileFunction.functionArn,
      description: 'User Profile Lambda ARN',
      exportName: `${config.stackPrefix}-user-profile-arn`,
    });

    new cdk.CfnOutput(this, 'EntityServiceFunctionArn', {
      value: this.entityServiceFunction.functionArn,
      description: 'Entity Service Lambda ARN',
      exportName: `${config.stackPrefix}-entity-service-arn`,
    });

    new cdk.CfnOutput(this, 'AnalyticsServiceFunctionArn', {
      value: this.analyticsServiceFunction.functionArn,
      description: 'Analytics Service Lambda ARN',
      exportName: `${config.stackPrefix}-analytics-service-arn`,
    });

    new cdk.CfnOutput(this, 'OperationsServiceFunctionArn', {
      value: this.operationsServiceFunction.functionArn,
      description: 'Operations Service Lambda ARN',
      exportName: `${config.stackPrefix}-operations-service-arn`,
    });

    new cdk.CfnOutput(this, 'ConfigServiceFunctionArn', {
      value: this.configServiceFunction.functionArn,
      description: 'Config Service Lambda ARN',
      exportName: `${config.stackPrefix}-config-service-arn`,
    });

    new cdk.CfnOutput(this, 'FinancialServiceFunctionArn', {
      value: this.financialServiceFunction.functionArn,
      description: 'Financial Service Lambda ARN',
      exportName: `${config.stackPrefix}-financial-service-arn`,
    });

    new cdk.CfnOutput(this, 'ReminderServiceFunctionArn', {
      value: this.reminderServiceFunction.functionArn,
      description: 'Reminder Service Lambda ARN',
      exportName: `${config.stackPrefix}-reminder-service-arn`,
    });
  }
}

