/**
 * =============================================================================
 * BarkBase API Core Stack
 * =============================================================================
 * 
 * Creates HTTP API Gateway with:
 * - CORS configuration for frontend
 * - Routes for auth and profile endpoints
 * - Lambda integrations
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface ApiCoreStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly authApiFunction: lambda.IFunction;
  readonly userProfileFunction: lambda.IFunction;
}

export class ApiCoreStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiCoreStackProps) {
    super(scope, id, props);

    const { config, authApiFunction, userProfileFunction } = props;

    // =========================================================================
    // HTTP API Gateway
    // =========================================================================

    this.httpApi = new apigatewayv2.HttpApi(this, 'BarkbaseHttpApi', {
      apiName: `${config.stackPrefix}-api`,
      description: 'BarkBase HTTP API Gateway',
      corsPreflight: {
        allowOrigins: config.corsOrigins,
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Tenant-Id',
          'X-Request-Id',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(24),
      },
      disableExecuteApiEndpoint: false,
    });

    // =========================================================================
    // Lambda Integrations
    // =========================================================================

    const authIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'AuthIntegration',
      authApiFunction
    );

    const profileIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'ProfileIntegration',
      userProfileFunction
    );

    // =========================================================================
    // Routes
    // =========================================================================

    // Auth routes - /api/v1/auth/*
    this.httpApi.addRoutes({
      path: '/api/v1/auth',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: authIntegration,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/auth/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: authIntegration,
    });

    // Profile routes - /api/v1/profile/*
    this.httpApi.addRoutes({
      path: '/api/v1/profile',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: profileIntegration,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/profile/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: profileIntegration,
    });

    // Health check route
    this.httpApi.addRoutes({
      path: '/api/v1/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: authIntegration,
    });

    // Store the API URL
    this.apiUrl = this.httpApi.apiEndpoint;

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'HTTP API Gateway URL',
      exportName: `${config.stackPrefix}-api-url`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.httpApi.apiId,
      description: 'HTTP API Gateway ID',
      exportName: `${config.stackPrefix}-api-id`,
    });
  }
}

