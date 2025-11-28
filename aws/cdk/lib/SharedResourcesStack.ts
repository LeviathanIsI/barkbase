/**
 * =============================================================================
 * BarkBase Shared Resources Stack
 * =============================================================================
 * 
 * Stack Name: Barkbase-SharedResourcesStack-{env}
 * 
 * RESPONSIBILITIES:
 * -----------------
 * This stack creates shared resources used across multiple service stacks:
 * 
 * 1. Lambda Layers:
 *    - DbLayer: PostgreSQL connection pool with Secrets Manager support
 *    - (Future: Other shared layers)
 * 
 * DEPENDENCIES:
 * -------------
 * None - This stack can be deployed independently.
 * 
 * OUTPUTS (consumed by service stacks):
 * -------------------------------------
 * - DbLayerArn: ARN of the database connection layer
 * 
 * DEPLOYMENT:
 * -----------
 * Deploy after Phase 1 (Network + Database):
 * 
 * cdk deploy Barkbase-SharedResourcesStack-dev
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BarkBaseEnvironment } from './shared/ServiceStackProps';
import { DbLayer } from './shared/DbLayer';

export interface SharedResourcesStackProps extends cdk.StackProps {
  environment: BarkBaseEnvironment;
}

export class SharedResourcesStack extends cdk.Stack {
  /** The database Lambda layer */
  public readonly dbLayer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: SharedResourcesStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // =========================================================================
    // Database Layer
    // =========================================================================
    const dbLayerConstruct = new DbLayer(this, 'DbLayer', {
      environment,
    });
    this.dbLayer = dbLayerConstruct.layer;

    // =========================================================================
    // CloudFormation Outputs
    // =========================================================================
    
    new cdk.CfnOutput(this, 'DbLayerArn', {
      value: this.dbLayer.layerVersionArn,
      description: 'ARN of the database connection Lambda layer',
      exportName: `${this.stackName}-DbLayerArn`,
    });

    // =========================================================================
    // Tags
    // =========================================================================
    cdk.Tags.of(this).add('Project', 'BarkBase');
    cdk.Tags.of(this).add('Environment', environment.envName);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}

