/**
 * IdentityServicesStack
 * 
 * Purpose: Authentication, user profile, and role/permission management for BarkBase.
 * 
 * Domain Boundaries:
 * - Authentication (login, logout, refresh, signup)
 * - User profile management
 * - Role and permission configuration
 * 
 * Lambda Functions:
 * - AuthApiFunction: /api/v1/auth/* routes
 * - UserProfileServiceFunction: /api/v1/users/profile, password, permissions
 * - RolesConfigServiceFunction: /api/v1/roles, /api/v1/user-permissions
 * 
 * API Routes Owned:
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/logout
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/signup
 * - GET /api/v1/users/profile
 * - POST /api/v1/users/password
 * - ANY /api/v1/roles
 * - GET/POST/PATCH /api/v1/user-permissions/*
 * 
 * Dependencies:
 * - NetworkStack (VPC, security groups, subnets)
 * - DatabaseStack (credentials secret)
 * 
 * Resource Count: ~15-20 resources (3 Lambdas + LogGroups + IAM)
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ServiceStackProps, buildLambdaEnvironment } from './shared/ServiceStackProps';
import * as path from 'path';

export interface IdentityServicesStackProps extends ServiceStackProps {
  // Identity-specific props can be added here
}

export class IdentityServicesStack extends cdk.Stack {
  /**
   * Auth API Lambda - handles /api/v1/auth/* routes
   */
  public readonly authApiFunction: nodejs.NodejsFunction;

  /**
   * User Profile Service Lambda - handles /api/v1/users/profile, password
   */
  public readonly userProfileServiceFunction: nodejs.NodejsFunction;

  /**
   * Roles Config Service Lambda - handles /api/v1/roles, user-permissions
   */
  public readonly rolesConfigServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: IdentityServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // Common Lambda configuration
    const commonLambdaProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
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
    };

    // =========================================================================
    // Auth API Function
    // =========================================================================
    this.authApiFunction = new nodejs.NodejsFunction(this, 'AuthApiFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-auth-api`,
      description: 'BarkBase Auth API - login, logout, refresh, signup',
      entry: path.join(__dirname, '../../lambdas/auth-api/index.ts'),
      handler: 'handler',
    });

    // Log group with retention
    new logs.LogGroup(this, 'AuthApiLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-auth-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.authApiFunction);

    // =========================================================================
    // User Profile Service Function
    // =========================================================================
    this.userProfileServiceFunction = new nodejs.NodejsFunction(this, 'UserProfileServiceFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-user-profile-service`,
      description: 'BarkBase User Profile Service - profile, password, permissions',
      entry: path.join(__dirname, '../../lambdas/user-profile-service/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'UserProfileLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-user-profile-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.userProfileServiceFunction);

    // =========================================================================
    // Roles Config Service Function
    // =========================================================================
    this.rolesConfigServiceFunction = new nodejs.NodejsFunction(this, 'RolesConfigServiceFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-roles-config-service`,
      description: 'BarkBase Roles Config Service - roles, user-permissions',
      entry: path.join(__dirname, '../../lambdas/roles-config-service/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'RolesConfigLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-roles-config-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.rolesConfigServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'AuthApiFunctionArn', {
      value: this.authApiFunction.functionArn,
      description: 'Auth API Lambda function ARN',
      exportName: `${this.stackName}-AuthApiFunctionArn`,
    });

    new cdk.CfnOutput(this, 'UserProfileFunctionArn', {
      value: this.userProfileServiceFunction.functionArn,
      description: 'User Profile Service Lambda function ARN',
      exportName: `${this.stackName}-UserProfileFunctionArn`,
    });

    new cdk.CfnOutput(this, 'RolesConfigFunctionArn', {
      value: this.rolesConfigServiceFunction.functionArn,
      description: 'Roles Config Service Lambda function ARN',
      exportName: `${this.stackName}-RolesConfigFunctionArn`,
    });
  }
}
