/**
 * =============================================================================
 * BarkBase Database Stack
 * =============================================================================
 *
 * References EXISTING RDS instances (created via AWS CLI).
 *
 * NO SECRETS IN THIS FILE!
 * Database credentials are stored in:
 * - backend/.env.development (dev)
 * - backend/.env.production (prod)
 *
 * Lambda functions read DATABASE_URL from environment variables.
 *
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly bastionSecurityGroup: ec2.ISecurityGroup;
  readonly dbSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, dbSecurityGroup } = props;

    // Store DB security group reference (imported from NetworkStack)
    this.dbSecurityGroup = dbSecurityGroup;

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    // Note: DbSecurityGroupId is exported by NetworkStack, not duplicated here

    new cdk.CfnOutput(this, 'Note', {
      value: 'DATABASE_URL is set via .env files, NOT in CDK',
      description: 'Credentials are in backend/.env.development and backend/.env.production',
    });
  }
}

