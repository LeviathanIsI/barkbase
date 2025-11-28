/**
 * EntityServicesStack - handles pets, owners, and staff routes
 * 
 * Routes handled:
 * - /api/v1/pets, /api/v1/pets/{proxy+}
 * - /api/v1/owners, /api/v1/owners/{proxy+}
 * - /api/v1/staff, /api/v1/staff/{proxy+}
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

export interface EntityServicesStackProps extends BaseServicesStackProps {}

export class EntityServicesStack extends cdk.Stack {
  public readonly entityServiceFn: lambda.Function;

  constructor(scope: Construct, id: string, props: EntityServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "EntityDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Entity services",
    });

    const authLayer = new lambda.LayerVersion(this, "EntityAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Entity services",
    });

    // Entity Service Lambda
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

    // Create integration
    const entityIntegration = new integrations.HttpLambdaIntegration(
      "EntityServiceIntegration",
      this.entityServiceFn
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
          integration: entityIntegration,
          authorizer,
        });
      });
    };

    // Pets routes
    registerRoutes("Pets", "/api/v1/pets", authenticatedMethods);
    registerRoutes("PetsProxy", "/api/v1/pets/{proxy+}", authenticatedMethods);

    // Owners routes
    registerRoutes("Owners", "/api/v1/owners", authenticatedMethods);
    registerRoutes("OwnersProxy", "/api/v1/owners/{proxy+}", authenticatedMethods);

    // Staff routes
    registerRoutes("Staff", "/api/v1/staff", authenticatedMethods);
    registerRoutes("StaffProxy", "/api/v1/staff/{proxy+}", authenticatedMethods);

    // Export function ARN for backwards compatibility
    new cdk.CfnOutput(this, "EntityServiceFunctionArn", {
      value: this.entityServiceFn.functionArn,
      exportName: `Barkbase-EntityServices-${props.stage}-EntityServiceFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "entity");
  }
}

