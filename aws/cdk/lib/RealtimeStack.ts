/**
 * RealtimeStack
 * 
 * Purpose: Real-time communication via WebSocket API.
 * 
 * Domain Boundaries:
 * - WebSocket API for real-time updates
 * - Connection management ($connect, $disconnect)
 * - Message routing ($default)
 * - Broadcast functionality
 * 
 * WebSocket Routes:
 * - $connect: Connection establishment
 * - $disconnect: Connection cleanup
 * - $default: Main message handler
 * - broadcast: Tenant-wide broadcast messages
 * 
 * Dependencies:
 * - NetworkStack (VPC, security groups, subnets)
 * - DatabaseStack (connection state storage)
 * 
 * Use Cases:
 * - Live kennel status updates
 * - Real-time booking notifications
 * - Dashboard live updates
 * - Cross-tab synchronization
 * 
 * Resource Count: ~20-30 resources (WebSocket API + 4 Lambdas)
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';
import * as path from 'path';

export interface RealtimeStackProps extends cdk.StackProps {
  /**
   * VPC where Lambdas will be deployed for RDS access.
   */
  vpc: ec2.IVpc;

  /**
   * Security group for Lambda functions.
   */
  lambdaSecurityGroup: ec2.ISecurityGroup;

  /**
   * Private subnets for Lambda VPC placement.
   */
  appSubnets: ec2.ISubnet[];

  /**
   * Secrets Manager secret containing database credentials.
   */
  dbSecret: secretsmanager.ISecret;

  /**
   * Database hostname (RDS endpoint).
   */
  dbHost: string;

  /**
   * Database port.
   */
  dbPort: string;

  /**
   * Database name.
   */
  dbName: string;

  /**
   * Deployment stage (dev, staging, prod).
   */
  stage: string;

  /**
   * Environment name.
   */
  environment: string;
}

export class RealtimeStack extends cdk.Stack {
  /**
   * The WebSocket API
   */
  public readonly webSocketApi: apigwv2.WebSocketApi;

  /**
   * The WebSocket API endpoint URL
   */
  public readonly webSocketApiEndpoint: string;

  /**
   * WebSocket connection handler Lambda
   */
  public readonly connectFunction: nodejs.NodejsFunction;

  /**
   * WebSocket disconnection handler Lambda
   */
  public readonly disconnectFunction: nodejs.NodejsFunction;

  /**
   * WebSocket message handler Lambda
   */
  public readonly messageFunction: nodejs.NodejsFunction;

  /**
   * WebSocket broadcast handler Lambda
   */
  public readonly broadcastFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: RealtimeStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv: Record<string, string> = {
      DB_HOST: props.dbHost,
      DB_PORT: props.dbPort,
      DB_NAME: props.dbName,
      DB_SECRET_ID: props.dbSecret.secretName,
      DB_SECRET_ARN: props.dbSecret.secretArn,
      STAGE: props.stage,
      ENVIRONMENT: props.environment,
    };

    // Common Lambda configuration
    const commonLambdaProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      vpc: props.vpc,
      vpcSubnets: { subnets: props.appSubnets },
      securityGroups: [props.lambdaSecurityGroup],
      tracing: lambda.Tracing.ACTIVE,
      environment: lambdaEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    };

    // =========================================================================
    // WebSocket Handler Lambdas
    // =========================================================================

    // Connect Handler - $connect route
    this.connectFunction = new nodejs.NodejsFunction(this, 'ConnectFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-realtime-connect`,
      description: 'BarkBase WebSocket connect handler',
      entry: path.join(__dirname, '../../lambdas/realtime-connect/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'ConnectLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-realtime-connect`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.connectFunction);

    // Disconnect Handler - $disconnect route
    this.disconnectFunction = new nodejs.NodejsFunction(this, 'DisconnectFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-realtime-disconnect`,
      description: 'BarkBase WebSocket disconnect handler',
      entry: path.join(__dirname, '../../lambdas/realtime-disconnect/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'DisconnectLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-realtime-disconnect`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.disconnectFunction);

    // Message Handler - $default route
    this.messageFunction = new nodejs.NodejsFunction(this, 'MessageFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-realtime-message`,
      description: 'BarkBase WebSocket message handler',
      entry: path.join(__dirname, '../../lambdas/realtime-message/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'MessageLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-realtime-message`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.messageFunction);

    // Broadcast Handler - broadcast route
    this.broadcastFunction = new nodejs.NodejsFunction(this, 'BroadcastFunction', {
      ...commonLambdaProps,
      functionName: `barkbase-${props.stage}-realtime-broadcast`,
      description: 'BarkBase WebSocket broadcast handler',
      entry: path.join(__dirname, '../../lambdas/realtime-broadcast/index.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'BroadcastLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-realtime-broadcast`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    props.dbSecret.grantRead(this.broadcastFunction);

    // =========================================================================
    // WebSocket API
    // =========================================================================
    this.webSocketApi = new apigwv2.WebSocketApi(this, 'BarkbaseWebSocketApi', {
      apiName: `barkbase-${props.stage}-realtime`,
      description: 'BarkBase WebSocket API for real-time updates',
      connectRouteOptions: {
        integration: new apigwv2Integrations.WebSocketLambdaIntegration(
          'ConnectIntegration',
          this.connectFunction
        ),
      },
      disconnectRouteOptions: {
        integration: new apigwv2Integrations.WebSocketLambdaIntegration(
          'DisconnectIntegration',
          this.disconnectFunction
        ),
      },
      defaultRouteOptions: {
        integration: new apigwv2Integrations.WebSocketLambdaIntegration(
          'DefaultIntegration',
          this.messageFunction
        ),
      },
    });

    // Add broadcast route
    this.webSocketApi.addRoute('broadcast', {
      integration: new apigwv2Integrations.WebSocketLambdaIntegration(
        'BroadcastIntegration',
        this.broadcastFunction
      ),
    });

    // Create WebSocket stage
    const webSocketStage = new apigwv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: this.webSocketApi,
      stageName: props.stage,
      autoDeploy: true,
    });

    this.webSocketApiEndpoint = webSocketStage.url;

    // Grant execute-api permissions to Lambdas for sending messages back
    const executeApiArn = this.formatArn({
      service: 'execute-api',
      resource: this.webSocketApi.apiId,
      resourceName: `${props.stage}/*`,
    });

    this.messageFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [executeApiArn],
      })
    );

    this.broadcastFunction.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['execute-api:ManageConnections'],
        resources: [executeApiArn],
      })
    );

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'WebSocketApiId', {
      value: this.webSocketApi.apiId,
      description: 'WebSocket API ID',
      exportName: `${this.stackName}-WebSocketApiId`,
    });

    new cdk.CfnOutput(this, 'WebSocketApiEndpoint', {
      value: this.webSocketApiEndpoint,
      description: 'WebSocket API endpoint URL',
      exportName: `${this.stackName}-WebSocketApiEndpoint`,
    });
  }
}
