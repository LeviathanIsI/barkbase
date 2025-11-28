/**
 * FinancialServicesStack
 * 
 * Purpose: Financial operations and payment processing for BarkBase.
 * 
 * Domain Boundaries:
 * - Invoice generation and management
 * - Payment processing
 * - Billing metrics and reporting
 * 
 * Lambda Functions:
 * - FinancialServiceFunction: /api/v1/payments/*, /api/v1/invoices/*,
 *   /api/v1/billing/*
 * 
 * API Routes Owned:
 * - POST /api/v1/payments
 * - GET /api/v1/payments
 * - POST /api/v1/invoices
 * - GET /api/v1/invoices
 * - POST /api/v1/invoices/generate/{bookingId}
 * - GET /api/v1/billing/metrics
 * 
 * Dependencies:
 * - NetworkStack (VPC, security groups, subnets)
 * - DatabaseStack (credentials secret)
 * 
 * Security Notes:
 * - PCI compliance considerations for payment processing
 * - All financial operations must be audited
 * 
 * Resource Count: ~5-8 resources (1 Lambda + LogGroup + IAM)
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ServiceStackProps, buildLambdaEnvironment } from './shared/ServiceStackProps';
import * as path from 'path';

export interface FinancialServicesStackProps extends ServiceStackProps {
  // Financial-specific props can be added here
  // Future: Stripe API key secret ARN
}

export class FinancialServicesStack extends cdk.Stack {
  /**
   * Financial Service Lambda - handles payments, invoices, billing
   */
  public readonly financialServiceFunction: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: FinancialServicesStackProps) {
    super(scope, id, props);

    // Build shared Lambda environment
    const lambdaEnv = buildLambdaEnvironment(props);

    // =========================================================================
    // Financial Service Function
    // =========================================================================
    this.financialServiceFunction = new nodejs.NodejsFunction(this, 'FinancialServiceFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      functionName: `barkbase-${props.stage}-financial-service`,
      description: 'BarkBase Financial Service - payments, invoices, billing',
      entry: path.join(__dirname, '../../lambdas/financial-service/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(15),
      memorySize: 512,
      vpc: props.vpc,
      vpcSubnets: { subnets: props.appSubnets },
      securityGroups: [props.lambdaSecurityGroup],
      tracing: lambda.Tracing.ACTIVE,
      environment: lambdaEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    new logs.LogGroup(this, 'FinancialServiceLogGroup', {
      logGroupName: `/aws/lambda/barkbase-${props.stage}-financial-service`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Grant Secrets Manager read access
    props.dbSecret.grantRead(this.financialServiceFunction);

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'FinancialServiceFunctionArn', {
      value: this.financialServiceFunction.functionArn,
      description: 'Financial Service Lambda function ARN',
      exportName: `${this.stackName}-FinancialServiceFunctionArn`,
    });
  }
}
