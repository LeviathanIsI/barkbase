import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import * as path from "path";

export interface ServicesStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  dbSecret: secretsmanager.ISecret;
  dbHost: string;
  dbPort: number;
  dbName: string;
  httpApi?: apigwv2.HttpApi;
  httpApiId?: string;
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

    const resolvedHttpApiId =
      props.httpApiId ||
      this.node.tryGetContext("httpApiId") ||
      process.env.HTTP_API_ID ||
      "ejxp74eyhe";

    const skipHttpRoutes =
      process.env.SKIP_HTTP_ROUTES === "1" ||
      this.node.tryGetContext("skipHttpRoutes") === true;

    if (skipHttpRoutes) {
      console.warn(
        "ServicesStack: SKIP_HTTP_ROUTES flag set – skipping HttpApi route bindings (temporary workaround while ApiCore is disabled)."
      );
    }

    const legacyExportPrefix = `Barkbase-ServicesStack-${props.stage}`;
    const registerLegacyExport = (
      id: string,
      fn: lambda.Function,
      legacySuffix: string
    ) => {
      new cdk.CfnOutput(this, id, {
        value: fn.functionArn,
        exportName: `${legacyExportPrefix}:${legacySuffix}`,
      });
    };

    // NOTE: Options handler removed - HTTP API's built-in CORS (corsPreflight)
    // handles OPTIONS preflight requests automatically. No Lambda needed.

    // Treat the HttpApi as an external resource so this stack can deploy
    // without re-synthesizing Barkbase-ApiCoreStack (which currently exceeds
    // the 500 resource limit). Long term we can revisit once ApiCore is slimmed.
    const httpApi: apigwv2.HttpApi =
      props.httpApi ||
      (apigwv2.HttpApi.fromHttpApiAttributes(
        this,
        "ImportedBarkbaseHttpApi",
        {
          httpApiId: resolvedHttpApiId,
        }
      ) as apigwv2.HttpApi);

    type RouteRegistrationOptions = {
      integration: any;
      authorizer?: HttpUserPoolAuthorizer;
    };

    const registerRoutes = (
      idPrefix: string,
      path: string,
      methods: apigwv2.HttpMethod[],
      options: RouteRegistrationOptions
    ) => {
      const normalizedPath = path.replace(/[^A-Za-z0-9]/g, "") || "Root";
      methods.forEach((method) => {
        new apigwv2.HttpRoute(
          this,
          `${idPrefix}${method}${normalizedPath}`,
          {
            httpApi,
            routeKey: apigwv2.HttpRouteKey.with(path, method),
            integration: options.integration,
            authorizer: options.authorizer,
          }
        );
      });
    };

    const dbEnv = {
      DB_HOST: props.dbHost,
      DB_PORT: props.dbPort.toString(),
      DB_NAME: props.dbName,
      DB_SECRET_ID: props.dbSecret.secretName,
      DB_SECRET_ARN: props.dbSecret.secretArn,
      ENVIRONMENT: props.stage,
      STAGE: props.stage,
    };

    // JWT secrets for HS256 token validation (required for JWTValidator in auth-layer)
    const jwtSecret = process.env.JWT_SECRET || "";
    const jwtSecretOld = process.env.JWT_SECRET_OLD || "";

    const authEnv: { [key: string]: string } = {
      USER_POOL_ID: props.userPool?.userPoolId ?? "us-east-2_v94gByGOq",
      CLIENT_ID:
        props.userPoolClient?.userPoolClientId ?? "2csen8hj7b53ec2q9bc0siubja",
      // JWT secrets for validating custom HS256 tokens from auth-api
      ...(jwtSecret ? { JWT_SECRET: jwtSecret } : {}),
      ...(jwtSecretOld ? { JWT_SECRET_OLD: jwtSecretOld } : {}),
    };

    // S3 bucket for file uploads - use existing if provided, otherwise create one
    const existingBucketName =
      this.node.tryGetContext("uploadsBucketName") ??
      process.env.UPLOADS_BUCKET ??
      "";
    
    let uploadsBucket: s3.IBucket;
    let fileBucketName: string;
    
    if (existingBucketName) {
      // Reference existing bucket
      uploadsBucket = s3.Bucket.fromBucketName(this, "ImportedUploadsBucket", existingBucketName);
      fileBucketName = existingBucketName;
    } else {
      // Create a new bucket for uploads
      uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        cors: [
          {
            allowedHeaders: ["*"],
            allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
            allowedOrigins: ["*"], // Tighten in production
            maxAge: 3000,
          },
        ],
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });
      fileBucketName = uploadsBucket.bucketName;
      
      // Output the bucket name for reference
      new cdk.CfnOutput(this, "UploadsBucketName", {
        value: uploadsBucket.bucketName,
        description: "S3 bucket for file uploads",
      });
    }

    const cloudFrontDomain =
      this.node.tryGetContext("cloudFrontDomain") ??
      process.env.CLOUDFRONT_DOMAIN ??
      "";
    const s3KmsKeyId =
      this.node.tryGetContext("uploadsKmsKeyArn") ??
      process.env.S3_KMS_KEY_ARN ??
      "";

    const fileEnv = {
      S3_BUCKET: fileBucketName,
      CLOUDFRONT_DOMAIN: cloudFrontDomain,
      S3_KMS_KEY_ID: s3KmsKeyId,
    };

    const dbLayer = new lambda.LayerVersion(this, "ServicesDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Shared database utilities for BarkBase services",
    });

    const authLayer = new lambda.LayerVersion(this, "ServicesAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Shared authentication utilities for BarkBase services",
    });

    const vpcConfig = {
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    };

    this.operationsServiceFn = new lambda.Function(
      this,
      "OperationsServiceFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/operations-service")
        ),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      }
    );
    props.dbSecret.grantRead(this.operationsServiceFn);

    const authenticatedHttpMethods = [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
      apigwv2.HttpMethod.PUT,
      apigwv2.HttpMethod.PATCH,
      apigwv2.HttpMethod.DELETE,
    ];

    const proxyMethods = [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
      apigwv2.HttpMethod.PUT,
      apigwv2.HttpMethod.PATCH,
      apigwv2.HttpMethod.DELETE,
    ];

    if (!skipHttpRoutes) {
      const operationsIntegration = new integrations.HttpLambdaIntegration(
        "OperationsServiceIntegration",
        this.operationsServiceFn
      );

      const operationsRouteOptions = {
        integration: operationsIntegration,
        authorizer: props.authorizer,
      };

      registerRoutes(
        "BookingsRoot",
        "/api/v1/bookings",
        authenticatedHttpMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "RunsRoot",
        "/api/v1/runs",
        authenticatedHttpMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "RunTemplatesRoot",
        "/api/v1/run-templates",
        authenticatedHttpMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "CheckInsRoot",
        "/api/v1/check-ins",
        authenticatedHttpMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "CheckOutsRoot",
        "/api/v1/check-outs",
        authenticatedHttpMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "KennelsRoot",
        "/api/v1/kennels",
        authenticatedHttpMethods,
        operationsRouteOptions
      );

      registerRoutes(
        "BookingsProxy",
        "/api/v1/bookings/{proxy+}",
        proxyMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "RunsProxy",
        "/api/v1/runs/{proxy+}",
        proxyMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "RunTemplatesProxy",
        "/api/v1/run-templates/{proxy+}",
        proxyMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "CheckInsProxy",
        "/api/v1/check-ins/{proxy+}",
        proxyMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "CheckOutsProxy",
        "/api/v1/check-outs/{proxy+}",
        proxyMethods,
        operationsRouteOptions
      );
      registerRoutes(
        "KennelsProxy",
        "/api/v1/kennels/{proxy+}",
        proxyMethods,
        operationsRouteOptions
      );

      registerRoutes(
        "RunsAssignments",
        "/api/v1/runs/assignments",
        [apigwv2.HttpMethod.GET],
        operationsRouteOptions
      );
      registerRoutes(
        "KennelsOccupancy",
        "/api/v1/kennels/occupancy",
        [apigwv2.HttpMethod.GET],
        operationsRouteOptions
      );
    }

    this.entityServiceFn = new lambda.Function(this, "EntityServiceFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/entity-service")
      ),
      layers: [dbLayer, authLayer],
      environment: { ...dbEnv, ...authEnv },
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.entityServiceFn);

    if (!skipHttpRoutes) {
      const entityIntegration = new integrations.HttpLambdaIntegration(
        "EntityServiceIntegration",
        this.entityServiceFn
      );

      const entityRouteOptions = {
        integration: entityIntegration,
        authorizer: props.authorizer,
      };

      registerRoutes(
        "PetsRoot",
        "/api/v1/pets",
        authenticatedHttpMethods,
        entityRouteOptions
      );
      registerRoutes(
        "PetsProxy",
        "/api/v1/pets/{proxy+}",
        proxyMethods,
        entityRouteOptions
      );
      registerRoutes(
        "OwnersRoot",
        "/api/v1/owners",
        authenticatedHttpMethods,
        entityRouteOptions
      );
      registerRoutes(
        "OwnersProxy",
        "/api/v1/owners/{proxy+}",
        proxyMethods,
        entityRouteOptions
      );
      registerRoutes(
        "StaffRoot",
        "/api/v1/staff",
        authenticatedHttpMethods,
        entityRouteOptions
      );
      registerRoutes(
        "StaffProxy",
        "/api/v1/staff/{proxy+}",
        proxyMethods,
        entityRouteOptions
      );
    }

    this.featuresServiceFn = new lambda.Function(
      this,
      "FeaturesServiceFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/features-service")
        ),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      }
    );
    props.dbSecret.grantRead(this.featuresServiceFn);

    if (!skipHttpRoutes) {
      const featuresIntegration = new integrations.HttpLambdaIntegration(
        "FeaturesServiceIntegration",
        this.featuresServiceFn
      );

      const featuresRouteOptions = {
        integration: featuresIntegration,
        authorizer: props.authorizer,
      };

      const featuresBasePaths = [
        "/api/v1/tasks",
        "/api/v1/notes",
        "/api/v1/incidents",
        "/api/v1/messages",
        "/api/v1/communications",
        "/api/v1/invites",
        "/api/v1/segments",
      ];

      featuresBasePaths.forEach((pathName) => {
        registerRoutes(
          `Feature${pathName.replace(/[^A-Za-z0-9]/g, "")}Root`,
          pathName,
          authenticatedHttpMethods,
          featuresRouteOptions
        );
      });

      const featuresProxyPaths = [
        "/api/v1/tasks/{proxy+}",
        "/api/v1/notes/{proxy+}",
        "/api/v1/incidents/{proxy+}",
        "/api/v1/messages/{proxy+}",
        "/api/v1/communications/{proxy+}",
        "/api/v1/invites/{proxy+}",
        "/api/v1/segments/{proxy+}",
      ];

      featuresProxyPaths.forEach((pathName) => {
        registerRoutes(
          `Feature${pathName.replace(/[^A-Za-z0-9]/g, "")}Proxy`,
          pathName,
          proxyMethods,
          featuresRouteOptions
        );
      });
    }

    const createConfigLambda = (id: string): lambda.Function => {
      const fn = new lambda.Function(this, id, {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/config-service")
        ),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      });
      props.dbSecret.grantRead(fn);
      return fn;
    };

    this.rolesConfigServiceFn = createConfigLambda(
      "RolesConfigServiceFunction"
    );
    this.tenantsMembershipsConfigServiceFn = createConfigLambda(
      "TenantsMembershipsConfigServiceFunction"
    );
    this.facilityServicesConfigServiceFn = createConfigLambda(
      "FacilityServicesConfigServiceFunction"
    );

    if (!skipHttpRoutes) {
      const rolesConfigIntegration = new integrations.HttpLambdaIntegration(
        "RolesConfigServiceIntegration",
        this.rolesConfigServiceFn
      );
      const tenantsMembershipsConfigIntegration =
        new integrations.HttpLambdaIntegration(
          "TenantsMembershipsConfigServiceIntegration",
          this.tenantsMembershipsConfigServiceFn
        );
      const facilityServicesConfigIntegration =
        new integrations.HttpLambdaIntegration(
          "FacilityServicesConfigServiceIntegration",
          this.facilityServicesConfigServiceFn
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

      ["/api/v1/roles", "/api/v1/user-permissions"].forEach((pathName) => {
        registerRoutes(
          `RolesConfig${pathName.replace(/[^A-Za-z0-9]/g, "")}Root`,
          pathName,
          authenticatedHttpMethods,
          rolesConfigRouteOptions
        );
      });
      ["/api/v1/roles/{proxy+}", "/api/v1/user-permissions/{proxy+}"].forEach(
        (pathName) => {
          registerRoutes(
            `RolesConfig${pathName.replace(/[^A-Za-z0-9]/g, "")}Proxy`,
            pathName,
            configProxyMethods,
            rolesConfigRouteOptions
          );
        }
      );

      ["/api/v1/tenants", "/api/v1/memberships"].forEach((pathName) => {
        registerRoutes(
          `TenantsConfig${pathName.replace(/[^A-Za-z0-9]/g, "")}Root`,
          pathName,
          authenticatedHttpMethods,
          tenantsMembershipsRouteOptions
        );
      });
      ["/api/v1/tenants/{proxy+}", "/api/v1/memberships/{proxy+}"].forEach(
        (pathName) => {
          registerRoutes(
            `TenantsConfig${pathName.replace(/[^A-Za-z0-9]/g, "")}Proxy`,
            pathName,
            configProxyMethods,
            tenantsMembershipsRouteOptions
          );
        }
      );

      [
        "/api/v1/facility",
        "/api/v1/services",
        "/api/v1/account-defaults",
        "/api/v1/packages",
      ].forEach((pathName) => {
        registerRoutes(
          `FacilityConfig${pathName.replace(/[^A-Za-z0-9]/g, "")}Root`,
          pathName,
          authenticatedHttpMethods,
          facilityServicesRouteOptions
        );
      });
      [
        "/api/v1/facility/{proxy+}",
        "/api/v1/services/{proxy+}",
        "/api/v1/account-defaults/{proxy+}",
        "/api/v1/packages/{proxy+}",
      ].forEach((pathName) => {
        registerRoutes(
          `FacilityConfig${pathName.replace(/[^A-Za-z0-9]/g, "")}Proxy`,
          pathName,
          configProxyMethods,
          facilityServicesRouteOptions
        );
      });
    }

    this.userProfileServiceFn = new lambda.Function(
      this,
      "UserProfileServiceFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/user-profile-service")
        ),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      }
    );
    props.dbSecret.grantRead(this.userProfileServiceFn);

    if (!skipHttpRoutes) {
      const userProfileIntegration = new integrations.HttpLambdaIntegration(
        "UserProfileServiceIntegration",
        this.userProfileServiceFn
      );
      const userProfileOptions = {
        integration: userProfileIntegration,
        authorizer: props.authorizer,
      };

      registerRoutes(
        "ProfilesRoot",
        "/api/v1/profiles",
        [apigwv2.HttpMethod.GET],
        userProfileOptions
      );
      registerRoutes(
        "UserProfiles",
        "/api/v1/users/{userId}/profiles",
        [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
        userProfileOptions
      );
      registerRoutes(
        "CurrentUserProfile",
        "/api/v1/users/profile",
        [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH],
        userProfileOptions
      );
      registerRoutes(
        "UserPassword",
        "/api/v1/users/password",
        [apigwv2.HttpMethod.POST],
        userProfileOptions
      );
      registerRoutes(
        "UserAvatar",
        "/api/v1/users/avatar",
        [apigwv2.HttpMethod.PATCH],
        userProfileOptions
      );
    }

    this.propertiesApiV2Fn = new lambda.Function(
      this,
      "PropertiesApiV2Function",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/properties-api-v2")
        ),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      }
    );
    props.dbSecret.grantRead(this.propertiesApiV2Fn);

    if (!skipHttpRoutes) {
      const propertiesIntegration = new integrations.HttpLambdaIntegration(
        "PropertiesApiV2Integration",
        this.propertiesApiV2Fn
      );

      const propertiesRouteOptions = {
        integration: propertiesIntegration,
        authorizer: props.authorizer,
      };

      registerRoutes(
        "PropertiesV2Root",
        "/api/v2/properties",
        [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
        propertiesRouteOptions
      );
      registerRoutes(
        "PropertiesV2ById",
        "/api/v2/properties/{propertyId}",
        [
          apigwv2.HttpMethod.GET,
          apigwv2.HttpMethod.PATCH,
          apigwv2.HttpMethod.DELETE,
        ],
        propertiesRouteOptions
      );
      registerRoutes(
        "PropertiesV2Archive",
        "/api/v2/properties/{propertyId}/archive",
        [apigwv2.HttpMethod.POST],
        propertiesRouteOptions
      );
      registerRoutes(
        "PropertiesV2Restore",
        "/api/v2/properties/{propertyId}/restore",
        [apigwv2.HttpMethod.POST],
        propertiesRouteOptions
      );
    }

    this.financialServiceFn = new lambda.Function(
      this,
      "FinancialServiceFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/financial-service")
        ),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      }
    );
    props.dbSecret.grantRead(this.financialServiceFn);

    if (!skipHttpRoutes) {
      const financialIntegration = new integrations.HttpLambdaIntegration(
        "FinancialServiceIntegration",
        this.financialServiceFn
      );
      const financialOptions = {
        integration: financialIntegration,
        authorizer: props.authorizer,
      };
      registerRoutes(
        "PaymentsRoot",
        "/api/v1/payments",
        [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
        financialOptions
      );
      registerRoutes(
        "InvoicesRoot",
        "/api/v1/invoices",
        [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
        financialOptions
      );
      registerRoutes(
        "BillingOverview",
        "/api/v1/billing/overview",
        [apigwv2.HttpMethod.GET],
        financialOptions
      );
      registerRoutes(
        "BillingMetrics",
        "/api/v1/billing/metrics",
        [apigwv2.HttpMethod.GET],
        financialOptions
      );
      registerRoutes(
        "PaymentsById",
        "/api/v1/payments/{paymentId}",
        [apigwv2.HttpMethod.GET],
        financialOptions
      );
      registerRoutes(
        "InvoicesById",
        "/api/v1/invoices/{invoiceId}",
        [apigwv2.HttpMethod.GET],
        financialOptions
      );
      registerRoutes(
        "InvoicesGenerate",
        "/api/v1/invoices/generate/{bookingId}",
        [apigwv2.HttpMethod.POST],
        financialOptions
      );
      registerRoutes(
        "InvoicesSendEmail",
        "/api/v1/invoices/{invoiceId}/send-email",
        [apigwv2.HttpMethod.POST],
        financialOptions
      );
      registerRoutes(
        "InvoicesPaid",
        "/api/v1/invoices/{invoiceId}/paid",
        [apigwv2.HttpMethod.PUT],
        financialOptions
      );
    }

    this.analyticsServiceFn = new lambda.Function(
      this,
      "AnalyticsServiceFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/analytics-service")
        ),
        layers: [dbLayer, authLayer],
        environment: { ...dbEnv, ...authEnv },
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      }
    );
    props.dbSecret.grantRead(this.analyticsServiceFn);

    if (!skipHttpRoutes) {
      const analyticsIntegration = new integrations.HttpLambdaIntegration(
        "AnalyticsServiceIntegration",
        this.analyticsServiceFn
      );
      const analyticsOptions = {
        integration: analyticsIntegration,
        authorizer: props.authorizer,
      };

      [
        "/api/v1/dashboard/stats",
        "/api/v1/dashboard/today-pets",
        "/api/v1/dashboard/arrivals",
        "/api/v1/dashboard/departures",
        "/api/v1/dashboard/occupancy",
        "/api/v1/dashboard/revenue",
        "/api/v1/dashboard/activity",
        "/api/v1/reports/dashboard",
        "/api/v1/reports/revenue",
        "/api/v1/reports/occupancy",
        "/api/v1/reports/arrivals",
        "/api/v1/reports/departures",
        "/api/v1/schedule",
        "/api/v1/schedule/capacity",
      ].forEach((pathName) => {
        registerRoutes(
          `Analytics${pathName.replace(/[^A-Za-z0-9]/g, "")}`,
          pathName,
          [apigwv2.HttpMethod.GET],
          analyticsOptions
        );
      });
    }

    this.adminApiFn = new lambda.Function(this, "AdminApiFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/admin-api")
      ),
      layers: [dbLayer, authLayer],
      environment: { ...dbEnv, ...authEnv },
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.adminApiFn);

    if (!skipHttpRoutes) {
      const adminIntegration = new integrations.HttpLambdaIntegration(
        "AdminApiIntegration",
        this.adminApiFn
      );
      registerRoutes(
        "AdminStats",
        "/api/v1/admin/stats",
        [apigwv2.HttpMethod.GET],
        { integration: adminIntegration, authorizer: props.authorizer }
      );
    }

    this.getUploadUrlFn = new lambda.Function(this, "GetUploadUrlFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/get-upload-url")
      ),
      environment: fileEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    
    // Grant the upload Lambda permission to generate presigned PUT URLs
    uploadsBucket.grantWrite(this.getUploadUrlFn);

    this.getDownloadUrlFn = new lambda.Function(
      this,
      "GetDownloadUrlFunction",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "index.handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../lambdas/get-download-url")
        ),
        environment: fileEnv,
        timeout: cdk.Duration.seconds(30),
        ...vpcConfig,
      }
    );
    
    // Grant the download Lambda permission to generate presigned GET URLs
    uploadsBucket.grantRead(this.getDownloadUrlFn);

    if (!skipHttpRoutes) {
      const uploadUrlIntegration = new integrations.HttpLambdaIntegration(
        "GetUploadUrlIntegration",
        this.getUploadUrlFn
      );
      registerRoutes(
        "UploadUrl",
        "/api/v1/upload-url",
        [apigwv2.HttpMethod.POST],
        { integration: uploadUrlIntegration, authorizer: props.authorizer }
      );

      const downloadUrlIntegration = new integrations.HttpLambdaIntegration(
        "GetDownloadUrlIntegration",
        this.getDownloadUrlFn
      );
      registerRoutes(
        "DownloadUrl",
        "/api/v1/download-url",
        [apigwv2.HttpMethod.GET],
        { integration: downloadUrlIntegration, authorizer: props.authorizer }
      );
    }

    // === Auth API Lambda ===
    // JWT secrets are now included in authEnv for all service Lambdas
    const cookieDomain =
      this.node.tryGetContext("cookieDomain") ??
      process.env.COOKIE_DOMAIN ??
      "";

    const authApiEnv: { [key: string]: string } = {
      ...dbEnv,
      ...authEnv, // Includes JWT_SECRET, JWT_SECRET_OLD, USER_POOL_ID, CLIENT_ID
      // Cookie domain for production/staging (optional)
      ...(cookieDomain ? { COOKIE_DOMAIN: cookieDomain } : {}),
    };

    this.authApiFunction = new lambda.Function(this, "AuthApiFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/auth-api")
      ),
      layers: [dbLayer, authLayer],
      environment: authApiEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.authApiFunction);

    // Grant Cognito permissions if user pool is configured
    if (props.userPool) {
      props.userPool.grant(this.authApiFunction, "cognito-idp:InitiateAuth");
    }

    // NOTE: The HTTP API has built-in CORS configuration (corsPreflight in ApiCoreStack)
    // which automatically handles OPTIONS preflight requests. We do NOT need an explicit
    // OPTIONS route handler - it actually overrides and breaks the native CORS support.
    // The GlobalOptions route was removed to let the HTTP API's native CORS work properly.

    // Auth fallback routes - only create if SKIP_HTTP_ROUTES is set AND
    // auth routes don't already exist in the API (controlled by SKIP_AUTH_FALLBACK_ROUTES)
    const skipAuthFallbackRoutes =
      process.env.SKIP_AUTH_FALLBACK_ROUTES === "1" ||
      this.node.tryGetContext("skipAuthFallbackRoutes") === true;

    if (skipHttpRoutes && !skipAuthFallbackRoutes) {
      const fallbackAuthIntegration = new integrations.HttpLambdaIntegration(
        "AuthApiFallbackIntegration",
        this.authApiFunction
      );

      [
        "/api/v1/auth/login",
        "/api/v1/auth/signup",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/auth/register",
      ].forEach((pathName) => {
        registerRoutes(
          `AuthFallback${pathName.replace(/[^A-Za-z0-9]/g, "")}`,
          pathName,
          [apigwv2.HttpMethod.POST],
          { integration: fallbackAuthIntegration }
        );
      });
    }

    registerLegacyExport(
      "OperationsServiceFunctionArnExport",
      this.operationsServiceFn,
      "ExportsOutputFnGetAttOperationsServiceFunction0603CF61Arn2B9DD38B"
    );
    registerLegacyExport(
      "EntityServiceFunctionArnExport",
      this.entityServiceFn,
      "ExportsOutputFnGetAttEntityServiceFunction31C1524DArnF75F98D8"
    );
    registerLegacyExport(
      "FeaturesServiceFunctionArnExport",
      this.featuresServiceFn,
      "ExportsOutputFnGetAttFeaturesServiceFunctionA6C57C51Arn2D47EC9C"
    );
    registerLegacyExport(
      "RolesConfigServiceFunctionArnExport",
      this.rolesConfigServiceFn,
      "ExportsOutputFnGetAttRolesConfigServiceFunction34B9994AArn1E6C2AA2"
    );
    registerLegacyExport(
      "TenantsMembershipsConfigServiceFunctionArnExport",
      this.tenantsMembershipsConfigServiceFn,
      "ExportsOutputFnGetAttTenantsMembershipsConfigServiceFunctionA6627078Arn911C29E5"
    );
    registerLegacyExport(
      "FacilityServicesConfigServiceFunctionArnExport",
      this.facilityServicesConfigServiceFn,
      "ExportsOutputFnGetAttFacilityServicesConfigServiceFunction3CE03B41Arn2B51AD19"
    );
    registerLegacyExport(
      "UserProfileServiceFunctionArnExport",
      this.userProfileServiceFn,
      "ExportsOutputFnGetAttUserProfileServiceFunction5A1818D5ArnDA4E7A0F"
    );
    registerLegacyExport(
      "PropertiesApiV2FunctionArnExport",
      this.propertiesApiV2Fn,
      "ExportsOutputFnGetAttPropertiesApiV2FunctionF2C6947FArnFCE15633"
    );
    registerLegacyExport(
      "FinancialServiceFunctionArnExport",
      this.financialServiceFn,
      "ExportsOutputFnGetAttFinancialServiceFunction09E7DA47ArnAC7B7E88"
    );
    registerLegacyExport(
      "AnalyticsServiceFunctionArnExport",
      this.analyticsServiceFn,
      "ExportsOutputFnGetAttAnalyticsServiceFunctionA7CDC68AArnF2E72E38"
    );
    registerLegacyExport(
      "AdminApiFunctionArnExport",
      this.adminApiFn,
      "ExportsOutputFnGetAttAdminApiFunction0560532AArnB6598925"
    );
    registerLegacyExport(
      "GetUploadUrlFunctionArnExport",
      this.getUploadUrlFn,
      "ExportsOutputFnGetAttGetUploadUrlFunction24AFC12EArnE286DDE0"
    );
    registerLegacyExport(
      "GetDownloadUrlFunctionArnExport",
      this.getDownloadUrlFn,
      "ExportsOutputFnGetAttGetDownloadUrlFunction7617431BArn7E4E7ECB"
    );
    registerLegacyExport(
      "AuthApiFunctionArnExport",
      this.authApiFunction,
      "ExportsOutputFnGetAttAuthApiFunction31FCF8B8ArnAEE430B2"
    );

    cdk.Tags.of(this).add("Stage", props.stage);
  }
}
