import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_rds as rds, aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly rdsSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  public readonly rdsSecurityGroup: ec2.ISecurityGroup;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly dbName: string;
  public readonly dbHost?: string;
  public readonly dbPort?: number;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.rdsSecurityGroup = props.rdsSecurityGroup;

    const stage =
      this.node.tryGetContext('stage') ??
      this.node.tryGetContext('Stage') ??
      process.env.STAGE ??
      'dev';

    const defaultSecretName = `Barkbase-${stage}-db-credentials`;
    const dbSecretArn =
      this.node.tryGetContext('dbSecretArn') ?? process.env.DB_SECRET_ARN ?? undefined;
    const dbSecretName =
      this.node.tryGetContext('dbSecretName') ??
      process.env.DB_SECRET_NAME ??
      defaultSecretName;

    this.dbSecret = dbSecretArn
      ? secretsmanager.Secret.fromSecretCompleteArn(this, 'BarkbaseDbSecret', dbSecretArn)
      : secretsmanager.Secret.fromSecretNameV2(this, 'BarkbaseDbSecret', dbSecretName);

    this.dbName = process.env.DB_NAME || 'barkbase';

    const legacyRdsSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'LegacyDbSecurityGroup',
      'sg-0ec9960ae33807760',
    );

    const existingDb = rds.DatabaseInstance.fromDatabaseInstanceAttributes(
      this,
      'ExistingBarkbaseDb',
      {
        instanceIdentifier:
          this.node.tryGetContext('dbInstanceIdentifier') ?? 'barkbase-dev-public',
        instanceEndpointAddress:
          this.node.tryGetContext('dbEndpointAddress') ??
          'barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com',
        port: Number(this.node.tryGetContext('dbEndpointPort') ?? 5432),
        securityGroups: [legacyRdsSecurityGroup],
      },
    );

    this.dbHost = existingDb.dbInstanceEndpointAddress;
    // CDK exposes the endpoint port as a string; convert to number for downstream consumers.
    this.dbPort = Number(existingDb.dbInstanceEndpointPort);

    // TODO: In a future phase, create/manage the actual RDS instance or cluster here,
    //       using this.vpc and this.rdsSecurityGroup for network placement.
    // TODO: Move database parameter groups, snapshots, and proxies into this stack
    //       once we migrate away from the imported instance.

    cdk.Tags.of(this).add('Stage', stage);
  }
}



