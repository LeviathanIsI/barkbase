import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';

export interface BarkbaseUnifiedBackendStackProps extends cdk.StackProps {
  dbEnvironment: { [key: string]: string };
  dbSecret: secretsmanager.ISecret;
  dbLayer: lambda.ILayerVersion;
  authLayer: lambda.ILayerVersion;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  vpc?: ec2.IVpc;
  securityGroups?: ec2.ISecurityGroup[];
  deployInVpc?: boolean;
}

export class BarkbaseUnifiedBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BarkbaseUnifiedBackendStackProps) {
    super(scope, id, props);

    if (!props.dbEnvironment || !props.dbSecret || !props.dbLayer || !props.authLayer || !props.userPool || !props.userPoolClient) {
      throw new Error('Missing required infrastructure references for unified backend stack.');
    }

    const layers = [props.dbLayer, props.authLayer];

    const environment = {
      ...props.dbEnvironment,
      NODE_ENV: props.dbEnvironment.NODE_ENV || 'production',
      USER_POOL_ID: props.userPool.userPoolId,
      CLIENT_ID: props.userPoolClient.userPoolClientId,
    };

    const unifiedFunctionProps: lambda.FunctionProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'lambda-handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend'), {
        exclude: [
          '.gitignore',
          'README.md',
          'server.js',
          'src/**/*.test.*',
          '**/test/**',
          '**/*.md',
        ],
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64,
      environment,
      layers,
    };

    if (props.deployInVpc && props.vpc) {
      unifiedFunctionProps.vpc = props.vpc;
      unifiedFunctionProps.securityGroups = props.securityGroups;
      unifiedFunctionProps.vpcSubnets = { subnetType: ec2.SubnetType.PRIVATE_ISOLATED };
    }

    const unifiedFn = new lambda.Function(this, 'UnifiedBackendFunction', unifiedFunctionProps);
    props.dbSecret.grantRead(unifiedFn);

    const httpApi = new apigwv2.HttpApi(this, 'UnifiedBackendHttpApi', {
      apiName: 'barkbase-unified-backend',
      corsPreflight: {
        allowOrigins: ['*'],
        allowHeaders: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
      },
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      'UnifiedBackendIntegration',
      unifiedFn,
    );

    httpApi.addRoutes({
      path: '/api/v1/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    new cdk.CfnOutput(this, 'UnifiedBackendApiUrl', {
      value: httpApi.apiEndpoint,
      exportName: 'UnifiedBackendApiUrl',
    });
  }
}

