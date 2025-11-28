/**
 * OperationsServicesStack - handles bookings, runs, check-ins, check-outs, and kennels routes
 * 
 * Routes handled:
 * - /api/v1/bookings, /api/v1/bookings/{proxy+}
 * - /api/v1/runs, /api/v1/runs/{proxy+}, /api/v1/runs/assignments
 * - /api/v1/run-templates, /api/v1/run-templates/{proxy+}
 * - /api/v1/check-ins, /api/v1/check-ins/{proxy+}
 * - /api/v1/check-outs, /api/v1/check-outs/{proxy+}
 * - /api/v1/kennels, /api/v1/kennels/{proxy+}, /api/v1/kennels/occupancy
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

export interface OperationsServicesStackProps extends BaseServicesStackProps {}

export class OperationsServicesStack extends cdk.Stack {
  public readonly operationsServiceFn: lambda.Function;

  constructor(scope: Construct, id: string, props: OperationsServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "OperationsDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Operations services",
    });

    const authLayer = new lambda.LayerVersion(this, "OperationsAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Operations services",
    });

    // Operations Service Lambda
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

    // Create integration
    const operationsIntegration = new integrations.HttpLambdaIntegration(
      "OperationsServiceIntegration",
      this.operationsServiceFn
    );

    const httpApi = props.httpApi;
    const authorizer = props.authorizer;

    const authenticatedMethods = [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
      apigwv2.HttpMethod.PUT,
      apigwv2.HttpMethod.PATCH,
      apigwv2.HttpMethod.DELETE,
    ];

    // Helper to register routes with all methods
    const registerRoutes = (
      prefix: string,
      routePath: string,
      methods: apigwv2.HttpMethod[]
    ) => {
      const normalizedPath = routePath.replace(/[^A-Za-z0-9]/g, "") || "Root";
      methods.forEach((method) => {
        new apigwv2.HttpRoute(this, `${prefix}${method}${normalizedPath}`, {
          httpApi: httpApi as apigwv2.HttpApi,
          routeKey: apigwv2.HttpRouteKey.with(routePath, method),
          integration: operationsIntegration,
          authorizer,
        });
      });
    };

    // Bookings routes
    registerRoutes("Bookings", "/api/v1/bookings", authenticatedMethods);
    registerRoutes("BookingsProxy", "/api/v1/bookings/{proxy+}", authenticatedMethods);

    // Runs routes
    registerRoutes("Runs", "/api/v1/runs", authenticatedMethods);
    registerRoutes("RunsProxy", "/api/v1/runs/{proxy+}", authenticatedMethods);
    registerRoutes("RunsAssignments", "/api/v1/runs/assignments", [apigwv2.HttpMethod.GET]);

    // Run Templates routes
    registerRoutes("RunTemplates", "/api/v1/run-templates", authenticatedMethods);
    registerRoutes("RunTemplatesProxy", "/api/v1/run-templates/{proxy+}", authenticatedMethods);

    // Check-ins routes
    registerRoutes("CheckIns", "/api/v1/check-ins", authenticatedMethods);
    registerRoutes("CheckInsProxy", "/api/v1/check-ins/{proxy+}", authenticatedMethods);

    // Check-outs routes
    registerRoutes("CheckOuts", "/api/v1/check-outs", authenticatedMethods);
    registerRoutes("CheckOutsProxy", "/api/v1/check-outs/{proxy+}", authenticatedMethods);

    // Kennels routes
    registerRoutes("Kennels", "/api/v1/kennels", authenticatedMethods);
    registerRoutes("KennelsProxy", "/api/v1/kennels/{proxy+}", authenticatedMethods);
    registerRoutes("KennelsOccupancy", "/api/v1/kennels/occupancy", [apigwv2.HttpMethod.GET]);

    // Export function ARN for backwards compatibility
    new cdk.CfnOutput(this, "OperationsServiceFunctionArn", {
      value: this.operationsServiceFn.functionArn,
      exportName: `Barkbase-OperationsServices-${props.stage}-OperationsServiceFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "operations");
  }
}

