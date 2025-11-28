/**
 * OperationsServicesStack
 * 
 * Purpose: Day-to-day operational features for BarkBase facilities.
 * 
 * Domain Boundaries:
 * - Booking management
 * - Check-in/check-out processing
 * - Kennel/run management and assignments
 * - Run templates
 * - Daily operations tracking
 * 
 * Lambda Functions:
 * - OperationsServiceFunction: /api/v1/bookings/*, /api/v1/check-ins/*, 
 *   /api/v1/check-outs/*, /api/v1/kennels/*, /api/v1/runs/*
 * 
 * API Routes Owned:
 * - ANY /api/v1/bookings
 * - POST/PUT/DELETE /api/v1/bookings/{proxy+}
 * - POST /api/v1/bookings/{id}/check-in
 * - POST /api/v1/bookings/{id}/check-out
 * - ANY /api/v1/check-ins
 * - GET/PATCH/DELETE /api/v1/check-ins/{proxy+}
 * - ANY /api/v1/check-outs
 * - GET/PATCH/DELETE /api/v1/check-outs/{proxy+}
 * - ANY /api/v1/kennels
 * - GET/PUT /api/v1/kennels/{proxy+}
 * - GET /api/v1/kennels/occupancy
 * - ANY /api/v1/runs
 * - POST/GET/DELETE /api/v1/runs/{proxy+}
 * - GET /api/v1/runs/assignments
 * - POST /api/v1/run-templates/{proxy+}
 * 
 * Dependencies:
 * - NetworkStack (VPC, security groups, subnets)
 * - DatabaseStack (credentials secret)
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

export interface OperationsServicesStackProps extends ServiceStackProps {
  // Operations-specific props can be added here
}

export class OperationsServicesStack extends cdk.Stack {
  /**
   * Operations Service Lambda - handles bookings, check-ins, kennels, runs
   */
  public readonly operationsServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: OperationsServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Operations Service Function
    // =========================================================================
    this.operationsServiceFunction = new nodejs.NodejsFunction(this, 'OperationsServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-operations-service`,
      description: 'BarkBase Operations Service - bookings, check-ins, kennels, runs',
      entry: path.join(__dirname, '../../lambdas/operations-service/index.ts'),
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

    new logs.LogGroup(this, 'OperationsServiceLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-operations-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.operationsServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'OperationsServiceFunctionArn', {
      value: this.operationsServiceFunction.functionArn,
      description: 'Operations Service Lambda function ARN',
      exportName: `${this.stackName}-OperationsServiceFunctionArn`,
    });
  }
}
