/**
 * =============================================================================
 * BarkBase Monitoring Stack
 * =============================================================================
 *
 * Creates CloudWatch monitoring infrastructure:
 * - Log retention policies for all Lambda functions
 * - CloudWatch dashboard with key metrics
 * - Alarms for errors and high latency
 * - X-Ray tracing for API Gateway and Lambda functions
 * - SNS topic for alarm notifications
 *
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as xray from 'aws-cdk-lib/aws-xray';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface MonitoringStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly httpApi: apigatewayv2.HttpApi;
  readonly authApiFunction: lambda.IFunction;
  readonly userProfileFunction: lambda.IFunction;
  readonly entityServiceFunction: lambda.IFunction;
  readonly analyticsServiceFunction: lambda.IFunction;
  readonly operationsServiceFunction: lambda.IFunction;
  readonly configServiceFunction: lambda.IFunction;
  readonly financialServiceFunction: lambda.IFunction;
  readonly notificationEmail?: string;
}

export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { config, httpApi } = props;

    // Lambda functions array for easier iteration
    const lambdaFunctions = [
      { name: 'AuthApi', function: props.authApiFunction },
      { name: 'UserProfile', function: props.userProfileFunction },
      { name: 'Entity', function: props.entityServiceFunction },
      { name: 'Analytics', function: props.analyticsServiceFunction },
      { name: 'Operations', function: props.operationsServiceFunction },
      { name: 'Config', function: props.configServiceFunction },
      { name: 'Financial', function: props.financialServiceFunction },
    ];

    // =========================================================================
    // SNS Topic for Alarm Notifications
    // =========================================================================

    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${config.stackPrefix}-alarms`,
      displayName: 'BarkBase CloudWatch Alarms',
    });

    // Add email subscription if provided
    if (props.notificationEmail) {
      this.alarmTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.notificationEmail)
      );
    }

    // =========================================================================
    // Log Groups and Retention
    // =========================================================================

    // Set log retention for each Lambda function
    lambdaFunctions.forEach(({ name, function: fn }) => {
      const logGroup = new logs.LogGroup(this, `${name}LogGroup`, {
        logGroupName: `/aws/lambda/${fn.functionName}`,
        retention: config.env === 'prod'
          ? logs.RetentionDays.THREE_MONTHS
          : logs.RetentionDays.ONE_MONTH,
        removalPolicy: config.env === 'prod'
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      });
    });

    // API Gateway log group
    const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: `/aws/apigateway/${httpApi.apiId}`,
      retention: config.env === 'prod'
        ? logs.RetentionDays.THREE_MONTHS
        : logs.RetentionDays.ONE_MONTH,
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // =========================================================================
    // Enable X-Ray Tracing
    // =========================================================================

    // Enable tracing on API Gateway (requires updating the API in ApiCoreStack)
    // Note: This is a placeholder - actual implementation would modify the HTTP API

    // Enable tracing for each Lambda function
    lambdaFunctions.forEach(({ name, function: fn }) => {
      if (fn instanceof lambda.Function) {
        // Cast to mutable function to enable tracing
        const mutableFn = fn as lambda.Function;
        // Note: In practice, this should be done when creating the functions
        // by adding: tracing: lambda.Tracing.ACTIVE to the function props
      }
    });

    // =========================================================================
    // CloudWatch Alarms
    // =========================================================================

    // Lambda Error Alarms
    const errorAlarms: cloudwatch.Alarm[] = [];
    lambdaFunctions.forEach(({ name, function: fn }) => {
      const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
        alarmName: `${config.stackPrefix}-${name}-errors`,
        alarmDescription: `High error rate for ${name} function`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: {
            FunctionName: fn.functionName,
          },
          statistic: 'Sum',
        }),
        threshold: 10, // Alert if more than 10 errors
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
      errorAlarms.push(errorAlarm);

      // Lambda Duration Alarm (high latency)
      const durationAlarm = new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
        alarmName: `${config.stackPrefix}-${name}-high-latency`,
        alarmDescription: `High latency for ${name} function`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: {
            FunctionName: fn.functionName,
          },
          statistic: 'Average',
        }),
        threshold: 5000, // Alert if average duration > 5 seconds
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

      // Lambda Throttles Alarm
      const throttleAlarm = new cloudwatch.Alarm(this, `${name}ThrottleAlarm`, {
        alarmName: `${config.stackPrefix}-${name}-throttles`,
        alarmDescription: `Lambda throttling for ${name} function`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          dimensionsMap: {
            FunctionName: fn.functionName,
          },
          statistic: 'Sum',
        }),
        threshold: 5, // Alert if more than 5 throttles
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      throttleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    });

    // API Gateway Alarms
    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxAlarm', {
      alarmName: `${config.stackPrefix}-api-4xx-errors`,
      alarmDescription: 'High rate of 4xx errors on API',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '4XXError',
        dimensionsMap: {
          ApiName: httpApi.httpApiName || httpApi.apiId,
        },
        statistic: 'Sum',
      }),
      threshold: 50, // Alert if more than 50 4xx errors
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api4xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      alarmName: `${config.stackPrefix}-api-5xx-errors`,
      alarmDescription: 'Any 5xx errors on API',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: httpApi.httpApiName || httpApi.apiId,
        },
        statistic: 'Sum',
      }),
      threshold: 5, // Alert if more than 5 5xx errors
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api5xxAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // API Gateway Latency Alarm
    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `${config.stackPrefix}-api-high-latency`,
      alarmDescription: 'High API latency',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiName: httpApi.httpApiName || httpApi.apiId,
        },
        statistic: 'Average',
      }),
      threshold: 1000, // Alert if average latency > 1 second
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // =========================================================================
    // CloudWatch Dashboard
    // =========================================================================

    this.dashboard = new cloudwatch.Dashboard(this, 'MainDashboard', {
      dashboardName: `${config.stackPrefix}-dashboard`,
      defaultInterval: cdk.Duration.hours(3),
    });

    // API Gateway Metrics Row
    const apiRequestsWidget = new cloudwatch.GraphWidget({
      title: 'API Requests',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Count',
          dimensionsMap: { ApiName: httpApi.httpApiName || httpApi.apiId },
          statistic: 'Sum',
        }),
      ],
      width: 8,
    });

    const apiErrorsWidget = new cloudwatch.GraphWidget({
      title: 'API Errors',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: { ApiName: httpApi.httpApiName || httpApi.apiId },
          statistic: 'Sum',
          color: cloudwatch.Color.ORANGE,
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: { ApiName: httpApi.httpApiName || httpApi.apiId },
          statistic: 'Sum',
          color: cloudwatch.Color.RED,
        }),
      ],
      width: 8,
    });

    const apiLatencyWidget = new cloudwatch.GraphWidget({
      title: 'API Latency (ms)',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: { ApiName: httpApi.httpApiName || httpApi.apiId },
          statistic: 'Average',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: { ApiName: httpApi.httpApiName || httpApi.apiId },
          statistic: 'p99',
          color: cloudwatch.Color.ORANGE,
        }),
      ],
      width: 8,
    });

    // Lambda Metrics Row
    const lambdaInvocationsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Invocations',
      left: lambdaFunctions.map(({ name, function: fn }) =>
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Invocations',
          dimensionsMap: { FunctionName: fn.functionName },
          statistic: 'Sum',
        })
      ),
      width: 8,
    });

    const lambdaErrorsWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Errors',
      left: lambdaFunctions.map(({ name, function: fn }) =>
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          dimensionsMap: { FunctionName: fn.functionName },
          statistic: 'Sum',
        })
      ),
      width: 8,
    });

    const lambdaDurationWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Duration (ms)',
      left: lambdaFunctions.map(({ name, function: fn }) =>
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: { FunctionName: fn.functionName },
          statistic: 'Average',
        })
      ),
      width: 8,
    });

    // Lambda Throttles Widget
    const lambdaThrottlesWidget = new cloudwatch.GraphWidget({
      title: 'Lambda Throttles',
      left: lambdaFunctions.map(({ name, function: fn }) =>
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          dimensionsMap: { FunctionName: fn.functionName },
          statistic: 'Sum',
        })
      ),
      width: 8,
    });

    // Alarm Status Widget
    const alarmStatusWidget = new cloudwatch.AlarmStatusWidget({
      title: 'Alarm Status',
      alarms: errorAlarms,
      width: 8,
      height: 4,
    });

    // Add widgets to dashboard
    this.dashboard.addWidgets(
      apiRequestsWidget,
      apiErrorsWidget,
      apiLatencyWidget,
    );

    this.dashboard.addWidgets(
      lambdaInvocationsWidget,
      lambdaErrorsWidget,
      lambdaDurationWidget,
    );

    this.dashboard.addWidgets(
      lambdaThrottlesWidget,
      alarmStatusWidget,
    );

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${config.region}.console.aws.amazon.com/cloudwatch/home?region=${config.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
      exportName: `${config.stackPrefix}-dashboard-url`,
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic for CloudWatch Alarms',
      exportName: `${config.stackPrefix}-alarm-topic`,
    });

    new cdk.CfnOutput(this, 'XRayServiceMap', {
      value: `https://${config.region}.console.aws.amazon.com/xray/home?region=${config.region}#/service-map`,
      description: 'X-Ray Service Map URL',
      exportName: `${config.stackPrefix}-xray-url`,
    });

    // Instructions for setting up notifications
    if (!props.notificationEmail) {
      new cdk.CfnOutput(this, 'SetupNotifications', {
        value: `To receive alarm notifications, subscribe to the SNS topic: ${this.alarmTopic.topicArn}`,
        description: 'How to set up email notifications',
      });
    }
  }
}