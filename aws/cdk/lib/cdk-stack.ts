import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration, WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as rds from "aws-cdk-lib/aws-rds";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cw from "aws-cdk-lib/aws-cloudwatch";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
// import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import * as path from "path";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // === VPC (no NAT, private isolated subnets) ===
    const vpc = new ec2.Vpc(this, "AppVpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
    });

    // Security groups
    const lambdaSG = new ec2.SecurityGroup(this, "LambdaSecurityGroup", { vpc });
    const dbSG = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", { vpc });
    dbSG.addIngressRule(lambdaSG, ec2.Port.tcp(5432), "Allow Lambda to Postgres");

    // VPC Endpoints to avoid NAT for AWS services access
    vpc.addGatewayEndpoint("S3Endpoint", { service: ec2.GatewayVpcEndpointAwsService.S3 });
    vpc.addInterfaceEndpoint("SecretsManagerEndpoint", { service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER, securityGroups: [lambdaSG] });
    vpc.addInterfaceEndpoint("CloudWatchLogsEndpoint", { service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS, securityGroups: [lambdaSG] });

    // === RDS (PostgreSQL) with Secrets Manager and RDS Proxy ===
    const dbName = process.env.DB_NAME || "barkbase";
    const masterUsername = process.env.DB_USER || "postgres";

    const dbSecret = new rds.DatabaseSecret(this, "DbSecret", {
      username: masterUsername,
      secretName: `${id}-db-credentials`,
    });

    const dbInstance = new rds.DatabaseInstance(this, "PostgresInstance", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.V15_6 }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSG],
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      multiAz: false,
      allocatedStorage: 20,
      storageEncrypted: true,
      storageType: rds.StorageType.GP3,
      publiclyAccessible: false,
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: dbName,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    const dbProxy = dbInstance.addProxy("PostgresProxy", {
      secrets: [dbSecret],
      vpc,
      securityGroups: [dbSG],
      requireTLS: true,
      iamAuth: false,
      borrowTimeout: cdk.Duration.seconds(120),
      maxConnectionsPercent: 90,
    });

    // Shared environment variables (via RDS Proxy and Secrets)
    const dbEnvironment = {
      DB_HOST: dbProxy.endpoint,
      DB_PORT: "5432",
      DB_NAME: dbName,
      DB_USER: dbSecret.secretValueFromJson("username").toString(),
      DB_PASSWORD: dbSecret.secretValueFromJson("password").toString(),
      DB_SECRET_ID: dbSecret.secretArn,
    };

    // Database Layer
    const dbLayer = new lambda.LayerVersion(this, "DbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Provides a shared database connection pool",
    });

    // Users API
    const usersApiFunction = new lambda.Function(this, "UsersApiFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/users-api")
      ),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });

    // === Authentication (Cognito) ===
    const userPool = new cognito.UserPool(this, "BarkbaseUserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, "BarkbaseUserPoolClient", {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
        refreshToken: true,
      },
      generateSecret: false,
    });

    // Prepare an HTTP API authorizer using the Cognito User Pool (to be applied per-route gradually)
    const httpAuthorizer = new HttpUserPoolAuthorizer(
      "BarkbaseHttpAuthorizer",
      userPool,
      {
        userPoolClients: [userPoolClient],
        identitySource: ["$request.header.Authorization"],
      }
    );

    // Allowed origins for CORS come from env (comma-separated), fallback to "*" for dev
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    // HTTP API Gateway
    const httpApi = new apigw.HttpApi(this, "BarkbaseApi", {
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          // Keep for staged rollout; remove after claim-only tenancy is fully deployed
          "x-tenant-id",
        ],
        allowMethods: [
          apigw.CorsHttpMethod.OPTIONS,
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PUT,
          apigw.CorsHttpMethod.DELETE,
        ],
        allowOrigins: allowedOrigins,
      },
    });

    // Users Routes
    const usersIntegration = new HttpLambdaIntegration(
      "UsersIntegration",
      usersApiFunction
    );
    httpApi.addRoutes({
      path: "/api/v1/users",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: usersIntegration,
      // authorizer: httpAuthorizer, // Enable after Cognito tokens are used in frontend
    });
    httpApi.addRoutes({
      path: "/api/v1/users/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: usersIntegration,
      // authorizer: httpAuthorizer,
    });

    // Pets API
    const petsApiFunction = new lambda.Function(this, "PetsApiFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/pets-api")
      ),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const petsIntegration = new HttpLambdaIntegration(
      "PetsIntegration",
      petsApiFunction
    );
    httpApi.addRoutes({
      path: "/api/v1/pets",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: petsIntegration,
      // authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: petsIntegration,
      // authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/{id}/vaccinations",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: petsIntegration,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/{id}/vaccinations/{vaccinationId}",
      methods: [apigw.HttpMethod.PUT],
      integration: petsIntegration,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/vaccinations/expiring",
      methods: [apigw.HttpMethod.GET],
      integration: petsIntegration,
    });

    // S3 Bucket (private with KMS-SSE)
    const kmsKey = new kms.Key(this, 'UploadsKmsKey', {
      enableKeyRotation: true,
      alias: `alias/${id}-uploads`,
    });

    const bucket = new s3.Bucket(this, 'UploadsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      enforceSSL: true,
    });

    // S3 environment
    const s3Environment = {
      S3_BUCKET: bucket.bucketName,
      CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN || "",
      S3_KMS_KEY_ID: kmsKey.keyArn,
    };

    // Upload URL Function
    const getUploadUrlFunction = new lambda.Function(
      this,
      "GetUploadUrlFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/get-upload-url")
        ),
        environment: s3Environment,
        timeout: cdk.Duration.seconds(30),
        vpc,
        securityGroups: [lambdaSG],
      }
    );
    bucket.grantWrite(getUploadUrlFunction);

    const getUploadUrlIntegration = new HttpLambdaIntegration(
      "GetUploadUrlIntegration",
      getUploadUrlFunction
    );
    httpApi.addRoutes({
      path: "/api/v1/upload-url",
      methods: [apigw.HttpMethod.POST],
      integration: getUploadUrlIntegration,
      // authorizer: httpAuthorizer,
    });

    // --- S3 Download URL Generator ---
    const getDownloadUrlFunction = new lambda.Function(this, 'GetDownloadUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/get-download-url')),
      environment: s3Environment,
      vpc,
      securityGroups: [lambdaSG],
    });
    bucket.grantRead(getDownloadUrlFunction);
    const getDownloadUrlIntegration = new HttpLambdaIntegration('GetDownloadUrlIntegration', getDownloadUrlFunction);
    httpApi.addRoutes({
      path: '/api/v1/download-url',
      methods: [apigw.HttpMethod.GET],
      integration: getDownloadUrlIntegration,
      // authorizer: httpAuthorizer,
    });

    // === Phase 5: Frontend hosting (S3 + CloudFront) ===
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });
    const siteOai = new cloudfront.OriginAccessIdentity(this, 'SiteOAI');
    siteBucket.grantRead(siteOai);

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(siteBucket, { originAccessIdentity: siteOai }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
      ],
    });

    new cdk.CfnOutput(this, 'SiteBucketName', { value: siteBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', { value: distribution.domainName });

    // === Observability (Phase 4) ===
    // API Access Logs on $default stage with detailed metrics
    const apiAccessLogs = new logs.LogGroup(this, 'HttpApiAccessLogs', {
      retention: logs.RetentionDays.TWO_YEARS,
    });
    new apigw.CfnStage(this, 'HttpApiDefaultStageSettings', {
      apiId: httpApi.apiId,
      stageName: '$default',
      autoDeploy: true,
      accessLogSettings: {
        destinationArn: apiAccessLogs.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          httpMethod: "$context.httpMethod",
          routeKey: "$context.routeKey",
          status: "$context.status",
          protocol: "$context.protocol",
          responseLength: "$context.responseLength"
        }),
      },
      defaultRouteSettings: {
        detailedMetricsEnabled: true,
      },
    });

    // Lambda X-Ray tracing
    usersApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'users');
    usersApiFunction.tracing = lambda.Tracing.ACTIVE;
    petsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'pets');
    petsApiFunction.tracing = lambda.Tracing.ACTIVE;
    authApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'auth');
    authApiFunction.tracing = lambda.Tracing.ACTIVE;
    bookingsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'bookings');
    bookingsApiFunction.tracing = lambda.Tracing.ACTIVE;
    tenantsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'tenants');
    tenantsApiFunction.tracing = lambda.Tracing.ACTIVE;
    ownersApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'owners');
    ownersApiFunction.tracing = lambda.Tracing.ACTIVE;
    paymentsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'payments');
    paymentsApiFunction.tracing = lambda.Tracing.ACTIVE;
    reportsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'reports');
    reportsApiFunction.tracing = lambda.Tracing.ACTIVE;
    servicesApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'services');
    servicesApiFunction.tracing = lambda.Tracing.ACTIVE;
    membershipsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'memberships');
    membershipsApiFunction.tracing = lambda.Tracing.ACTIVE;
    staffApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'staff');
    staffApiFunction.tracing = lambda.Tracing.ACTIVE;
    runsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'runs');
    runsApiFunction.tracing = lambda.Tracing.ACTIVE;
    rolesApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'roles');
    rolesApiFunction.tracing = lambda.Tracing.ACTIVE;
    kennelsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'kennels');
    kennelsApiFunction.tracing = lambda.Tracing.ACTIVE;
    notesApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'notes');
    notesApiFunction.tracing = lambda.Tracing.ACTIVE;
    messagesApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'messages');
    messagesApiFunction.tracing = lambda.Tracing.ACTIVE;
    invoicesApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'invoices');
    invoicesApiFunction.tracing = lambda.Tracing.ACTIVE;
    packagesApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'packages');
    packagesApiFunction.tracing = lambda.Tracing.ACTIVE;
    adminApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'admin');
    adminApiFunction.tracing = lambda.Tracing.ACTIVE;
    billingApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'billing');
    billingApiFunction.tracing = lambda.Tracing.ACTIVE;
    communicationApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'communication');
    communicationApiFunction.tracing = lambda.Tracing.ACTIVE;
    facilityApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'facility');
    facilityApiFunction.tracing = lambda.Tracing.ACTIVE;
    accountDefaultsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'account-defaults');
    accountDefaultsApiFunction.tracing = lambda.Tracing.ACTIVE;
    userPermissionsApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'user-permissions');
    userPermissionsApiFunction.tracing = lambda.Tracing.ACTIVE;
    migrationApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'migration');
    migrationApiFunction.tracing = lambda.Tracing.ACTIVE;
    calendarApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'calendar');
    calendarApiFunction.tracing = lambda.Tracing.ACTIVE;
    dashboardApiFunction.addEnvironment('AWS_XRAY_TRACING_NAME', 'dashboard');
    dashboardApiFunction.tracing = lambda.Tracing.ACTIVE;

    // CloudWatch Alarms
    new cw.Alarm(this, 'Api5xxAlarm', {
      metric: new cw.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        statistic: 'sum',
        period: cdk.Duration.minutes(5),
        dimensionsMap: { ApiId: httpApi.apiId, Stage: '$default' },
      }),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'HTTP API 5XX errors > 5 in 5 minutes',
    });

    new cw.Alarm(this, 'BookingsErrorsAlarm', {
      metric: bookingsApiFunction.metricErrors({ period: cdk.Duration.minutes(5), statistic: 'sum' }),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'Bookings Lambda errors > 5 in 5 minutes',
    });

    new cw.Alarm(this, 'BookingsP95LatencyAlarm', {
      metric: bookingsApiFunction.metricDuration({ period: cdk.Duration.minutes(5), statistic: 'p95' }),
      threshold: 2000,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'Bookings Lambda p95 > 2s',
    });

    new cw.Alarm(this, 'RdsConnectionsHigh', {
      metric: dbInstance.metricDatabaseConnections({ period: cdk.Duration.minutes(5), statistic: 'avg' }),
      threshold: 80,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'RDS connections high (avg > 80)',
    });

    // Basic WAF for HTTP API: AWS managed rules + rate limit
    const webAcl = new wafv2.CfnWebACL(this, 'HttpApiWebAcl', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'httpApiWebAcl', sampledRequestsEnabled: true },
      name: `${id}-httpapi-waf`,
      rules: [
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 0,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesCommonRuleSet' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'common', sampledRequestsEnabled: true },
        },
        {
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesKnownBadInputsRuleSet' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'bad-inputs', sampledRequestsEnabled: true },
        },
        {
          name: 'RateLimit',
          priority: 2,
          action: { block: {} },
          statement: { rateBasedStatement: { limit: 2000, aggregateKeyType: 'IP' } },
          visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'rate', sampledRequestsEnabled: true },
        },
      ],
    });

    new wafv2.CfnWebACLAssociation(this, 'HttpApiWebAclAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/apis/${httpApi.apiId}/stages/$default`,
      webAclArn: webAcl.attrArn,
    });

    // Note: Check-in/Check-out are handled by bookings-api Lambda

    // Add JWT_SECRET to environment for auth
    const authEnvironment = { ...dbEnvironment, JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production' };

    // === NEW LAMBDA FUNCTIONS ===

    // Auth API
    const authApiFunction = new lambda.Function(this, 'AuthApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/auth-api')),
      layers: [dbLayer],
      environment: authEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const authIntegration = new HttpLambdaIntegration('AuthIntegration', authApiFunction);
    httpApi.addRoutes({ path: '/api/v1/auth/login', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/signup', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/refresh', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/logout', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/register', methods: [apigw.HttpMethod.POST], integration: authIntegration });

    // Bookings API
    const bookingsApiFunction = new lambda.Function(this, 'BookingsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/bookings-api')),
      layers: [dbLayer],
      environment: authEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const bookingsAlias = new lambda.Alias(this, 'BookingsLiveAlias', {
      aliasName: 'live',
      version: bookingsApiFunction.currentVersion,
    });
    // Canary: 10% for 5 minutes
    new codedeploy.LambdaDeploymentGroup(this, 'BookingsCanaryDeployment', {
      alias: bookingsAlias,
      deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
    });
    const bookingsIntegration = new HttpLambdaIntegration('BookingsIntegration', bookingsAlias);
    httpApi.addRoutes({ path: '/api/v1/bookings', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: bookingsIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: bookingsIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/status', methods: [apigw.HttpMethod.PATCH], integration: bookingsIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkin', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkout', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration /*, authorizer: httpAuthorizer*/ });

    // Tenants API
    const tenantsApiFunction = new lambda.Function(this, 'TenantsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/tenants-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const tenantsIntegration = new HttpLambdaIntegration('TenantsIntegration', tenantsApiFunction);
    // Public by slug
    httpApi.addRoutes({ path: '/api/v1/tenants', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration });
    // Authenticated current tenant endpoints (to enable authorizer later)
    httpApi.addRoutes({ path: '/api/v1/tenants/current', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/plan', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/onboarding', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PATCH], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration });
    httpApi.addRoutes({ path: '/api/v1/tenants/features', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration });

    // Owners API
    const ownersApiFunction = new lambda.Function(this, 'OwnersApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/owners-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const ownersIntegration = new HttpLambdaIntegration('OwnersIntegration', ownersApiFunction);
    httpApi.addRoutes({ path: '/api/v1/owners', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: ownersIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/owners/{ownerId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: ownersIntegration /*, authorizer: httpAuthorizer*/ });

    // Payments API
    const paymentsApiFunction = new lambda.Function(this, 'PaymentsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/payments-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const paymentsIntegration = new HttpLambdaIntegration('PaymentsIntegration', paymentsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/payments', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: paymentsIntegration });
    httpApi.addRoutes({ path: '/api/v1/payments/{paymentId}', methods: [apigw.HttpMethod.GET], integration: paymentsIntegration });

    // Reports API
    const reportsApiFunction = new lambda.Function(this, 'ReportsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/reports-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const reportsIntegration = new HttpLambdaIntegration('ReportsIntegration', reportsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/reports/dashboard', methods: [apigw.HttpMethod.GET], integration: reportsIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/reports/revenue', methods: [apigw.HttpMethod.GET], integration: reportsIntegration /*, authorizer: httpAuthorizer*/ });
    httpApi.addRoutes({ path: '/api/v1/reports/occupancy', methods: [apigw.HttpMethod.GET], integration: reportsIntegration /*, authorizer: httpAuthorizer*/ });

    // Kennels API
    const kennelsApiFunction = new lambda.Function(this, 'KennelsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/kennels-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const kennelsIntegration = new HttpLambdaIntegration('KennelsIntegration', kennelsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/kennels', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: kennelsIntegration });
    httpApi.addRoutes({ path: '/api/v1/kennels/{kennelId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: kennelsIntegration });

    // Staff API
    const staffApiFunction = new lambda.Function(this, 'StaffApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/staff-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const staffIntegration = new HttpLambdaIntegration('StaffIntegration', staffApiFunction);
    httpApi.addRoutes({ path: '/api/v1/staff', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: staffIntegration });
    httpApi.addRoutes({ path: '/api/v1/staff/{staffId}', methods: [apigw.HttpMethod.GET], integration: staffIntegration });

    // Dashboard API
    const dashboardApiFunction = new lambda.Function(this, 'DashboardApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/dashboard-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const dashboardIntegration = new HttpLambdaIntegration('DashboardIntegration', dashboardApiFunction);
    httpApi.addRoutes({ path: '/api/v1/dashboard/overview', methods: [apigw.HttpMethod.GET], integration: dashboardIntegration });

    // Calendar API
    const calendarApiFunction = new lambda.Function(this, 'CalendarApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/calendar-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const calendarIntegration = new HttpLambdaIntegration('CalendarIntegration', calendarApiFunction);
    httpApi.addRoutes({ path: '/api/v1/calendar', methods: [apigw.HttpMethod.GET], integration: calendarIntegration });

    // Incidents API
    const incidentsApiFunction = new lambda.Function(this, 'IncidentsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/incidents-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const incidentsIntegration = new HttpLambdaIntegration('IncidentsIntegration', incidentsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/incidents', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: incidentsIntegration });

    // Services API
    const servicesApiFunction = new lambda.Function(this, 'ServicesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/services-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });
    const servicesIntegration = new HttpLambdaIntegration('ServicesIntegration', servicesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/services', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: servicesIntegration });
    httpApi.addRoutes({ path: '/api/v1/services/{serviceId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: servicesIntegration });

    // Invites API
    const invitesApiFunction = new lambda.Function(this, 'InvitesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/invites-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const invitesIntegration = new HttpLambdaIntegration('InvitesIntegration', invitesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/invites', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: invitesIntegration });

    // Invoices API
    const invoicesApiFunction = new lambda.Function(this, 'InvoicesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/invoices-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const invoicesIntegration = new HttpLambdaIntegration('InvoicesIntegration', invoicesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/invoices', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: invoicesIntegration });

    // Packages API
    const packagesApiFunction = new lambda.Function(this, 'PackagesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/packages-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const packagesIntegration = new HttpLambdaIntegration('PackagesIntegration', packagesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/packages', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: packagesIntegration });

    // Tasks API
    const tasksApiFunction = new lambda.Function(this, 'TasksApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/tasks-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const tasksIntegration = new HttpLambdaIntegration('TasksIntegration', tasksApiFunction);
    httpApi.addRoutes({ path: '/api/v1/tasks', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: tasksIntegration });
    httpApi.addRoutes({ path: '/api/v1/tasks/{taskId}', methods: [apigw.HttpMethod.PATCH], integration: tasksIntegration });

    // Messages API
    const messagesApiFunction = new lambda.Function(this, 'MessagesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/messages-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const messagesIntegration = new HttpLambdaIntegration('MessagesIntegration', messagesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/messages', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: messagesIntegration });

    // Runs API
    const runsApiFunction = new lambda.Function(this, 'RunsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/runs-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const runsIntegration = new HttpLambdaIntegration('RunsIntegration', runsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/runs', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: runsIntegration });
    httpApi.addRoutes({ path: '/api/v1/runs/{runId}', methods: [apigw.HttpMethod.PUT], integration: runsIntegration });

    // Memberships API
    const membershipsApiFunction = new lambda.Function(this, 'MembershipsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/memberships-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const membershipsIntegration = new HttpLambdaIntegration('MembershipsIntegration', membershipsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/memberships', methods: [apigw.HttpMethod.GET], integration: membershipsIntegration });
    httpApi.addRoutes({ path: '/api/v1/memberships/{membershipId}', methods: [apigw.HttpMethod.PUT], integration: membershipsIntegration });

    // Admin API
    const adminApiFunction = new lambda.Function(this, 'AdminApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/admin-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const adminIntegration = new HttpLambdaIntegration('AdminIntegration', adminApiFunction);
    httpApi.addRoutes({ path: '/api/v1/admin/stats', methods: [apigw.HttpMethod.GET], integration: adminIntegration });

    // Billing API
    const billingApiFunction = new lambda.Function(this, 'BillingApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/billing-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const billingIntegration = new HttpLambdaIntegration('BillingIntegration', billingApiFunction);
    httpApi.addRoutes({ path: '/api/v1/billing/metrics', methods: [apigw.HttpMethod.GET], integration: billingIntegration });

    // Communication API
    const communicationApiFunction = new lambda.Function(this, 'CommunicationApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/communication-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const communicationIntegration = new HttpLambdaIntegration('CommunicationIntegration', communicationApiFunction);
    httpApi.addRoutes({ path: '/api/v1/communications', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: communicationIntegration });

    // Notes API
    const notesApiFunction = new lambda.Function(this, 'NotesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/notes-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const notesIntegration = new HttpLambdaIntegration('NotesIntegration', notesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/notes', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: notesIntegration });

    // Roles API
    const rolesApiFunction = new lambda.Function(this, 'RolesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/roles-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const rolesIntegration = new HttpLambdaIntegration('RolesIntegration', rolesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/roles', methods: [apigw.HttpMethod.GET], integration: rolesIntegration });

    // Facility API
    const facilityApiFunction = new lambda.Function(this, 'FacilityApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/facility-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const facilityIntegration = new HttpLambdaIntegration('FacilityIntegration', facilityApiFunction);
    httpApi.addRoutes({ path: '/api/v1/facility', methods: [apigw.HttpMethod.GET], integration: facilityIntegration /*, authorizer: httpAuthorizer*/ });

    // Account Defaults API
    const accountDefaultsApiFunction = new lambda.Function(this, 'AccountDefaultsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/account-defaults-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const accountDefaultsIntegration = new HttpLambdaIntegration('AccountDefaultsIntegration', accountDefaultsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/account-defaults', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT], integration: accountDefaultsIntegration /*, authorizer: httpAuthorizer*/ });

    // User Permissions API
    const userPermissionsApiFunction = new lambda.Function(this, 'UserPermissionsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/user-permissions-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const userPermissionsIntegration = new HttpLambdaIntegration('UserPermissionsIntegration', userPermissionsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/user-permissions', methods: [apigw.HttpMethod.GET], integration: userPermissionsIntegration /*, authorizer: httpAuthorizer*/ });

    // Migration API (for running database migrations)
    const migrationApiFunction = new lambda.Function(this, 'MigrationApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/migration-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(60), // Longer timeout for migrations
    });
    const migrationIntegration = new HttpLambdaIntegration('MigrationIntegration', migrationApiFunction);
    httpApi.addRoutes({ path: '/api/v1/migration', methods: [apigw.HttpMethod.POST], integration: migrationIntegration });

    // === WEBSOCKET API FOR REAL-TIME ===

    // WebSocket Connect Handler
    const wsConnectFunction = new lambda.Function(this, 'WebSocketConnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-connect')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });

    // WebSocket Disconnect Handler
    const wsDisconnectFunction = new lambda.Function(this, 'WebSocketDisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-disconnect')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });

    // WebSocket Message Handler
    const wsMessageFunction = new lambda.Function(this, 'WebSocketMessageFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-message')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });

    // WebSocket Broadcast Function (invoked by other Lambdas)
    const wsBroadcastFunction = new lambda.Function(this, 'WebSocketBroadcastFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-broadcast')),
      layers: [dbLayer],
      environment: dbEnvironment,
      vpc: vpc,
      securityGroups: [lambdaSG],
      timeout: cdk.Duration.seconds(30),
    });

    // Create WebSocket API
    const webSocketApi = new apigw.WebSocketApi(this, 'BarkbaseWebSocketApi', {
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration('ConnectIntegration', wsConnectFunction),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration('DisconnectIntegration', wsDisconnectFunction),
      },
      defaultRouteOptions: {
        integration: new WebSocketLambdaIntegration('DefaultIntegration', wsMessageFunction),
      },
    });

    const webSocketStage = new apigw.WebSocketStage(this, 'BarkbaseWebSocketStage', {
      webSocketApi,
      stageName: 'production',
      autoDeploy: true,
    });

    // Grant WebSocket management permissions
    const wsManagementPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`
      ],
    });

    wsMessageFunction.addToRolePolicy(wsManagementPolicy);
    wsBroadcastFunction.addToRolePolicy(wsManagementPolicy);

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.url!,
      description: "The URL of the API Gateway",
    });

    new cdk.CfnOutput(this, "WebSocketUrl", {
      value: webSocketStage.url,
      description: "WebSocket URL for real-time connections",
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });
  }
}
