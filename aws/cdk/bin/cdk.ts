#!/usr/bin/env node
import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import { EdgeWafStack } from '../lib/edge-waf-stack';
import { BarkbaseUnifiedBackendStack } from '../lib/barkbase-unified-backend-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || process.env.DEPLOY_STAGE || 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-2';

const main = new CdkStack(app, `Barkbase-${stage}`, {
  env: { account, region },
  tags: { Stage: stage },
});

new BarkbaseUnifiedBackendStack(app, `Barkbase-UnifiedBackend-${stage}`, {
  env: { account, region },
  tags: { Stage: stage },
  dbEnvironment: main.dbEnvironment,
  dbSecret: main.dbSecret,
  dbLayer: main.dbLayer,
  authLayer: main.authLayer,
  userPool: main.userPool,
  userPoolClient: main.userPoolClient,
  vpc: main.deployLambdasInVpc ? main.vpc : undefined,
  securityGroups: main.deployLambdasInVpc ? [main.lambdaSecurityGroup] : undefined,
  deployInVpc: main.deployLambdasInVpc,
});


// Optional: deploy WAF stack in us-east-1 and pass its ARN via context later
const deployEdgeWaf = app.node.tryGetContext('deployEdgeWaf');
if (deployEdgeWaf && account) {
  new EdgeWafStack(app, `Barkbase-EdgeWaf-${stage}`, {
    env: { account, region: 'us-east-1' },
    tags: { Stage: stage },
  });
}

app.synth();
