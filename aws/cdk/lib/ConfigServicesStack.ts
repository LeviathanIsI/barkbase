/**
 * ConfigServicesStack - handles roles, tenants, memberships, facility, services,
 * account-defaults, packages, and associations routes
 * 
 * Routes handled:
 * - /api/v1/roles, /api/v1/roles/{proxy+}
 * - /api/v1/user-permissions, /api/v1/user-permissions/{proxy+}
 * - /api/v1/tenants, /api/v1/tenants/{proxy+}
 * - /api/v1/memberships, /api/v1/memberships/{proxy+}
 * - /api/v1/facility, /api/v1/facility/{proxy+}
 * - /api/v1/services, /api/v1/services/{proxy+}
 * - /api/v1/account-defaults, /api/v1/account-defaults/{proxy+}
 * - /api/v1/packages, /api/v1/packages/{proxy+}
 * - /api/v1/associations, /api/v1/associations/{proxy+}
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

export interface ConfigServicesStackProps extends BaseServicesStackProps {}

export class ConfigServicesStack extends cdk.Stack {
  public readonly rolesConfigServiceFn: lambda.Function;
  public readonly tenantsMembershipsConfigServiceFn: lambda.Function;
  public readonly facilityServicesConfigServiceFn: lambda.Function;

  constructor(scope: Construct, id: string, props: ConfigServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "ConfigDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Config services",
    });

    const authLayer = new lambda.LayerVersion(this, "ConfigAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Config services",
    });

    // Helper function to create config lambdas
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

    // Create three config service lambdas (same as original ServicesStack)
    this.rolesConfigServiceFn = createConfigLambda("RolesConfigServiceFunction");
    this.tenantsMembershipsConfigServiceFn = createConfigLambda(
      "TenantsMembershipsConfigServiceFunction"
    );
    this.facilityServicesConfigServiceFn = createConfigLambda(
      "FacilityServicesConfigServiceFunction"
    );

    // Create integrations
    const rolesConfigIntegration = new integrations.HttpLambdaIntegration(
      "RolesConfigServiceIntegration",
      this.rolesConfigServiceFn
    );
    const tenantsMembershipsConfigIntegration = new integrations.HttpLambdaIntegration(
      "TenantsMembershipsConfigServiceIntegration",
      this.tenantsMembershipsConfigServiceFn
    );
    const facilityServicesConfigIntegration = new integrations.HttpLambdaIntegration(
      "FacilityServicesConfigServiceIntegration",
      this.facilityServicesConfigServiceFn
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

    // Helper to register routes
    const registerRoutes = (
      prefix: string,
      routePath: string,
      methods: apigwv2.HttpMethod[],
      integration: integrations.HttpLambdaIntegration
    ) => {
      const normalizedPath = routePath.replace(/[^A-Za-z0-9]/g, "") || "Root";
      methods.forEach((method) => {
        new apigwv2.HttpRoute(this, `${prefix}${method}${normalizedPath}`, {
          httpApi: httpApi as apigwv2.HttpApi,
          routeKey: apigwv2.HttpRouteKey.with(routePath, method),
          integration,
          authorizer,
        });
      });
    };

    // Roles and user-permissions routes
    ["/api/v1/roles", "/api/v1/user-permissions"].forEach((routePath) => {
      const prefix = `RolesConfig${routePath.replace(/[^A-Za-z0-9]/g, "")}`;
      registerRoutes(prefix, routePath, authenticatedMethods, rolesConfigIntegration);
      registerRoutes(
        `${prefix}Proxy`,
        `${routePath}/{proxy+}`,
        authenticatedMethods,
        rolesConfigIntegration
      );
    });

    // Tenants and memberships routes
    ["/api/v1/tenants", "/api/v1/memberships"].forEach((routePath) => {
      const prefix = `TenantsConfig${routePath.replace(/[^A-Za-z0-9]/g, "")}`;
      registerRoutes(
        prefix,
        routePath,
        authenticatedMethods,
        tenantsMembershipsConfigIntegration
      );
      registerRoutes(
        `${prefix}Proxy`,
        `${routePath}/{proxy+}`,
        authenticatedMethods,
        tenantsMembershipsConfigIntegration
      );
    });

    // Facility, services, account-defaults, packages, associations routes
    [
      "/api/v1/facility",
      "/api/v1/services",
      "/api/v1/account-defaults",
      "/api/v1/packages",
      "/api/v1/associations",
    ].forEach((routePath) => {
      const prefix = `FacilityConfig${routePath.replace(/[^A-Za-z0-9]/g, "")}`;
      registerRoutes(
        prefix,
        routePath,
        authenticatedMethods,
        facilityServicesConfigIntegration
      );
      registerRoutes(
        `${prefix}Proxy`,
        `${routePath}/{proxy+}`,
        authenticatedMethods,
        facilityServicesConfigIntegration
      );
    });

    // Export function ARNs for backwards compatibility
    new cdk.CfnOutput(this, "RolesConfigServiceFunctionArn", {
      value: this.rolesConfigServiceFn.functionArn,
      exportName: `Barkbase-ConfigServices-${props.stage}-RolesConfigServiceFunctionArn`,
    });
    new cdk.CfnOutput(this, "TenantsMembershipsConfigServiceFunctionArn", {
      value: this.tenantsMembershipsConfigServiceFn.functionArn,
      exportName: `Barkbase-ConfigServices-${props.stage}-TenantsMembershipsConfigServiceFunctionArn`,
    });
    new cdk.CfnOutput(this, "FacilityServicesConfigServiceFunctionArn", {
      value: this.facilityServicesConfigServiceFn.functionArn,
      exportName: `Barkbase-ConfigServices-${props.stage}-FacilityServicesConfigServiceFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "config");
  }
}

