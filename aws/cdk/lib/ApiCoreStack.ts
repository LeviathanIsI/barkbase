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
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface ApiCoreStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly authApiFunction: lambda.IFunction;
  readonly userProfileFunction: lambda.IFunction;
  readonly entityServiceFunction: lambda.IFunction;
  readonly analyticsServiceFunction: lambda.IFunction;
  readonly operationsServiceFunction: lambda.IFunction;
  readonly configServiceFunction: lambda.IFunction;
  readonly financialServiceFunction: lambda.IFunction;
  readonly userPool: cognito.IUserPool;
  readonly userPoolClient: cognito.IUserPoolClient;
}

export class ApiCoreStack extends cdk.Stack {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiCoreStackProps) {
    super(scope, id, props);

    const {
      config,
      authApiFunction,
      userProfileFunction,
      entityServiceFunction,
      analyticsServiceFunction,
      operationsServiceFunction,
      configServiceFunction,
      financialServiceFunction,
      userPool,
      userPoolClient
    } = props;

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
    // Cognito JWT Authorizer
    // =========================================================================

    const authorizer = new apigatewayv2Authorizers.HttpUserPoolAuthorizer(
      'CognitoAuthorizer',
      userPool,
      {
        userPoolClients: [userPoolClient],
        authorizerName: `${config.stackPrefix}-jwt-authorizer`,
        identitySource: ['$request.header.Authorization'],
      }
    );

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

    const entityIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'EntityIntegration',
      entityServiceFunction
    );

    const analyticsIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'AnalyticsIntegration',
      analyticsServiceFunction
    );

    const operationsIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'OperationsIntegration',
      operationsServiceFunction
    );

    const configIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'ConfigIntegration',
      configServiceFunction
    );

    const financialIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'FinancialIntegration',
      financialServiceFunction
    );

    // =========================================================================
    // Routes
    // =========================================================================

    // IMPORTANT: We use explicit HTTP methods (GET, POST, PUT, PATCH, DELETE) instead of ANY.
    // This allows the HttpApi's built-in corsPreflight to handle OPTIONS requests automatically
    // without requiring JWT authorization. Using ANY would match OPTIONS and apply the authorizer,
    // causing CORS preflight to fail with 401.

    // Auth routes - /api/v1/auth/* (PUBLIC - no authorization required)
    this.httpApi.addRoutes({
      path: '/api/v1/auth',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: authIntegration,
      // No authorizer - public endpoints for login/register
    });

    this.httpApi.addRoutes({
      path: '/api/v1/auth/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: authIntegration,
      // No authorizer - public endpoints for login/register
    });

    // Profile routes - /api/v1/profile/* (PROTECTED)
    this.httpApi.addRoutes({
      path: '/api/v1/profile',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: profileIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/profile/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: profileIntegration,
      authorizer, // JWT authorization required
    });

    // User profile compatibility routes - /api/v1/users/profile (PROTECTED)
    // Some frontend code uses /api/v1/users/profile instead of /api/v1/profile
    this.httpApi.addRoutes({
      path: '/api/v1/users/profile',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: profileIntegration,
      authorizer, // JWT authorization required
    });

    // Health check route (PUBLIC)
    this.httpApi.addRoutes({
      path: '/api/v1/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: authIntegration,
      // No authorizer - health check should be public
    });

    // Entity service routes - /api/v1/entity/* (PROTECTED)
    this.httpApi.addRoutes({
      path: '/api/v1/entity',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: entityIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/entity/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: entityIntegration,
      authorizer, // JWT authorization required
    });

    // Analytics service routes - /api/v1/analytics/* (PROTECTED)
    this.httpApi.addRoutes({
      path: '/api/v1/analytics',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: analyticsIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/analytics/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: analyticsIntegration,
      authorizer, // JWT authorization required
    });

    // Operations service routes - /api/v1/operations/* (PROTECTED)
    this.httpApi.addRoutes({
      path: '/api/v1/operations',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: operationsIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/operations/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: operationsIntegration,
      authorizer, // JWT authorization required
    });

    // Config service routes - /api/v1/config/* (PROTECTED)
    this.httpApi.addRoutes({
      path: '/api/v1/config',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: configIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/config/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: configIntegration,
      authorizer, // JWT authorization required
    });

    // Financial service routes - /api/v1/financial/* (PROTECTED)
    this.httpApi.addRoutes({
      path: '/api/v1/financial',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: financialIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/financial/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: financialIntegration,
      authorizer, // JWT authorization required
    });

    // Segments routes - /api/v1/segments/* (PROTECTED)
    // Routes to analytics service for customer segmentation
    this.httpApi.addRoutes({
      path: '/api/v1/segments',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: analyticsIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/segments/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: analyticsIntegration,
      authorizer, // JWT authorization required
    });

    // Messages/Conversations routes - /api/v1/messages/* (PROTECTED)
    // Routes to analytics service for messaging functionality
    this.httpApi.addRoutes({
      path: '/api/v1/messages',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: analyticsIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/messages/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: analyticsIntegration,
      authorizer, // JWT authorization required
    });

    // Run templates routes - /api/v1/run-templates/* (PROTECTED)
    // Routes to operations service for daycare run management
    this.httpApi.addRoutes({
      path: '/api/v1/run-templates',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: operationsIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/run-templates/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: operationsIntegration,
      authorizer, // JWT authorization required
    });

    // Runs routes - /api/v1/runs/* (PROTECTED)
    // Routes to operations service for daycare runs
    this.httpApi.addRoutes({
      path: '/api/v1/runs',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: operationsIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v1/runs/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: operationsIntegration,
      authorizer, // JWT authorization required
    });

    // =========================================================================
    // CUSTOM PROPERTIES API (v2)
    // =========================================================================
    // Enterprise custom fields system - routes to config service
    // /api/v2/properties/* (PROTECTED)
    // =========================================================================

    this.httpApi.addRoutes({
      path: '/api/v2/properties',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: configIntegration,
      authorizer, // JWT authorization required
    });

    this.httpApi.addRoutes({
      path: '/api/v2/properties/{proxy+}',
      methods: [
        apigatewayv2.HttpMethod.GET,
        apigatewayv2.HttpMethod.POST,
        apigatewayv2.HttpMethod.PUT,
        apigatewayv2.HttpMethod.PATCH,
        apigatewayv2.HttpMethod.DELETE,
      ],
      integration: configIntegration,
      authorizer, // JWT authorization required
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

