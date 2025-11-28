/**
 * ApiCoreStack - owns the shared HTTP API Gateway v2 and Cognito authorizer.
 * 
 * This stack is the canonical owner of the HttpApi. All domain-specific service
 * stacks (AuthServicesStack, EntityServicesStack, etc.) attach their routes
 * to this shared HttpApi via props.
 * 
 * NO routes or integrations are defined here - only the HttpApi and authorizer.
 */
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwAuthorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';

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
  /** The shared HTTP API that all service stacks attach routes to */
  public readonly httpApi: apigwv2.HttpApi;
  
  /** Optional Cognito authorizer for protected routes */
  public readonly authorizer?: apigwAuthorizers.HttpUserPoolAuthorizer;

  constructor(scope: Construct, id: string, props: ApiCoreStackProps) {
    super(scope, id, props);

    const stage = props.stage ?? 'dev';

    // Core HttpApi – no routes or integrations live in this stack
    // All routes are added by the domain-specific service stacks
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
