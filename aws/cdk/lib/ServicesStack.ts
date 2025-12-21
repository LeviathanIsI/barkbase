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
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
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

  // Workflow Execution Engine
  public readonly workflowTriggerQueue: sqs.IQueue;
  public readonly workflowStepQueue: sqs.IQueue;
  public readonly workflowTriggerProcessorFunction: lambda.IFunction;
  public readonly workflowStepExecutorFunction: lambda.IFunction;
  public readonly workflowSchedulerFunction: lambda.IFunction;
  public readonly workflowSchedulerRole: iam.IRole;
  public readonly workflowCleanupFunction: lambda.IFunction;
  public readonly workflowDlqProcessorFunction: lambda.IFunction;
  public readonly workflowStepDlq: sqs.IQueue;
  public readonly workflowTriggerDlq: sqs.IQueue;

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
    // Workflow Execution Engine - SQS Queues
    // =========================================================================

    // Dead Letter Queue for workflow triggers
    this.workflowTriggerDlq = new sqs.Queue(this, 'WorkflowTriggerDLQ', {
      queueName: `${config.stackPrefix}-workflow-triggers-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Dead Letter Queue for workflow steps
    this.workflowStepDlq = new sqs.Queue(this, 'WorkflowStepDLQ', {
      queueName: `${config.stackPrefix}-workflow-steps-dlq`,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Workflow trigger queue - receives domain events (booking.created, pet.updated, etc.)
    this.workflowTriggerQueue = new sqs.Queue(this, 'WorkflowTriggerQueue', {
      queueName: `${config.stackPrefix}-workflow-triggers`,
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: this.workflowTriggerDlq,
        maxReceiveCount: 3, // Retry 3 times before sending to DLQ
      },
    });

    // Workflow step queue - processes individual workflow steps
    this.workflowStepQueue = new sqs.Queue(this, 'WorkflowStepQueue', {
      queueName: `${config.stackPrefix}-workflow-steps`,
      visibilityTimeout: cdk.Duration.seconds(300), // 5 min for step processing
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: this.workflowStepDlq,
        maxReceiveCount: 3,
      },
    });

    // EventBridge Scheduler role for delayed step execution
    this.workflowSchedulerRole = new iam.Role(this, 'WorkflowSchedulerRole', {
      roleName: `${config.stackPrefix}-workflow-scheduler-role`,
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'Role for EventBridge Scheduler to send messages to SQS for delayed workflow steps',
    });

    // Grant scheduler role permission to send messages to step queue
    this.workflowStepQueue.grantSendMessages(this.workflowSchedulerRole);

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

    // Grant SQS permissions for workflow event publishing
    this.workflowTriggerQueue.grantSendMessages(lambdaRole);
    this.workflowStepQueue.grantSendMessages(lambdaRole);

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
      // Workflow execution engine queue URLs
      WORKFLOW_TRIGGER_QUEUE_URL: this.workflowTriggerQueue.queueUrl,
      WORKFLOW_STEP_QUEUE_URL: this.workflowStepQueue.queueUrl,
      WORKFLOW_STEP_QUEUE_ARN: this.workflowStepQueue.queueArn,
      WORKFLOW_SCHEDULER_ROLE_ARN: this.workflowSchedulerRole.roleArn,
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
    // Workflow Execution Engine Lambda Functions
    // =========================================================================
    // These functions power the workflow automation system.
    // They are invoked via SQS and EventBridge, NOT exposed via API Gateway.

    // Workflow Trigger Processor - Receives domain events and enrolls records
    this.workflowTriggerProcessorFunction = new lambda.Function(this, 'WorkflowTriggerProcessorFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-workflow-trigger-processor`,
      description: 'BarkBase Workflow Trigger Processor - Processes domain events and enrolls records in workflows',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/workflow-processor')),
      timeout: cdk.Duration.seconds(30),
    });

    // Workflow Step Executor - Executes individual workflow steps
    this.workflowStepExecutorFunction = new lambda.Function(this, 'WorkflowStepExecutorFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-workflow-step-executor`,
      description: 'BarkBase Workflow Step Executor - Executes workflow steps (actions, waits, determinators)',
      handler: 'step-executor.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/workflow-processor')),
      timeout: cdk.Duration.minutes(1),
      environment: {
        ...commonEnvironment,
        WORKFLOW_STEP_EXECUTOR_ARN: '', // Will be updated after creation
      },
    });

    // Workflow Scheduled Processor - Handles scheduled triggers and resuming paused executions
    this.workflowSchedulerFunction = new lambda.Function(this, 'WorkflowSchedulerFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-workflow-scheduler`,
      description: 'BarkBase Workflow Scheduler - Scheduled triggers and resuming paused workflow executions',
      handler: 'scheduled-processor.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/workflow-processor')),
      timeout: cdk.Duration.minutes(5),
    });

    // Wire SQS queues to Lambda functions with event source mappings
    this.workflowTriggerProcessorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.workflowTriggerQueue as sqs.Queue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(5),
        reportBatchItemFailures: true,
      })
    );

    this.workflowStepExecutorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.workflowStepQueue as sqs.Queue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(2),
        reportBatchItemFailures: true,
      })
    );

    // Grant additional permissions for step executor (EventBridge Scheduler)
    this.workflowStepExecutorFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['scheduler:CreateSchedule', 'scheduler:DeleteSchedule', 'scheduler:GetSchedule'],
      resources: ['*'],
    }));

    // Grant scheduler role to pass itself
    this.workflowSchedulerRole.grantPassRole(this.workflowStepExecutorFunction.role!);

    // EventBridge rule to run scheduled processor every 5 minutes
    const workflowScheduleRule = new events.Rule(this, 'WorkflowScheduleRule', {
      ruleName: `${config.stackPrefix}-workflow-scheduler`,
      description: 'Triggers workflow scheduler every 5 minutes for scheduled triggers and resuming paused executions',
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
    });

    workflowScheduleRule.addTarget(new targets.LambdaFunction(this.workflowSchedulerFunction, {
      retryAttempts: 2,
    }));

    // Create EventBridge Scheduler group for workflow wait schedules
    new cdk.CfnResource(this, 'WorkflowSchedulerGroup', {
      type: 'AWS::Scheduler::ScheduleGroup',
      properties: {
        Name: 'workflow-schedules',
      },
    });

    // =========================================================================
    // Workflow Cleanup Service (EventBridge-scheduled, NOT exposed via API Gateway)
    // =========================================================================
    // Cleans up old workflow data based on HubSpot-aligned retention policies:
    // - WorkflowExecutionLog: 90 days (action logs)
    // - WorkflowExecution: 180 days (enrollment history)
    // Per-tenant customization via Tenant.settings.workflow_log_retention_days
    // and Tenant.settings.workflow_execution_retention_days

    this.workflowCleanupFunction = new lambda.Function(this, 'WorkflowCleanupFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-workflow-cleanup`,
      description: 'BarkBase Workflow Cleanup - Scheduled data retention cleanup for workflow logs and executions',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/workflow-cleanup')),
      timeout: cdk.Duration.minutes(5), // Allow time for processing all tenants
    });

    // Grant CloudWatch metrics permissions for emitting cleanup metrics
    this.workflowCleanupFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    }));

    // EventBridge rule to trigger cleanup service daily at 2am UTC (off-peak hours)
    const workflowCleanupScheduleRule = new events.Rule(this, 'WorkflowCleanupScheduleRule', {
      ruleName: `${config.stackPrefix}-workflow-cleanup`,
      description: 'Triggers workflow cleanup service daily at 2am UTC for data retention',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    workflowCleanupScheduleRule.addTarget(new targets.LambdaFunction(this.workflowCleanupFunction, {
      retryAttempts: 2,
    }));

    // =========================================================================
    // Workflow DLQ Processor (EventBridge-triggered from SQS DLQ)
    // =========================================================================
    // Processes messages that failed after max retries (3 attempts).
    // - Logs failure details for debugging
    // - Updates WorkflowExecution status to 'failed'
    // - Increments workflow.failed_count
    // - Sends notifications if configured

    this.workflowDlqProcessorFunction = new lambda.Function(this, 'WorkflowDlqProcessorFunction', {
      ...commonLambdaConfig,
      functionName: `${config.stackPrefix}-workflow-dlq-processor`,
      description: 'BarkBase Workflow DLQ Processor - Handles failed workflow messages after max retries',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/workflow-dlq-processor')),
      timeout: cdk.Duration.minutes(2),
    });

    // Grant CloudWatch metrics permissions
    this.workflowDlqProcessorFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    }));

    // Wire DLQ processor to both DLQs
    this.workflowDlqProcessorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.workflowStepDlq as sqs.Queue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(10),
      })
    );

    this.workflowDlqProcessorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.workflowTriggerDlq as sqs.Queue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(10),
      })
    );

    // =========================================================================
    // CloudWatch Alarms for DLQ Monitoring
    // =========================================================================

    // SNS topic for DLQ alerts
    const dlqAlertTopic = new sns.Topic(this, 'WorkflowDlqAlertTopic', {
      topicName: `${config.stackPrefix}-workflow-dlq-alerts`,
      displayName: 'BarkBase Workflow DLQ Alerts',
    });

    // Alarm when any message appears in the step DLQ
    const stepDlqAlarm = new cloudwatch.Alarm(this, 'WorkflowStepDlqAlarm', {
      alarmName: `${config.stackPrefix}-workflow-step-dlq-messages`,
      alarmDescription: 'Alarm when workflow step messages appear in DLQ (failed after 3 retries)',
      metric: this.workflowStepDlq.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    stepDlqAlarm.addAlarmAction(new cloudwatchActions.SnsAction(dlqAlertTopic));

    // Alarm when any message appears in the trigger DLQ
    const triggerDlqAlarm = new cloudwatch.Alarm(this, 'WorkflowTriggerDlqAlarm', {
      alarmName: `${config.stackPrefix}-workflow-trigger-dlq-messages`,
      alarmDescription: 'Alarm when workflow trigger messages appear in DLQ (failed after 3 retries)',
      metric: this.workflowTriggerDlq.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    triggerDlqAlarm.addAlarmAction(new cloudwatchActions.SnsAction(dlqAlertTopic));

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

    // Workflow Queue Outputs
    new cdk.CfnOutput(this, 'WorkflowTriggerQueueUrl', {
      value: this.workflowTriggerQueue.queueUrl,
      description: 'Workflow Trigger Queue URL',
      exportName: `${config.stackPrefix}-workflow-trigger-queue-url`,
    });

    new cdk.CfnOutput(this, 'WorkflowTriggerQueueArn', {
      value: this.workflowTriggerQueue.queueArn,
      description: 'Workflow Trigger Queue ARN',
      exportName: `${config.stackPrefix}-workflow-trigger-queue-arn`,
    });

    new cdk.CfnOutput(this, 'WorkflowStepQueueUrl', {
      value: this.workflowStepQueue.queueUrl,
      description: 'Workflow Step Queue URL',
      exportName: `${config.stackPrefix}-workflow-step-queue-url`,
    });

    new cdk.CfnOutput(this, 'WorkflowStepQueueArn', {
      value: this.workflowStepQueue.queueArn,
      description: 'Workflow Step Queue ARN',
      exportName: `${config.stackPrefix}-workflow-step-queue-arn`,
    });

    new cdk.CfnOutput(this, 'WorkflowTriggerProcessorArn', {
      value: this.workflowTriggerProcessorFunction.functionArn,
      description: 'Workflow Trigger Processor Lambda ARN',
      exportName: `${config.stackPrefix}-workflow-trigger-processor-arn`,
    });

    new cdk.CfnOutput(this, 'WorkflowStepExecutorArn', {
      value: this.workflowStepExecutorFunction.functionArn,
      description: 'Workflow Step Executor Lambda ARN',
      exportName: `${config.stackPrefix}-workflow-step-executor-arn`,
    });

    new cdk.CfnOutput(this, 'WorkflowSchedulerArn', {
      value: this.workflowSchedulerFunction.functionArn,
      description: 'Workflow Scheduler Lambda ARN',
      exportName: `${config.stackPrefix}-workflow-scheduler-arn`,
    });

    new cdk.CfnOutput(this, 'WorkflowCleanupArn', {
      value: this.workflowCleanupFunction.functionArn,
      description: 'Workflow Cleanup Lambda ARN',
      exportName: `${config.stackPrefix}-workflow-cleanup-arn`,
    });

    new cdk.CfnOutput(this, 'WorkflowDlqProcessorArn', {
      value: this.workflowDlqProcessorFunction.functionArn,
      description: 'Workflow DLQ Processor Lambda ARN',
      exportName: `${config.stackPrefix}-workflow-dlq-processor-arn`,
    });

    new cdk.CfnOutput(this, 'WorkflowStepDlqUrl', {
      value: this.workflowStepDlq.queueUrl,
      description: 'Workflow Step DLQ URL',
      exportName: `${config.stackPrefix}-workflow-step-dlq-url`,
    });

    new cdk.CfnOutput(this, 'WorkflowTriggerDlqUrl', {
      value: this.workflowTriggerDlq.queueUrl,
      description: 'Workflow Trigger DLQ URL',
      exportName: `${config.stackPrefix}-workflow-trigger-dlq-url`,
    });
  }
}

