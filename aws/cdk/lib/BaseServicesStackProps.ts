/**
 * Shared interfaces and types for BarkBase domain-specific service stacks.
 * Each domain stack receives these common props to connect to shared infrastructure.
 */
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

/**
 * Base props required by all domain service stacks
 */
export interface BaseServicesStackProps extends cdk.StackProps {
  /** Deployment stage (dev, staging, prod) */
  stage: string;

  /** VPC for Lambda execution */
  vpc: ec2.IVpc;

  /** Security group for Lambda functions */
  lambdaSecurityGroup: ec2.ISecurityGroup;

  /** Database credentials secret */
  dbSecret: secretsmanager.ISecret;

  /** Database host endpoint */
  dbHost: string;

  /** Database port */
  dbPort: number;

  /** Database name */
  dbName: string;

  /** Shared HTTP API from ApiCoreStack */
  httpApi: apigwv2.IHttpApi;

  /** Optional Cognito user pool for auth context */
  userPool?: cognito.IUserPool;

  /** Optional Cognito user pool client */
  userPoolClient?: cognito.IUserPoolClient;

  /** Optional HTTP User Pool Authorizer for protected routes */
  authorizer?: HttpUserPoolAuthorizer;
}

/**
 * Helper to create standard database environment variables
 */
export function createDbEnv(props: Pick<BaseServicesStackProps, 'dbHost' | 'dbPort' | 'dbName' | 'dbSecret' | 'stage'>): Record<string, string> {
  return {
    DB_HOST: props.dbHost,
    DB_PORT: props.dbPort.toString(),
    DB_NAME: props.dbName,
    DB_SECRET_ID: props.dbSecret.secretName,
    DB_SECRET_ARN: props.dbSecret.secretArn,
    ENVIRONMENT: props.stage,
    STAGE: props.stage,
  };
}

/**
 * Helper to create auth environment variables
 */
export function createAuthEnv(
  userPool?: cognito.IUserPool,
  userPoolClient?: cognito.IUserPoolClient
): Record<string, string> {
  const jwtSecret = process.env.JWT_SECRET || "";
  const jwtSecretOld = process.env.JWT_SECRET_OLD || "";

  return {
    USER_POOL_ID: userPool?.userPoolId ?? "us-east-2_v94gByGOq",
    CLIENT_ID: userPoolClient?.userPoolClientId ?? "2csen8hj7b53ec2q9bc0siubja",
    ...(jwtSecret ? { JWT_SECRET: jwtSecret } : {}),
    ...(jwtSecretOld ? { JWT_SECRET_OLD: jwtSecretOld } : {}),
  };
}

/**
 * Helper to create VPC configuration for Lambda functions
 */
export function createVpcConfig(props: Pick<BaseServicesStackProps, 'vpc' | 'lambdaSecurityGroup'>) {
  return {
    vpc: props.vpc,
    securityGroups: [props.lambdaSecurityGroup],
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  };
}

