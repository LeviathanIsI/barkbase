import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface EdgeWafStackProps extends cdk.StackProps {
	webAclName?: string;
}

export class EdgeWafStack extends cdk.Stack {
	public readonly webAclArn: string;

	constructor(scope: Construct, id: string, props: EdgeWafStackProps) {
		super(scope, id, props);

		const webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebAcl', {
			defaultAction: { allow: {} },
			scope: 'CLOUDFRONT',
			visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'cfWebAcl', sampledRequestsEnabled: true },
			name: props.webAclName ?? `${id}-cf-waf`,
			rules: [
				{
					name: 'AWS-AWSManagedRulesCommonRuleSet',
					priority: 0,
					overrideAction: { none: {} },
					statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesCommonRuleSet' } },
					visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'common', sampledRequestsEnabled: true },
				},
				{
					name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
					priority: 1,
					overrideAction: { none: {} },
					statement: { managedRuleGroupStatement: { vendorName: 'AWS', name: 'AWSManagedRulesKnownBadInputsRuleSet' } },
					visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'bad-inputs', sampledRequestsEnabled: true },
				},
				{
					name: 'RateLimit',
					priority: 2,
					action: { block: {} },
					statement: { rateBasedStatement: { limit: 2000, aggregateKeyType: 'IP' } },
					visibilityConfig: { cloudWatchMetricsEnabled: true, metricName: 'rate', sampledRequestsEnabled: true },
				},
			],
		});


		new cdk.CfnOutput(this, 'WebAclArn', { value: webAcl.attrArn });

		this.webAclArn = webAcl.attrArn;
	}
}
