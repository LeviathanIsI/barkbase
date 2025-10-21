#!/usr/bin/env node
import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';

const app = new cdk.App();
new CdkStack(app, 'BarkbaseStack', {
  env: { 
    account: '211125574375', 
    region: 'us-east-2' 
  },
});
