/**
 * =============================================================================
 * BarkBase Database Stack
 * =============================================================================
 * 
 * Creates PostgreSQL RDS instance with:
 * - Secrets Manager for credentials
 * - Private subnet placement
 * - Security group allowing Lambda and Bastion access
 * - Multi-AZ for production
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly vpc: ec2.IVpc;
  readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  readonly bastionSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.IDatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly dbSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc, lambdaSecurityGroup, bastionSecurityGroup } = props;

    // Create security group for RDS
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      securityGroupName: `${config.stackPrefix}-db-sg`,
      description: 'Security group for BarkBase PostgreSQL RDS',
      allowAllOutbound: false,
    });

    // Allow inbound PostgreSQL from Lambda security group
    this.dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Lambda functions'
    );

    // Allow inbound PostgreSQL from Bastion security group
    this.dbSecurityGroup.addIngressRule(
      bastionSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Bastion host'
    );

    // Create Secrets Manager secret for DB credentials
    this.dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: `${config.stackPrefix}/db-credentials`,
      description: 'BarkBase PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'barkbase_admin',
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        excludeCharacters: '"@/\\\'',
        passwordLength: 32,
      },
    });

    // Map instance class string to proper type
    const instanceType = this.getInstanceType(config.dbInstanceClass);

    // Create RDS PostgreSQL instance
    this.dbInstance = new rds.DatabaseInstance(this, 'BarkbaseDb', {
      instanceIdentifier: `${config.stackPrefix}-postgres`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [this.dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      databaseName: 'barkbase',
      multiAz: config.dbMultiAz,
      allocatedStorage: config.env === 'prod' ? 100 : 20,
      maxAllocatedStorage: config.env === 'prod' ? 500 : 50,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      deletionProtection: config.env === 'prod',
      backupRetention: cdk.Duration.days(config.env === 'prod' ? 30 : 7),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      autoMinorVersionUpgrade: true,
      publiclyAccessible: false,
      removalPolicy: config.env === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      cloudwatchLogsExports: ['postgresql', 'upgrade'],
      enablePerformanceInsights: config.env === 'prod',
      performanceInsightRetention: config.env === 'prod' 
        ? rds.PerformanceInsightRetention.MONTHS_1 
        : undefined,
      parameterGroup: new rds.ParameterGroup(this, 'DbParameterGroup', {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_15,
        }),
        parameters: {
          'log_statement': 'all',
          'log_min_duration_statement': '1000',
        },
      }),
    });

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.dbInstance.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL Endpoint',
      exportName: `${config.stackPrefix}-db-endpoint`,
    });

    new cdk.CfnOutput(this, 'DbPort', {
      value: this.dbInstance.instanceEndpoint.port.toString(),
      description: 'RDS PostgreSQL Port',
      exportName: `${config.stackPrefix}-db-port`,
    });

    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: `${config.stackPrefix}-db-secret-arn`,
    });

    new cdk.CfnOutput(this, 'DbSecurityGroupId', {
      value: this.dbSecurityGroup.securityGroupId,
      description: 'Database Security Group ID',
      exportName: `${config.stackPrefix}-db-sg-id`,
    });
  }

  private getInstanceType(instanceClass: string): ec2.InstanceType {
    const [family, size] = instanceClass.split('.');
    
    // Map common instance types
    const familyMap: Record<string, ec2.InstanceClass> = {
      't3': ec2.InstanceClass.T3,
      't4g': ec2.InstanceClass.T4G,
      'r5': ec2.InstanceClass.R5,
      'r6g': ec2.InstanceClass.R6G,
      'm5': ec2.InstanceClass.M5,
      'm6g': ec2.InstanceClass.M6G,
    };

    const sizeMap: Record<string, ec2.InstanceSize> = {
      'micro': ec2.InstanceSize.MICRO,
      'small': ec2.InstanceSize.SMALL,
      'medium': ec2.InstanceSize.MEDIUM,
      'large': ec2.InstanceSize.LARGE,
      'xlarge': ec2.InstanceSize.XLARGE,
      '2xlarge': ec2.InstanceSize.XLARGE2,
      '4xlarge': ec2.InstanceSize.XLARGE4,
    };

    const instanceFamily = familyMap[family] || ec2.InstanceClass.T3;
    const instanceSize = sizeMap[size] || ec2.InstanceSize.MICRO;

    return ec2.InstanceType.of(instanceFamily, instanceSize);
  }
}

