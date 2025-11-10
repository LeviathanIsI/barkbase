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
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
// import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as codedeploy from "aws-cdk-lib/aws-codedeploy";
import * as rds from "aws-cdk-lib/aws-rds";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Construct } from "constructs";
import * as path from "path";
// Custom integration that prevents per-route Lambda permissions
class LambdaIntegrationNoPermission extends HttpLambdaIntegration {
  private readonly lambdaFn: lambda.IFunction;

  constructor(id: string, handler: lambda.IFunction) {
    super(id, handler);
    this.lambdaFn = handler;
  }

  // Override bind to prevent automatic permission creation
  public bind(options: apigw.HttpRouteIntegrationBindOptions): apigw.HttpRouteIntegrationConfig {
    // Return integration config WITHOUT calling super.bind() or grantInvoke()
    return {
      type: apigw.HttpIntegrationType.AWS_PROXY,
      uri: this.lambdaFn.functionArn,
      payloadFormatVersion: apigw.PayloadFormatVersion.VERSION_2_0,
    };
  }
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===================================================================
    // ENVIRONMENT CONFIGURATION
    // ===================================================================
    // Deployment stage (dev, staging, prod)
    const stage = process.env.STAGE || process.env.ENVIRONMENT || 'dev';

    // Feature flags for cost optimization
    const enableVpcEndpoints = process.env.ENABLE_VPC_ENDPOINTS === 'true';
    const enableRdsProxy = process.env.ENABLE_RDS_PROXY === 'true';
    const deployLambdasInVpc = process.env.DEPLOY_LAMBDAS_IN_VPC === 'true';

    // Environment-specific configuration
    const config = {
      dev: {
        logRetentionDays: logs.RetentionDays.ONE_MONTH, // 30 days
        backupRetentionDays: 7,
        rdsInstanceSize: ec2.InstanceSize.MICRO,
        rdsMultiAz: false,
        rdsAllocatedStorage: 20,
        enablePerformanceInsights: false,
      },
      staging: {
        logRetentionDays: logs.RetentionDays.THREE_MONTHS, // 90 days
        backupRetentionDays: 14,
        rdsInstanceSize: ec2.InstanceSize.SMALL,
        rdsMultiAz: false,
        rdsAllocatedStorage: 50,
        enablePerformanceInsights: false,
      },
      prod: {
        logRetentionDays: logs.RetentionDays.THREE_MONTHS, // 90 days
        backupRetentionDays: 30,
        rdsInstanceSize: ec2.InstanceSize.SMALL,
        rdsMultiAz: true,
        rdsAllocatedStorage: 100,
        enablePerformanceInsights: true,
      },
    };

