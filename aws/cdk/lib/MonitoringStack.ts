import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: Add CloudWatch dashboards, alarms, and SNS topics here
    // TODO: Wire metrics from API Gateway, Lambda, and RDS when ready
  }
}


