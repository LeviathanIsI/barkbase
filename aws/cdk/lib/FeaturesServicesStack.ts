/**
 * FeaturesServicesStack - handles tasks, notes, incidents, messages, communications, 
 * invites, segments, and notifications routes
 * 
 * Routes handled:
 * - /api/v1/tasks, /api/v1/tasks/{proxy+}
 * - /api/v1/notes, /api/v1/notes/{proxy+}
 * - /api/v1/incidents, /api/v1/incidents/{proxy+}
 * - /api/v1/messages, /api/v1/messages/{proxy+}
 * - /api/v1/communications, /api/v1/communications/{proxy+}
 * - /api/v1/invites, /api/v1/invites/{proxy+}
 * - /api/v1/segments, /api/v1/segments/{proxy+}
 * - /api/v1/notifications, /api/v1/notifications/{proxy+}
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

export interface FeaturesServicesStackProps extends BaseServicesStackProps {}

export class FeaturesServicesStack extends cdk.Stack {
  public readonly featuresServiceFn: lambda.Function;

  constructor(scope: Construct, id: string, props: FeaturesServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "FeaturesDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Features services",
    });

    const authLayer = new lambda.LayerVersion(this, "FeaturesAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Features services",
    });

    // Features Service Lambda
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

    // Create integration
    const featuresIntegration = new integrations.HttpLambdaIntegration(
      "FeaturesServiceIntegration",
      this.featuresServiceFn
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
          integration: featuresIntegration,
          authorizer,
        });
      });
    };

    // Feature domain routes
    const basePaths = [
      "/api/v1/tasks",
      "/api/v1/notes",
      "/api/v1/incidents",
      "/api/v1/messages",
      "/api/v1/communications",
      "/api/v1/invites",
      "/api/v1/segments",
      "/api/v1/notifications",
    ];

    basePaths.forEach((routePath) => {
      const prefix = `Feature${routePath.replace(/[^A-Za-z0-9]/g, "")}`;
      registerRoutes(prefix, routePath, authenticatedMethods);
      registerRoutes(`${prefix}Proxy`, `${routePath}/{proxy+}`, authenticatedMethods);
    });

    // Export function ARN for backwards compatibility
    new cdk.CfnOutput(this, "FeaturesServiceFunctionArn", {
      value: this.featuresServiceFn.functionArn,
      exportName: `Barkbase-FeaturesServices-${props.stage}-FeaturesServiceFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "features");
  }
}

