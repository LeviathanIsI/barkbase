/**
 * EntityServicesStack
 * 
 * Purpose: Core entity management for BarkBase - pets, owners, and staff.
 * 
 * Domain Boundaries:
 * - Pet entity CRUD operations
 * - Owner/customer entity CRUD operations
 * - Staff entity CRUD operations
 * - Pet-Owner relationships
 * - Pet profiles, medical info, vaccination records
 * 
 * Lambda Functions:
 * - EntityServiceFunction: /api/v1/pets/*, /api/v1/owners/*, /api/v1/staff/*
 * 
 * API Routes Owned:
 * - ANY /api/v1/pets
 * - GET/PUT/DELETE /api/v1/pets/{proxy+}
 * - GET /api/v1/pets/{id}/vaccinations
 * - GET /api/v1/pets/vaccinations/expiring
 * - GET /api/v1/pets/medical-alerts
 * - ANY /api/v1/owners
 * - GET/PUT/DELETE /api/v1/owners/{proxy+}
 * - GET /api/v1/owners/{id}/pets
 * - ANY /api/v1/staff
 * - GET/PUT/DELETE /api/v1/staff/{proxy+}
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

export interface EntityServicesStackProps extends ServiceStackProps {
  // Entity-specific props can be added here
}

export class EntityServicesStack extends cdk.Stack {
  /**
   * Entity Service Lambda - handles pets, owners, staff CRUD
   */
  public readonly entityServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: EntityServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Entity Service Function
    // =========================================================================
    this.entityServiceFunction = new nodejs.NodejsFunction(this, 'EntityServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-entity-service`,
      description: 'BarkBase Entity Service - pets, owners, staff CRUD',
      entry: path.join(__dirname, '../../lambdas/entity-service/index.ts'),
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

    new logs.LogGroup(this, 'EntityServiceLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-entity-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.entityServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'EntityServiceFunctionArn', {
      value: this.entityServiceFunction.functionArn,
      description: 'Entity Service Lambda function ARN',
      exportName: `${this.stackName}-EntityServiceFunctionArn`,
    });
  }
}
