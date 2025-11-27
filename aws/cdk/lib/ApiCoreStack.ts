import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwAuthorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";

export interface ApiCoreStackProps extends cdk.StackProps {
  stage: string;

  /**
   * Optional Cognito resources. When provided, we expose a HttpUserPoolAuthorizer
   * that other stacks can reuse when they attach routes.
   * When omitted, the API is created without any authorizer.
   */
  userPool?: cognito.IUserPool;
  userPoolClient?: cognito.IUserPoolClient;
}

export class ApiCoreStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;
  public readonly authorizer?: apigwAuthorizers.HttpUserPoolAuthorizer;

  constructor(scope: Construct, id: string, props: ApiCoreStackProps) {
    super(scope, id, props);

    const stage = props.stage ?? 'dev';

    // Core HttpApi – **no routes or integrations live in this stack**
    this.httpApi = new apigwv2.HttpApi(this, 'BarkbaseHttpApi', {
      apiName: `barkbase-http-api-${stage}`,
      corsPreflight: {
        allowOrigins: [
          'http://localhost:5173',
          // TODO: add production origin, e.g. 'https://app.barkbase.com',
        ],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          'content-type',
          'authorization',
          'x-tenant-id',
          'x-requested-with',
          'cookie',
        ],
        allowCredentials: true,
      },
    });
    const httpApi = this.httpApi;

    // --- Auth API wiring (Barkbase-ServicesStack-dev → Barkbase-ApiCoreStack-dev) ---

    const authFnArn = cdk.Fn.importValue(
      "Barkbase-ServicesStack-dev:ExportsOutputFnGetAttAuthApiFunction31FCF8B8ArnAEE430B2"
    );

    const authFunction = lambda.Function.fromFunctionAttributes(
      this,
      "AuthApiFunctionImported",
      {
        functionArn: authFnArn,
        // Ensure CDK can attach invoke permissions for this HttpApi
        sameEnvironment: true,
      }
    );

    const authIntegration = new HttpLambdaIntegration(
      "AuthApiHttpIntegration",
      authFunction
    );

    // register all auth routes
    httpApi.addRoutes({
      path: "/api/v1/auth/login",
      methods: [apigw.HttpMethod.POST],
      integration: authIntegration,
    });

    httpApi.addRoutes({
      path: "/api/v1/auth/signup",
      methods: [apigw.HttpMethod.POST],
      integration: authIntegration,
    });

    httpApi.addRoutes({
      path: "/api/v1/auth/refresh",
      methods: [apigw.HttpMethod.POST],
      integration: authIntegration,
    });

    httpApi.addRoutes({
      path: "/api/v1/auth/logout",
      methods: [apigw.HttpMethod.POST],
      integration: authIntegration,
    });

    httpApi.addRoutes({
      path: "/api/v1/auth/register",
      methods: [apigw.HttpMethod.POST],
      integration: authIntegration,
    });

    httpApi.addRoutes({
      path: "/api/v1/auth/resend-verification",
      methods: [apigw.HttpMethod.POST],
      integration: authIntegration,
    });

    httpApi.addRoutes({
      path: "/api/v1/auth/change-password",
      methods: [apigw.HttpMethod.POST],
      integration: authIntegration,
    });

    // --- End auth wiring ---

    // Optional Cognito authorizer – created only when both resources are passed in
    if (props.userPool && props.userPoolClient) {
      this.authorizer = new apigwAuthorizers.HttpUserPoolAuthorizer(
        'CognitoAuthorizer',
        props.userPool,
        {
          userPoolClients: [props.userPoolClient],
          identitySource: ['$request.header.Authorization'],
        },
      );
    }

    // Tag for environment awareness
    cdk.Tags.of(this).add('Stage', stage);

    // Outputs so other stacks / environments can introspect the API
    new cdk.CfnOutput(this, 'HttpApiId', {
      value: this.httpApi.apiId,
      exportName: `Barkbase-${stage}-HttpApiId`,
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.apiEndpoint,
      exportName: `Barkbase-${stage}-HttpApiUrl`,
    });

    if (this.authorizer) {
      new cdk.CfnOutput(this, 'HttpApiAuthorizerId', {
        value: this.authorizer.authorizerId,
        exportName: `Barkbase-${stage}-HttpApiAuthorizerId`,
      });
    }
  }
}



