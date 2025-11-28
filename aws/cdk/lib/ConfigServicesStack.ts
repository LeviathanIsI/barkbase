/**
 * ConfigServicesStack
 * 
 * Purpose: Application configuration and facility settings management.
 * 
 * Domain Boundaries:
 * - Service definitions (boarding, grooming, etc.)
 * - Facility configuration
 * - Package definitions
 * - Account defaults
 * 
 * Lambda Functions:
 * - ConfigServiceFunction: /api/v1/services/*, /api/v1/facility/*, 
 *   /api/v1/packages/*, /api/v1/account-defaults/*
 * 
 * API Routes Owned:
 * - ANY /api/v1/services
 * - DELETE /api/v1/services/{proxy+}
 * - POST/GET/PATCH /api/v1/facility/{proxy+}
 * - POST/PUT /api/v1/packages/{proxy+}
 * - PUT/DELETE /api/v1/account-defaults/{proxy+}
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

export interface ConfigServicesStackProps extends ServiceStackProps {
  // Config-specific props can be added here
}

export class ConfigServicesStack extends cdk.Stack {
  /**
   * Config Service Lambda - handles services, facility, packages, account-defaults
   */
  public readonly configServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: ConfigServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Config Service Function
    // =========================================================================
    this.configServiceFunction = new nodejs.NodejsFunction(this, 'ConfigServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-config-service`,
      description: 'BarkBase Config Service - services, facility, packages',
      entry: path.join(__dirname, '../../lambdas/config-service/index.ts'),
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

    new logs.LogGroup(this, 'ConfigServiceLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-config-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.configServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'ConfigServiceFunctionArn', {
      value: this.configServiceFunction.functionArn,
      description: 'Config Service Lambda function ARN',
      exportName: `${this.stackName}-ConfigServiceFunctionArn`,
    });
  }
}
