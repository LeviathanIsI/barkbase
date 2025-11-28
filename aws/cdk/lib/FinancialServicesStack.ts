/**
 * FinancialServicesStack - handles payments, invoices, and billing routes
 * 
 * Routes handled:
 * - GET/POST /api/v1/payments
 * - GET /api/v1/payments/{paymentId}
 * - GET/POST /api/v1/invoices
 * - GET /api/v1/invoices/{invoiceId}
 * - POST /api/v1/invoices/generate/{bookingId}
 * - POST /api/v1/invoices/{invoiceId}/send-email
 * - PUT /api/v1/invoices/{invoiceId}/paid
 * - GET /api/v1/billing/overview
 * - GET /api/v1/billing/metrics
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

export interface FinancialServicesStackProps extends BaseServicesStackProps {}

export class FinancialServicesStack extends cdk.Stack {
  public readonly financialServiceFn: lambda.Function;

  constructor(scope: Construct, id: string, props: FinancialServicesStackProps) {
    super(scope, id, props);

    const dbEnv = createDbEnv(props);
    const authEnv = createAuthEnv(props.userPool, props.userPoolClient);
    const vpcConfig = createVpcConfig(props);

    // Create layers for this stack
    const dbLayer = new lambda.LayerVersion(this, "FinancialDbLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/db-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Database utilities for Financial services",
    });

    const authLayer = new lambda.LayerVersion(this, "FinancialAuthLayer", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../layers/auth-layer")
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: "Authentication utilities for Financial services",
    });

    // Financial Service Lambda
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

    // Create integration
    const financialIntegration = new integrations.HttpLambdaIntegration(
      "FinancialServiceIntegration",
      this.financialServiceFn
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
          integration: financialIntegration,
          authorizer,
        });
      });
    };

    // Payments routes
    registerRoutes("PaymentsRoot", "/api/v1/payments", [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("PaymentsById", "/api/v1/payments/{paymentId}", [
      apigwv2.HttpMethod.GET,
    ]);

    // Invoices routes
    registerRoutes("InvoicesRoot", "/api/v1/invoices", [
      apigwv2.HttpMethod.GET,
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("InvoicesById", "/api/v1/invoices/{invoiceId}", [
      apigwv2.HttpMethod.GET,
    ]);
    registerRoutes("InvoicesGenerate", "/api/v1/invoices/generate/{bookingId}", [
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("InvoicesSendEmail", "/api/v1/invoices/{invoiceId}/send-email", [
      apigwv2.HttpMethod.POST,
    ]);
    registerRoutes("InvoicesPaid", "/api/v1/invoices/{invoiceId}/paid", [
      apigwv2.HttpMethod.PUT,
    ]);

    // Billing routes
    registerRoutes("BillingOverview", "/api/v1/billing/overview", [
      apigwv2.HttpMethod.GET,
    ]);
    registerRoutes("BillingMetrics", "/api/v1/billing/metrics", [
      apigwv2.HttpMethod.GET,
    ]);

    // Export function ARN for backwards compatibility
    new cdk.CfnOutput(this, "FinancialServiceFunctionArn", {
      value: this.financialServiceFn.functionArn,
      exportName: `Barkbase-FinancialServices-${props.stage}-FinancialServiceFunctionArn`,
    });

    cdk.Tags.of(this).add("Stage", props.stage);
    cdk.Tags.of(this).add("Domain", "financial");
  }
}

