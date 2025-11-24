import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: Provision S3 buckets and CloudFront distribution in future iteration
    // TODO: Attach WAF or custom domains later as needed
    // TODO: Surface deployment outputs (domain, bucket name) when resources exist
  }
}


