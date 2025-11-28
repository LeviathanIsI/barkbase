/**
 * PropertiesServicesStack - handles properties v2 API routes
 * 
 * Routes handled:
 * - GET/POST /api/v2/properties
 * - GET/PATCH/DELETE /api/v2/properties/{propertyId}
 * - POST /api/v2/properties/{propertyId}/archive
 * - POST /api/v2/properties/{propertyId}/restore
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

export interface PropertiesServicesStackProps extends BaseServicesStackProps {}

export class PropertiesServicesStack extends cdk.Stack {
  public readonly propertiesApiV2Fn: lambda.Function;

  constructor(scope: Construct, id: string, props: PropertiesServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "PropertiesDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Properties services",
    });

    const authLayer = new lambda.LayerVersion(this, "PropertiesAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Properties services",
    });

    // Properties API V2 Lambda
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

    // Create integration
    const propertiesIntegration = new integrations.HttpLambdaIntegration(
      "PropertiesApiV2Integration",
      this.propertiesApiV2Fn
    );

    const httpApi = props.httpApi;
    const authorizer = props.authorizer;

    // Helper to register routes
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
          integration: propertiesIntegration,
          authorizer,
        });
      });
    };

    // Properties V2 routes
    registerRoutes("PropertiesV2Root", "/api/v2/properties", [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("PropertiesV2ById", "/api/v2/properties/{propertyId}", [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.PATCH,
      apigwv2.HttpMethod.DELETE,
    ]);
    registerRoutes("PropertiesV2Archive", "/api/v2/properties/{propertyId}/archive", [
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("PropertiesV2Restore", "/api/v2/properties/{propertyId}/restore", [
      apigwv2.HttpMethod.POST,
    ]);

    // Export function ARN for backwards compatibility
    new cdk.CfnOutput(this, "PropertiesApiV2FunctionArn", {
      value: this.propertiesApiV2Fn.functionArn,
      exportName: `Barkbase-PropertiesServices-${props.stage}-PropertiesApiV2FunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "properties");
  }
}

