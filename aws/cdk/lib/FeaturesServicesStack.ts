/**
 * FeaturesServicesStack
 * 
 * Purpose: Feature-rich capabilities for BarkBase operations.
 * 
 * Domain Boundaries:
 * - Task management
 * - Communications/messaging
 * - Incident reporting
 * - Notes system
 * - Invites management
 * - Customer segments
 * 
 * Lambda Functions:
 * - FeaturesServiceFunction: /api/v1/tasks/*, /api/v1/communications/*,
 *   /api/v1/incidents/*, /api/v1/notes/*, /api/v1/messages/*, 
 *   /api/v1/invites/*, /api/v1/segments/*
 * 
 * API Routes Owned:
 * - ANY /api/v1/tasks
 * - GET/PUT/DELETE /api/v1/tasks/{proxy+}
 * - ANY /api/v1/communications
 * - GET/PATCH /api/v1/communications/{proxy+}
 * - ANY /api/v1/incidents
 * - POST/DELETE /api/v1/incidents/{proxy+}
 * - ANY /api/v1/notes
 * - POST/DELETE /api/v1/notes/{proxy+}
 * - ANY /api/v1/messages
 * - GET/PUT /api/v1/messages/{proxy+}
 * - ANY /api/v1/invites
 * - POST/PATCH/GET /api/v1/invites/{proxy+}
 * - PUT/PATCH /api/v1/segments/{proxy+}
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

export interface FeaturesServicesStackProps extends ServiceStackProps {
  // Features-specific props can be added here
}

export class FeaturesServicesStack extends cdk.Stack {
  /**
   * Features Service Lambda - handles tasks, communications, incidents, notes, etc.
   */
  public readonly featuresServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: FeaturesServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Features Service Function
    // =========================================================================
    this.featuresServiceFunction = new nodejs.NodejsFunction(this, 'FeaturesServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-features-service`,
      description: 'BarkBase Features Service - tasks, communications, incidents, notes',
      entry: path.join(__dirname, '../../lambdas/features-service/index.ts'),
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

    new logs.LogGroup(this, 'FeaturesServiceLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-features-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.featuresServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'FeaturesServiceFunctionArn', {
      value: this.featuresServiceFunction.functionArn,
      description: 'Features Service Lambda function ARN',
      exportName: `${this.stackName}-FeaturesServiceFunctionArn`,
    });
  }
}
