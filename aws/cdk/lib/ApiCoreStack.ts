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
import * as iam from 'aws-cdk-lib/aws-iam';
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
    // Routes - CONSOLIDATED to avoid Lambda policy size limit
    // =========================================================================
    //
    // IMPORTANT: We use minimal route definitions to avoid exceeding the 20KB
    // Lambda resource-based policy limit. Each route/method combo adds a
    // permission statement. With 54+ routes, we hit the limit.
    //
    // Strategy: Use {proxy+} catch-all patterns and let Lambdas route internally.
    // This reduces from ~54 route blocks to ~14.
    //
    // CORS: We use explicit HTTP methods (not ANY) so API Gateway handles OPTIONS.
    // =========================================================================

    const allMethods = [
      apigatewayv2.HttpMethod.GET,
      apigatewayv2.HttpMethod.POST,
      apigatewayv2.HttpMethod.PUT,
      apigatewayv2.HttpMethod.PATCH,
      apigatewayv2.HttpMethod.DELETE,
    ];

    // -------------------------------------------------------------------------
    // AUTH SERVICE - Public routes (no authorizer)
    // Handles: /api/v1/auth/*, /api/v1/health
    // -------------------------------------------------------------------------
    this.httpApi.addRoutes({
      path: '/api/v1/auth/{proxy+}',
      methods: allMethods,
      integration: authIntegration,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: authIntegration,
    });

    // -------------------------------------------------------------------------
    // PROFILE SERVICE - Protected routes
    // Handles: /api/v1/profile/*, /api/v1/users/*
    // -------------------------------------------------------------------------
    this.httpApi.addRoutes({
      path: '/api/v1/profile/{proxy+}',
      methods: allMethods,
      integration: profileIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/users/{proxy+}',
      methods: allMethods,
      integration: profileIntegration,
      authorizer,
    });

    // -------------------------------------------------------------------------
    // ENTITY SERVICE - Protected routes
    // Handles: /api/v1/entity/*
    // -------------------------------------------------------------------------
    this.httpApi.addRoutes({
      path: '/api/v1/entity/{proxy+}',
      methods: allMethods,
      integration: entityIntegration,
      authorizer,
    });

    // -------------------------------------------------------------------------
    // ANALYTICS SERVICE - Protected routes
    // Handles: /api/v1/analytics/*, /api/v1/segments/*, /api/v1/messages/*,
    //          /api/v1/reports/*, /api/v1/compliance/*
    // -------------------------------------------------------------------------
    this.httpApi.addRoutes({
      path: '/api/v1/analytics/{proxy+}',
      methods: allMethods,
      integration: analyticsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/segments/{proxy+}',
      methods: allMethods,
      integration: analyticsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/messages/{proxy+}',
      methods: allMethods,
      integration: analyticsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/reports/{proxy+}',
      methods: allMethods,
      integration: analyticsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/compliance/{proxy+}',
      methods: allMethods,
      integration: analyticsIntegration,
      authorizer,
    });

    // Audit logs (Settings > Audit Log)
    this.httpApi.addRoutes({
      path: '/api/v1/audit-logs',
      methods: allMethods,
      integration: analyticsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/audit-logs/{proxy+}',
      methods: allMethods,
      integration: analyticsIntegration,
      authorizer,
    });

    // -------------------------------------------------------------------------
    // OPERATIONS SERVICE - Protected routes
    // Handles: /api/v1/operations/*, /api/v1/incidents/*, /api/v1/customer/*,
    //          /api/v1/run-templates/*, /api/v1/runs/*, /api/v1/calendar/*,
    //          /api/v1/notifications/*, /api/v1/staff/*, /api/v1/time-entries/*,
    //          /api/v1/shifts/*, /api/v1/recurring/*
    // -------------------------------------------------------------------------
    this.httpApi.addRoutes({
      path: '/api/v1/operations/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/incidents/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/customer/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/run-templates/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/runs/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/calendar/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/notifications/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/staff/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/time-entries/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/shifts/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/recurring/{proxy+}',
      methods: allMethods,
      integration: operationsIntegration,
      authorizer,
    });

    // -------------------------------------------------------------------------
    // CONFIG SERVICE - Protected routes
    // Handles: /api/v1/config/*, /api/v1/account-defaults/*, /api/v1/policies/*,
    //          /api/v1/memberships/*, /api/v1/forms/*, /api/v2/properties/*,
    //          /api/v2/entities/*
    // Note: Base paths added for endpoints that need direct GET/POST access
    // -------------------------------------------------------------------------
    this.httpApi.addRoutes({
      path: '/api/v1/config/{proxy+}',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/account-defaults',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/account-defaults/{proxy+}',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/policies',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/policies/{proxy+}',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/memberships',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/memberships/{proxy+}',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/forms',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v1/forms/{proxy+}',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v2/properties/{proxy+}',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    this.httpApi.addRoutes({
      path: '/api/v2/entities/{proxy+}',
      methods: allMethods,
      integration: configIntegration,
      authorizer,
    });

    // -------------------------------------------------------------------------
    // FINANCIAL SERVICE - Protected routes + public webhook
    // Handles: /api/v1/financial/*
    // -------------------------------------------------------------------------
    this.httpApi.addRoutes({
      path: '/api/v1/financial/{proxy+}',
      methods: allMethods,
      integration: financialIntegration,
      authorizer,
    });

    // Stripe webhook - PUBLIC (no authorizer, verified via Stripe signature)
    this.httpApi.addRoutes({
      path: '/api/v1/webhooks/stripe',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: financialIntegration,
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

