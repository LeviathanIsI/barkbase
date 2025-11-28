/**
 * =============================================================================
 * BarkBase Network Stack
 * =============================================================================
 * 
 * Stack Name: Barkbase-NetworkStack-{env} (e.g., Barkbase-NetworkStack-dev)
 * 
 * RESPONSIBILITIES:
 * -----------------
 * This stack creates and manages all foundational networking resources:
 * 
 * 1. VPC (Virtual Private Cloud)
 *    - CIDR: 10.0.0.0/16
 *    - 2 Availability Zones for high availability
 * 
 * 2. Subnets:
 *    - Public subnets (for NAT Gateways, ALB if needed)
 *    - Private subnets with egress (for Lambdas, app tier)
 *    - Isolated subnets (for RDS database)
 * 
 * 3. Security Groups:
 *    - App/Lambda Security Group: For Lambda functions and app tier
 *    - Database Security Group: For RDS, allows inbound from App SG
 * 
 * 4. NAT Gateway:
 *    - Single NAT Gateway for cost optimization in dev
 *    - Enables private subnet resources to access the internet
 * 
 * OUTPUTS (consumed by other stacks):
 * ------------------------------------
 * - VpcId: The VPC identifier
 * - VpcCidr: The VPC CIDR block
 * - PrivateSubnetIds: Comma-separated list of private subnet IDs
 * - IsolatedSubnetIds: Comma-separated list of isolated subnet IDs (for DB)
 * - AppSecurityGroupId: Security group for Lambda/app tier
 * - DatabaseSecurityGroupId: Security group for RDS database
 * 
 * DEPLOYMENT:
 * -----------
 * This stack has no dependencies and should be deployed first.
 * 
 * cdk deploy Barkbase-NetworkStack-dev
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { BarkBaseEnvironment, resourceName, ssmPath } from './shared/ServiceStackProps';

export interface NetworkStackProps extends cdk.StackProps {
  environment: BarkBaseEnvironment;
}

export class NetworkStack extends cdk.Stack {
  /** The VPC for all BarkBase resources */
  public readonly vpc: ec2.Vpc;
  
  /** Security group for Lambda functions and application tier */
  public readonly appSecurityGroup: ec2.SecurityGroup;
  
  /** Security group for RDS database */
  public readonly databaseSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // =========================================================================
    // VPC
    // =========================================================================
    // Create a VPC with public, private, and isolated subnets across 2 AZs.
    // - Public subnets: NAT Gateway, load balancers
    // - Private subnets: Lambda functions, ECS tasks
    // - Isolated subnets: RDS database (no internet access)
    
    this.vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: resourceName(environment, 'vpc'),
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1, // Single NAT for cost optimization in dev/staging
      
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Add VPC Flow Logs for security auditing (optional but recommended)
    this.vpc.addFlowLog('FlowLog', {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.REJECT,
    });

    // =========================================================================
    // Security Groups
    // =========================================================================
    
    // App/Lambda Security Group
    // This SG is used by Lambda functions and any app tier resources.
    // It allows all outbound traffic by default.
    this.appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: resourceName(environment, 'app-sg'),
      description: 'Security group for Lambda functions and application tier',
      allowAllOutbound: true,
    });

    // Database Security Group
    // This SG is used by RDS. It allows inbound PostgreSQL traffic only from
    // the App Security Group.
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: resourceName(environment, 'db-sg'),
      description: 'Security group for RDS PostgreSQL database',
      allowAllOutbound: false, // DB should not initiate outbound connections
    });

    // Allow PostgreSQL (port 5432) from App SG to DB SG
    this.databaseSecurityGroup.addIngressRule(
      this.appSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL from App/Lambda tier'
    );

    // =========================================================================
    // SSM Parameters (for easy reference by other stacks/services)
    // =========================================================================
    
    new ssm.StringParameter(this, 'VpcIdParam', {
      parameterName: ssmPath(environment, 'network', 'vpc-id'),
      stringValue: this.vpc.vpcId,
      description: 'BarkBase VPC ID',
    });

    new ssm.StringParameter(this, 'AppSgIdParam', {
      parameterName: ssmPath(environment, 'network', 'app-sg-id'),
      stringValue: this.appSecurityGroup.securityGroupId,
      description: 'BarkBase App/Lambda Security Group ID',
    });

    new ssm.StringParameter(this, 'DbSgIdParam', {
      parameterName: ssmPath(environment, 'network', 'db-sg-id'),
      stringValue: this.databaseSecurityGroup.securityGroupId,
      description: 'BarkBase Database Security Group ID',
    });

    // =========================================================================
    // CloudFormation Outputs
    // =========================================================================
    // These outputs are exported for cross-stack references and documentation.
    
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${this.stackName}-VpcId`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
      exportName: `${this.stackName}-VpcCidr`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(s => s.subnetId).join(','),
      description: 'Private Subnet IDs (comma-separated)',
      exportName: `${this.stackName}-PrivateSubnetIds`,
    });

    new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
      value: this.vpc.isolatedSubnets.map(s => s.subnetId).join(','),
      description: 'Isolated Subnet IDs for RDS (comma-separated)',
      exportName: `${this.stackName}-IsolatedSubnetIds`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.vpc.publicSubnets.map(s => s.subnetId).join(','),
      description: 'Public Subnet IDs (comma-separated)',
      exportName: `${this.stackName}-PublicSubnetIds`,
    });

    new cdk.CfnOutput(this, 'AppSecurityGroupId', {
      value: this.appSecurityGroup.securityGroupId,
      description: 'App/Lambda Security Group ID',
      exportName: `${this.stackName}-AppSecurityGroupId`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.databaseSecurityGroup.securityGroupId,
      description: 'Database Security Group ID',
      exportName: `${this.stackName}-DatabaseSecurityGroupId`,
    });

    // =========================================================================
    // Tags
    // =========================================================================
    cdk.Tags.of(this).add('Project', 'BarkBase');
    cdk.Tags.of(this).add('Environment', environment.envName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}