    const envConfig = config[stage as keyof typeof config] || config.dev;

    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║ BARKBASE INFRASTRUCTURE DEPLOYMENT                                ║
╠═══════════════════════════════════════════════════════════════════╣
║ Stage:                ${stage.padEnd(45)}║
║ VPC Endpoints:        ${(enableVpcEndpoints ? 'ENABLED' : 'DISABLED').padEnd(45)}║
║ RDS Proxy:            ${(enableRdsProxy ? 'ENABLED' : 'DISABLED').padEnd(45)}║
║ Lambdas in VPC:       ${(deployLambdasInVpc ? 'YES' : 'NO').padEnd(45)}║
║ Log Retention:        ${envConfig.logRetentionDays + ' days'.padEnd(45)}║
║ Backup Retention:     ${envConfig.backupRetentionDays + ' days'.padEnd(45)}║
║ RDS Instance:         t4g.${envConfig.rdsInstanceSize.padEnd(39)}║
║ Multi-AZ:             ${(envConfig.rdsMultiAz ? 'YES' : 'NO').padEnd(45)}║
╚═══════════════════════════════════════════════════════════════════╝
    `);

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

    // COST OPTIMIZATION: VPC Endpoints (only if Lambda functions are deployed in VPC)
    // Cost: ~$14.40/month for interface endpoints
    // Enable by setting ENABLE_VPC_ENDPOINTS=true environment variable
    if (enableVpcEndpoints) {
      console.log('✓ Creating VPC Endpoints (Cost: ~$14.40/month)');
      vpc.addGatewayEndpoint("S3Endpoint", { service: ec2.GatewayVpcEndpointAwsService.S3 });
      vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        securityGroups: [lambdaSG]
      });
      vpc.addInterfaceEndpoint("CloudWatchLogsEndpoint", {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        securityGroups: [lambdaSG]
      });
    } else {
      console.log('✗ VPC Endpoints disabled (Saving: ~$14.40/month)');
      console.log('  Note: Lambda functions must NOT be deployed in VPC or have NAT Gateway');
    }

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
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, envConfig.rdsInstanceSize),
      multiAz: envConfig.rdsMultiAz,
      allocatedStorage: envConfig.rdsAllocatedStorage,
      storageEncrypted: true,
      storageType: rds.StorageType.GP3,
      publiclyAccessible: false,
      credentials: rds.Credentials.fromSecret(dbSecret),
      databaseName: dbName,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,

      // AUTOMATED BACKUPS - Critical for production operations
      backupRetention: cdk.Duration.days(envConfig.backupRetentionDays),
      preferredBackupWindow: '03:00-04:00', // 3-4 AM UTC (low usage hours)
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00', // Sunday 4-5 AM UTC

      // MONITORING AND PERFORMANCE
      enablePerformanceInsights: envConfig.enablePerformanceInsights,
      performanceInsightRetention: envConfig.enablePerformanceInsights
        ? rds.PerformanceInsightRetention.DEFAULT // 7 days
        : undefined,
      monitoringInterval: stage === 'prod' ? cdk.Duration.seconds(60) : undefined,
      cloudwatchLogsExports: ['postgresql'], // Export PostgreSQL logs to CloudWatch

      // DELETION PROTECTION (production only)
      deletionProtection: stage === 'prod',
    });

    console.log(`✓ RDS Instance configured:
      - Instance: t4g.${envConfig.rdsInstanceSize}
      - Storage: ${envConfig.rdsAllocatedStorage}GB GP3
      - Multi-AZ: ${envConfig.rdsMultiAz}
      - Backup Retention: ${envConfig.backupRetentionDays} days
      - Performance Insights: ${envConfig.enablePerformanceInsights}
      - Deletion Protection: ${stage === 'prod'}
    `);

    // COST OPTIMIZATION: RDS Proxy (optional - $10/month per proxy)
    // Provides connection pooling and IAM authentication
    // Enable by setting ENABLE_RDS_PROXY=true environment variable
    let dbEndpoint: string;
    let dbPort: string;

    if (enableRdsProxy) {
      console.log('✓ Creating RDS Proxy (Cost: ~$10/month)');
      const dbProxy = dbInstance.addProxy("PostgresProxy", {
        secrets: [dbSecret],
        vpc,
        securityGroups: [dbSG],
        requireTLS: true,
        iamAuth: false,
        borrowTimeout: cdk.Duration.seconds(120),
        maxConnectionsPercent: 90,
      });
      dbEndpoint = dbProxy.endpoint;
      dbPort = '5432';
      console.log('  Using RDS Proxy endpoint for database connections');
    } else {
      console.log('✗ RDS Proxy disabled (Saving: ~$10/month)');
      dbEndpoint = dbInstance.dbInstanceEndpointAddress;
      dbPort = dbInstance.dbInstanceEndpointPort;
      console.log('  Using direct RDS instance endpoint');
    }

    // INFRASTRUCTURE FIX: Database connection configuration
    // Now uses the actual RDS instance/proxy endpoint created in this stack
    // instead of hardcoded external database
    const dbEnvironment = {
      DB_HOST: dbEndpoint,
      DB_PORT: dbPort,
      DB_NAME: dbName,
      DB_SECRET_ID: dbSecret.secretArn,
      STAGE: stage, // For application logic (e.g., CORS origins)
    };

    console.log(`✓ Database connection configured:
      - Endpoint: ${dbEndpoint}
      - Port: ${dbPort}
      - Database: ${dbName}
    `);

    // ===================================================================
    // LAMBDA FUNCTION HELPER
    // ===================================================================
    // Standardizes Lambda creation with proper log retention, VPC config,
    // environment variables, and monitoring
    interface CreateLambdaProps {
      id: string;
      handler: string;
      codePath: string;
      environment?: { [key: string]: string };
      layers?: lambda.LayerVersion[];
      timeout?: cdk.Duration;
      memorySize?: number;
      description?: string;
    }

    const createLambdaFunction = (props: CreateLambdaProps): lambda.Function => {
      const lambdaFunction = new lambda.Function(this, props.id, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: props.handler,
        code: lambda.Code.fromAsset(props.codePath),
        environment: props.environment || {},
        layers: props.layers || [],
        timeout: props.timeout || cdk.Duration.seconds(30),
        memorySize: props.memorySize || 1024,
        description: props.description,

        // LOG RETENTION: Automatically configure based on environment
        logRetention: envConfig.logRetentionDays,

        // VPC CONFIGURATION: Conditional based on deployment strategy
        ...(deployLambdasInVpc ? {
          vpc,
          vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
          securityGroups: [lambdaSG],
        } : {}),
      });

      return lambdaFunction;
    };

    console.log(`✓ Lambda configuration:
      - Log Retention: ${envConfig.logRetentionDays} days
      - VPC Deployment: ${deployLambdasInVpc ? 'YES' : 'NO'}
      - Default Timeout: 30 seconds
      - Default Memory: 1024 MB
    `);

    // Database Layer
    const dbLayer = new lambda.LayerVersion(this, "DbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Provides a shared database connection pool",
    });

    // Authentication Layer
    const authLayer = new lambda.LayerVersion(this, "AuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Provides JWT validation and authentication utilities",
    });

    // ===================================================================
    // LAMBDA FUNCTIONS
    // ===================================================================

    // Users API
    const usersApiFunction = createLambdaFunction({
      id: "UsersApiFunction",
      handler: "index.handler",
      codePath: path.join(__dirname, "../../lambdas/users-api"),
      environment: dbEnvironment,
      layers: [dbLayer],
      description: "User management API with tenant isolation",
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
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    // SECURITY: HTTP API Gateway with rate limiting
    const httpApi = new apigw.HttpApi(this, "BarkbaseApi", {
      corsPreflight: {
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
          "x-tenant-id",
        ],
        allowMethods: [
          apigw.CorsHttpMethod.OPTIONS,
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PUT,
          apigw.CorsHttpMethod.PATCH,
          apigw.CorsHttpMethod.DELETE,
        ],
        allowOrigins: allowedOrigins,
        allowCredentials: false,
      },
      // SECURITY: Default throttle settings for all routes
      // Prevents brute-force attacks and API abuse
      defaultDomainMapping: {
        domainName: undefined // Custom domain setup optional
      }
    });

    // SECURITY: Add default stage with throttling
    // Note: HTTP API has different throttling than REST API
    // Rate limiting is per-route and must be configured via CfnStage
    const defaultStage = httpApi.defaultStage?.node.defaultChild as apigw.CfnStage;
    if (defaultStage) {
      defaultStage.defaultRouteSettings = {
        throttlingBurstLimit: 200,  // Max concurrent requests
        throttlingRateLimit: 100,   // Requests per second (sustained)
      };

      // SECURITY: Specific throttle limits for sensitive endpoints
      defaultStage.routeSettings = {
        // Auth endpoints - stricter limits to prevent brute-force
        'POST /api/v1/auth/login': {
          throttlingBurstLimit: 50,
          throttlingRateLimit: 10,
        },
        'POST /api/v1/auth/signup': {
          throttlingBurstLimit: 50,
          throttlingRateLimit: 10,
        },
        'POST /api/v1/auth/register': {
          throttlingBurstLimit: 50,
          throttlingRateLimit: 10,
        },
        // File uploads - lower limits due to size
        'POST /api/v1/upload-url': {
          throttlingBurstLimit: 10,
          throttlingRateLimit: 5,
        },
      };
    }

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

    // Pets API - REPLACED BY EntityServiceFunction
    // const petsApiFunction = new lambda.Function(this, "PetsApiFunction", {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: "index.handler",
    //   code: lambda.Code.fromAsset(
    //     path.join(__dirname, "../../lambdas/pets-api")
    //   ),
    //   layers: [dbLayer, authLayer],
    //   environment: {
    //     ...dbEnvironment,
    //     USER_POOL_ID: userPool.userPoolId,
    //     CLIENT_ID: userPoolClient.userPoolClientId,
    //     FORCE_REFRESH: "v2",
    //   },
    //   timeout: cdk.Duration.seconds(30),
    // });
    // dbSecret.grantRead(petsApiFunction);

    // const petsIntegration = new HttpLambdaIntegration(
    //   "PetsIntegration",
    //   petsApiFunction
    // );
    // httpApi.addRoutes({
    //   path: "/api/v1/pets",
    //   methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
    //   integration: petsIntegration,
    //   authorizer: httpAuthorizer,
    // });
    // httpApi.addRoutes({
    //   path: "/api/v1/pets/{id}",
    //   methods: [
    //     apigw.HttpMethod.GET,
    //     apigw.HttpMethod.PUT,
    //     apigw.HttpMethod.DELETE,
    //   ],
    //   integration: petsIntegration,
    //   authorizer: httpAuthorizer,
    // });
    // httpApi.addRoutes({
    //   path: "/api/v1/pets/{id}/vaccinations",
    //   methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST],
    //   integration: petsIntegration,
    //   authorizer: httpAuthorizer,
    // });
    // httpApi.addRoutes({
    //   path: "/api/v1/pets/{id}/vaccinations/{vaccinationId}",
    //   methods: [apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE],
    //   integration: petsIntegration,
    //   authorizer: httpAuthorizer,
    // });
    // httpApi.addRoutes({
    //   path: "/api/v1/pets/vaccinations/expiring",
    //   methods: [apigw.HttpMethod.GET],
    //   integration: petsIntegration,
    //   authorizer: httpAuthorizer,
    // });

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

    // === SECURITY MONITORING ===
    // SNS Topic for security alerts
    const securityAlertTopic = new sns.Topic(this, 'SecurityAlertTopic', {
      displayName: 'BarkBase Security Alerts',
      topicName: `barkbase-security-alerts-${stage}`,
    });

    // Subscribe email if MONITORING_EMAIL is provided
    const monitoringEmail = process.env.MONITORING_EMAIL;
    if (monitoringEmail) {
      securityAlertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(monitoringEmail)
      );
    }

    // SECURITY ALARM: Failed Login Attempts
    // Triggers when >10 failed logins per minute detected
    const failedLoginMetric = new cloudwatch.Metric({
      namespace: 'BarkBase/Security',
      metricName: 'FailedLoginAttempts',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    new cloudwatch.Alarm(this, 'FailedLoginAlarm', {
      alarmName: `barkbase-failed-logins-${stage}`,
      alarmDescription: 'Alert on suspicious number of failed login attempts (potential brute-force attack)',
      metric: failedLoginMetric,
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatchActions.SnsAction(securityAlertTopic));

    // SECURITY ALARM: Authorization Failures (403s)
    // Triggers when >50 authorization failures per minute
    const authFailureMetric = new cloudwatch.Metric({
      namespace: 'BarkBase/Security',
      metricName: 'AuthorizationFailures',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    new cloudwatch.Alarm(this, 'AuthorizationFailureAlarm', {
      alarmName: `barkbase-auth-failures-${stage}`,
      alarmDescription: 'Alert on excessive authorization failures (potential privilege escalation attempts)',
      metric: authFailureMetric,
      threshold: 50,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatchActions.SnsAction(securityAlertTopic));

    // SECURITY ALARM: Input Validation Failures
    // Triggers when >20 validation failures per minute (potential attack attempts)
    const validationFailureMetric = new cloudwatch.Metric({
      namespace: 'BarkBase/Security',
      metricName: 'InputValidationFailures',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    new cloudwatch.Alarm(this, 'ValidationFailureAlarm', {
      alarmName: `barkbase-validation-failures-${stage}`,
      alarmDescription: 'Alert on excessive input validation failures (potential injection attacks)',
      metric: validationFailureMetric,
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatchActions.SnsAction(securityAlertTopic));

    // SECURITY ALARM: Database Connection Errors
    // Triggers on database connectivity issues
    const dbErrorMetric = new cloudwatch.Metric({
      namespace: 'BarkBase/Security',
      metricName: 'DatabaseConnectionErrors',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, 'DatabaseErrorAlarm', {
      alarmName: `barkbase-database-errors-${stage}`,
      alarmDescription: 'Alert on database connection errors (potential infrastructure issue or attack)',
      metric: dbErrorMetric,
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatchActions.SnsAction(securityAlertTopic));

    // Lambda Error Rate Alarms (for each critical Lambda)
    [authApiFunction].forEach((lambdaFn, index) => {
      const errorAlarm = new cloudwatch.Alarm(this, `Lambda${index}ErrorAlarm`, {
        alarmName: `barkbase-lambda-errors-${lambdaFn.functionName}-${stage}`,
        alarmDescription: `Alert on errors in ${lambdaFn.functionName}`,
        metric: lambdaFn.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(securityAlertTopic));
    });

    // ===================================================================
    // OPERATIONAL MONITORING & DASHBOARDS
    // ===================================================================
    // SNS Topic for operational alerts (non-security)
    const operationalAlertTopic = new sns.Topic(this, 'OperationalAlertTopic', {
      displayName: 'BarkBase Operational Alerts',
      topicName: `barkbase-ops-alerts-${stage}`,
    });

    if (monitoringEmail) {
      operationalAlertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(monitoringEmail)
      );
    }

    // RDS MONITORING: CPU Utilization
    new cloudwatch.Alarm(this, 'RdsCpuAlarm', {
      alarmName: `barkbase-rds-cpu-${stage}`,
      alarmDescription: 'Alert when RDS CPU exceeds 80%',
      metric: dbInstance.metricCPUUtilization({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    }).addAlarmAction(new cloudwatchActions.SnsAction(operationalAlertTopic));

    // RDS MONITORING: Database Connections
    new cloudwatch.Alarm(this, 'RdsConnectionsAlarm', {
      alarmName: `barkbase-rds-connections-${stage}`,
      alarmDescription: 'Alert when database connections are high',
      metric: dbInstance.metricDatabaseConnections({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80, // Alert at 80 connections (max is typically 100 for t4g.micro)
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    }).addAlarmAction(new cloudwatchActions.SnsAction(operationalAlertTopic));

    // RDS MONITORING: Free Storage Space
    new cloudwatch.Alarm(this, 'RdsStorageAlarm', {
      alarmName: `barkbase-rds-storage-${stage}`,
      alarmDescription: 'Alert when RDS free storage is low',
      metric: dbInstance.metricFreeStorageSpace({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 2 * 1024 * 1024 * 1024, // 2 GB in bytes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    }).addAlarmAction(new cloudwatchActions.SnsAction(operationalAlertTopic));

    // API GATEWAY MONITORING: High Latency
    new cloudwatch.Alarm(this, 'ApiGatewayLatencyAlarm', {
      alarmName: `barkbase-api-latency-${stage}`,
      alarmDescription: 'Alert when API Gateway latency exceeds 2000ms',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiId: httpApi.apiId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 2000, // 2 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    }).addAlarmAction(new cloudwatchActions.SnsAction(operationalAlertTopic));

    // API GATEWAY MONITORING: 5xx Errors
    new cloudwatch.Alarm(this, 'ApiGateway5xxAlarm', {
      alarmName: `barkbase-api-5xx-${stage}`,
      alarmDescription: 'Alert on API Gateway 5xx errors',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiId: httpApi.apiId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatchActions.SnsAction(operationalAlertTopic));

    // CLOUDWATCH DASHBOARD: Application Overview
    const dashboard = new cloudwatch.Dashboard(this, 'BarkbaseDashboard', {
      dashboardName: `BarkBase-${stage}`,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Request Count',
        left: [new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: { ApiId: httpApi.apiId },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: { ApiId: httpApi.apiId },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        })],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'RDS - CPU & Connections',
        left: [dbInstance.metricCPUUtilization()],
        right: [dbInstance.metricDatabaseConnections()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'RDS - Storage & IOPS',
        left: [dbInstance.metricFreeStorageSpace()],
        right: [dbInstance.metricReadIOPS(), dbInstance.metricWriteIOPS()],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda - Invocations',
        left: [
          usersApiFunction.metricInvocations(),
          authApiFunction.metricInvocations(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda - Errors',
        left: [
          usersApiFunction.metricErrors(),
          authApiFunction.metricErrors(),
        ],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda - Duration',
        left: [
          usersApiFunction.metricDuration(),
          authApiFunction.metricDuration(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Security Events',
        left: [failedLoginMetric, authFailureMetric, validationFailureMetric],
        width: 12,
      })
    );

    console.log(`✓ Monitoring configured:
      - CloudWatch Dashboard: BarkBase-${stage}
      - Security Alerts: ${securityAlertTopic.topicName}
      - Operational Alerts: ${operationalAlertTopic.topicName}
      - RDS Monitoring: CPU, Connections, Storage
      - API Gateway Monitoring: Latency, Errors
      - Lambda Monitoring: Invocations, Errors, Duration
    `);

    new cdk.CfnOutput(this, 'SiteBucketName', { value: siteBucket.bucketName });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', { value: distribution.domainName });
    new cdk.CfnOutput(this, 'CognitoDomain', { value: `https://${domainPrefix}.auth.${this.region}.amazoncognito.com` });
    new cdk.CfnOutput(this, 'SecurityAlertTopicArn', { value: securityAlertTopic.topicArn });
    new cdk.CfnOutput(this, 'OperationalAlertTopicArn', { value: operationalAlertTopic.topicArn });
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=BarkBase-${stage}`,
      description: 'CloudWatch Dashboard URL',
    });
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: dbEndpoint,
      description: 'RDS Database Endpoint',
    });

    // ===================================================================
    // JWT SECRET VALIDATION
    // ===================================================================
    // SECURITY: Validate JWT_SECRET is configured before deployment
    // This prevents deployment with weak default secrets
    if (!process.env.JWT_SECRET) {
      throw new Error(
        '╔═══════════════════════════════════════════════════════════════════╗\n' +
        '║ FATAL ERROR: JWT_SECRET NOT CONFIGURED                           ║\n' +
        '╠═══════════════════════════════════════════════════════════════════╣\n' +
        '║ JWT_SECRET environment variable must be set before deployment.   ║\n' +
        '║                                                                   ║\n' +
        '║ Generate a secure secret:                                        ║\n' +
        '║   openssl rand -base64 64                                        ║\n' +
        '║                                                                   ║\n' +
        '║ Then set it:                                                     ║\n' +
        '║   export JWT_SECRET="your-generated-secret"                      ║\n' +
        '║                                                                   ║\n' +
        '║ See aws/SECURITY_DEPLOYMENT_GUIDE.md for more details.          ║\n' +
        '╚═══════════════════════════════════════════════════════════════════╝'
      );
    }

    // Add JWT_SECRET and optional JWT_SECRET_OLD for rotation
    const authEnvironment = {
      ...dbEnvironment,
      JWT_SECRET: process.env.JWT_SECRET,
      ...(process.env.JWT_SECRET_OLD ? { JWT_SECRET_OLD: process.env.JWT_SECRET_OLD } : {}),
    };

    console.log(`✓ JWT Configuration:
      - Primary Secret: ${process.env.JWT_SECRET.substring(0, 10)}...
      - Rotation Secret: ${process.env.JWT_SECRET_OLD ? 'CONFIGURED' : 'NOT SET'}
    `);

    // Auth API
    const authApiFunction = createLambdaFunction({
      id: 'AuthApiFunction',
      handler: 'index.handler',
      codePath: path.join(__dirname, '../../lambdas/auth-api'),
      environment: authEnvironment,
      layers: [dbLayer],
      description: 'Authentication API with JWT token management',
    });
    dbSecret.grantRead(authApiFunction);

    const authIntegration = new HttpLambdaIntegration('AuthIntegration', authApiFunction);
    httpApi.addRoutes({ path: '/api/v1/auth/login', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/signup', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/refresh', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/logout', methods: [apigw.HttpMethod.POST], integration: authIntegration });
    httpApi.addRoutes({ path: '/api/v1/auth/register', methods: [apigw.HttpMethod.POST], integration: authIntegration });

    // Bookings API - REPLACED BY OperationsServiceFunction
    // const bookingsApiFunction = new lambda.Function(this, 'BookingsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/bookings-api')),
    //   layers: [dbLayer, authLayer],
    //   environment: authEnvironment,
    //   // No VPC - connects to public database
    //
    //   timeout: cdk.Duration.seconds(30),
    // });
    // dbSecret.grantRead(bookingsApiFunction);
    // // Canary deployment removed to optimize resource count
    // // Can be added back if needed via separate deployment stack
    // const bookingsIntegration = new HttpLambdaIntegration('BookingsIntegration', bookingsApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/bookings', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: bookingsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: bookingsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/status', methods: [apigw.HttpMethod.PATCH], integration: bookingsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkin', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/bookings/{bookingId}/checkout', methods: [apigw.HttpMethod.POST], integration: bookingsIntegration, authorizer: httpAuthorizer });

    // Tenants API - REPLACED BY ConfigServiceFunction
    // const tenantsApiFunction = new lambda.Function(this, 'TenantsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/tenants-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //
    //   timeout: cdk.Duration.seconds(30),
    // });
    // dbSecret.grantRead(tenantsApiFunction);
    // const tenantsIntegration = new HttpLambdaIntegration('TenantsIntegration', tenantsApiFunction);
    // // Public by slug
    // httpApi.addRoutes({ path: '/api/v1/tenants', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration });
    // // Authenticated current tenant endpoints (to enable authorizer later)
    // httpApi.addRoutes({ path: '/api/v1/tenants/current', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/tenants/current/plan', methods: [apigw.HttpMethod.GET], integration: tenantsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/tenants/current/onboarding', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PATCH], integration: tenantsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/tenants/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/tenants/current/theme', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/tenants/features', methods: [apigw.HttpMethod.PUT], integration: tenantsIntegration, authorizer: httpAuthorizer });

    // Owners API - REPLACED BY EntityServiceFunction
    // const ownersApiFunction = new lambda.Function(this, 'OwnersApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/owners-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //
    //   timeout: cdk.Duration.seconds(30),
    // });
    // dbSecret.grantRead(ownersApiFunction);
    // const ownersIntegration = new HttpLambdaIntegration('OwnersIntegration', ownersApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/owners', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: ownersIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/owners/{ownerId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: ownersIntegration, authorizer: httpAuthorizer });

    // Financial Service (consolidates payments-api, invoices-api, billing-api)
    // Saves 10 CloudFormation resources: 3 Lambdas → 1 Lambda
    const financialServiceFunction = new lambda.Function(this, 'FinancialServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/financial-service')),
      layers: [dbLayer, authLayer],
      environment: {
        ...dbEnvironment,
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(financialServiceFunction);  // FIX: Add missing Secrets Manager permission
    const financialIntegration = new HttpLambdaIntegration('FinancialIntegration', financialServiceFunction);

    // Payments routes (from payments-api)
    httpApi.addRoutes({ path: '/api/v1/payments', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: financialIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/payments/{paymentId}', methods: [apigw.HttpMethod.GET], integration: financialIntegration, authorizer: httpAuthorizer });

    // Invoices routes (from invoices-api)
    httpApi.addRoutes({ path: '/api/v1/invoices', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: financialIntegration, authorizer: httpAuthorizer });

    // Billing routes (from billing-api)
    httpApi.addRoutes({ path: '/api/v1/billing/metrics', methods: [apigw.HttpMethod.GET], integration: financialIntegration, authorizer: httpAuthorizer });

    // Analytics Service (consolidated: dashboard-api + reports-api + schedule-api)
    const analyticsServiceFunction = new lambda.Function(this, 'AnalyticsServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/analytics-service')),
      layers: [dbLayer, authLayer],
      environment: {
        ...dbEnvironment,
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(analyticsServiceFunction);
    const analyticsIntegration = new HttpLambdaIntegration('AnalyticsIntegration', analyticsServiceFunction);

    // Dashboard routes
    httpApi.addRoutes({ path: '/api/v1/dashboard/stats', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/dashboard/today-pets', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/dashboard/arrivals', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/dashboard/departures', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/dashboard/occupancy', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/dashboard/revenue', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/dashboard/activity', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });

    // Reports routes
    httpApi.addRoutes({ path: '/api/v1/reports/dashboard', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/reports/revenue', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/reports/occupancy', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });

    // Schedule routes
    httpApi.addRoutes({ path: '/api/v1/schedule', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/schedule/capacity', methods: [apigw.HttpMethod.GET], integration: analyticsIntegration, authorizer: httpAuthorizer });

    // Kennels API - REPLACED BY OperationsServiceFunction
    // const kennelsApiFunction = new lambda.Function(this, 'KennelsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/kennels-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    // });
    // dbSecret.grantRead(kennelsApiFunction);
    // const kennelsIntegration = new HttpLambdaIntegration('KennelsIntegration', kennelsApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/kennels', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: kennelsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/kennels/occupancy', methods: [apigw.HttpMethod.GET], integration: kennelsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/kennels/{kennelId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: kennelsIntegration, authorizer: httpAuthorizer });

    // Staff API - REPLACED BY EntityServiceFunction
    // const staffApiFunction = new lambda.Function(this, 'StaffApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/staff-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    // });
    // dbSecret.grantRead(staffApiFunction);
    // const staffIntegration = new HttpLambdaIntegration('StaffIntegration', staffApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/staff', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: staffIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/staff/{staffId}', methods: [apigw.HttpMethod.GET], integration: staffIntegration, authorizer: httpAuthorizer });


    // Incidents API - REPLACED BY FeaturesServiceFunction
    // const incidentsApiFunction = new lambda.Function(this, 'IncidentsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/incidents-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    // });
    // const incidentsIntegration = new HttpLambdaIntegration('IncidentsIntegration', incidentsApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/incidents', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: incidentsIntegration, authorizer: httpAuthorizer });

    // Services API - REPLACED BY ConfigServiceFunction
    // const servicesApiFunction = new lambda.Function(this, 'ServicesApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/services-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    // });
    // const servicesIntegration = new HttpLambdaIntegration('ServicesIntegration', servicesApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/services', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: servicesIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/services/{serviceId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: servicesIntegration, authorizer: httpAuthorizer });

    // Properties API (for system and custom properties management)
    const propertiesApiFunction = new lambda.Function(this, 'PropertiesApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/properties-api')),
      layers: [dbLayer],
      environment: dbEnvironment,
      // No VPC - connects to public database
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(propertiesApiFunction);
    const propertiesIntegration = new HttpLambdaIntegration('PropertiesIntegration', propertiesApiFunction);
    httpApi.addRoutes({ path: '/api/v1/properties', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: propertiesIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/properties/{propertyId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE], integration: propertiesIntegration, authorizer: httpAuthorizer });

    // === ENTERPRISE PROPERTY MANAGEMENT SYSTEM ===

    // Properties API v2 (Enhanced with rich metadata, dependencies, and enterprise features)
    const propertiesApiV2Function = new lambda.Function(this, 'PropertiesApiV2Function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/properties-api-v2')),
      layers: [dbLayer],
      environment: dbEnvironment,
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(propertiesApiV2Function);
    const propertiesV2Integration = new HttpLambdaIntegration('PropertiesV2Integration', propertiesApiV2Function);
    httpApi.addRoutes({ path: '/api/v2/properties', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: propertiesV2Integration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v2/properties/{propertyId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE], integration: propertiesV2Integration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v2/properties/{propertyId}/archive', methods: [apigw.HttpMethod.POST], integration: propertiesV2Integration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v2/properties/{propertyId}/restore', methods: [apigw.HttpMethod.POST], integration: propertiesV2Integration, authorizer: httpAuthorizer });
    // Note: Advanced endpoints (dependencies, impact-analysis, usage-report, substitute, force) 
    // accessible via direct Lambda invocation to optimize resource count

    // Property Dependency Service (consolidated into properties-api-v2 for resource optimization)
    // Dependency endpoints available via /api/v2/properties/{propertyId}/dependencies etc.

    // User Profile Service (Permission profiles and FLS management)  
    const userProfileServiceFunction = new lambda.Function(this, 'UserProfileServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/user-profile-service')),
      layers: [dbLayer],
      environment: dbEnvironment,
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(userProfileServiceFunction);
    const userProfileIntegration = new HttpLambdaIntegration('UserProfileIntegration', userProfileServiceFunction);
    httpApi.addRoutes({ path: '/api/v1/profiles', methods: [apigw.HttpMethod.GET], integration: userProfileIntegration, authorizer: httpAuthorizer });
    httpApi.addRoutes({ path: '/api/v1/users/{userId}/profiles', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: userProfileIntegration, authorizer: httpAuthorizer });

    // Property Archival Job (Scheduled - runs daily at 2 AM UTC)
    const propertyArchivalJobFunction = new lambda.Function(this, 'PropertyArchivalJobFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/property-archival-job')),
      layers: [dbLayer],
      environment: dbEnvironment,
      timeout: cdk.Duration.minutes(15),
    });
    dbSecret.grantRead(propertyArchivalJobFunction);
    const archivalSchedule = new events.Rule(this, 'PropertyArchivalSchedule', {
      schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
    });
    archivalSchedule.addTarget(new targets.LambdaFunction(propertyArchivalJobFunction));

    // Property Permanent Deletion Job (Scheduled - runs weekly on Sundays at 3 AM UTC)
    const propertyPermanentDeletionJobFunction = new lambda.Function(this, 'PropertyPermanentDeletionJobFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/property-permanent-deletion-job')),
      layers: [dbLayer],
      environment: dbEnvironment,
      timeout: cdk.Duration.minutes(15),
    });
    dbSecret.grantRead(propertyPermanentDeletionJobFunction);
    const permanentDeletionSchedule = new events.Rule(this, 'PropertyPermanentDeletionSchedule', {
      schedule: events.Schedule.cron({ weekDay: 'SUN', hour: '3', minute: '0' }),
    });
    permanentDeletionSchedule.addTarget(new targets.LambdaFunction(propertyPermanentDeletionJobFunction));

    // Invites API - REPLACED BY FeaturesServiceFunction
    // const invitesApiFunction = new lambda.Function(this, 'InvitesApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/invites-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const invitesIntegration = new HttpLambdaIntegration('InvitesIntegration', invitesApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/invites', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: invitesIntegration, authorizer: httpAuthorizer });


    // Tasks API - REPLACED BY FeaturesServiceFunction
    // const tasksApiFunction = new lambda.Function(this, 'TasksApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/tasks-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // dbSecret.grantRead(tasksApiFunction);
    // const tasksIntegration = new HttpLambdaIntegration('TasksIntegration', tasksApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/tasks', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: tasksIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/tasks/{taskId}', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: tasksIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/tasks/{taskId}/complete', methods: [apigw.HttpMethod.POST], integration: tasksIntegration, authorizer: httpAuthorizer });

    // Messages API - REPLACED BY FeaturesServiceFunction
    // const messagesApiFunction = new lambda.Function(this, 'MessagesApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/messages-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const messagesIntegration = new HttpLambdaIntegration('MessagesIntegration', messagesApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/messages', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: messagesIntegration, authorizer: httpAuthorizer });

    // Runs API - REPLACED BY OperationsServiceFunction
    // const runsApiFunction = new lambda.Function(this, 'RunsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/runs-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // dbSecret.grantRead(runsApiFunction);
    // const runsIntegration = new HttpLambdaIntegration('RunsIntegration', runsApiFunction);
    // // Run template endpoints
    // httpApi.addRoutes({ path: '/api/v1/run-templates', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: runsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/run-templates/{id}', methods: [apigw.HttpMethod.PUT, apigw.HttpMethod.DELETE], integration: runsIntegration, authorizer: httpAuthorizer });
    // // Run endpoints
    // httpApi.addRoutes({ path: '/api/v1/runs/{runId}/available-slots', methods: [apigw.HttpMethod.GET], integration: runsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/runs/assignments', methods: [apigw.HttpMethod.GET], integration: runsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/runs', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: runsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/runs/{runId}', methods: [apigw.HttpMethod.PUT], integration: runsIntegration, authorizer: httpAuthorizer });

    // Memberships API - REPLACED BY ConfigServiceFunction
    // const membershipsApiFunction = new lambda.Function(this, 'MembershipsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/memberships-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const membershipsIntegration = new HttpLambdaIntegration('MembershipsIntegration', membershipsApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/memberships', methods: [apigw.HttpMethod.GET], integration: membershipsIntegration, authorizer: httpAuthorizer });
    // httpApi.addRoutes({ path: '/api/v1/memberships/{membershipId}', methods: [apigw.HttpMethod.PUT], integration: membershipsIntegration, authorizer: httpAuthorizer });

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
    httpApi.addRoutes({ path: '/api/v1/admin/stats', methods: [apigw.HttpMethod.GET], integration: adminIntegration, authorizer: httpAuthorizer });

    // Communication API - REPLACED BY FeaturesServiceFunction
    // const communicationApiFunction = new lambda.Function(this, 'CommunicationApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/communication-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const communicationIntegration = new HttpLambdaIntegration('CommunicationIntegration', communicationApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/communications', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: communicationIntegration, authorizer: httpAuthorizer });

    // Notes API - REPLACED BY FeaturesServiceFunction
    // const notesApiFunction = new lambda.Function(this, 'NotesApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/notes-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const notesIntegration = new HttpLambdaIntegration('NotesIntegration', notesApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/notes', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST], integration: notesIntegration, authorizer: httpAuthorizer });

    // Roles API - REPLACED BY ConfigServiceFunction
    // const rolesApiFunction = new lambda.Function(this, 'RolesApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/roles-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const rolesIntegration = new HttpLambdaIntegration('RolesIntegration', rolesApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/roles', methods: [apigw.HttpMethod.GET], integration: rolesIntegration, authorizer: httpAuthorizer });

    // Facility API - REPLACED BY ConfigServiceFunction
    // const facilityApiFunction = new lambda.Function(this, 'FacilityApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/facility-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const facilityIntegration = new HttpLambdaIntegration('FacilityIntegration', facilityApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/facility', methods: [apigw.HttpMethod.GET], integration: facilityIntegration, authorizer: httpAuthorizer });

    // Account Defaults API - REPLACED BY ConfigServiceFunction
    // const accountDefaultsApiFunction = new lambda.Function(this, 'AccountDefaultsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/account-defaults-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const accountDefaultsIntegration = new HttpLambdaIntegration('AccountDefaultsIntegration', accountDefaultsApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/account-defaults', methods: [apigw.HttpMethod.GET, apigw.HttpMethod.PUT], integration: accountDefaultsIntegration, authorizer: httpAuthorizer });

    // === NEW CONSOLIDATED SERVICES (Replaces 22 individual Lambda functions) ===

    // Operations Service (consolidates bookings, runs, check-in, check-out, kennels)
    const operationsServiceFunction = new lambda.Function(this, 'OperationsServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/operations-service')),
      layers: [dbLayer, authLayer],
      environment: {
        ...dbEnvironment,
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(operationsServiceFunction);

    // Entity Service (consolidates pets, owners, staff)
    const entityServiceFunction = new lambda.Function(this, 'EntityServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/entity-service')),
      layers: [dbLayer, authLayer],
      environment: {
        ...dbEnvironment,
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(entityServiceFunction);

    // Features Service (consolidates tasks, notes, incidents, messages, communication, invites)
    const featuresServiceFunction = new lambda.Function(this, 'FeaturesServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/features-service')),
      layers: [dbLayer, authLayer],
      environment: {
        ...dbEnvironment,
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(featuresServiceFunction);

    // Config Service (consolidates services, tenants, roles, defaults, facility, packages, memberships, permissions)
    const configServiceFunction = new lambda.Function(this, 'ConfigServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/config-service')),
      layers: [dbLayer, authLayer],
      environment: {
        ...dbEnvironment,
        USER_POOL_ID: userPool.userPoolId,
        CLIENT_ID: userPoolClient.userPoolClientId,
      },
      timeout: cdk.Duration.seconds(30),
    });
    dbSecret.grantRead(configServiceFunction);

    // OPTIONS Handler (dedicated lightweight Lambda for CORS preflight)
    // This Lambda ONLY handles OPTIONS requests - no database access needed
    const optionsHandlerFunction = new lambda.Function(this, 'OptionsHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/options-handler')),
      timeout: cdk.Duration.seconds(3),
      memorySize: 128,
    });

    // Use custom integration class to prevent 217 individual permissions
    const optionsIntegration = new LambdaIntegrationNoPermission(
      'OptionsIntegration',
      optionsHandlerFunction
    );

    // Operations Service routes
    const operationsIntegration = new HttpLambdaIntegration('OperationsIntegration', operationsServiceFunction);
    // Base paths (for list/create operations)
    httpApi.addRoutes({
      path: '/api/v1/bookings',
      methods: [apigw.HttpMethod.ANY],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/runs',
      methods: [apigw.HttpMethod.ANY],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/run-templates',
      methods: [apigw.HttpMethod.ANY],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/check-ins',
      methods: [apigw.HttpMethod.ANY],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/check-outs',
      methods: [apigw.HttpMethod.ANY],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/kennels',
      methods: [apigw.HttpMethod.ANY],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    // Proxy paths (for operations on specific resources)
    // Use explicit methods (not ANY) to exclude OPTIONS, allowing wildcard OPTIONS route to match
    httpApi.addRoutes({
      path: '/api/v1/bookings/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/runs/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/run-templates/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/check-ins/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/check-outs/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/kennels/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: operationsIntegration,
      authorizer: httpAuthorizer,
    });

    // Entity Service routes
    const entityIntegration = new HttpLambdaIntegration('EntityIntegration', entityServiceFunction);
    // Base paths
    httpApi.addRoutes({
      path: '/api/v1/pets',
      methods: [apigw.HttpMethod.ANY],
      integration: entityIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/owners',
      methods: [apigw.HttpMethod.ANY],
      integration: entityIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/staff',
      methods: [apigw.HttpMethod.ANY],
      integration: entityIntegration,
      authorizer: httpAuthorizer,
    });
    // Proxy paths
    httpApi.addRoutes({
      path: '/api/v1/pets/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: entityIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/owners/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: entityIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/staff/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: entityIntegration,
      authorizer: httpAuthorizer,
    });

    // Features Service routes
    const featuresIntegration = new HttpLambdaIntegration('FeaturesIntegration', featuresServiceFunction);
    // Base paths
    httpApi.addRoutes({
      path: '/api/v1/tasks',
      methods: [apigw.HttpMethod.ANY],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/notes',
      methods: [apigw.HttpMethod.ANY],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/incidents',
      methods: [apigw.HttpMethod.ANY],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/messages',
      methods: [apigw.HttpMethod.ANY],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/communications',
      methods: [apigw.HttpMethod.ANY],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/invites',
      methods: [apigw.HttpMethod.ANY],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    // Proxy paths
    httpApi.addRoutes({
      path: '/api/v1/tasks/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/notes/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/incidents/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/messages/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/communications/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/invites/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: featuresIntegration,
      authorizer: httpAuthorizer,
    });

    // Config Service routes
    const configIntegration = new HttpLambdaIntegration('ConfigIntegration', configServiceFunction);
    // Base paths
    httpApi.addRoutes({
      path: '/api/v1/services',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/tenants',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/roles',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/account-defaults',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/facility',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/packages',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/memberships',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/user-permissions',
      methods: [apigw.HttpMethod.ANY],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    // Proxy paths
    httpApi.addRoutes({
      path: '/api/v1/services/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/tenants/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/roles/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/account-defaults/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/facility/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/packages/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/memberships/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });
    httpApi.addRoutes({
      path: '/api/v1/user-permissions/{proxy+}',
      methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT, apigw.HttpMethod.PATCH, apigw.HttpMethod.DELETE],
      integration: configIntegration,
      authorizer: httpAuthorizer,
    });

    // ===== CORS PREFLIGHT OPTIONS ROUTES (NO AUTHORIZATION) =====
    // These routes handle CORS preflight requests without requiring JWT authentication
    // All OPTIONS routes use the dedicated OPTIONS handler Lambda

    // Operations Service OPTIONS routes
    httpApi.addRoutes({ path: '/api/v1/bookings', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/runs', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/run-templates', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/check-ins', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/check-outs', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/kennels', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });

    // Entity Service OPTIONS routes
    httpApi.addRoutes({ path: '/api/v1/pets', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/owners', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/staff', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });

    // Features Service OPTIONS routes
    httpApi.addRoutes({ path: '/api/v1/tasks', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/notes', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/incidents', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/messages', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/communications', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/invites', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });

    // Config Service OPTIONS routes
    httpApi.addRoutes({ path: '/api/v1/services', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/tenants', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/roles', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/account-defaults', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/facility', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/packages', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/memberships', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });
    httpApi.addRoutes({ path: '/api/v1/user-permissions', methods: [apigw.HttpMethod.OPTIONS], integration: optionsIntegration, authorizer: new apigw.HttpNoneAuthorizer() });

    // Wildcard OPTIONS route for all sub-paths under /api/v1/* (CORS preflight)
    // This catches OPTIONS requests like /api/v1/pets/vaccinations/expiring, /api/v1/bookings/{id}, etc.
    // Works because {proxy+} routes now use explicit methods (GET,POST,PUT,PATCH,DELETE) instead of ANY
    httpApi.addRoutes({
      path: '/api/v1/{proxy+}',
      methods: [apigw.HttpMethod.OPTIONS],
      integration: optionsIntegration,
      authorizer: new apigw.HttpNoneAuthorizer()  // CRITICAL: No auth on OPTIONS
    });

    // User Permissions API - REPLACED BY ConfigServiceFunction
    // const userPermissionsApiFunction = new lambda.Function(this, 'UserPermissionsApiFunction', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/user-permissions-api')),
    //   layers: [dbLayer],
    //   environment: dbEnvironment,
    //   // No VPC - connects to public database
    //   timeout: cdk.Duration.seconds(30),
    //   allowPublicSubnet: true,
    // });
    // const userPermissionsIntegration = new HttpLambdaIntegration('UserPermissionsIntegration', userPermissionsApiFunction);
    // httpApi.addRoutes({ path: '/api/v1/user-permissions', methods: [apigw.HttpMethod.GET], integration: userPermissionsIntegration, authorizer: httpAuthorizer });

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
    httpApi.addRoutes({ path: '/api/v1/migration', methods: [apigw.HttpMethod.POST], integration: migrationIntegration, authorizer: httpAuthorizer });

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

    // ===== REMOVE ALL AUTO-GENERATED LAMBDA PERMISSIONS =====
    // This prevents the 217 individual permissions that exceed CloudFormation's 500 resource limit
    // Instead, we rely on wildcard permissions added manually below

    const removePermissions = (node: any) => {
      for (const child of node.children) {
        if (child instanceof lambda.CfnPermission) {
          node.tryRemoveChild(child.node.id);
        }
        if (child.node.children.length > 0) {
          removePermissions(child.node);
        }
      }
    };

    // Remove all auto-generated permissions from all Lambda functions
    removePermissions(this.node);

    // Re-add ONLY the wildcard permissions we need
    optionsHandlerFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    operationsServiceFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    entityServiceFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    featuresServiceFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    configServiceFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    usersApiFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    authApiFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    financialServiceFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    analyticsServiceFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    propertiesApiFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    propertiesApiV2Function.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    userProfileServiceFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    adminApiFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    migrationApiFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    getUploadUrlFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });

    getDownloadUrlFunction.addPermission('ApiGatewayWildcard', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${httpApi.apiId}/*/*/*`,
    });
  }
}

