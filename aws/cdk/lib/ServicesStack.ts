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
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface ServicesStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly dbSecretArn: string;
  readonly userPoolId: string;
  readonly userPoolClientId: string;
  readonly jwksUrl: string;
}

export class ServicesStack extends cdk.Stack {
  public readonly dbLayer: lambda.ILayerVersion;
  public readonly sharedLayer: lambda.ILayerVersion;
  public readonly authApiFunction: lambda.IFunction;
  public readonly userProfileFunction: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);

    const { 
      config, 
      vpc, 
      lambdaSecurityGroup, 
      dbSecretArn, 
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

    // Grant access to Secrets Manager
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
      ],
      resources: [dbSecretArn],
    }));

    // Common environment variables for all Lambda functions
    const commonEnvironment: Record<string, string> = {
      NODE_ENV: config.env === 'prod' ? 'production' : 'development',
      AWS_REGION_DEPLOY: config.region,
      DB_SECRET_ARN: dbSecretArn,
      DB_NAME: 'barkbase',
      COGNITO_USER_POOL_ID: userPoolId,
      COGNITO_CLIENT_ID: userPoolClientId,
      COGNITO_JWKS_URL: jwksUrl,
      COGNITO_ISSUER_URL: `https://cognito-idp.${config.region}.amazonaws.com/${userPoolId}`,
    };

    // Common Lambda configuration
    const commonLambdaConfig = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      layers: [this.dbLayer, this.sharedLayer],
      environment: commonEnvironment,
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
  }
}

