/**
 * AuthServicesStack - handles all /api/v1/auth/* routes
 * 
 * Routes handled:
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/signup
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/resend-verification
 * - POST /api/v1/auth/change-password
 * - GET /api/v1/auth/sessions
 * - DELETE /api/v1/auth/sessions/all
 * - DELETE /api/v1/auth/sessions/{sessionId}
 */
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";
import {
  BaseServicesStackProps,
  createDbEnv,
  createAuthEnv,
  createVpcConfig,
} from "./BaseServicesStackProps";

export interface AuthServicesStackProps extends BaseServicesStackProps {}

export class AuthServicesStack extends cdk.Stack {
  public readonly authApiFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AuthServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "AuthDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Auth services",
    });

    const authLayer = new lambda.LayerVersion(this, "AuthAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Auth services",
    });

    // Cookie domain for production/staging (optional)
    const cookieDomain =
      this.node.tryGetContext("cookieDomain") ??
      process.env.COOKIE_DOMAIN ??
      "";

    const authApiEnv: Record<string, string> = {
      ...dbEnv,
      ...authEnv,
      ...(cookieDomain ? { COOKIE_DOMAIN: cookieDomain } : {}),
    };

    // Auth API Lambda
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
      props.userPool.grant(
        this.authApiFunction,
        "cognito-idp:InitiateAuth",
        "cognito-idp:ResendConfirmationCode",
        "cognito-idp:ChangePassword"
      );
    }

    // Create integration
    const authIntegration = new integrations.HttpLambdaIntegration(
      "AuthApiIntegration",
      this.authApiFunction
    );

    // Helper to register routes
    const httpApi = props.httpApi;

    // Auth routes - POST endpoints (no authorizer needed, these are public)
    const postRoutes = [
      "/api/v1/auth/login",
      "/api/v1/auth/signup",
      "/api/v1/auth/refresh",
      "/api/v1/auth/logout",
      "/api/v1/auth/register",
      "/api/v1/auth/resend-verification",
      "/api/v1/auth/change-password",
    ];

    postRoutes.forEach((routePath) => {
      const routeId = `Auth${routePath.replace(/[^A-Za-z0-9]/g, "")}POST`;
      new apigwv2.HttpRoute(this, routeId, {
        httpApi: httpApi as apigwv2.HttpApi,
        routeKey: apigwv2.HttpRouteKey.with(routePath, apigwv2.HttpMethod.POST),
        integration: authIntegration,
      });
    });

    // Session management routes
    // GET /api/v1/auth/sessions - list sessions
    new apigwv2.HttpRoute(this, "AuthSessionsGET", {
      httpApi: httpApi as apigwv2.HttpApi,
      routeKey: apigwv2.HttpRouteKey.with(
        "/api/v1/auth/sessions",
        apigwv2.HttpMethod.GET
      ),
      integration: authIntegration,
    });

    // DELETE /api/v1/auth/sessions/all - revoke all sessions
    new apigwv2.HttpRoute(this, "AuthSessionsAllDELETE", {
      httpApi: httpApi as apigwv2.HttpApi,
      routeKey: apigwv2.HttpRouteKey.with(
        "/api/v1/auth/sessions/all",
        apigwv2.HttpMethod.DELETE
      ),
      integration: authIntegration,
    });

    // DELETE /api/v1/auth/sessions/{sessionId} - revoke specific session
    new apigwv2.HttpRoute(this, "AuthSessionIdDELETE", {
      httpApi: httpApi as apigwv2.HttpApi,
      routeKey: apigwv2.HttpRouteKey.with(
        "/api/v1/auth/sessions/{sessionId}",
        apigwv2.HttpMethod.DELETE
      ),
      integration: authIntegration,
    });

    // Export the auth function ARN for cross-stack references (backwards compatibility)
    new cdk.CfnOutput(this, "AuthApiFunctionArn", {
      value: this.authApiFunction.functionArn,
      exportName: `Barkbase-AuthServices-${props.stage}-AuthApiFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "auth");
  }
}

