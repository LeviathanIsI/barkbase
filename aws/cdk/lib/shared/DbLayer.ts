/**
 * =============================================================================
 * BarkBase Database Lambda Layer
 * =============================================================================
 *
 * This construct creates a Lambda Layer containing the database connection
 * module that provides:
 * - PostgreSQL connection pooling via pg (node-postgres)
 * - AWS Secrets Manager integration for credentials
 * - Automatic connection management
 *
 * LAYER CONTENTS:
 * ---------------
 * /opt/nodejs/db.js - Main module exporting getPool()
 * /opt/nodejs/node_modules/pg - PostgreSQL driver
 * /opt/nodejs/node_modules/@aws-sdk/client-secrets-manager - AWS SDK
 *
 * USAGE IN LAMBDA:
 * ----------------
 * const { getPool } = require('/opt/nodejs/db');
 * const pool = getPool();
 * const result = await pool.query('SELECT * FROM "Pet"');
 *
 * =============================================================================
 */

import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BarkBaseEnvironment, resourceName } from './ServiceStackProps';

export interface DbLayerProps {
  environment: BarkBaseEnvironment;
}

export class DbLayer extends Construct {
  public readonly layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: DbLayerProps) {
    super(scope, id);

    const { environment } = props;

    // Path to the db-layer directory (relative to CDK project root)
    const layerPath = path.join(__dirname, '..', '..', '..', 'layers', 'db-layer');

    this.layer = new lambda.LayerVersion(this, 'DbLayer', {
      layerVersionName: resourceName(environment, 'db-layer'),
      description: 'BarkBase database connection layer with pg and Secrets Manager support',
      code: lambda.Code.fromAsset(layerPath, {
        // The layer expects the 'nodejs' folder structure
        // aws/layers/db-layer/nodejs/ -> /opt/nodejs/
      }),
      compatibleRuntimes: [
        lambda.Runtime.NODEJS_18_X,
        lambda.Runtime.NODEJS_20_X,
      ],
      compatibleArchitectures: [
        lambda.Architecture.X86_64,
        lambda.Architecture.ARM_64,
      ],
    });
  }
}

