/**
 * PropertiesV2ServicesStack
 * 
 * Purpose: Property and facility management for BarkBase v2 API.
 * 
 * Domain Boundaries:
 * - Physical facility/property definitions
 * - Multi-location support
 * - Property archival and deletion
 * 
 * Lambda Functions:
 * - PropertiesApiV2Function: /api/v2/properties/*
 * 
 * API Routes Owned:
 * - GET /api/v2/properties
 * - GET /api/v2/properties/{id}
 * - DELETE /api/v2/properties/{propertyId}
 * - POST /api/v2/properties/{propertyId}/archive
 * 
 * Dependencies:
 * - NetworkStack (VPC, security groups, subnets)
 * - DatabaseStack (credentials secret)
 * 
 * Note: This is the v2 API for properties. Legacy v1 routes may exist elsewhere.
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

export interface PropertiesV2ServicesStackProps extends ServiceStackProps {
  // Properties-specific props can be added here
}

export class PropertiesV2ServicesStack extends cdk.Stack {
  /**
   * Properties API v2 Lambda - handles /api/v2/properties/*
   */
  public readonly propertiesApiV2Function: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: PropertiesV2ServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Properties API V2 Function
    // =========================================================================
    this.propertiesApiV2Function = new nodejs.NodejsFunction(this, 'PropertiesApiV2Function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-properties-v2-service`,
      description: 'BarkBase Properties API v2 - property management',
      entry: path.join(__dirname, '../../lambdas/properties-v2-service/index.ts'),
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

    new logs.LogGroup(this, 'PropertiesApiV2LogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-properties-v2-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.propertiesApiV2Function);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'PropertiesApiV2FunctionArn', {
      value: this.propertiesApiV2Function.functionArn,
      description: 'Properties API v2 Lambda function ARN',
      exportName: `${this.stackName}-PropertiesApiV2FunctionArn`,
    });
  }
}
