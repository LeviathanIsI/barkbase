import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration, WebSocketLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cw from "aws-cdk-lib/aws-cloudwatch";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as sns from "aws-cdk-lib/aws-sns";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
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
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.of('14', '14.10') }),
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

    // Shared environment variables
    // Using direct connection to public RDS instance (not proxy)
    const dbEnvironment = {
      DB_HOST: "barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com",
      DB_PORT: "5432",
      DB_NAME: dbName,
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
      // No VPC - connects to public database
      
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(usersApiFunction);

    // === Cognito Pre-SignUp Trigger (auto-confirm for dev) ===
    const preSignUpFunction = new lambda.Function(this, "CognitoPreSignUpFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/cognito-pre-signup")
      ),
      timeout: cdk.Duration.seconds(10),
    });

    // === Cognito Post-Confirmation Trigger ===
    const postConfirmationFunction = new lambda.Function(this, "CognitoPostConfirmationFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/cognito-post-confirmation")
      ),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });

    dbSecret.grantRead(postConfirmationFunction);

    // === Authentication (Cognito) ===
    const userPool = new cognito.UserPool(this, "BarkbaseUserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true }, // Auto-verify email addresses
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
      lambdaTriggers: {
        preSignUp: preSignUpFunction,
        postConfirmation: postConfirmationFunction,
      },
    });

    // Hosted UI domain for Cognito (unique per stack)
    const domainPrefix = `barkbase-${this.node.addr.slice(0, 8).toLowerCase()}`;
    new cognito.UserPoolDomain(this, 'BarkbaseUserPoolDomain', {
      userPool,
      cognitoDomain: { domainPrefix },
    });

    const userPoolClient = new cognito.UserPoolClient(this, "BarkbaseUserPoolClient", {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        // Local dev callback/logout; CloudFront can be added later if needed
        callbackUrls: [
          'http://localhost:5173',
        ],
        logoutUrls: [
          'http://localhost:5173',
        ],
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
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: "/api/v1/users/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: usersIntegration,
      authorizer: httpAuthorizer,
    });

    // Pets API
    const petsApiFunction = new lambda.Function(this, "PetsApiFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/pets-api")
      ),
      layers: [dbLayer],
      environment: {
        ...dbEnvironment,
        FORCE_REFRESH: "v2", // Force Lambda refresh after IAM policy update
      },
      // No VPC - connects to public database
      
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(petsApiFunction);
    const petsIntegration = new HttpLambdaIntegration(
      "PetsIntegration",
      petsApiFunction
    );
    httpApi.addRoutes({
      path: "/api/v1/pets",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: petsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/{id}",
      methods: [
        apigw.HttpMethod.GET,
        apigw.HttpMethod.PUT,
        apigw.HttpMethod.DELETE,
      ],
      integration: petsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/{id}/vaccinations",
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
      integration: petsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/{id}/vaccinations/{vaccinationId}",
      methods: [apigw.HttpMethod.PUT],
      integration: petsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: "/api/v1/pets/vaccinations/expiring",
      methods: [apigw.HttpMethod.GET],
      integration: petsIntegration,
      authorizer: httpAuthorizer,
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
      authorizer: httpAuthorizer,
    });

    // --- S3 Download URL Generator ---
    const getDownloadUrlFunction = new lambda.Function(this, 'GetDownloadUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/get-download-url')),
      environment: s3Environment,
      
    });
    bucket.grantRead(getDownloadUrlFunction);
    const getDownloadUrlIntegration = new HttpLambdaIntegration('GetDownloadUrlIntegration', getDownloadUrlFunction);
    httpApi.addRoutes({
      path: '/api/v1/download-url',
      methods: [apigw.HttpMethod.GET],
      integration: getDownloadUrlIntegration,
      authorizer: httpAuthorizer,
    });

    // === Phase 5: Frontend hosting (S3 + CloudFront) ===
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });
    const siteOai = new cloudfront.OriginAccessIdentity(this, 'SiteOAI');
    siteBucket.grantRead(siteOai);

    const webAclArn = this.node.tryGetContext('webAclArn');
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultRootObject: 'index.html',
      webAclId: webAclArn,
      defaultBehavior: {
        origin: new origins.S3Origin(siteBucket, { originAccessIdentity: siteOai }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(`${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`, {
            originPath: '/$default',
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.minutes(5) },
      ],
    });

    // Note: CloudFront WebACL (scope=CLOUDFRONT) must be deployed in us-east-1 in a separate stack

    new cdk.CfnOutput(this, 'SiteBucketName', { value: siteBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', { value: distribution.domainName });
    new cdk.CfnOutput(this, 'CognitoDomain', { value: `https://${domainPrefix}.auth.${this.region}.amazoncognito.com` });

    // === Observability (Phase 4) ===
    // Optional: Access logs for HTTP API default stage can be configured via console or separate stack to avoid conflicts

    // === CloudWatch Dashboard (API p95/5xx, Lambda errors, RDS connections) ===
    const dashboard = new cw.Dashboard(this, 'BarkbaseDashboard', {
      dashboardName: `${id}-dashboard`,
    });
    const api5xx = new cw.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5xx',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
      dimensionsMap: { ApiId: (httpApi as any).apiId, Stage: '$default' },
    });

    // Lambda X-Ray tracing (constructor-level only where needed; remove property assignments to avoid compile errors)

    // CloudWatch Alarms
    const alarmTopic = new sns.Topic(this, 'OpsAlarmTopic');
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
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    // Create alarms after function is defined; placeholder simple metric until then
    new cw.Alarm(this, 'BookingsErrorsAlarm', {
      metric: new cw.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        period: cdk.Duration.minutes(5),
        statistic: 'sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'Bookings Lambda errors > 5 in 5 minutes',
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    new cw.Alarm(this, 'BookingsP95LatencyAlarm', {
      metric: new cw.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        period: cdk.Duration.minutes(5),
        statistic: 'p95',
      }),
      threshold: 2000,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'Bookings Lambda p95 > 2s',
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    new cw.Alarm(this, 'RdsConnectionsHigh', {
      metric: dbInstance.metricDatabaseConnections({ period: cdk.Duration.minutes(5), statistic: 'avg' }),
      threshold: 80,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      alarmDescription: 'RDS connections high (avg > 80)',
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    // Remove WAF association with HTTP API (not supported). Protect API via CloudFront instead.

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
      // No VPC - connects to public database
      
      timeout: cdk.Duration.seconds(30),
    });
    // Allow auth function to read database credentials from Secrets Manager
    dbSecret.grantRead(authApiFunction);
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
      // No VPC - connects to public database
      
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(bookingsApiFunction);
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
    httpApi.addRoutes({ path: '/api/v1/bookings', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: bookingsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: bookingsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/status', methods: [apigw.HttpMethod.PATCH], integration: bookingsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkin', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkout', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration, authorizer: httpAuthorizer });

    // Add dashboard widgets now that bookings function exists
    const bookingsErrors = new cw.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
      dimensionsMap: { FunctionName: bookingsApiFunction.functionName },
    });
    const bookingsP95 = new cw.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
      statistic: 'p95',
      period: cdk.Duration.minutes(5),
      dimensionsMap: { FunctionName: bookingsApiFunction.functionName },
    });
    const rdsConnections = new cw.Metric({
      namespace: 'AWS/RDS',
      metricName: 'DatabaseConnections',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      dimensionsMap: { DBInstanceIdentifier: dbInstance.instanceIdentifier },
    });
    dashboard.addWidgets(
      new cw.GraphWidget({ title: 'API 5XX (sum)', left: [api5xx] }),
      new cw.GraphWidget({ title: 'Bookings Errors (sum)', left: [bookingsErrors] }),
      new cw.GraphWidget({ title: 'Bookings p95 (ms)', left: [bookingsP95] }),
      new cw.GraphWidget({ title: 'RDS Connections (avg)', left: [rdsConnections] }),
    );

    // Tenants API
    const tenantsApiFunction = new lambda.Function(this, 'TenantsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/tenants-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(tenantsApiFunction);
    const tenantsIntegration = new HttpLambdaIntegration('TenantsIntegration', tenantsApiFunction);
    // Public by slug
    httpApi.addRoutes({ path: '/api/v1/tenants', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration });
    // Authenticated current tenant endpoints (to enable authorizer later)
    httpApi.addRoutes({ path: '/api/v1/tenants/current', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/plan', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/onboarding', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PATCH], integration: tenantsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/tenants/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/tenants/current/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/tenants/features', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration, authorizer: httpAuthorizer });

    // Owners API
    const ownersApiFunction = new lambda.Function(this, 'OwnersApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/owners-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(ownersApiFunction);
    const ownersIntegration = new HttpLambdaIntegration('OwnersIntegration', ownersApiFunction);
    httpApi.addRoutes({ path: '/api/v1/owners', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: ownersIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/owners/{ownerId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: ownersIntegration, authorizer: httpAuthorizer });

    // Payments API
    const paymentsApiFunction = new lambda.Function(this, 'PaymentsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/payments-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
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
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    const reportsIntegration = new HttpLambdaIntegration('ReportsIntegration', reportsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/reports/dashboard', methods: [apigw.HttpMethod.GET], integration: reportsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/reports/revenue', methods: [apigw.HttpMethod.GET], integration: reportsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/reports/occupancy', methods: [apigw.HttpMethod.GET], integration: reportsIntegration, authorizer: httpAuthorizer });

    // Kennels API
    const kennelsApiFunction = new lambda.Function(this, 'KennelsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/kennels-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(kennelsApiFunction);
    const kennelsIntegration = new HttpLambdaIntegration('KennelsIntegration', kennelsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/kennels', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: kennelsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/kennels/occupancy', methods: [apigw.HttpMethod.GET], integration: kennelsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/kennels/{kennelId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: kennelsIntegration, authorizer: httpAuthorizer });

    // Staff API
    const staffApiFunction = new lambda.Function(this, 'StaffApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/staff-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(staffApiFunction);
    const staffIntegration = new HttpLambdaIntegration('StaffIntegration', staffApiFunction);
    httpApi.addRoutes({ path: '/api/v1/staff', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: staffIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/staff/{staffId}', methods: [apigw.HttpMethod.GET], integration: staffIntegration, authorizer: httpAuthorizer });

    // Dashboard API
    const dashboardApiFunction = new lambda.Function(this, 'DashboardApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/dashboard-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(dashboardApiFunction);
    const dashboardIntegration = new HttpLambdaIntegration('DashboardIntegration', dashboardApiFunction);
    httpApi.addRoutes({ path: '/api/v1/dashboard/overview', methods: [apigw.HttpMethod.GET], integration: dashboardIntegration, authorizer: httpAuthorizer });

    // Schedule API
    const scheduleApiFunction = new lambda.Function(this, 'ScheduleApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/schedule-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(scheduleApiFunction);
    const scheduleIntegration = new HttpLambdaIntegration('ScheduleIntegration', scheduleApiFunction);
    httpApi.addRoutes({ path: '/api/v1/schedule', methods: [apigw.HttpMethod.GET], integration: scheduleIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/schedule/capacity', methods: [apigw.HttpMethod.GET], integration: scheduleIntegration, authorizer: httpAuthorizer });

    // Incidents API
    const incidentsApiFunction = new lambda.Function(this, 'IncidentsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/incidents-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    dbSecret.grantRead(tasksApiFunction);
    const tasksIntegration = new HttpLambdaIntegration('TasksIntegration', tasksApiFunction);
    httpApi.addRoutes({ path: '/api/v1/tasks', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: tasksIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/tasks/{taskId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: tasksIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/tasks/{taskId}/complete', methods: [apigw.HttpMethod.POST], integration: tasksIntegration, authorizer: httpAuthorizer });

    // Messages API
    const messagesApiFunction = new lambda.Function(this, 'MessagesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/messages-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
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
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    dbSecret.grantRead(runsApiFunction);
    const runsIntegration = new HttpLambdaIntegration('RunsIntegration', runsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/runs', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: runsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/runs/{runId}', methods: [apigw.HttpMethod.PUT], integration: runsIntegration, authorizer: httpAuthorizer });

    // Memberships API
    const membershipsApiFunction = new lambda.Function(this, 'MembershipsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/memberships-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
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
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const facilityIntegration = new HttpLambdaIntegration('FacilityIntegration', facilityApiFunction);
    httpApi.addRoutes({ path: '/api/v1/facility', methods: [apigw.HttpMethod.GET], integration: facilityIntegration, authorizer: httpAuthorizer });

    // Account Defaults API
    const accountDefaultsApiFunction = new lambda.Function(this, 'AccountDefaultsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/account-defaults-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const accountDefaultsIntegration = new HttpLambdaIntegration('AccountDefaultsIntegration', accountDefaultsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/account-defaults', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT], integration: accountDefaultsIntegration, authorizer: httpAuthorizer });

    // User Permissions API
    const userPermissionsApiFunction = new lambda.Function(this, 'UserPermissionsApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/user-permissions-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
      allowPublicSubnet: true,
    });
    const userPermissionsIntegration = new HttpLambdaIntegration('UserPermissionsIntegration', userPermissionsApiFunction);
    httpApi.addRoutes({ path: '/api/v1/user-permissions', methods: [apigw.HttpMethod.GET], integration: userPermissionsIntegration, authorizer: httpAuthorizer });

    // Migration API (for running database migrations)
    const migrationApiFunction = new lambda.Function(this, 'MigrationApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/migration-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
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
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(wsConnectFunction);

    // WebSocket Disconnect Handler
    const wsDisconnectFunction = new lambda.Function(this, 'WebSocketDisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-disconnect')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(wsDisconnectFunction);

    // WebSocket Message Handler
    const wsMessageFunction = new lambda.Function(this, 'WebSocketMessageFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-message')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(wsMessageFunction);

    // WebSocket Broadcast Function (invoked by other Lambdas)
    const wsBroadcastFunction = new lambda.Function(this, 'WebSocketBroadcastFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/websocket-broadcast')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(wsBroadcastFunction);

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

