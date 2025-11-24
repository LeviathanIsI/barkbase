import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
  /**
   * Number of NAT gateways to provision.
   * Defaults to 1 for general internet egress, but can be overridden (e.g., 0 when using VPC endpoints only).
   */
  readonly natGatewayCount?: number;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly rdsSecurityGroup: ec2.SecurityGroup;
  public readonly interfaceEndpoints: ec2.InterfaceVpcEndpoint[];

  constructor(scope: Construct, id: string, props?: NetworkStackProps) {
    super(scope, id, props);

    const stage =
      this.node.tryGetContext('stage') ??
      this.node.tryGetContext('Stage') ??
      process.env.STAGE ??
      'dev';

    const natGatewayCount =
      props?.natGatewayCount ??
      Number(this.node.tryGetContext('natGateways') ?? 1);

    this.vpc = new ec2.Vpc(this, 'BarkbaseVpc', {
      maxAzs: 2,
      natGateways: natGatewayCount,
      subnetConfiguration: [
        {
          name: 'PublicIngress',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: 'AppPrivate',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for BarkBase Lambda functions',
      allowAllOutbound: true,
    });

    this.rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for BarkBase database resources',
      allowAllOutbound: false,
    });

    this.rdsSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda functions to access RDS on port 5432',
    );

    this.interfaceEndpoints = [
      this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [this.lambdaSecurityGroup],
      }),
      this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [this.lambdaSecurityGroup],
      }),
    ];

    const resourcesToTag = [
      this.vpc,
      this.lambdaSecurityGroup,
      this.rdsSecurityGroup,
      ...this.interfaceEndpoints,
    ];

    resourcesToTag.forEach((resource) => {
      cdk.Tags.of(resource).add('Stage', stage);
    });
  }
}



