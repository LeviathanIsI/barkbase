/**
 * AnalyticsServicesStack
 * 
 * Purpose: Business intelligence and analytics for BarkBase.
 * 
 * Domain Boundaries:
 * - Dashboard statistics
 * - Today's pets view
 * - Arrivals/departures reporting
 * - Schedule/capacity views
 * - Revenue and occupancy reports
 * 
 * Lambda Functions:
 * - AnalyticsServiceFunction: /api/v1/dashboard/*, /api/v1/schedule/*,
 *   /api/v1/reports/*
 * 
 * API Routes Owned:
 * - GET /api/v1/dashboard/stats
 * - GET /api/v1/dashboard/today-pets
 * - GET /api/v1/dashboard/arrivals
 * - GET /api/v1/schedule
 * - GET /api/v1/schedule/capacity
 * - GET /api/v1/reports/departures
 * - GET /api/v1/reports/arrivals
 * - GET /api/v1/reports/revenue
 * - GET /api/v1/reports/occupancy
 * 
 * Dependencies:
 * - NetworkStack (VPC, security groups, subnets)
 * - DatabaseStack (credentials secret)
 * 
 * Performance Notes:
 * - Consider using read replicas for heavy analytics queries
 * - Cache frequently accessed dashboard data
 * 
 * Resource Count: ~5-8 resources (1 Lambda + LogGroup + IAM)
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ServiceStackProps, buildLambdaEnvironment } from './shared/ServiceStackProps';
import * as path from 'path';

export interface AnalyticsServicesStackProps extends ServiceStackProps {
  // Analytics-specific props can be added here
}

export class AnalyticsServicesStack extends cdk.Stack {
  /**
   * Analytics Service Lambda - handles dashboard, schedule, reports
   */
  public readonly analyticsServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: AnalyticsServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Analytics Service Function
    // =========================================================================
    this.analyticsServiceFunction = new nodejs.NodejsFunction(this, 'AnalyticsServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-analytics-service`,
      description: 'BarkBase Analytics Service - dashboard, schedule, reports',
      entry: path.join(__dirname, '../../lambdas/analytics-service/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(15),
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
    });

    new logs.LogGroup(this, 'AnalyticsServiceLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-analytics-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.analyticsServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'AnalyticsServiceFunctionArn', {
      value: this.analyticsServiceFunction.functionArn,
      description: 'Analytics Service Lambda function ARN',
      exportName: `${this.stackName}-AnalyticsServiceFunctionArn`,
    });
  }
}
