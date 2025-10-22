#!/usr/bin/env node
import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || process.env.DEPLOY_STAGE || 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-2';

const stack = new CdkStack(app, `Barkbase-${stage}`, {
  env: { account, region },
  tags: { Stage: stage },
});

app.synth();
