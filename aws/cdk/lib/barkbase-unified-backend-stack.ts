import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface BarkbaseUnifiedBackendStackProps extends cdk.StackProps {
  /**
   * Optional existing VPC to run the Lambda inside.
   * If not provided, the Lambda will run without VPC connectivity
   * and should use public DB endpoints or other networking options.
   */
  vpcName?: string;
}

export class BarkbaseUnifiedBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: BarkbaseUnifiedBackendStackProps) {
    super(scope, id, props);

    let vpc: ec2.IVpc | undefined;
    if (props?.vpcName) {
      vpc = ec2.Vpc.fromLookup(this, 'UnifiedBackendVpc', {
        vpcName: props.vpcName,
      });
    }

    const unifiedFn = new lambda.Function(this, 'UnifiedBackendFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'lambda-handler.handler',
      code: lambda.Code.fromAsset('../backend', {
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
      vpc,
      environment: {
        NODE_ENV: 'production',
        DB_HOST: process.env.DB_HOST ?? '',
        DB_PORT: process.env.DB_PORT ?? '5432',
        DB_USER: process.env.DB_USER ?? '',
        DB_PASSWORD: process.env.DB_PASSWORD ?? '',
        DB_NAME: process.env.DB_NAME ?? 'barkbase',
        DB_SSL: process.env.DB_SSL ?? 'true',
      },
    });

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

