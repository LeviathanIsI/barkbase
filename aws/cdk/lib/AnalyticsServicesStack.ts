/**
 * AnalyticsServicesStack - handles dashboard, reports, schedule, and calendar routes
 * 
 * Routes handled:
 * - GET /api/v1/dashboard/stats
 * - GET /api/v1/dashboard/today-pets
 * - GET /api/v1/dashboard/arrivals
 * - GET /api/v1/dashboard/departures
 * - GET /api/v1/dashboard/occupancy
 * - GET /api/v1/dashboard/revenue
 * - GET /api/v1/dashboard/activity
 * - GET /api/v1/reports/dashboard
 * - GET /api/v1/reports/revenue
 * - GET /api/v1/reports/occupancy
 * - GET /api/v1/reports/arrivals
 * - GET /api/v1/reports/departures
 * - GET /api/v1/reports/today-pets
 * - GET /api/v1/reports/activity
 * - GET /api/v1/schedule
 * - GET /api/v1/schedule/capacity
 * - GET /api/v1/calendar
 * - GET /api/v1/calendar/events
 * - GET /api/v1/calendar/occupancy
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

export interface AnalyticsServicesStackProps extends BaseServicesStackProps {}

export class AnalyticsServicesStack extends cdk.Stack {
  public readonly analyticsServiceFn: lambda.Function;

  constructor(scope: Construct, id: string, props: AnalyticsServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "AnalyticsDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Analytics services",
    });

    const authLayer = new lambda.LayerVersion(this, "AnalyticsAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Analytics services",
    });

    // Analytics Service Lambda
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

    // Create integration
    const analyticsIntegration = new integrations.HttpLambdaIntegration(
      "AnalyticsServiceIntegration",
      this.analyticsServiceFn
    );

    const httpApi = props.httpApi;
    const authorizer = props.authorizer;

    // All analytics routes are GET-only
    const analyticsRoutes = [
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
      "/api/v1/reports/today-pets",
      "/api/v1/reports/activity",
      "/api/v1/schedule",
      "/api/v1/schedule/capacity",
      "/api/v1/calendar",
      "/api/v1/calendar/events",
      "/api/v1/calendar/occupancy",
    ];

    analyticsRoutes.forEach((routePath) => {
      const routeId = `Analytics${routePath.replace(/[^A-Za-z0-9]/g, "")}GET`;
      new apigwv2.HttpRoute(this, routeId, {
        httpApi: httpApi as apigwv2.HttpApi,
        routeKey: apigwv2.HttpRouteKey.with(routePath, apigwv2.HttpMethod.GET),
        integration: analyticsIntegration,
        authorizer,
      });
    });

    // Export function ARN for backwards compatibility
    new cdk.CfnOutput(this, "AnalyticsServiceFunctionArn", {
      value: this.analyticsServiceFn.functionArn,
      exportName: `Barkbase-AnalyticsServices-${props.stage}-AnalyticsServiceFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "analytics");
  }
}

