/**
 * =============================================================================
 * BarkBase API Core Stack
 * =============================================================================
 * 
 * Stack Name: Barkbase-ApiCoreStack-{env}
 * 
 * RESPONSIBILITIES:
 * -----------------
 * This stack creates the HTTP API (API Gateway v2) that routes all requests
 * to the unified backend Lambda:
 * 
 * 1. HTTP API:
 *    - Name: barkbase-{env}-http-api
 *    - Protocol: HTTP (API Gateway v2)
 *    - Routes all requests to the unified backend Lambda
 * 
 * 2. Routing:
 *    - $default route catches all paths and methods
 *    - Express backend handles actual routing (/api/v1/*, /health, etc.)
 * 
 * 3. CORS:
 *    - Configured for frontend access
 *    - Allows standard methods and headers
 * 
 * DEPENDENCIES:
 * -------------
 * - BackendServicesStack: Unified backend Lambda function
 * 
 * NOTE: This stack does NOT include Cognito/auth. That will be a future phase.
 * 
 * DEPLOYMENT:
 * -----------
 * cdk deploy Barkbase-ApiCoreStack-dev
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BarkBaseEnvironment, resourceName } from './shared/ServiceStackProps';

export interface ApiCoreStackProps extends cdk.StackProps {
  /** Environment configuration */
  environment: BarkBaseEnvironment;
  /** The unified backend Lambda function from BackendServicesStack */
  backendFunction: lambda.IFunction;
}

export class ApiCoreStack extends cdk.Stack {
  /** The HTTP API */
  public readonly httpApi: apigw.HttpApi;

  constructor(scope: Construct, id: string, props: ApiCoreStackProps) {
    super(scope, id, props);

    const { environment, backendFunction } = props;

    // =========================================================================
    // HTTP API
    // =========================================================================
    // Create an HTTP API (API Gateway v2) with CORS configured.
    // This is more cost-effective and lower-latency than REST API (v1).
    
    this.httpApi = new apigw.HttpApi(this, 'HttpApi', {
      apiName: resourceName(environment, 'http-api'),
      description: 'BarkBase HTTP API - Routes to unified backend Lambda',
      
      // CORS configuration for frontend access
      corsPreflight: {
        allowOrigins: this.getAllowedOrigins(environment),
        allowMethods: [
          apigw.CorsHttpMethod.GET,
          apigw.CorsHttpMethod.POST,
          apigw.CorsHttpMethod.PUT,
          apigw.CorsHttpMethod.PATCH,
          apigw.CorsHttpMethod.DELETE,
          apigw.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Tenant-Id',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
      
      // Disable execute-api endpoint if using custom domain (future)
      disableExecuteApiEndpoint: false,
    });

    // =========================================================================
    // Lambda Integration
    // =========================================================================
    // Create a Lambda integration that proxies all requests to the backend.
    
    const backendIntegration = new integrations.HttpLambdaIntegration(
      'BackendIntegration',
      backendFunction,
      {
        payloadFormatVersion: apigw.PayloadFormatVersion.VERSION_2_0,
      }
    );

    // =========================================================================
    // Routes
    // =========================================================================
    // Use $default route to catch ALL requests (any method, any path).
    // The Express backend will handle actual routing:
    // - /api/v1/* - API endpoints
    // - /health - Health check endpoint
    
    this.httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: backendIntegration,
    });

    // Also add a root route for /health or root-level requests
    this.httpApi.addRoutes({
      path: '/',
      methods: [apigw.HttpMethod.ANY],
      integration: backendIntegration,
    });

    // =========================================================================
    // CloudFormation Outputs
    // =========================================================================
    
    new cdk.CfnOutput(this, 'HttpApiId', {
      value: this.httpApi.httpApiId,
      description: 'HTTP API ID',
      exportName: `${this.stackName}-HttpApiId`,
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'HTTP API base URL',
      exportName: `${this.stackName}-HttpApiUrl`,
    });

    new cdk.CfnOutput(this, 'HttpApiStage', {
      value: this.httpApi.defaultStage?.stageName || '$default',
      description: 'HTTP API default stage name',
      exportName: `${this.stackName}-HttpApiStage`,
    });

    // =========================================================================
    // Tags
    // =========================================================================
    cdk.Tags.of(this).add('Project', 'BarkBase');
    cdk.Tags.of(this).add('Environment', environment.envName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }

  /**
   * Get allowed CORS origins based on environment
   * Note: Cannot use '*' with allowCredentials=true
   */
  private getAllowedOrigins(environment: BarkBaseEnvironment): string[] {
    if (environment.envName === 'prod') {
      // TODO: Replace with actual production frontend domain(s)
      return [
        'https://app.barkbase.com',
        'https://www.barkbase.com',
      ];
    }
    
    // Dev/staging: allow localhost origins
    // Note: Wildcard (*) is not allowed when credentials are enabled
    return [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
      'http://localhost:4173', // Vite preview
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4173',
    ];
  }
}

