/**
 * ApiCoreStack
 * 
 * Purpose: Central HTTP API Gateway (API Gateway v2) for BarkBase.
 * 
 * Domain Boundaries:
 * - Single HttpApi serving all REST endpoints
 * - Route definitions mapped to domain Lambda integrations
 * - CORS configuration
 * - No authorization yet (TODO: Add JWT/Cognito authorizer)
 * 
 * Integrations:
 * - 11 Lambda integrations (one per domain service)
 * - ~80-100 routes mapped to appropriate Lambdas
 * 
 * Dependencies:
 * - All service stacks (Lambda functions)
 * 
 * Resource Count: ~100-150 resources (HttpApi + routes + permissions)
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

export interface ApiCoreStackProps extends cdk.StackProps {
  /**
   * Deployment stage (dev, staging, prod)
   */
  stage: string;

  /**
   * Environment name
   */
  environment: string;

  // =========================================================================
  // Lambda Function References from Service Stacks
  // =========================================================================

  /** Auth API Lambda - /api/v1/auth/* */
  authApiFunction: lambda.IFunction;

  /** User Profile Service Lambda - /api/v1/users/* */
  userProfileServiceFunction: lambda.IFunction;

  /** Roles Config Service Lambda - /api/v1/roles, /api/v1/user-permissions/* */
  rolesConfigServiceFunction: lambda.IFunction;

  /** Tenants & Memberships Service Lambda - /api/v1/tenants/*, /api/v1/memberships/* */
  tenantsMembershipsServiceFunction: lambda.IFunction;

  /** Entity Service Lambda - /api/v1/pets/*, /api/v1/owners/*, /api/v1/staff/* */
  entityServiceFunction: lambda.IFunction;

  /** Operations Service Lambda - /api/v1/bookings/*, /api/v1/kennels/*, etc. */
  operationsServiceFunction: lambda.IFunction;

  /** Config Service Lambda - /api/v1/services/*, /api/v1/facility/*, etc. */
  configServiceFunction: lambda.IFunction;

  /** Features Service Lambda - /api/v1/tasks/*, /api/v1/communications/*, etc. */
  featuresServiceFunction: lambda.IFunction;

  /** Financial Service Lambda - /api/v1/payments/*, /api/v1/invoices/* */
  financialServiceFunction: lambda.IFunction;

  /** Analytics Service Lambda - /api/v1/dashboard/*, /api/v1/schedule/*, /api/v1/reports/* */
  analyticsServiceFunction: lambda.IFunction;

  /** Properties V2 Service Lambda - /api/v2/properties/* */
  propertiesApiV2Function: lambda.IFunction;
}

export class ApiCoreStack extends cdk.Stack {
  /**
   * The HTTP API Gateway
   */
  public readonly httpApi: apigwv2.HttpApi;

