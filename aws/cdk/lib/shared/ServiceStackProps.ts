/**
 * Shared Props Interface for BarkBase CDK Stacks
 * 
 * This file defines common interfaces used across all BarkBase stacks
 * to ensure consistent configuration and dependency injection.
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Environment configuration for BarkBase
 */
export interface BarkBaseEnvironment {
  /** Environment name: 'dev', 'staging', 'prod' */
  envName: string;
  /** AWS region for deployment */
  region: string;
  /** AWS account ID */
  account: string;
}

/**
 * Props for stacks that depend on NetworkStack outputs
 */
export interface NetworkDependentStackProps extends cdk.StackProps {
  /** The VPC to deploy resources into */
  vpc: ec2.IVpc;
  /** Security group for Lambda functions and app tier */
  appSecurityGroup: ec2.ISecurityGroup;
  /** Environment configuration */
  environment: BarkBaseEnvironment;
}

/**
 * Props for stacks that depend on DatabaseStack outputs
 */
export interface DatabaseDependentStackProps extends NetworkDependentStackProps {
  /** The RDS database instance */
  database: rds.IDatabaseInstance;
  /** The database credentials secret */
  databaseSecret: secretsmanager.ISecret;
  /** Database name */
  databaseName: string;
}

/**
 * Base props for all BarkBase service stacks
 */
export interface ServiceStackProps extends DatabaseDependentStackProps {
  /** The database Lambda layer */
  dbLayer: lambda.ILayerVersion;
}

/**
 * Helper to generate consistent resource naming
 */
export function resourceName(environment: BarkBaseEnvironment, resource: string): string {
  return `barkbase-${environment.envName}-${resource}`;
}

/**
 * Helper to generate consistent SSM parameter paths
 */
export function ssmPath(environment: BarkBaseEnvironment, ...segments: string[]): string {
  return `/barkbase/${environment.envName}/${segments.join('/')}`;
}

/**
 * Helper to generate consistent Secrets Manager secret names
 */
export function secretName(environment: BarkBaseEnvironment, ...segments: string[]): string {
  return `barkbase/${environment.envName}/${segments.join('/')}`;
}

/**
 * Build standard environment variables for Lambda functions that need DB access
 */
export function buildDbEnvironment(environment: BarkBaseEnvironment, databaseName: string): Record<string, string> {
  return {
    // Secret-based configuration (preferred in Lambda)
    DB_SECRET_NAME: secretName(environment, 'postgres', 'credentials'),
    DB_NAME: databaseName,
    // Environment metadata
    BARKBASE_ENV: environment.envName,
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1', // Keep-alive for better performance
  };
}

/**
 * Build standard Lambda function props for VPC-enabled functions
 */
export function buildVpcLambdaProps(
  vpc: ec2.IVpc,
  securityGroup: ec2.ISecurityGroup
): Pick<lambda.FunctionProps, 'vpc' | 'vpcSubnets' | 'securityGroups'> {
  return {
    vpc,
    vpcSubnets: {
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
    securityGroups: [securityGroup],
  };
}
