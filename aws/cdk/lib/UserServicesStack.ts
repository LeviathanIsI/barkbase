/**
 * UserServicesStack - handles user profile routes
 * 
 * Routes handled:
 * - GET /api/v1/profiles
 * - GET/POST /api/v1/users/{userId}/profiles
 * - GET/PATCH /api/v1/users/profile
 * - POST /api/v1/users/password
 * - PATCH /api/v1/users/avatar
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

export interface UserServicesStackProps extends BaseServicesStackProps {}

export class UserServicesStack extends cdk.Stack {
  public readonly userProfileServiceFn: lambda.Function;

  constructor(scope: Construct, id: string, props: UserServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "UserDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for User services",
    });

    const authLayer = new lambda.LayerVersion(this, "UserAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for User services",
    });

    // User Profile Service Lambda
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

    // Create integration
    const userProfileIntegration = new integrations.HttpLambdaIntegration(
      "UserProfileServiceIntegration",
      this.userProfileServiceFn
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
          integration: userProfileIntegration,
          authorizer,
        });
      });
    };

    // User profile routes
    registerRoutes("ProfilesRoot", "/api/v1/profiles", [apigwv2.HttpMethod.GET]);
    registerRoutes("UserProfiles", "/api/v1/users/{userId}/profiles", [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("CurrentUserProfile", "/api/v1/users/profile", [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.PATCH,
    ]);
    registerRoutes("UserPassword", "/api/v1/users/password", [
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("UserAvatar", "/api/v1/users/avatar", [
      apigwv2.HttpMethod.PATCH,
    ]);

    // Export function ARN for backwards compatibility
    new cdk.CfnOutput(this, "UserProfileServiceFunctionArn", {
      value: this.userProfileServiceFn.functionArn,
      exportName: `Barkbase-UserServices-${props.stage}-UserProfileServiceFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "user");
  }
}

