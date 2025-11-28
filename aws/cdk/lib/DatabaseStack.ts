/**
 * =============================================================================
 * BarkBase Database Stack
 * =============================================================================
 * 
 * Stack Name: Barkbase-DatabaseStack-{env} (e.g., Barkbase-DatabaseStack-dev)
 * 
 * RESPONSIBILITIES:
 * -----------------
 * This stack creates and manages the PostgreSQL RDS database:
 * 
 * 1. RDS PostgreSQL Instance:
 *    - Engine: PostgreSQL 15.x
 *    - Instance Class: db.t3.micro (dev) - configurable for prod
 *    - Storage: 20 GB GP3 with autoscaling up to 100 GB
 *    - Multi-AZ: Disabled for dev (enable for prod)
 *    - Encryption: Enabled at rest
 *    - Backup: 7-day retention with automated backups
 * 
 * 2. Database Credentials (Secrets Manager):
 *    - Secret Name: barkbase/{env}/postgres/credentials
 *    - Contains: username, password, host, port, dbname
 *    - Auto-rotation: Not enabled by default (can be added)
 * 
 * 3. SSM Parameters:
 *    - /barkbase/{env}/db/host - Database endpoint
 *    - /barkbase/{env}/db/port - Database port (5432)
 *    - /barkbase/{env}/db/name - Database name
 *    - /barkbase/{env}/db/secret-arn - Secret ARN for credentials
 * 
 * DEPENDENCIES:
 * -------------
 * - NetworkStack: Requires VPC, isolated subnets, and security groups
 * 
 * OUTPUTS (consumed by other stacks):
 * ------------------------------------
 * - DatabaseEndpoint: RDS instance endpoint address
 * - DatabasePort: RDS instance port (5432)
 * - DatabaseName: Database name
 * - DatabaseSecretArn: Secrets Manager secret ARN
 * - DatabaseSecretName: Secrets Manager secret name
 * 
 * DEPLOYMENT:
 * -----------
 * Deploy after NetworkStack:
 * 
 * cdk deploy Barkbase-DatabaseStack-dev
 * 
 * CONNECTION STRING FORMAT:
 * -------------------------
 * postgresql://{username}:{password}@{host}:{port}/{dbname}
 * 
 * Retrieve credentials from Secrets Manager:
 * aws secretsmanager get-secret-value --secret-id barkbase/dev/postgres/credentials
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { BarkBaseEnvironment, resourceName, ssmPath, secretName } from './shared/ServiceStackProps';

export interface DatabaseStackProps extends cdk.StackProps {
  /** Environment configuration */
  environment: BarkBaseEnvironment;
  /** VPC from NetworkStack */
  vpc: ec2.IVpc;
  /** Security group for database from NetworkStack */
  databaseSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  /** The RDS PostgreSQL database instance */
  public readonly database: rds.DatabaseInstance;
  
  /** The Secrets Manager secret containing database credentials */
  public readonly databaseSecret: secretsmanager.ISecret;
  
  /** The database name */
  public readonly databaseName: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { environment, vpc, databaseSecurityGroup } = props;

    // Database configuration
    this.databaseName = 'barkbase';
    const databaseUsername = 'barkbase_admin';

    // =========================================================================
    // Database Credentials Secret
    // =========================================================================
    // Create a Secrets Manager secret for the database credentials.
    // CDK will automatically generate a secure password.
    
    const credentialsSecretName = secretName(environment, 'postgres', 'credentials');
    
    const credentials = rds.Credentials.fromGeneratedSecret(databaseUsername, {
      secretName: credentialsSecretName,
    });

    // =========================================================================
    // RDS Subnet Group
    // =========================================================================
    // Place the database in isolated subnets (no internet access)
    
    const subnetGroup = new rds.SubnetGroup(this, 'SubnetGroup', {
      vpc,
      description: 'Subnet group for BarkBase PostgreSQL database',
      subnetGroupName: resourceName(environment, 'db-subnet-group'),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // =========================================================================
    // RDS Parameter Group
    // =========================================================================
    // Custom parameter group for PostgreSQL optimization
    
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      description: 'BarkBase PostgreSQL parameter group',
      parameters: {
        // Enable logical replication for future CDC needs
        'rds.logical_replication': '1',
        // Connection settings
        'max_connections': '100',
        // Logging settings
        'log_statement': 'ddl',
        'log_connections': '1',
        'log_disconnections': '1',
      },
    });

    // =========================================================================
    // RDS PostgreSQL Instance
    // =========================================================================
    
    this.database = new rds.DatabaseInstance(this, 'Database', {
      instanceIdentifier: resourceName(environment, 'postgres'),
      
      // Engine configuration
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      
      // Instance sizing - adjust for production
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO  // Use SMALL or MEDIUM for production
      ),
      
      // Storage configuration
      allocatedStorage: 20,
      maxAllocatedStorage: 100, // Enable storage autoscaling
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      
      // Network configuration
      vpc,
      subnetGroup,
      securityGroups: [databaseSecurityGroup],
      publiclyAccessible: false,
      
      // Database configuration
      databaseName: this.databaseName,
      credentials,
      parameterGroup,
      
      // Availability & durability
      multiAz: false, // Enable for production
      
      // Backup configuration
      backupRetention: cdk.Duration.days(7),
      preferredBackupWindow: '03:00-04:00', // UTC
      preferredMaintenanceWindow: 'Sun:04:00-Sun:05:00', // UTC
      deleteAutomatedBackups: true,
      
      // Deletion protection - enable for production
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Use RETAIN for production
      
      // Monitoring
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      cloudwatchLogsExports: ['postgresql', 'upgrade'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
      
      // Minor version auto-upgrade
      autoMinorVersionUpgrade: true,
    });

    // Store reference to the secret
    this.databaseSecret = this.database.secret!;

    // =========================================================================
    // SSM Parameters
    // =========================================================================
    // Store database configuration in SSM for easy access by Lambda functions
    // and other services.
    
    new ssm.StringParameter(this, 'DbHostParam', {
      parameterName: ssmPath(environment, 'db', 'host'),
      stringValue: this.database.instanceEndpoint.hostname,
      description: 'BarkBase PostgreSQL database endpoint',
    });

    new ssm.StringParameter(this, 'DbPortParam', {
      parameterName: ssmPath(environment, 'db', 'port'),
      stringValue: this.database.instanceEndpoint.port.toString(),
      description: 'BarkBase PostgreSQL database port',
    });

    new ssm.StringParameter(this, 'DbNameParam', {
      parameterName: ssmPath(environment, 'db', 'name'),
      stringValue: this.databaseName,
      description: 'BarkBase PostgreSQL database name',
    });

    new ssm.StringParameter(this, 'DbSecretArnParam', {
      parameterName: ssmPath(environment, 'db', 'secret-arn'),
      stringValue: this.databaseSecret.secretArn,
      description: 'BarkBase PostgreSQL credentials secret ARN',
    });

    new ssm.StringParameter(this, 'DbSecretNameParam', {
      parameterName: ssmPath(environment, 'db', 'secret-name'),
      stringValue: credentialsSecretName,
      description: 'BarkBase PostgreSQL credentials secret name',
    });

    // =========================================================================
    // CloudFormation Outputs
    // =========================================================================
    
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      description: 'RDS PostgreSQL endpoint address',
      exportName: `${this.stackName}-DatabaseEndpoint`,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: this.database.instanceEndpoint.port.toString(),
      description: 'RDS PostgreSQL port',
      exportName: `${this.stackName}-DatabasePort`,
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: this.databaseName,
      description: 'Database name',
      exportName: `${this.stackName}-DatabaseName`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseSecret.secretArn,
      description: 'Secrets Manager secret ARN for database credentials',
      exportName: `${this.stackName}-DatabaseSecretArn`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretName', {
      value: credentialsSecretName,
      description: 'Secrets Manager secret name for database credentials',
      exportName: `${this.stackName}-DatabaseSecretName`,
    });

    new cdk.CfnOutput(this, 'DatabaseInstanceId', {
      value: this.database.instanceIdentifier,
      description: 'RDS instance identifier',
      exportName: `${this.stackName}-DatabaseInstanceId`,
    });

    // =========================================================================
    // Tags
    // =========================================================================
    cdk.Tags.of(this).add('Project', 'BarkBase');
    cdk.Tags.of(this).add('Environment', environment.envName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}

