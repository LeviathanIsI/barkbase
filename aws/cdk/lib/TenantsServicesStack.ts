/**
 * TenantsServicesStack
 * 
 * Purpose: Multi-tenant management and membership handling for BarkBase.
 * 
 * Domain Boundaries:
 * - Tenant provisioning and configuration
 * - Tenant profile management
 * - Membership management
 * - Tenant-level data isolation
 * 
 * Lambda Functions:
 * - TenantsMembershipsServiceFunction: /api/v1/tenants/*, /api/v1/memberships/*
 * 
 * API Routes Owned:
 * - POST /api/v1/tenants/{proxy+}
 * - GET /api/v1/tenants?slug={slug}
 * - GET /api/v1/tenants/current
 * - GET /api/v1/tenants/current/plan
 * - GET /api/v1/tenants/current/onboarding
 * - GET /api/v1/tenants/current/theme
 * - GET/POST/PUT /api/v1/memberships/{proxy+}
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

export interface TenantsServicesStackProps extends ServiceStackProps {
  // Tenant-specific props can be added here
}

export class TenantsServicesStack extends cdk.Stack {
  /**
   * Tenants & Memberships Service Lambda
   */
  public readonly tenantsMembershipsServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: TenantsServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Tenants & Memberships Service Function
    // =========================================================================
    this.tenantsMembershipsServiceFunction = new nodejs.NodejsFunction(this, 'TenantsMembershipsServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-tenants-memberships-service`,
      description: 'BarkBase Tenants & Memberships Service',
      entry: path.join(__dirname, '../../lambdas/tenants-memberships-service/index.ts'),
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

    new logs.LogGroup(this, 'TenantsMembershipsLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-tenants-memberships-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.tenantsMembershipsServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'TenantsMembershipsServiceFunctionArn', {
      value: this.tenantsMembershipsServiceFunction.functionArn,
      description: 'Tenants & Memberships Service Lambda function ARN',
      exportName: `${this.stackName}-TenantsMembershipsServiceFunctionArn`,
    });
  }
}
