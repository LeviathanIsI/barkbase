/**
 * =============================================================================
 * BarkBase Backend Services Stack
 * =============================================================================
 * 
 * Stack Name: Barkbase-BackendServicesStack-{env}
 * 
 * RESPONSIBILITIES:
 * -----------------
 * This stack creates the unified backend Lambda function that runs the
 * Express application via serverless-http. It includes:
 * 
 * 1. Unified Backend Lambda:
 *    - Runs the Express app from backend/
 *    - Uses serverless-http adapter
 *    - Connected to VPC with private subnets
 *    - Has DbLayer attached for database connectivity
 *    - Has IAM permissions to read DB secret
 * 
 * 2. DB Healthcheck Lambda:
 *    - Simple function to verify database connectivity
 *    - Can be invoked manually for testing
 * 
 * DEPENDENCIES:
 * -------------
 * - NetworkStack: VPC, subnets, security groups
 * - DatabaseStack: RDS instance, credentials secret
 * - SharedResourcesStack: DbLayer
 * 
 * NOTE: This stack does NOT wire API Gateway routes. That will be done in
 * a future phase (ApiCoreStack).
 * 
 * DEPLOYMENT:
 * -----------
 * cdk deploy Barkbase-BackendServicesStack-dev
 * 
 * =============================================================================
 */

import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  ServiceStackProps,
  resourceName,
  buildDbEnvironment,
  buildVpcLambdaProps,
} from './shared/ServiceStackProps';

export class BackendServicesStack extends cdk.Stack {
  /** The unified backend Lambda function */
  public readonly backendFunction: lambda.Function;
  
  /** The DB healthcheck Lambda function */
  public readonly dbHealthcheckFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    const {
      environment,
      vpc,
      appSecurityGroup,
      databaseSecret,
      databaseName,
      dbLayer,
    } = props;

    // =========================================================================
    // Shared Configuration
    // =========================================================================
    
    // Build DB environment variables using the helper
    const dbEnv = buildDbEnvironment(environment, databaseName);
    
    // Build VPC configuration using the helper
    const vpcProps = buildVpcLambdaProps(vpc, appSecurityGroup);

    // Path to backend directory
    const backendDir = path.join(__dirname, '..', '..', '..', 'backend');

    // =========================================================================
    // Unified Backend Lambda
    // =========================================================================
    // This Lambda runs the entire Express backend via serverless-http.
    // We include node_modules in the deployment since the backend has
    // runtime dependencies (serverless-http, express, bcryptjs).
    
    this.backendFunction = new lambda.Function(this, 'BackendFunction', {
      functionName: resourceName(environment, 'backend'),
      description: 'BarkBase unified backend (Express via serverless-http)',
      
      // Runtime configuration
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'lambda-handler.handler',
      
      // Code from backend directory - INCLUDE node_modules for dependencies
      code: lambda.Code.fromAsset(backendDir, {
        exclude: [
          '.env',
          '.env.*',
          '*.log',
          'coverage',
          '.nyc_output',
          '.git',
          // Exclude dev dependencies folders if any
          'test',
          'tests',
          '__tests__',
        ],
      }),
      
      // Attach the database layer
      layers: [dbLayer],
      
      // VPC configuration (private subnets with NAT for internet access)
      ...vpcProps,
      
      // Environment variables
      environment: {
        ...dbEnv,
        NODE_ENV: environment.envName === 'prod' ? 'production' : 'development',
      },
      
      // Resource limits
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      
      // Logging - using logGroup for explicit control
      logGroup: new logs.LogGroup(this, 'BackendFunctionLogGroup', {
        logGroupName: `/aws/lambda/${resourceName(environment, 'backend')}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant permission to read the database secret
    databaseSecret.grantRead(this.backendFunction);

    // =========================================================================
    // DB Healthcheck Lambda
    // =========================================================================
    // A simple Lambda to verify database connectivity. Can be invoked manually
    // via the Lambda console or AWS CLI.
    
    this.dbHealthcheckFunction = new lambda.Function(this, 'DbHealthcheckFunction', {
      functionName: resourceName(environment, 'db-healthcheck'),
      description: 'BarkBase DB connectivity healthcheck',
      
      // Runtime configuration
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      
      // Inline code for simplicity
      code: lambda.Code.fromInline(`
const { getPool, warmUp } = require('/opt/nodejs/db');

exports.handler = async (event) => {
  console.log('[DB-HEALTHCHECK] Starting healthcheck...');
  
  try {
    // Warm up the pool (fetches secret if needed)
    await warmUp();
    
    // Get the pool and run a test query
    const pool = getPool();
    const result = await pool.query('SELECT 1 AS ok, NOW() as server_time');
    
    const row = result.rows[0];
    console.log('[DB-HEALTHCHECK] Query successful:', JSON.stringify(row));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        database: {
          connected: true,
          serverTime: row.server_time,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('[DB-HEALTHCHECK] Error:', error.message);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
      `),
      
      // Attach the database layer
      layers: [dbLayer],
      
      // VPC configuration (same as backend)
      ...vpcProps,
      
      // Environment variables
      environment: {
        ...dbEnv,
      },
      
      // Resource limits (lightweight function)
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      
      // Logging - using logGroup for explicit control
      logGroup: new logs.LogGroup(this, 'DbHealthcheckFunctionLogGroup', {
        logGroupName: `/aws/lambda/${resourceName(environment, 'db-healthcheck')}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant permission to read the database secret
    databaseSecret.grantRead(this.dbHealthcheckFunction);

    // =========================================================================
    // CloudFormation Outputs
    // =========================================================================
    
    new cdk.CfnOutput(this, 'BackendFunctionArn', {
      value: this.backendFunction.functionArn,
      description: 'ARN of the unified backend Lambda function',
      exportName: `${this.stackName}-BackendFunctionArn`,
    });

    new cdk.CfnOutput(this, 'BackendFunctionName', {
      value: this.backendFunction.functionName,
      description: 'Name of the unified backend Lambda function',
      exportName: `${this.stackName}-BackendFunctionName`,
    });

    new cdk.CfnOutput(this, 'DbHealthcheckFunctionArn', {
      value: this.dbHealthcheckFunction.functionArn,
      description: 'ARN of the DB healthcheck Lambda function',
      exportName: `${this.stackName}-DbHealthcheckFunctionArn`,
    });

    new cdk.CfnOutput(this, 'DbHealthcheckFunctionName', {
      value: this.dbHealthcheckFunction.functionName,
      description: 'Name of the DB healthcheck Lambda function',
      exportName: `${this.stackName}-DbHealthcheckFunctionName`,
    });

    // =========================================================================
    // Tags
    // =========================================================================
    cdk.Tags.of(this).add('Project', 'BarkBase');
    cdk.Tags.of(this).add('Environment', environment.envName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
