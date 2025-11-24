import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface RealtimeStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  dbSecret: secretsmanager.ISecret;
  dbHost: string;
  dbPort: number;
  dbName: string;
}

export class RealtimeStack extends cdk.Stack {
  public readonly webSocketApi: apigwv2.WebSocketApi;
  public readonly webSocketStage: apigwv2.WebSocketStage;
  public readonly connectFn: lambda.Function;
  public readonly disconnectFn: lambda.Function;
  public readonly messageFn: lambda.Function;
  public readonly broadcastFn: lambda.Function;

  constructor(scope: Construct, id: string, props: RealtimeStackProps) {
    super(scope, id, props);

    const dbEnv = {
      DB_HOST: props.dbHost,
      DB_PORT: props.dbPort.toString(),
      DB_NAME: props.dbName,
      DB_SECRET_ID: props.dbSecret.secretName,
      DB_SECRET_ARN: props.dbSecret.secretArn,
      ENVIRONMENT: props.stage,
      STAGE: props.stage,
    };

    const vpcConfig = {
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    };

    const dbLayer = new lambda.LayerVersion(this, 'RealtimeDbLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../layers/db-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared database helpers for realtime handlers',
    });

    this.connectFn = new lambda.Function(this, 'WebSocketConnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-connect')),
      environment: dbEnv,
      timeout: cdk.Duration.seconds(30),
      layers: [dbLayer],
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.connectFn);

    this.disconnectFn = new lambda.Function(this, 'WebSocketDisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-disconnect')),
      environment: dbEnv,
      timeout: cdk.Duration.seconds(30),
      layers: [dbLayer],
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.disconnectFn);

    this.messageFn = new lambda.Function(this, 'WebSocketMessageFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-message')),
      environment: dbEnv,
      timeout: cdk.Duration.seconds(30),
      layers: [dbLayer],
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.messageFn);

    this.broadcastFn = new lambda.Function(this, 'WebSocketBroadcastFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-broadcast')),
      environment: dbEnv,
      timeout: cdk.Duration.seconds(30),
      layers: [dbLayer],
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.broadcastFn);

    const connectIntegration = new integrations.WebSocketLambdaIntegration(
      'ConnectIntegration',
      this.connectFn,
    );
    const disconnectIntegration = new integrations.WebSocketLambdaIntegration(
      'DisconnectIntegration',
      this.disconnectFn,
    );
    const defaultIntegration = new integrations.WebSocketLambdaIntegration(
      'DefaultIntegration',
      this.messageFn,
    );

    // NOTE: Clients connect via wss://{apiId}.execute-api.{region}.amazonaws.com/{stage}?tenantId=...&userId=...
    // Handlers mirror the legacy unified stack: connect -> websocket-connect Lambda, disconnect -> websocket-disconnect,
    // $default -> websocket-message, and websocket-broadcast is invoked by other services for fan-out.
    this.webSocketApi = new apigwv2.WebSocketApi(this, 'BarkbaseWebSocketApi', {
      routeSelectionExpression: '$request.body.action',
      connectRouteOptions: { integration: connectIntegration },
      disconnectRouteOptions: { integration: disconnectIntegration },
      defaultRouteOptions: { integration: defaultIntegration },
    });

    this.webSocketStage = new apigwv2.WebSocketStage(this, 'BarkbaseWebSocketStage', {
      webSocketApi: this.webSocketApi,
      stageName: props.stage,
      autoDeploy: true,
    });

    const grantManageConnections = (fn: lambda.Function) =>
      fn.addToRolePolicy(
        new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.apiId}/*`,
        ],
        }),
      );

    grantManageConnections(this.messageFn);
    grantManageConnections(this.broadcastFn);

    cdk.Tags.of(this).add('Stage', props.stage);

    new cdk.CfnOutput(this, 'WebSocketApiId', {
      value: this.webSocketApi.apiId,
      exportName: `Barkbase-${props.stage}-WebSocketApiId`,
    });

    new cdk.CfnOutput(this, 'WebSocketApiEndpoint', {
      value: this.webSocketApi.apiEndpoint,
      exportName: `Barkbase-${props.stage}-WebSocketApiEndpoint`,
    });
  }
}



