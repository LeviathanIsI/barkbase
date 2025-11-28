/**
 * JobsStack
 * 
 * Purpose: Background jobs, scheduled tasks, and async processing.
 * 
 * Domain Boundaries:
 * - Property archival jobs (soft-archive inactive properties)
 * - Property permanent deletion jobs (hard-delete after retention period)
 * - Data migration jobs (schema updates, data transforms)
 * 
 * Scheduled Jobs:
 * - Property archival: Daily at 02:00 UTC
 * - Property deletion: Daily at 03:00 UTC
 * - Migration: Manual trigger (disabled by default)
 * 
 * Dependencies:
 * - NetworkStack (VPC access for RDS)
 * - DatabaseStack (data access)
 * 
 * Notes:
 * - All jobs run inside VPC for database access
 * - EventBridge rules trigger jobs on schedule
 * - Jobs should be idempotent and handle partial failures
 * 
 * Resource Count: ~15-25 resources (3 Lambdas + EventBridge rules)
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import * as path from 'path';

export interface JobsStackProps extends cdk.StackProps {
  /**
   * VPC where Lambdas will be deployed for RDS access.
   */
  vpc: ec2.IVpc;

  /**
   * Security group for Lambda functions.
   */
  lambdaSecurityGroup: ec2.ISecurityGroup;

  /**
   * Private subnets for Lambda VPC placement.
   */
  appSubnets: ec2.ISubnet[];

  /**
   * Secrets Manager secret containing database credentials.
   */
  dbSecret: secretsmanager.ISecret;

  /**
   * Database hostname (RDS endpoint).
   */
  dbHost: string;

  /**
   * Database port.
   */
  dbPort: string;

  /**
   * Database name.
   */
  dbName: string;

  /**
   * Deployment stage (dev, staging, prod).
   */
  stage: string;

  /**
   * Environment name.
   */
  environment: string;
}

export class JobsStack extends cdk.Stack {
  /**
   * Property archival job Lambda
   */
  public readonly propertyArchivalJobFunction: nodejs.NodejsFunction;

  /**
   * Property permanent deletion job Lambda
   */
  public readonly propertyDeletionJobFunction: nodejs.NodejsFunction;

  /**
   * Migration job Lambda
   */
  public readonly migrationJobFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: JobsStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv: Record<string, string> = {
      DB_HOST: props.dbHost,
      DB_PORT: props.dbPort,
      DB_NAME: props.dbName,
      DB_SECRET_ID: props.dbSecret.secretName,
      DB_SECRET_ARN: props.dbSecret.secretArn,
      STAGE: props.stage,
      ENVIRONMENT: props.environment,
    };

    // Common Lambda configuration
    const commonLambdaProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(5), // Jobs may take longer
      memorySize: 512,
      vpc: props.vpc,
      vpcSubnets: { subnets: props.appSubnets },
      securityGroups: [props.lambdaSecurityGroup],
      tracing: lambda.Tracing.ACTIVE,
      environment: lambdaEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    };

    // =========================================================================
    // Property Archival Job
    // =========================================================================
    this.propertyArchivalJobFunction = new nodejs.NodejsFunction(this, 'PropertyArchivalJobFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-job-property-archival`,
      description: 'BarkBase property archival job - soft-archive inactive properties',
      entry: path.join(__dirname, '../../lambdas/jobs-property-archival/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'PropertyArchivalLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-job-property-archival`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.propertyArchivalJobFunction);

    // =========================================================================
    // Property Permanent Deletion Job
    // =========================================================================
    this.propertyDeletionJobFunction = new nodejs.NodejsFunction(this, 'PropertyDeletionJobFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-job-property-deletion`,
      description: 'BarkBase property deletion job - hard-delete archived properties',
      entry: path.join(__dirname, '../../lambdas/jobs-property-deletion/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'PropertyDeletionLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-job-property-deletion`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.propertyDeletionJobFunction);

    // =========================================================================
    // Migration Job
    // =========================================================================
    this.migrationJobFunction = new nodejs.NodejsFunction(this, 'MigrationJobFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-job-migration`,
      description: 'BarkBase migration job - data migrations and schema updates',
      entry: path.join(__dirname, '../../lambdas/jobs-migration/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.minutes(15), // Migrations may take longer
    });

    new logs.LogGroup(this, 'MigrationLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-job-migration`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.migrationJobFunction);

    // =========================================================================
    // EventBridge Rules
    // =========================================================================

    // Property Archival - Daily at 02:00 UTC
    const propertyArchivalRule = new events.Rule(this, 'PropertyArchivalRule', {
      ruleName: `barkbase-${props.stage}-property-archival-schedule`,
      description: 'Triggers property archival job daily at 02:00 UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      enabled: true,
    });

    propertyArchivalRule.addTarget(
      new eventsTargets.LambdaFunction(this.propertyArchivalJobFunction, {
        retryAttempts: 2,
      })
    );

    // Property Deletion - Daily at 03:00 UTC
    const propertyDeletionRule = new events.Rule(this, 'PropertyDeletionRule', {
      ruleName: `barkbase-${props.stage}-property-deletion-schedule`,
      description: 'Triggers property deletion job daily at 03:00 UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '3',
        day: '*',
        month: '*',
        year: '*',
      }),
      enabled: true,
    });

    propertyDeletionRule.addTarget(
      new eventsTargets.LambdaFunction(this.propertyDeletionJobFunction, {
        retryAttempts: 2,
      })
    );

    // Migration - Disabled by default (manual trigger only)
    const migrationRule = new events.Rule(this, 'MigrationRule', {
      ruleName: `barkbase-${props.stage}-migration-schedule`,
      description: 'Migration job trigger (disabled by default)',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '4',
        day: '1', // First day of month
        month: '*',
        year: '*',
      }),
      enabled: false, // Disabled by default - enable when needed
    });

    migrationRule.addTarget(
      new eventsTargets.LambdaFunction(this.migrationJobFunction, {
        retryAttempts: 1,
      })
    );

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'PropertyArchivalJobArn', {
      value: this.propertyArchivalJobFunction.functionArn,
      description: 'Property archival job Lambda ARN',
      exportName: `${this.stackName}-PropertyArchivalJobArn`,
    });

    new cdk.CfnOutput(this, 'PropertyDeletionJobArn', {
      value: this.propertyDeletionJobFunction.functionArn,
      description: 'Property deletion job Lambda ARN',
      exportName: `${this.stackName}-PropertyDeletionJobArn`,
    });

    new cdk.CfnOutput(this, 'MigrationJobArn', {
      value: this.migrationJobFunction.functionArn,
      description: 'Migration job Lambda ARN',
      exportName: `${this.stackName}-MigrationJobArn`,
    });
  }
}
