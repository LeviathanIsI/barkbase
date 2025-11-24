import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';

export interface JobsStackProps extends cdk.StackProps {
  stage: string;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  dbSecret: secretsmanager.ISecret;
  dbHost: string;
  dbPort: number;
  dbName: string;
}

export class JobsStack extends cdk.Stack {
  public readonly propertyArchivalFn: lambda.Function;
  public readonly propertyPermanentDeletionFn: lambda.Function;
  public readonly migrationApiFn: lambda.Function;

  constructor(scope: Construct, id: string, props: JobsStackProps) {
    super(scope, id, props);

    const dbEnv = {
      DB_HOST: props.dbHost,
      DB_PORT: props.dbPort.toString(),
      DB_NAME: props.dbName,
      DB_SECRET_ID: props.dbSecret.secretName,
      DB_SECRET_ARN: props.dbSecret.secretArn,
      ENVIRONMENT: props.stage,
      STAGE: props.stage,
    };

    const vpcConfig = {
      vpc: props.vpc,
      securityGroups: [props.lambdaSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    };

    this.propertyArchivalFn = new lambda.Function(this, 'PropertyArchivalJobFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/property-archival-job')),
      environment: dbEnv,
      timeout: cdk.Duration.minutes(15),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.propertyArchivalFn);

    this.propertyPermanentDeletionFn = new lambda.Function(
      this,
      'PropertyPermanentDeletionJobFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(
          path.join(__dirname, '../../lambdas/property-permanent-deletion-job'),
        ),
        environment: dbEnv,
        timeout: cdk.Duration.minutes(15),
        ...vpcConfig,
      },
    );
    props.dbSecret.grantRead(this.propertyPermanentDeletionFn);

    this.migrationApiFn = new lambda.Function(this, 'MigrationApiFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambdas/migration-api')),
      environment: dbEnv,
      timeout: cdk.Duration.seconds(60),
      ...vpcConfig,
    });
    props.dbSecret.grantRead(this.migrationApiFn);

    const archivalRule = new events.Rule(this, 'PropertyArchivalSchedule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '2' }),
    });
    archivalRule.addTarget(new targets.LambdaFunction(this.propertyArchivalFn));

    const permanentDeletionRule = new events.Rule(this, 'PropertyPermanentDeletionSchedule', {
      schedule: events.Schedule.cron({ minute: '0', hour: '3', weekDay: 'SUN' }),
    });
    permanentDeletionRule.addTarget(new targets.LambdaFunction(this.propertyPermanentDeletionFn));

    cdk.Tags.of(this).add('Stage', props.stage);
  }
}



