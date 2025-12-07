/**
 * =============================================================================
 * BarkBase Network Stack
 * =============================================================================
 *
 * Imports EXISTING VPC and security groups, creates NEW private subnets.
 *
 * Existing (created via AWS CLI):
 * - VPC: vpc-0592948fdeab2f345 (barkbase-new-vpc)
 * - Lambda SG: sg-0287664a6375c45d7 (barkbase-new-lambda-sg)
 * - DB SG: sg-04d9d4804ac310e7c (barkbase-new-rds-sg)
 * - Public subnets: subnet-031c05c2913d2acb8, subnet-04e5367cef56fe12c (for RDS)
 *
 * Created by CDK:
 * - Private subnet A in us-east-2a (for Lambda)
 * - Private subnet B in us-east-2b (for Lambda)
 * - Private route table (no NAT, no internet - Lambda only needs RDS access)
 *
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

// =============================================================================
// EXISTING INFRASTRUCTURE IDS (created via AWS CLI)
// =============================================================================
const EXISTING_VPC_ID = 'vpc-0592948fdeab2f345';
const EXISTING_PUBLIC_SUBNET_A_ID = 'subnet-031c05c2913d2acb8'; // us-east-2a (RDS uses these)
const EXISTING_PUBLIC_SUBNET_B_ID = 'subnet-04e5367cef56fe12c'; // us-east-2b (RDS uses these)
const EXISTING_LAMBDA_SG_ID = 'sg-0287664a6375c45d7';           // barkbase-new-lambda-sg
const EXISTING_DB_SG_ID = 'sg-04d9d4804ac310e7c';               // barkbase-new-rds-sg

// Private subnet CIDR blocks (VPC is 10.100.0.0/16, existing public are 10.100.1.0/24 and 10.100.2.0/24)
const PRIVATE_SUBNET_A_CIDR = '10.100.10.0/24'; // us-east-2a
const PRIVATE_SUBNET_B_CIDR = '10.100.11.0/24'; // us-east-2b

export interface NetworkStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  public readonly bastionSecurityGroup: ec2.ISecurityGroup;
  public readonly dbSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { config } = props;

    // =========================================================================
    // Import EXISTING VPC (created via AWS CLI)
    // =========================================================================
    this.vpc = ec2.Vpc.fromLookup(this, 'ImportedVpc', {
      vpcId: EXISTING_VPC_ID,
    });

    // =========================================================================
    // Import existing PUBLIC subnets (used by RDS)
    // =========================================================================
    const publicSubnetA = ec2.Subnet.fromSubnetId(this, 'PublicSubnetA', EXISTING_PUBLIC_SUBNET_A_ID);
    const publicSubnetB = ec2.Subnet.fromSubnetId(this, 'PublicSubnetB', EXISTING_PUBLIC_SUBNET_B_ID);
    this.publicSubnets = [publicSubnetA, publicSubnetB];

    // =========================================================================
    // Create NEW private subnets (for Lambda functions)
    // These have NO route to internet - Lambda only needs RDS access via VPC
    // =========================================================================

    // Create private route table (no routes to internet)
    const privateRouteTable = new ec2.CfnRouteTable(this, 'PrivateRouteTable', {
      vpcId: EXISTING_VPC_ID,
      tags: [
        { key: 'Name', value: `${config.stackPrefix}-private-rt` },
      ],
    });

    // Create private subnet A in us-east-2a
    const privateSubnetA = new ec2.CfnSubnet(this, 'PrivateSubnetA', {
      vpcId: EXISTING_VPC_ID,
      cidrBlock: PRIVATE_SUBNET_A_CIDR,
      availabilityZone: 'us-east-2a',
      mapPublicIpOnLaunch: false,
      tags: [
        { key: 'Name', value: `${config.stackPrefix}-private-subnet-a` },
      ],
    });

    // Create private subnet B in us-east-2b
    const privateSubnetB = new ec2.CfnSubnet(this, 'PrivateSubnetB', {
      vpcId: EXISTING_VPC_ID,
      cidrBlock: PRIVATE_SUBNET_B_CIDR,
      availabilityZone: 'us-east-2b',
      mapPublicIpOnLaunch: false,
      tags: [
        { key: 'Name', value: `${config.stackPrefix}-private-subnet-b` },
      ],
    });

    // Associate private subnets with private route table
    new ec2.CfnSubnetRouteTableAssociation(this, 'PrivateSubnetARouteTableAssoc', {
      subnetId: privateSubnetA.ref,
      routeTableId: privateRouteTable.ref,
    });

    new ec2.CfnSubnetRouteTableAssociation(this, 'PrivateSubnetBRouteTableAssoc', {
      subnetId: privateSubnetB.ref,
      routeTableId: privateRouteTable.ref,
    });

    // Import the newly created subnets as ISubnet for use in other stacks
    this.privateSubnets = [
      ec2.Subnet.fromSubnetAttributes(this, 'ImportedPrivateSubnetA', {
        subnetId: privateSubnetA.ref,
        availabilityZone: 'us-east-2a',
        routeTableId: privateRouteTable.ref,
      }),
      ec2.Subnet.fromSubnetAttributes(this, 'ImportedPrivateSubnetB', {
        subnetId: privateSubnetB.ref,
        availabilityZone: 'us-east-2b',
        routeTableId: privateRouteTable.ref,
      }),
    ];

    // =========================================================================
    // Import EXISTING Security Groups (created via AWS CLI)
    // =========================================================================

    // Lambda Security Group - allows egress to DB
    this.lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedLambdaSG',
      EXISTING_LAMBDA_SG_ID,
      { allowAllOutbound: true }
    );

    // DB Security Group - allows ingress from Lambda SG
    this.dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ImportedDbSG',
      EXISTING_DB_SG_ID
    );

    // Bastion SG - reuse Lambda SG for now
    this.bastionSecurityGroup = this.lambdaSecurityGroup;

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID (imported)',
      exportName: `${config.stackPrefix}-vpc-id`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: `${EXISTING_PUBLIC_SUBNET_A_ID},${EXISTING_PUBLIC_SUBNET_B_ID}`,
      description: 'Public Subnet IDs (imported, used by RDS)',
      exportName: `${config.stackPrefix}-public-subnet-ids`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: cdk.Fn.join(',', [privateSubnetA.ref, privateSubnetB.ref]),
      description: 'Private Subnet IDs (created, used by Lambda)',
      exportName: `${config.stackPrefix}-private-subnet-ids`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
      description: 'Lambda Security Group ID (imported)',
      exportName: `${config.stackPrefix}-lambda-sg-id`,
    });

    new cdk.CfnOutput(this, 'DbSecurityGroupId', {
      value: this.dbSecurityGroup.securityGroupId,
      description: 'DB Security Group ID (imported)',
      exportName: `${config.stackPrefix}-db-sg-id`,
    });
  }
}

