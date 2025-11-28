/**
 * DatabaseStack
 * 
 * Purpose: Database infrastructure for BarkBase Dev v2 tenant data.
 * 
 * Domain Boundaries:
 * - RDS PostgreSQL 15 instance (multi-tenant, shared by all tenants via tenant_id)
 * - Database credentials stored in AWS Secrets Manager (auto-generated)
 * - DB subnet group using private subnets from NetworkStack
 * - No public accessibility - only reachable from within VPC
 * 
 * Dependencies:
 * - NetworkStack (VPC, dbSecurityGroup, appSubnets)
 * 
 * Consumers:
 * - All service stacks that need database access
 * - Lambda functions retrieve credentials from dbSecret
 * 
 * Security Notes:
 * - Credentials are NEVER hardcoded - always from Secrets Manager
 * - Database is in private subnets with no public IP
 * - Only accessible from lambdaSecurityGroup on port 5432
 * 
 * Dev Environment Notes:
 * - DeletionProtection: false (for easy teardown)
 * - RemovalPolicy: DESTROY (data will be deleted on stack destroy)
 * - Small instance class (t3.micro) for cost control
 * - Change these settings for production!
 * 
 * Resource Count: ~5-10 resources (well under 500 limit)
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  /**
   * VPC where the database will be deployed.
   * Required: Must be passed from NetworkStack.
   */
  vpc: ec2.IVpc;

  /**
   * Security group for the database instance.
   * Should allow inbound from Lambda security group on port 5432.
   * Required: Must be passed from NetworkStack.
   */
  dbSecurityGroup: ec2.ISecurityGroup;

  /**
   * Optional: Private subnets for database placement.
   * If not provided, will use VPC's private subnets.
   */
  appSubnets?: ec2.ISubnet[];

  /**
   * Optional: Database name.
   * Default: 'barkbase'
   */
  databaseName?: string;

  /**
   * Optional: Instance class for the database.
   * Default: t3.micro (dev-appropriate)
   */
  instanceClass?: ec2.InstanceClass;

  /**
   * Optional: Instance size for the database.
   * Default: MICRO
   */
  instanceSize?: ec2.InstanceSize;

  /**
   * Optional: Allocated storage in GiB.
   * Default: 20
   */
  allocatedStorageGiB?: number;
}

export class DatabaseStack extends cdk.Stack {
  /**
   * The RDS PostgreSQL database instance.
   */
  public readonly instance: rds.DatabaseInstance;

  /**
   * The Secrets Manager secret containing database credentials.
   * Secret JSON format: { username, password, host, port, dbname, engine }
   */
  public readonly dbSecret: secretsmanager.ISecret;

  /**
   * Re-export of the database security group for consumers.
   */
  public readonly dbSecurityGroup: ec2.ISecurityGroup;

  /**
   * Database hostname for connection.
   */
  public readonly hostname: string;

  /**
   * Database port (5432 for PostgreSQL).
   */
  public readonly port: string;

  /**
   * Database name ('barkbase').
   */
  public readonly dbName: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Configuration with defaults
    const databaseName = props.databaseName ?? 'barkbase';
    const instanceClass = props.instanceClass ?? ec2.InstanceClass.T3;
    const instanceSize = props.instanceSize ?? ec2.InstanceSize.MICRO;
    const allocatedStorageGiB = props.allocatedStorageGiB ?? 20;

    // Store props for re-export
    this.dbSecurityGroup = props.dbSecurityGroup;
    this.dbName = databaseName;

    // =========================================================================
    // RDS PostgreSQL Instance
    // =========================================================================
    this.instance = new rds.DatabaseInstance(this, 'BarkbaseDatabase', {
      // Engine: PostgreSQL 15
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),

      // Instance configuration (small for dev)
      instanceType: ec2.InstanceType.of(instanceClass, instanceSize),
      allocatedStorage: allocatedStorageGiB,
      maxAllocatedStorage: 100, // Allow autoscaling up to 100 GiB if needed
      storageType: rds.StorageType.GP2,

      // Credentials - auto-generated and stored in Secrets Manager
      credentials: rds.Credentials.fromGeneratedSecret('barkbase_admin', {
        secretName: 'barkbase-dev/db-credentials',
      }),

      // Database name
      databaseName,

      // Networking
      vpc: props.vpc,
      vpcSubnets: {
        subnets: props.appSubnets ?? props.vpc.privateSubnets,
      },
      securityGroups: [props.dbSecurityGroup],
      publiclyAccessible: false, // CRITICAL: No public access

      // Availability (single AZ for dev)
      multiAz: false,

      // Backup configuration
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true, // Delete backups when instance is deleted (dev only)

      // Maintenance window (Sunday 3-4 AM UTC)
      preferredMaintenanceWindow: 'Sun:03:00-Sun:04:00',

      // DEV ONLY settings - change for production!
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,

      // Monitoring
      enablePerformanceInsights: false, // Disable for t3.micro (not supported)
      monitoringInterval: cdk.Duration.seconds(0), // Disable enhanced monitoring for dev

      // Instance identifier
      instanceIdentifier: 'barkbase-dev-postgres',

      // Parameter group (using defaults for PostgreSQL 15)
      // Can add custom parameter group later if needed
    });

    // Store secret reference
    this.dbSecret = this.instance.secret!;

    // Store connection info
    this.hostname = this.instance.dbInstanceEndpointAddress;
    this.port = this.instance.dbInstanceEndpointPort;

    // Add tags
    cdk.Tags.of(this.instance).add('Name', 'BarkbaseDevV2/PostgreSQL');
    cdk.Tags.of(this.instance).add('Environment', 'Dev');

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.hostname,
      description: 'Database endpoint hostname',
      exportName: `${this.stackName}-DbEndpoint`,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: this.port,
      description: 'Database port',
      exportName: `${this.stackName}-DbPort`,
    });

    new cdk.CfnOutput(this, 'DatabaseName', {
      value: this.dbName,
      description: 'Database name',
      exportName: `${this.stackName}-DbName`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.dbSecret.secretArn,
      description: 'ARN of the Secrets Manager secret containing DB credentials',
      exportName: `${this.stackName}-DbSecretArn`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretName', {
      value: this.dbSecret.secretName,
      description: 'Name of the Secrets Manager secret',
      exportName: `${this.stackName}-DbSecretName`,
    });

    new cdk.CfnOutput(this, 'DatabaseInstanceId', {
      value: this.instance.instanceIdentifier,
      description: 'RDS instance identifier',
      exportName: `${this.stackName}-DbInstanceId`,
    });
  }

  /**
   * Helper: Get the full connection string (without credentials).
   * Credentials should be retrieved from dbSecret at runtime.
   */
  public get connectionEndpoint(): string {
    return `${this.hostname}:${this.port}/${this.dbName}`;
  }
}
