/**
 * NetworkStack
 * 
 * Purpose: Core networking infrastructure for BarkBase Dev v2.
 * 
 * Domain Boundaries:
 * - VPC configuration (10.0.0.0/16 CIDR, 2 AZs)
 * - Public subnets (for NAT gateway, bastion, future tooling)
 * - Private subnets (for Lambdas, RDS, application compute)
 * - NAT Gateway (1x for cost control in dev)
 * - Security groups for Lambda/app and database isolation
 * - VPC endpoints for Secrets Manager and CloudWatch Logs
 * 
 * Consumers:
 * - DatabaseStack (VPC, dbSecurityGroup for RDS placement)
 * - All Lambda functions (VPC, lambdaSecurityGroup)
 * - Future ECS/Fargate services
 * 
 * This stack MUST be deployed first as all other stacks depend on it.
 * 
 * Resource Count: ~25-35 resources (well under 500 limit)
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
  /**
   * Optional: Override the VPC CIDR block.
   * Default: 10.0.0.0/16
   */
  vpcCidr?: string;

  /**
   * Optional: Number of availability zones to use.
   * Default: 2
   */
  maxAzs?: number;

  /**
   * Optional: Number of NAT gateways (1 for dev, 2+ for prod).
   * Default: 1
   */
  natGateways?: number;
}

export class NetworkStack extends cdk.Stack {
  /**
   * The VPC for all BarkBase resources.
   */
  public readonly vpc: ec2.Vpc;

  /**
   * Private subnets for application workloads (Lambdas, RDS, etc.).
   */
  public readonly appSubnets: ec2.ISubnet[];

  /**
   * Public subnets for NAT gateway and future bastion/tooling.
   */
  public readonly publicSubnets: ec2.ISubnet[];

  /**
   * Security group for Lambda functions and application compute.
   * Allows outbound traffic; inbound rules added by consumers.
   */
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;

  /**
   * Security group for RDS database.
   * Allows inbound from lambdaSecurityGroup on port 5432 only.
   */
  public readonly dbSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    const vpcCidr = props?.vpcCidr ?? '10.0.0.0/16';
    const maxAzs = props?.maxAzs ?? 2;
    const natGateways = props?.natGateways ?? 1;

    // =========================================================================
    // VPC
    // =========================================================================
    this.vpc = new ec2.Vpc(this, 'BarkbaseVpc', {
      ipAddresses: ec2.IpAddresses.cidr(vpcCidr),
      maxAzs,
      natGateways,

      // Subnet configuration: public + private (app) per AZ
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'App',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],

      // Enable DNS support for VPC endpoints
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Store subnet references for consumers
    this.publicSubnets = this.vpc.publicSubnets;
    this.appSubnets = this.vpc.privateSubnets;

    // Add descriptive tags to subnets
    this.publicSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add('Name', `BarkbaseDevV2/Public/AZ${index + 1}`);
      cdk.Tags.of(subnet).add('Tier', 'Public');
    });

    this.appSubnets.forEach((subnet, index) => {
      cdk.Tags.of(subnet).add('Name', `BarkbaseDevV2/App/AZ${index + 1}`);
      cdk.Tags.of(subnet).add('Tier', 'Private');
    });

    // =========================================================================
    // Security Groups
    // =========================================================================

    // Lambda/Application Security Group
    // Used by Lambda functions and future application compute
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions and application compute',
      securityGroupName: 'barkbase-dev-lambda-sg',
      allowAllOutbound: true, // Lambdas need outbound for AWS services
    });

    cdk.Tags.of(this.lambdaSecurityGroup).add('Name', 'BarkbaseDevV2/Lambda-SG');

    // Database Security Group
    // Used by RDS PostgreSQL instance
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS PostgreSQL database',
      securityGroupName: 'barkbase-dev-db-sg',
      allowAllOutbound: false, // DB doesn't need outbound
    });

    cdk.Tags.of(this.dbSecurityGroup).add('Name', 'BarkbaseDevV2/Database-SG');

    // Allow inbound PostgreSQL (5432) from Lambda security group only
    this.dbSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Lambda functions'
    );

    // =========================================================================
    // VPC Endpoints
    // =========================================================================
    // Interface endpoints allow Lambdas in private subnets to reach AWS services
    // without going through NAT gateway (cost optimization).

    // Secrets Manager endpoint - for database credentials retrieval
    new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      securityGroups: [this.lambdaSecurityGroup],
    });

    // CloudWatch Logs endpoint - for Lambda logging
    new ec2.InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      privateDnsEnabled: true,
      securityGroups: [this.lambdaSecurityGroup],
    });

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    // Export values for cross-stack references and documentation

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for BarkBase Dev',
      exportName: `${this.stackName}-VpcId`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR block',
      exportName: `${this.stackName}-VpcCidr`,
    });

    new cdk.CfnOutput(this, 'AppSubnetIds', {
      value: this.appSubnets.map(s => s.subnetId).join(','),
      description: 'Private (App) subnet IDs',
      exportName: `${this.stackName}-AppSubnetIds`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.publicSubnets.map(s => s.subnetId).join(','),
      description: 'Public subnet IDs',
      exportName: `${this.stackName}-PublicSubnetIds`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
      description: 'Security group ID for Lambda functions',
      exportName: `${this.stackName}-LambdaSgId`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.dbSecurityGroup.securityGroupId,
      description: 'Security group ID for database',
      exportName: `${this.stackName}-DbSgId`,
    });
  }
}
