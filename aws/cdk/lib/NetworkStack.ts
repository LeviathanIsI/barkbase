/**
 * =============================================================================
 * BarkBase Network Stack
 * =============================================================================
 * 
 * Creates the foundational network infrastructure:
 * - VPC with 2 AZs
 * - Public and private subnets
 * - NAT Gateway (1 for dev, scalable for prod)
 * - Security Groups for Lambda and Bastion access
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface NetworkStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  public readonly bastionSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Create VPC with public and private subnets across 2 AZs
    this.vpc = new ec2.Vpc(this, 'BarkbaseVpc', {
      vpcName: `${config.stackPrefix}-vpc`,
      maxAzs: 2,
      natGateways: config.natGateways,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
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
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Store subnet references
    this.privateSubnets = this.vpc.privateSubnets;
    this.publicSubnets = this.vpc.publicSubnets;

    // Security Group for Lambda functions
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSG', {
      vpc: this.vpc,
      securityGroupName: `${config.stackPrefix}-lambda-sg`,
      description: 'Security group for BarkBase Lambda functions',
      allowAllOutbound: true,
    });

    // Security Group for Bastion Host (SSH tunneling for DBeaver)
    this.bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSG', {
      vpc: this.vpc,
      securityGroupName: `${config.stackPrefix}-bastion-sg`,
      description: 'Security group for Bastion host SSH tunneling',
      allowAllOutbound: true,
    });

    // SECURITY: Restrict SSH access to Bastion
    // In development: allow from anywhere (for convenience)
    // In production: REQUIRE explicit allowed IPs via context variable
    //
    // Best practice: Use AWS SSM Session Manager instead of SSH
    // This eliminates the need for open SSH ports entirely.
    // To use SSM: aws ssm start-session --target <instance-id>
    if (config.env === 'dev') {
      this.bastionSecurityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(22),
        'Allow SSH access from anywhere (dev only)'
      );
    } else {
      // SECURITY: Production requires explicit allowed IPs
      // Set BASTION_ALLOWED_CIDRS environment variable with comma-separated CIDRs
      // Example: BASTION_ALLOWED_CIDRS="1.2.3.4/32,5.6.7.8/32"
      const allowedCidrsEnv = process.env.BASTION_ALLOWED_CIDRS || '';
      const allowedCidrs = allowedCidrsEnv.split(',').map(s => s.trim()).filter(Boolean);

      if (allowedCidrs.length === 0) {
        // If no CIDRs provided, only allow VPC-internal SSH access
        // External access should use SSM Session Manager
        console.warn('[SECURITY] No BASTION_ALLOWED_CIDRS provided - SSH only accessible from within VPC');
        console.warn('[SECURITY] Use AWS SSM Session Manager for external access: aws ssm start-session --target <instance-id>');
        this.bastionSecurityGroup.addIngressRule(
          ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
          ec2.Port.tcp(22),
          'Allow SSH access from within VPC only (use SSM for external access)'
        );
      } else {
        // Add explicit IP allowlist
        for (const cidr of allowedCidrs) {
          try {
            this.bastionSecurityGroup.addIngressRule(
              ec2.Peer.ipv4(cidr),
              ec2.Port.tcp(22),
              `Allow SSH access from ${cidr}`
            );
            console.log(`[SECURITY] Added SSH access from: ${cidr}`);
          } catch (err) {
            console.error(`[SECURITY] Invalid CIDR in BASTION_ALLOWED_CIDRS: ${cidr}`);
          }
        }
      }
    }

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${config.stackPrefix}-vpc-id`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.privateSubnets.map(s => s.subnetId).join(','),
      description: 'Private Subnet IDs',
      exportName: `${config.stackPrefix}-private-subnet-ids`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.publicSubnets.map(s => s.subnetId).join(','),
      description: 'Public Subnet IDs',
      exportName: `${config.stackPrefix}-public-subnet-ids`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
      description: 'Lambda Security Group ID',
      exportName: `${config.stackPrefix}-lambda-sg-id`,
    });

    new cdk.CfnOutput(this, 'BastionSecurityGroupId', {
      value: this.bastionSecurityGroup.securityGroupId,
      description: 'Bastion Security Group ID',
      exportName: `${config.stackPrefix}-bastion-sg-id`,
    });
  }
}

