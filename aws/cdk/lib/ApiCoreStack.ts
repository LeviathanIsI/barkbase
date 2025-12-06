/**
 * =============================================================================
 * BarkBase API Core Stack - OPTIMIZED FOR RESOURCE COUNT
 * =============================================================================
 * 
 * Creates HTTP API Gateway with:
 * - CORS configuration for frontend
 * - CONSOLIDATED catch-all routes using CfnRoute (no auto-permissions)
 * - Single wildcard permission per Lambda
 * 
 * OPTIMIZATION STRATEGY:
 * - Use CfnIntegration + CfnRoute instead of HttpLambdaIntegration + addRoutes
 * - This prevents CDK from auto-generating 1 permission per route/method
 * - Single wildcard permission per Lambda covers ALL routes
 * - Keep HttpUserPoolAuthorizer to preserve existing authorizer resource
 * - Reduces from ~370 resources to ~70 resources
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
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
    // API Gateway Throttling Configuration
    // =========================================================================
    // Configure default throttling at the API level
    // These are baseline limits; WAF provides more granular rate limiting
    const defaultStage = this.httpApi.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    if (defaultStage) {
      defaultStage.defaultRouteSettings = {
        throttlingBurstLimit: 1000, // Burst capacity
        throttlingRateLimit: 500,   // Sustained requests per second
      };
    }

    // =========================================================================
    // INTENTIONALLY UNUSED: Cognito JWT Authorizer
    // =========================================================================
    // This authorizer is INTENTIONALLY defined but NOT attached to any routes.
    //
    // WHY NOT USED:
    // - JWT authorizers block OPTIONS preflight requests (browsers send these
    //   without credentials, causing CORS failures)
    // - All authentication is handled by Lambda functions instead via
    //   authenticateRequest() which validates Cognito tokens in the request body
    //
    // WHY KEPT:
    // - CloudFormation state compatibility (removing would cause stack drift)
    // - Potential future use with non-browser API clients
    // - Documents the architectural decision
    //
    // DO NOT REMOVE without coordinating CloudFormation state migration.
    // =========================================================================

    new apigatewayv2Authorizers.HttpUserPoolAuthorizer(
      'CognitoAuthorizer',
      userPool,
      {
        userPoolClients: [userPoolClient],
        authorizerName: `${config.stackPrefix}-jwt-authorizer`,
        identitySource: ['$request.header.Authorization'],
      }
    );

    // =========================================================================
    // WILDCARD Lambda Permissions - ONE permission per Lambda covers ALL routes
    // =========================================================================

    const apiArn = `arn:aws:execute-api:${this.region}:${this.account}:${this.httpApi.apiId}/*/*`;

    // Auth Service
    new lambda.CfnPermission(this, 'AuthApiPermission', {
      action: 'lambda:InvokeFunction',
      functionName: authApiFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: apiArn,
    });

    // Profile Service
    new lambda.CfnPermission(this, 'UserProfilePermission', {
      action: 'lambda:InvokeFunction',
      functionName: userProfileFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: apiArn,
    });

    // Entity Service
    new lambda.CfnPermission(this, 'EntityServicePermission', {
      action: 'lambda:InvokeFunction',
      functionName: entityServiceFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: apiArn,
    });

    // Analytics Service
    new lambda.CfnPermission(this, 'AnalyticsServicePermission', {
      action: 'lambda:InvokeFunction',
      functionName: analyticsServiceFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: apiArn,
    });

    // Operations Service
    new lambda.CfnPermission(this, 'OperationsServicePermission', {
      action: 'lambda:InvokeFunction',
      functionName: operationsServiceFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: apiArn,
    });

    // Config Service
    new lambda.CfnPermission(this, 'ConfigServicePermission', {
      action: 'lambda:InvokeFunction',
      functionName: configServiceFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: apiArn,
    });

    // Financial Service
    new lambda.CfnPermission(this, 'FinancialServicePermission', {
      action: 'lambda:InvokeFunction',
      functionName: financialServiceFunction.functionName,
      principal: 'apigateway.amazonaws.com',
      sourceArn: apiArn,
    });

    // =========================================================================
    // CfnIntegrations - Low-level integrations WITHOUT auto-permissions
    // =========================================================================

    const authIntegration = new apigatewayv2.CfnIntegration(this, 'AuthIntegration', {
      apiId: this.httpApi.apiId,
      integrationType: 'AWS_PROXY',
      integrationUri: authApiFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    const profileIntegration = new apigatewayv2.CfnIntegration(this, 'ProfileIntegration', {
      apiId: this.httpApi.apiId,
      integrationType: 'AWS_PROXY',
      integrationUri: userProfileFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    const entityIntegration = new apigatewayv2.CfnIntegration(this, 'EntityIntegration', {
      apiId: this.httpApi.apiId,
      integrationType: 'AWS_PROXY',
      integrationUri: entityServiceFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    const analyticsIntegration = new apigatewayv2.CfnIntegration(this, 'AnalyticsIntegration', {
      apiId: this.httpApi.apiId,
      integrationType: 'AWS_PROXY',
      integrationUri: analyticsServiceFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    const operationsIntegration = new apigatewayv2.CfnIntegration(this, 'OperationsIntegration', {
      apiId: this.httpApi.apiId,
      integrationType: 'AWS_PROXY',
      integrationUri: operationsServiceFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    const configIntegration = new apigatewayv2.CfnIntegration(this, 'ConfigIntegration', {
      apiId: this.httpApi.apiId,
      integrationType: 'AWS_PROXY',
      integrationUri: configServiceFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    const financialIntegration = new apigatewayv2.CfnIntegration(this, 'FinancialIntegration', {
      apiId: this.httpApi.apiId,
      integrationType: 'AWS_PROXY',
      integrationUri: financialServiceFunction.functionArn,
      payloadFormatVersion: '2.0',
    });

    // =========================================================================
    // BINDING ROUTE - Required to "bind" the HttpUserPoolAuthorizer
    // =========================================================================
    // This ONE route uses the high-level addRoutes() to bind the authorizer,
    // which allows us to access authorizer.authorizerId for all other routes.
    // This creates 1 extra permission, but that's acceptable.
    // =========================================================================

    const entityHighLevelIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'EntityBindingIntegration',
      entityServiceFunction
    );

    // Entity service proxy route - NO authorizer (Lambda handles auth)
    // OPTIONS preflight requests don't include credentials, so JWT authorizer blocks them
    this.httpApi.addRoutes({
      path: '/api/v1/entity/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: entityHighLevelIntegration,
    });

    // =========================================================================
    // Route Definitions - Using CfnRoute for minimal resource overhead
    // =========================================================================

    // Helper function to create routes
    // NOTE: No JWT authorizer - Lambda functions handle auth via authenticateRequest()
    // API Gateway JWT authorizers block OPTIONS preflight (sent without credentials)
    const createRoute = (
      id: string,
      routeKey: string,
      integrationRef: string,
      _useAuth: boolean  // Kept for call-site compatibility, auth handled by Lambda
    ): apigatewayv2.CfnRoute => {
      return new apigatewayv2.CfnRoute(this, id, {
        apiId: this.httpApi.apiId,
        routeKey: routeKey,
        target: `integrations/${integrationRef}`,
      });
    };

    // -------------------------------------------------------------------------
    // AUTH SERVICE - Public routes (no authorizer)
    // -------------------------------------------------------------------------
    createRoute('AuthProxyRoute', 'ANY /api/v1/auth/{proxy+}', authIntegration.ref, false);
    createRoute('HealthRoute', 'GET /api/v1/health', authIntegration.ref, false);

    // -------------------------------------------------------------------------
    // PROFILE SERVICE - Protected routes
    // -------------------------------------------------------------------------
    createRoute('ProfileProxyRoute', 'ANY /api/v1/profile/{proxy+}', profileIntegration.ref, true);
    createRoute('UsersProxyRoute', 'ANY /api/v1/users/{proxy+}', profileIntegration.ref, true);

    // -------------------------------------------------------------------------
    // ENTITY SERVICE - Protected routes
    // NOTE: /api/v1/entity/{proxy+} is already created above via addRoutes()
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // ANALYTICS SERVICE - Protected routes
    // -------------------------------------------------------------------------
    createRoute('AnalyticsProxyRoute', 'ANY /api/v1/analytics/{proxy+}', analyticsIntegration.ref, true);
    createRoute('SegmentsProxyRoute', 'ANY /api/v1/segments/{proxy+}', analyticsIntegration.ref, true);
    createRoute('MessagesProxyRoute', 'ANY /api/v1/messages/{proxy+}', analyticsIntegration.ref, true);
    createRoute('ReportsProxyRoute', 'ANY /api/v1/reports/{proxy+}', analyticsIntegration.ref, true);
    createRoute('ComplianceProxyRoute', 'ANY /api/v1/compliance/{proxy+}', analyticsIntegration.ref, true);
    createRoute('AuditLogsBaseRoute', 'ANY /api/v1/audit-logs', analyticsIntegration.ref, true);
    createRoute('AuditLogsProxyRoute', 'ANY /api/v1/audit-logs/{proxy+}', analyticsIntegration.ref, true);

    // -------------------------------------------------------------------------
    // OPERATIONS SERVICE - Protected routes
    // -------------------------------------------------------------------------
    createRoute('OperationsProxyRoute', 'ANY /api/v1/operations/{proxy+}', operationsIntegration.ref, true);
    createRoute('IncidentsBaseRoute', 'ANY /api/v1/incidents', operationsIntegration.ref, true);
    createRoute('IncidentsProxyRoute', 'ANY /api/v1/incidents/{proxy+}', operationsIntegration.ref, true);
    createRoute('CustomerProxyRoute', 'ANY /api/v1/customer/{proxy+}', operationsIntegration.ref, true);
    createRoute('RunTemplatesProxyRoute', 'ANY /api/v1/run-templates/{proxy+}', operationsIntegration.ref, true);
    createRoute('RunsProxyRoute', 'ANY /api/v1/runs/{proxy+}', operationsIntegration.ref, true);
    createRoute('CalendarProxyRoute', 'ANY /api/v1/calendar/{proxy+}', operationsIntegration.ref, true);
    createRoute('NotificationsProxyRoute', 'ANY /api/v1/notifications/{proxy+}', operationsIntegration.ref, true);
    createRoute('StaffBaseRoute', 'ANY /api/v1/staff', operationsIntegration.ref, true);
    createRoute('StaffProxyRoute', 'ANY /api/v1/staff/{proxy+}', operationsIntegration.ref, true);
    createRoute('TimeEntriesBaseRoute', 'ANY /api/v1/time-entries', operationsIntegration.ref, true);
    createRoute('TimeEntriesProxyRoute', 'ANY /api/v1/time-entries/{proxy+}', operationsIntegration.ref, true);
    createRoute('ShiftsBaseRoute', 'ANY /api/v1/shifts', operationsIntegration.ref, true);
    createRoute('ShiftsProxyRoute', 'ANY /api/v1/shifts/{proxy+}', operationsIntegration.ref, true);
    createRoute('RecurringBaseRoute', 'ANY /api/v1/recurring', operationsIntegration.ref, true);
    createRoute('RecurringProxyRoute', 'ANY /api/v1/recurring/{proxy+}', operationsIntegration.ref, true);

    // -------------------------------------------------------------------------
    // CONFIG SERVICE - Protected routes
    // -------------------------------------------------------------------------
    createRoute('ConfigProxyRoute', 'ANY /api/v1/config/{proxy+}', configIntegration.ref, true);
    createRoute('AccountDefaultsBaseRoute', 'ANY /api/v1/account-defaults', configIntegration.ref, true);
    createRoute('AccountDefaultsProxyRoute', 'ANY /api/v1/account-defaults/{proxy+}', configIntegration.ref, true);
    createRoute('PoliciesBaseRoute', 'ANY /api/v1/policies', configIntegration.ref, true);
    createRoute('PoliciesProxyRoute', 'ANY /api/v1/policies/{proxy+}', configIntegration.ref, true);
    createRoute('MembershipsBaseRoute', 'ANY /api/v1/memberships', configIntegration.ref, true);
    createRoute('MembershipsProxyRoute', 'ANY /api/v1/memberships/{proxy+}', configIntegration.ref, true);
    createRoute('FormsBaseRoute', 'ANY /api/v1/forms', configIntegration.ref, true);
    createRoute('FormsProxyRoute', 'ANY /api/v1/forms/{proxy+}', configIntegration.ref, true);
    createRoute('PropertiesV2ProxyRoute', 'ANY /api/v2/properties/{proxy+}', configIntegration.ref, true);
    createRoute('EntitiesV2ProxyRoute', 'ANY /api/v2/entities/{proxy+}', configIntegration.ref, true);
    createRoute('SettingsProxyRoute', 'ANY /api/v1/settings/{proxy+}', configIntegration.ref, true);
    createRoute('ImportExportProxyRoute', 'ANY /api/v1/import-export/{proxy+}', configIntegration.ref, true);
    createRoute('DocumentsBaseRoute', 'ANY /api/v1/documents', configIntegration.ref, true);
    createRoute('DocumentsProxyRoute', 'ANY /api/v1/documents/{proxy+}', configIntegration.ref, true);
    createRoute('FilesProxyRoute', 'ANY /api/v1/files/{proxy+}', configIntegration.ref, true);
    createRoute('PackageTemplatesBaseRoute', 'ANY /api/v1/package-templates', configIntegration.ref, true);
    createRoute('PackageTemplatesProxyRoute', 'ANY /api/v1/package-templates/{proxy+}', configIntegration.ref, true);
    createRoute('AddonServicesBaseRoute', 'ANY /api/v1/addon-services', configIntegration.ref, true);
    createRoute('AddonServicesProxyRoute', 'ANY /api/v1/addon-services/{proxy+}', configIntegration.ref, true);
    createRoute('ServicesBaseRoute', 'ANY /api/v1/services', configIntegration.ref, true);
    createRoute('ServicesProxyRoute', 'ANY /api/v1/services/{proxy+}', configIntegration.ref, true);

    // -------------------------------------------------------------------------
    // FINANCIAL SERVICE - Protected routes + public webhook
    // -------------------------------------------------------------------------
    createRoute('FinancialProxyRoute', 'ANY /api/v1/financial/{proxy+}', financialIntegration.ref, true);
    
    // Stripe webhook - PUBLIC (no authorizer, verified via Stripe signature)
    createRoute('StripeWebhookRoute', 'POST /api/v1/webhooks/stripe', financialIntegration.ref, false);

    // =========================================================================
    // ADMIN ROUTES - IAM Authorized (Ops Center service-to-service only)
    // =========================================================================
    // These routes mirror the regular /api/v1/* routes but under /admin/v1/*
    // They require AWS IAM SigV4 authentication (no user tokens)
    // Lambda handlers detect admin requests via X-Admin-User header and
    // the path starting with /admin/v1/
    // =========================================================================

    // Helper function to create IAM-authorized admin routes
    const createAdminRoute = (
      id: string,
      routeKey: string,
      integrationRef: string
    ): apigatewayv2.CfnRoute => {
      return new apigatewayv2.CfnRoute(this, id, {
        apiId: this.httpApi.apiId,
        routeKey: routeKey,
        target: `integrations/${integrationRef}`,
        authorizationType: 'AWS_IAM',
      });
    };

    // Admin Auth Routes
    createAdminRoute('AdminAuthProxyRoute', 'ANY /admin/v1/auth/{proxy+}', authIntegration.ref);
    createAdminRoute('AdminHealthRoute', 'GET /admin/v1/health', authIntegration.ref);

    // Admin Profile Routes
    createAdminRoute('AdminProfileProxyRoute', 'ANY /admin/v1/profile/{proxy+}', profileIntegration.ref);
    createAdminRoute('AdminUsersProxyRoute', 'ANY /admin/v1/users/{proxy+}', profileIntegration.ref);

    // Admin Entity Routes
    createAdminRoute('AdminEntityProxyRoute', 'ANY /admin/v1/entity/{proxy+}', entityIntegration.ref);

    // Admin Analytics Routes
    createAdminRoute('AdminAnalyticsProxyRoute', 'ANY /admin/v1/analytics/{proxy+}', analyticsIntegration.ref);
    createAdminRoute('AdminSegmentsProxyRoute', 'ANY /admin/v1/segments/{proxy+}', analyticsIntegration.ref);
    createAdminRoute('AdminMessagesProxyRoute', 'ANY /admin/v1/messages/{proxy+}', analyticsIntegration.ref);
    createAdminRoute('AdminReportsProxyRoute', 'ANY /admin/v1/reports/{proxy+}', analyticsIntegration.ref);
    createAdminRoute('AdminComplianceProxyRoute', 'ANY /admin/v1/compliance/{proxy+}', analyticsIntegration.ref);

    // Admin Operations Routes
    createAdminRoute('AdminOperationsProxyRoute', 'ANY /admin/v1/operations/{proxy+}', operationsIntegration.ref);
    createAdminRoute('AdminIncidentsBaseRoute', 'ANY /admin/v1/incidents', operationsIntegration.ref);
    createAdminRoute('AdminIncidentsProxyRoute', 'ANY /admin/v1/incidents/{proxy+}', operationsIntegration.ref);
    createAdminRoute('AdminCustomerProxyRoute', 'ANY /admin/v1/customer/{proxy+}', operationsIntegration.ref);
    createAdminRoute('AdminRunTemplatesProxyRoute', 'ANY /admin/v1/run-templates/{proxy+}', operationsIntegration.ref);
    createAdminRoute('AdminRunsProxyRoute', 'ANY /admin/v1/runs/{proxy+}', operationsIntegration.ref);
    createAdminRoute('AdminCalendarProxyRoute', 'ANY /admin/v1/calendar/{proxy+}', operationsIntegration.ref);
    createAdminRoute('AdminStaffBaseRoute', 'ANY /admin/v1/staff', operationsIntegration.ref);
    createAdminRoute('AdminStaffProxyRoute', 'ANY /admin/v1/staff/{proxy+}', operationsIntegration.ref);

    // Admin Config Routes
    createAdminRoute('AdminConfigProxyRoute', 'ANY /admin/v1/config/{proxy+}', configIntegration.ref);
    createAdminRoute('AdminSettingsProxyRoute', 'ANY /admin/v1/settings/{proxy+}', configIntegration.ref);

    // Admin Financial Routes
    createAdminRoute('AdminFinancialProxyRoute', 'ANY /admin/v1/financial/{proxy+}', financialIntegration.ref);

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
