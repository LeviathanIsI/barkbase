/**
 * AdminServicesStack - handles admin stats and file upload/download routes
 * 
 * Routes handled:
 * - GET /api/v1/admin/stats
 * - POST /api/v1/upload-url
 * - GET /api/v1/download-url
 */
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as path from "path";
import {
  BaseServicesStackProps,
  createDbEnv,
  createAuthEnv,
  createVpcConfig,
} from "./BaseServicesStackProps";

export interface AdminServicesStackProps extends BaseServicesStackProps {}

export class AdminServicesStack extends cdk.Stack {
  public readonly adminApiFn: lambda.Function;
  public readonly getUploadUrlFn: lambda.Function;
  public readonly getDownloadUrlFn: lambda.Function;

  constructor(scope: Construct, id: string, props: AdminServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "AdminDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Admin services",
    });

    const authLayer = new lambda.LayerVersion(this, "AdminAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Admin services",
    });

    // S3 bucket configuration
    const fileBucketName =
      this.node.tryGetContext("uploadsBucketName") ??
      process.env.UPLOADS_BUCKET ??
      `barkbase-uploads-${props.stage}`;

    const uploadsBucket = s3.Bucket.fromBucketName(
      this,
      "ImportedUploadsBucket",
      fileBucketName
    );

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

    // Admin API Lambda
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

    // Upload URL Lambda
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
    uploadsBucket.grantWrite(this.getUploadUrlFn);

    // Download URL Lambda
    this.getDownloadUrlFn = new lambda.Function(this, "GetDownloadUrlFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../lambdas/get-download-url")
      ),
      environment: fileEnv,
      timeout: cdk.Duration.seconds(30),
      ...vpcConfig,
    });
    uploadsBucket.grantRead(this.getDownloadUrlFn);

    // Create integrations
    const adminIntegration = new integrations.HttpLambdaIntegration(
      "AdminApiIntegration",
      this.adminApiFn
    );
    const uploadUrlIntegration = new integrations.HttpLambdaIntegration(
      "GetUploadUrlIntegration",
      this.getUploadUrlFn
    );
    const downloadUrlIntegration = new integrations.HttpLambdaIntegration(
      "GetDownloadUrlIntegration",
      this.getDownloadUrlFn
    );

    const httpApi = props.httpApi;
    const authorizer = props.authorizer;

    // Admin stats route
    new apigwv2.HttpRoute(this, "AdminStatsGET", {
      httpApi: httpApi as apigwv2.HttpApi,
      routeKey: apigwv2.HttpRouteKey.with(
        "/api/v1/admin/stats",
        apigwv2.HttpMethod.GET
      ),
      integration: adminIntegration,
      authorizer,
    });

    // Upload URL route
    new apigwv2.HttpRoute(this, "UploadUrlPOST", {
      httpApi: httpApi as apigwv2.HttpApi,
      routeKey: apigwv2.HttpRouteKey.with(
        "/api/v1/upload-url",
        apigwv2.HttpMethod.POST
      ),
      integration: uploadUrlIntegration,
      authorizer,
    });

    // Download URL route
    new apigwv2.HttpRoute(this, "DownloadUrlGET", {
      httpApi: httpApi as apigwv2.HttpApi,
      routeKey: apigwv2.HttpRouteKey.with(
        "/api/v1/download-url",
        apigwv2.HttpMethod.GET
      ),
      integration: downloadUrlIntegration,
      authorizer,
    });

    // Export function ARNs for backwards compatibility
    new cdk.CfnOutput(this, "AdminApiFunctionArn", {
      value: this.adminApiFn.functionArn,
      exportName: `Barkbase-AdminServices-${props.stage}-AdminApiFunctionArn`,
    });
    new cdk.CfnOutput(this, "GetUploadUrlFunctionArn", {
      value: this.getUploadUrlFn.functionArn,
      exportName: `Barkbase-AdminServices-${props.stage}-GetUploadUrlFunctionArn`,
    });
    new cdk.CfnOutput(this, "GetDownloadUrlFunctionArn", {
      value: this.getDownloadUrlFn.functionArn,
      exportName: `Barkbase-AdminServices-${props.stage}-GetDownloadUrlFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "admin");
  }
}

