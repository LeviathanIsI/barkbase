import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';

export interface ServicesStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  dbSecret: secretsmanager.ISecret;
  dbHost: string;
  dbPort: number;
  dbName: string;
  httpApi: apigwv2.HttpApi;
  userPool?: cognito.IUserPool;
  userPoolClient?: cognito.IUserPoolClient;
  authorizer?: HttpUserPoolAuthorizer;
}

export class ServicesStack extends cdk.Stack {
  public readonly entityServiceFn: lambda.Function;
  public readonly operationsServiceFn: lambda.Function;
  public readonly featuresServiceFn: lambda.Function;
  public readonly rolesConfigServiceFn: lambda.Function;
  public readonly tenantsMembershipsConfigServiceFn: lambda.Function;
  public readonly facilityServicesConfigServiceFn: lambda.Function;
  public readonly userProfileServiceFn: lambda.Function;
  public readonly propertiesApiV2Fn: lambda.Function;
  public readonly financialServiceFn: lambda.Function;
  public readonly analyticsServiceFn: lambda.Function;
  public readonly adminApiFn: lambda.Function;
  public readonly getUploadUrlFn: lambda.Function;
  public readonly getDownloadUrlFn: lambda.Function;
  public readonly authApiFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);

    const dbEnv = {
      DB_HOST: props.dbHost,
      DB_PORT: props.dbPort.toString(),
      DB_NAME: props.dbName,
      DB_SECRET_ID: props.dbSecret.secretName,
      DB_SECRET_ARN: props.dbSecret.secretArn,
      ENVIRONMENT: props.stage,
      STAGE: props.stage,
    };

    const authEnv: { [key: string]: string } =
      props.userPool && props.userPoolClient
        ? {
            USER_POOL_ID: props.userPool.userPoolId,
            CLIENT_ID: props.userPoolClient.userPoolClientId,
          }
        : {};

    const fileBucketName =
      this.node.tryGetContext('uploadsBucketName') ?? process.env.UPLOADS_BUCKET ?? '';
    const cloudFrontDomain =
      this.node.tryGetContext('cloudFrontDomain') ?? process.env.CLOUDFRONT_DOMAIN ?? '';
    const s3KmsKeyId =
      this.node.tryGetContext('uploadsKmsKeyArn') ?? process.env.S3_KMS_KEY_ARN ?? '';

    const fileEnv = {
      S3_BUCKET: fileBucketName,
      CLOUDFRONT_DOMAIN: cloudFrontDomain,
      S3_KMS_KEY_ID: s3KmsKeyId,
    };

    const dbLayer = new lambda.LayerVersion(this, 'ServicesDbLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../layers/db-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared database utilities for BarkBase services',
    });

    const authLayer = new lambda.LayerVersion(this, 'ServicesAuthLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../layers/auth-layer')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared authentication utilities for BarkBase services',
    });

    const vpcConfig = {
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    };

    this.operationsServiceFn = new lambda.Function(this, 'OperationsServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/operations-service')),
      layers: [dbLayer, authLayer],
      environment: { ...dbEnv, ...authEnv },
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.operationsServiceFn);

    const operationsIntegration = new integrations.HttpLambdaIntegration(
      'OperationsServiceIntegration',
      this.operationsServiceFn,
    );

    const operationsRouteOptions = {
      integration: operationsIntegration,
      authorizer: props.authorizer,
    };

    props.httpApi.addRoutes({
      path: '/api/v1/bookings',
      methods: [apigwv2.HttpMethod.ANY],
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/runs',
      methods: [apigwv2.HttpMethod.ANY],
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/run-templates',
      methods: [apigwv2.HttpMethod.ANY],
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/check-ins',
      methods: [apigwv2.HttpMethod.ANY],
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/check-outs',
      methods: [apigwv2.HttpMethod.ANY],
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/kennels',
      methods: [apigwv2.HttpMethod.ANY],
      ...operationsRouteOptions,
    });

    const proxyMethods = [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
      apigwv2.HttpMethod.PUT,
      apigwv2.HttpMethod.PATCH,
      apigwv2.HttpMethod.DELETE,
    ];

    props.httpApi.addRoutes({
      path: '/api/v1/bookings/{proxy+}',
      methods: proxyMethods,
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/runs/{proxy+}',
      methods: proxyMethods,
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/run-templates/{proxy+}',
      methods: proxyMethods,
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/check-ins/{proxy+}',
      methods: proxyMethods,
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/check-outs/{proxy+}',
      methods: proxyMethods,
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/kennels/{proxy+}',
      methods: proxyMethods,
      ...operationsRouteOptions,
    });

    props.httpApi.addRoutes({
      path: '/api/v1/runs/assignments',
      methods: [apigwv2.HttpMethod.GET],
      ...operationsRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/kennels/occupancy',
      methods: [apigwv2.HttpMethod.GET],
      ...operationsRouteOptions,
    });

    this.entityServiceFn = new lambda.Function(this, 'EntityServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/entity-service')),
      layers: [dbLayer, authLayer],
      environment: { ...dbEnv, ...authEnv },
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.entityServiceFn);

    const entityIntegration = new integrations.HttpLambdaIntegration(
      'EntityServiceIntegration',
      this.entityServiceFn,
    );

    const entityRouteOptions = {
      integration: entityIntegration,
      authorizer: props.authorizer,
    };

    props.httpApi.addRoutes({
      path: '/api/v1/pets',
      methods: [apigwv2.HttpMethod.ANY],
      ...entityRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/pets/{proxy+}',
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PUT,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      ...entityRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/owners',
      methods: [apigwv2.HttpMethod.ANY],
      ...entityRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/owners/{proxy+}',
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PUT,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      ...entityRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/staff',
      methods: [apigwv2.HttpMethod.ANY],
      ...entityRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/staff/{proxy+}',
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.POST,
        apigwv2.HttpMethod.PUT,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      ...entityRouteOptions,
    });

    this.featuresServiceFn = new lambda.Function(this, 'FeaturesServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/features-service')),
      layers: [dbLayer, authLayer],
      environment: { ...dbEnv, ...authEnv },
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.featuresServiceFn);

    const featuresIntegration = new integrations.HttpLambdaIntegration(
      'FeaturesServiceIntegration',
      this.featuresServiceFn,
    );

    const featuresRouteOptions = {
      integration: featuresIntegration,
      authorizer: props.authorizer,
    };

    const featuresBasePaths = [
      '/api/v1/tasks',
      '/api/v1/notes',
      '/api/v1/incidents',
      '/api/v1/messages',
      '/api/v1/communications',
      '/api/v1/invites',
      '/api/v1/segments',
    ];

    featuresBasePaths.forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: [apigwv2.HttpMethod.ANY],
        ...featuresRouteOptions,
      });
    });

    const featuresProxyPaths = [
      '/api/v1/tasks/{proxy+}',
      '/api/v1/notes/{proxy+}',
      '/api/v1/incidents/{proxy+}',
      '/api/v1/messages/{proxy+}',
      '/api/v1/communications/{proxy+}',
      '/api/v1/invites/{proxy+}',
      '/api/v1/segments/{proxy+}',
    ];

    featuresProxyPaths.forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: [
          apigwv2.HttpMethod.GET,
          apigwv2.HttpMethod.POST,
          apigwv2.HttpMethod.PUT,
          apigwv2.HttpMethod.PATCH,
          apigwv2.HttpMethod.DELETE,
        ],
        ...featuresRouteOptions,
      });
    });

    const createConfigLambda = (id: string): lambda.Function => {
      const fn = new lambda.Function(this, id, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/config-service')),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      });
      props.dbSecret.grantRead(fn);
      return fn;
    };

    this.rolesConfigServiceFn = createConfigLambda('RolesConfigServiceFunction');
    this.tenantsMembershipsConfigServiceFn = createConfigLambda(
      'TenantsMembershipsConfigServiceFunction',
    );
    this.facilityServicesConfigServiceFn = createConfigLambda(
      'FacilityServicesConfigServiceFunction',
    );

    const rolesConfigIntegration = new integrations.HttpLambdaIntegration(
      'RolesConfigServiceIntegration',
      this.rolesConfigServiceFn,
    );
    const tenantsMembershipsConfigIntegration = new integrations.HttpLambdaIntegration(
      'TenantsMembershipsConfigServiceIntegration',
      this.tenantsMembershipsConfigServiceFn,
    );
    const facilityServicesConfigIntegration = new integrations.HttpLambdaIntegration(
      'FacilityServicesConfigServiceIntegration',
      this.facilityServicesConfigServiceFn,
    );

    const rolesConfigRouteOptions = {
      integration: rolesConfigIntegration,
      authorizer: props.authorizer,
    };
    const tenantsMembershipsRouteOptions = {
      integration: tenantsMembershipsConfigIntegration,
      authorizer: props.authorizer,
    };
    const facilityServicesRouteOptions = {
      integration: facilityServicesConfigIntegration,
      authorizer: props.authorizer,
    };

    const configProxyMethods = [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
      apigwv2.HttpMethod.PUT,
      apigwv2.HttpMethod.PATCH,
      apigwv2.HttpMethod.DELETE,
    ];

    // Roles & user permissions
    ['/api/v1/roles', '/api/v1/user-permissions'].forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: [apigwv2.HttpMethod.ANY],
        ...rolesConfigRouteOptions,
      });
    });
    ['/api/v1/roles/{proxy+}', '/api/v1/user-permissions/{proxy+}'].forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: configProxyMethods,
        ...rolesConfigRouteOptions,
      });
    });

    // Tenants & memberships
    ['/api/v1/tenants', '/api/v1/memberships'].forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: [apigwv2.HttpMethod.ANY],
        ...tenantsMembershipsRouteOptions,
      });
    });
    ['/api/v1/tenants/{proxy+}', '/api/v1/memberships/{proxy+}'].forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: configProxyMethods,
        ...tenantsMembershipsRouteOptions,
      });
    });

    // Facility, services, account defaults, packages
    [
      '/api/v1/facility',
      '/api/v1/services',
      '/api/v1/account-defaults',
      '/api/v1/packages',
    ].forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: [apigwv2.HttpMethod.ANY],
        ...facilityServicesRouteOptions,
      });
    });
    [
      '/api/v1/facility/{proxy+}',
      '/api/v1/services/{proxy+}',
      '/api/v1/account-defaults/{proxy+}',
      '/api/v1/packages/{proxy+}',
    ].forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: configProxyMethods,
        ...facilityServicesRouteOptions,
      });
    });

    this.userProfileServiceFn = new lambda.Function(this, 'UserProfileServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/user-profile-service')),
      layers: [dbLayer],
      environment: dbEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.userProfileServiceFn);

    const userProfileIntegration = new integrations.HttpLambdaIntegration(
      'UserProfileServiceIntegration',
      this.userProfileServiceFn,
    );
    const userProfileOptions = {
      integration: userProfileIntegration,
      authorizer: props.authorizer,
    };

    props.httpApi.addRoutes({
      path: '/api/v1/profiles',
      methods: [apigwv2.HttpMethod.GET],
      ...userProfileOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/users/{userId}/profiles',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      ...userProfileOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/users/profile',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH],
      ...userProfileOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/users/password',
      methods: [apigwv2.HttpMethod.POST],
      ...userProfileOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/users/avatar',
      methods: [apigwv2.HttpMethod.PATCH],
      ...userProfileOptions,
    });

    this.propertiesApiV2Fn = new lambda.Function(this, 'PropertiesApiV2Function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/properties-api-v2')),
      layers: [dbLayer],
      environment: dbEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.propertiesApiV2Fn);

    const propertiesIntegration = new integrations.HttpLambdaIntegration(
      'PropertiesApiV2Integration',
      this.propertiesApiV2Fn,
    );

    const propertiesRouteOptions = {
      integration: propertiesIntegration,
      authorizer: props.authorizer,
    };

    props.httpApi.addRoutes({
      path: '/api/v2/properties',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      ...propertiesRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v2/properties/{propertyId}',
      methods: [
        apigwv2.HttpMethod.GET,
        apigwv2.HttpMethod.PATCH,
        apigwv2.HttpMethod.DELETE,
      ],
      ...propertiesRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v2/properties/{propertyId}/archive',
      methods: [apigwv2.HttpMethod.POST],
      ...propertiesRouteOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v2/properties/{propertyId}/restore',
      methods: [apigwv2.HttpMethod.POST],
      ...propertiesRouteOptions,
    });

    this.financialServiceFn = new lambda.Function(this, 'FinancialServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/financial-service')),
      layers: [dbLayer, authLayer],
      environment: { ...dbEnv, ...authEnv },
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.financialServiceFn);

    const financialIntegration = new integrations.HttpLambdaIntegration(
      'FinancialServiceIntegration',
      this.financialServiceFn,
    );
    const financialOptions = {
      integration: financialIntegration,
      authorizer: props.authorizer,
    };
    props.httpApi.addRoutes({
      path: '/api/v1/payments',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/invoices',
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/billing/overview',
      methods: [apigwv2.HttpMethod.GET],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/billing/metrics',
      methods: [apigwv2.HttpMethod.GET],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/payments/{paymentId}',
      methods: [apigwv2.HttpMethod.GET],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/invoices/{invoiceId}',
      methods: [apigwv2.HttpMethod.GET],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/invoices/generate/{bookingId}',
      methods: [apigwv2.HttpMethod.POST],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/invoices/{invoiceId}/send-email',
      methods: [apigwv2.HttpMethod.POST],
      ...financialOptions,
    });
    props.httpApi.addRoutes({
      path: '/api/v1/invoices/{invoiceId}/paid',
      methods: [apigwv2.HttpMethod.PUT],
      ...financialOptions,
    });

    this.analyticsServiceFn = new lambda.Function(this, 'AnalyticsServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/analytics-service')),
      layers: [dbLayer, authLayer],
      environment: { ...dbEnv, ...authEnv },
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.analyticsServiceFn);

    const analyticsIntegration = new integrations.HttpLambdaIntegration(
      'AnalyticsServiceIntegration',
      this.analyticsServiceFn,
    );
    const analyticsOptions = {
      integration: analyticsIntegration,
      authorizer: props.authorizer,
    };

    [
      '/api/v1/dashboard/stats',
      '/api/v1/dashboard/today-pets',
      '/api/v1/dashboard/arrivals',
      '/api/v1/dashboard/departures',
      '/api/v1/dashboard/occupancy',
      '/api/v1/dashboard/revenue',
      '/api/v1/dashboard/activity',
      '/api/v1/reports/dashboard',
      '/api/v1/reports/revenue',
      '/api/v1/reports/occupancy',
      '/api/v1/reports/arrivals',
      '/api/v1/reports/departures',
      '/api/v1/schedule',
      '/api/v1/schedule/capacity',
    ].forEach((pathName) => {
      props.httpApi.addRoutes({
        path: pathName,
        methods: [apigwv2.HttpMethod.GET],
        ...analyticsOptions,
      });
    });

    this.adminApiFn = new lambda.Function(this, 'AdminApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/admin-api')),
      layers: [dbLayer],
      environment: dbEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.adminApiFn);

    const adminIntegration = new integrations.HttpLambdaIntegration(
      'AdminApiIntegration',
      this.adminApiFn,
    );
    props.httpApi.addRoutes({
      path: '/api/v1/admin/stats',
      methods: [apigwv2.HttpMethod.GET],
      integration: adminIntegration,
      authorizer: props.authorizer,
    });

    this.getUploadUrlFn = new lambda.Function(this, 'GetUploadUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/get-upload-url')),
      environment: fileEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });

    this.getDownloadUrlFn = new lambda.Function(this, 'GetDownloadUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/get-download-url')),
      environment: fileEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });

    const uploadUrlIntegration = new integrations.HttpLambdaIntegration(
      'GetUploadUrlIntegration',
      this.getUploadUrlFn,
    );
    props.httpApi.addRoutes({
      path: '/api/v1/upload-url',
      methods: [apigwv2.HttpMethod.POST],
      integration: uploadUrlIntegration,
      authorizer: props.authorizer,
    });

    const downloadUrlIntegration = new integrations.HttpLambdaIntegration(
      'GetDownloadUrlIntegration',
      this.getDownloadUrlFn,
    );
    props.httpApi.addRoutes({
      path: '/api/v1/download-url',
      methods: [apigwv2.HttpMethod.GET],
      integration: downloadUrlIntegration,
      authorizer: props.authorizer,
    });

    // === Auth API Lambda ===
    // JWT and cookie configuration for authentication
    const jwtSecret = process.env.JWT_SECRET || '';
    const jwtSecretOld = process.env.JWT_SECRET_OLD || '';
    const cookieDomain =
      this.node.tryGetContext('cookieDomain') ?? process.env.COOKIE_DOMAIN ?? '';

    const authApiEnv: { [key: string]: string } = {
      ...dbEnv,
      ...authEnv,
      // JWT configuration (required for token signing/verification)
      ...(jwtSecret ? { JWT_SECRET: jwtSecret } : {}),
      ...(jwtSecretOld ? { JWT_SECRET_OLD: jwtSecretOld } : {}),
      // Cookie domain for production/staging (optional)
      ...(cookieDomain ? { COOKIE_DOMAIN: cookieDomain } : {}),
    };

    this.authApiFunction = new lambda.Function(this, 'AuthApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/auth-api')),
      layers: [dbLayer, authLayer],
      environment: authApiEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.authApiFunction);

    // Grant Cognito permissions if user pool is configured
    if (props.userPool) {
      props.userPool.grant(this.authApiFunction, 'cognito-idp:InitiateAuth');
    }

    // Auth API routes (no authorizer - these are public endpoints)
    const authIntegration = new integrations.HttpLambdaIntegration(
      'AuthApiIntegration',
      this.authApiFunction,
    );

    // Root auth path for future endpoints
    props.httpApi.addRoutes({
      path: '/api/v1/auth',
      methods: [apigwv2.HttpMethod.ANY],
      integration: authIntegration,
      // No authorizer - auth endpoints are public
    });

    // Proxy for all auth sub-paths: /login, /signup, /refresh, /logout, /register, etc.
    props.httpApi.addRoutes({
      path: '/api/v1/auth/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: authIntegration,
      // No authorizer - auth endpoints are public
    });

    cdk.Tags.of(this).add('Stage', props.stage);
  }
}