  /**
   * The API endpoint URL
   */
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: ApiCoreStackProps) {
    super(scope, id, props);

    // =========================================================================
    // HTTP API
    // =========================================================================
    this.httpApi = new apigwv2.HttpApi(this, 'BarkbaseHttpApi', {
      apiName: `barkbase-${props.stage}-api`,
      description: 'BarkBase HTTP API - All REST endpoints',
      corsPreflight: {
        // TODO: Tighten CORS for production
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.PATCH,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Tenant-Id',
          'X-Requested-With',
          'X-User-Id',
          'X-User-Role',
        ],
        maxAge: cdk.Duration.hours(1),
      },
    });

    this.apiEndpoint = this.httpApi.apiEndpoint;

    // =========================================================================
    // Lambda Integrations
    // =========================================================================
    const authIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'AuthIntegration',
      props.authApiFunction
    );

    const userProfileIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'UserProfileIntegration',
      props.userProfileServiceFunction
    );

    const rolesConfigIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'RolesConfigIntegration',
      props.rolesConfigServiceFunction
    );

    const tenantsIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'TenantsIntegration',
      props.tenantsMembershipsServiceFunction
    );

    const entityIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'EntityIntegration',
      props.entityServiceFunction
    );

    const operationsIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'OperationsIntegration',
      props.operationsServiceFunction
    );

    const configIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'ConfigIntegration',
      props.configServiceFunction
    );

    const featuresIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'FeaturesIntegration',
      props.featuresServiceFunction
    );

    const financialIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'FinancialIntegration',
      props.financialServiceFunction
    );

    const analyticsIntegration = new apigwIntegrations.HttpLambdaIntegration(
      'AnalyticsIntegration',
      props.analyticsServiceFunction
    );

    const propertiesV2Integration = new apigwIntegrations.HttpLambdaIntegration(
      'PropertiesV2Integration',
      props.propertiesApiV2Function
    );

    // =========================================================================
    // Routes: Auth API
    // =========================================================================
    this.httpApi.addRoutes({
      path: '/api/v1/auth/login',
      methods: [apigwv2.HttpMethod.POST],
      integration: authIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/auth/logout',
      methods: [apigwv2.HttpMethod.POST],
      integration: authIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/auth/refresh',
      methods: [apigwv2.HttpMethod.POST],
      integration: authIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/auth/signup',
      methods: [apigwv2.HttpMethod.POST],
      integration: authIntegration,
    });

    // =========================================================================
    // Routes: User Profile
    // =========================================================================
    this.httpApi.addRoutes({
      path: '/api/v1/users/profile',
      methods: [apigwv2.HttpMethod.GET],
      integration: userProfileIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/users/password',
      methods: [apigwv2.HttpMethod.POST],
      integration: userProfileIntegration,
    });

    // =========================================================================
    // Routes: Roles & Permissions
    // =========================================================================
    this.httpApi.addRoutes({
      path: '/api/v1/roles',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: rolesConfigIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/roles/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: rolesConfigIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/user-permissions/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PATCH],
      integration: rolesConfigIntegration,
    });

    // =========================================================================
    // Routes: Tenants & Memberships
    // =========================================================================
    this.httpApi.addRoutes({
      path: '/api/v1/tenants',
      methods: [apigwv2.HttpMethod.GET],
      integration: tenantsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/tenants/current',
      methods: [apigwv2.HttpMethod.GET],
      integration: tenantsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/tenants/current/plan',
      methods: [apigwv2.HttpMethod.GET],
      integration: tenantsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/tenants/current/onboarding',
      methods: [apigwv2.HttpMethod.GET],
      integration: tenantsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/tenants/current/theme',
      methods: [apigwv2.HttpMethod.GET],
      integration: tenantsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/tenants/{proxy+}',
      methods: [apigwv2.HttpMethod.POST],
      integration: tenantsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/memberships/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT],
      integration: tenantsIntegration,
    });

    // =========================================================================
    // Routes: Entities (Pets, Owners, Staff)
    // =========================================================================
    // Pets
    this.httpApi.addRoutes({
      path: '/api/v1/pets',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: entityIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/pets/vaccinations/expiring',
      methods: [apigwv2.HttpMethod.GET],
      integration: entityIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/pets/medical-alerts',
      methods: [apigwv2.HttpMethod.GET],
      integration: entityIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/pets/owners',
      methods: [apigwv2.HttpMethod.POST],
      integration: entityIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/pets/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: entityIntegration,
    });

    // Owners
    this.httpApi.addRoutes({
      path: '/api/v1/owners',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: entityIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/owners/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: entityIntegration,
    });

    // Staff
    this.httpApi.addRoutes({
      path: '/api/v1/staff',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: entityIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/staff/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: entityIntegration,
    });

    // =========================================================================
    // Routes: Operations (Bookings, Check-ins, Kennels, Runs)
    // =========================================================================
    // Bookings
    this.httpApi.addRoutes({
      path: '/api/v1/bookings',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/bookings/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });

    // Check-ins
    this.httpApi.addRoutes({
      path: '/api/v1/check-ins',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/check-ins/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });

    // Check-outs
    this.httpApi.addRoutes({
      path: '/api/v1/check-outs',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/check-outs/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });

    // Kennels
    this.httpApi.addRoutes({
      path: '/api/v1/kennels',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/kennels/occupancy',
      methods: [apigwv2.HttpMethod.GET],
      integration: operationsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/kennels/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT],
      integration: operationsIntegration,
    });

    // Runs
    this.httpApi.addRoutes({
      path: '/api/v1/runs',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/runs/assignments',
      methods: [apigwv2.HttpMethod.GET],
      integration: operationsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/runs/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
      integration: operationsIntegration,
    });

    // Run templates
    this.httpApi.addRoutes({
      path: '/api/v1/run-templates/{proxy+}',
      methods: [apigwv2.HttpMethod.POST],
      integration: operationsIntegration,
    });

    // =========================================================================
    // Routes: Config (Services, Facility, Packages, Account Defaults)
    // =========================================================================
    // Services
    this.httpApi.addRoutes({
      path: '/api/v1/services',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: configIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/services/{proxy+}',
      methods: [apigwv2.HttpMethod.DELETE],
      integration: configIntegration,
    });

    // Facility
    this.httpApi.addRoutes({
      path: '/api/v1/facility/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PATCH],
      integration: configIntegration,
    });

    // Packages
    this.httpApi.addRoutes({
      path: '/api/v1/packages/{proxy+}',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT],
      integration: configIntegration,
    });

    // Account defaults
    this.httpApi.addRoutes({
      path: '/api/v1/account-defaults/{proxy+}',
      methods: [apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: configIntegration,
    });

    // =========================================================================
    // Routes: Features (Tasks, Communications, Incidents, Notes, Messages, etc.)
    // =========================================================================
    // Tasks
    this.httpApi.addRoutes({
      path: '/api/v1/tasks',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/tasks/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });

    // Communications
    this.httpApi.addRoutes({
      path: '/api/v1/communications',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/communications/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH],
      integration: featuresIntegration,
    });

    // Incidents
    this.httpApi.addRoutes({
      path: '/api/v1/incidents',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/incidents/{proxy+}',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });

    // Notes
    this.httpApi.addRoutes({
      path: '/api/v1/notes',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/notes/{proxy+}',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });

    // Messages
    this.httpApi.addRoutes({
      path: '/api/v1/messages',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/messages/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT],
      integration: featuresIntegration,
    });

    // Invites
    this.httpApi.addRoutes({
      path: '/api/v1/invites',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
      integration: featuresIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/invites/{proxy+}',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.PATCH],
      integration: featuresIntegration,
    });

    // Segments
    this.httpApi.addRoutes({
      path: '/api/v1/segments/{proxy+}',
      methods: [apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.PATCH],
      integration: featuresIntegration,
    });

    // =========================================================================
    // Routes: Financial (Payments, Invoices, Billing)
    // =========================================================================
    this.httpApi.addRoutes({
      path: '/api/v1/payments',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: financialIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/invoices',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: financialIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/invoices/generate/{bookingId}',
      methods: [apigwv2.HttpMethod.POST],
      integration: financialIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/billing/metrics',
      methods: [apigwv2.HttpMethod.GET],
      integration: financialIntegration,
    });

    // =========================================================================
    // Routes: Analytics (Dashboard, Schedule, Reports)
    // =========================================================================
    // Dashboard
    this.httpApi.addRoutes({
      path: '/api/v1/dashboard/stats',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/dashboard/today-pets',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/dashboard/arrivals',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });

    // Schedule
    this.httpApi.addRoutes({
      path: '/api/v1/schedule',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/schedule/capacity',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });

    // Reports
    this.httpApi.addRoutes({
      path: '/api/v1/reports/departures',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/reports/arrivals',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/reports/revenue',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });
    this.httpApi.addRoutes({
      path: '/api/v1/reports/occupancy',
      methods: [apigwv2.HttpMethod.GET],
      integration: analyticsIntegration,
    });

    // =========================================================================
    // Routes: Properties V2
    // =========================================================================
    this.httpApi.addRoutes({
      path: '/api/v2/properties',
      methods: [apigwv2.HttpMethod.GET],
      integration: propertiesV2Integration,
    });
    this.httpApi.addRoutes({
      path: '/api/v2/properties/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: propertiesV2Integration,
    });
    this.httpApi.addRoutes({
      path: '/api/v2/properties/{propertyId}',
      methods: [apigwv2.HttpMethod.DELETE],
      integration: propertiesV2Integration,
    });
    this.httpApi.addRoutes({
      path: '/api/v2/properties/{propertyId}/archive',
      methods: [apigwv2.HttpMethod.POST],
      integration: propertiesV2Integration,
    });

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'HttpApiId', {
      value: this.httpApi.apiId,
      description: 'HTTP API ID',
      exportName: `${this.stackName}-HttpApiId`,
    });

    new cdk.CfnOutput(this, 'HttpApiEndpoint', {
      value: this.apiEndpoint,
      description: 'HTTP API endpoint URL',
      exportName: `${this.stackName}-HttpApiEndpoint`,
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.url || '',
      description: 'HTTP API default stage URL',
      exportName: `${this.stackName}-HttpApiUrl`,
    });
  }
}
