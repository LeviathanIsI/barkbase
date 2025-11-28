/**
 * ApiCoreStack
 * 
 * Purpose: Central API Gateway configuration for BarkBase.
 * 
 * Domain Boundaries:
 * - API Gateway REST API definition
 * - Custom domain configuration
 * - API stages (dev, staging, prod)
 * - Request/response logging
 * - Rate limiting and throttling
 * - CORS configuration
 * - API key management (if needed)
 * - Lambda authorizer integration
 * 
 * Dependencies:
 * - IdentityServicesStack (Cognito authorizer)
 * - All service stacks (Lambda integrations)
 * 
 * Consumers:
 * - FrontendStack (API endpoint URL)
 * - All client applications
 * 
 * Notes:
 * - Routes are delegated to service stacks
 * - This stack owns the API Gateway resource itself
 * - Custom domain: api.barkbase.app (or similar)
 */

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface ApiCoreStackProps extends cdk.StackProps {
  // Future: cross-stack dependencies
  // userPool: cognito.IUserPool;
  // serviceLambdas: Map<string, lambda.IFunction>;
}

export class ApiCoreStack extends cdk.Stack {
  // Future exports:
  // public readonly api: apigateway.IRestApi;
  // public readonly apiEndpoint: string;
  // public readonly customDomainUrl: string;

  constructor(scope: Construct, id: string, props?: ApiCoreStackProps) {
    super(scope, id, props);

    // =======================================================================
    // PLACEHOLDER: API Core Resources
    // =======================================================================
    // TODO: Create REST API with regional endpoint
    // TODO: Configure Cognito authorizer
    // TODO: Set up custom domain with ACM certificate
    // TODO: Configure API stages with stage variables
    // TODO: Set up request/response logging to CloudWatch
    // TODO: Configure throttling (10000 req/s burst, 5000 req/s steady)
    // TODO: Enable CORS for frontend domains
    // TODO: Create usage plans for rate limiting
    // =======================================================================
  }
}

