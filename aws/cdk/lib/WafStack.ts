/**
 * =============================================================================
 * BarkBase WAF Stack
 * =============================================================================
 *
 * AWS WAF for API Gateway protection:
 * - Rate limiting (1000 req/5min per IP)
 * - Stricter rate limiting for auth endpoints (50 req/5min per IP)
 * - Geographic restrictions (optional)
 * - Known bad inputs protection
 * - AWS managed rule sets
 *
 * IMPORTANT: WAF WebACL must be in us-east-1 for CloudFront
 * For regional API Gateway, it can be in the same region
 *
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface WafStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  /**
   * The API Gateway stage ARN for WAF association.
   * For HTTP API (API Gateway v2), use execute-api format:
   *   arn:aws:execute-api:{region}:{account}:{apiId}/{stageName}
   *
   * Example: arn:aws:execute-api:us-east-2:123456789012:abc123def4/$default
   *
   * NOTE: The stage name "$default" is used as-is (not URL-encoded)
   */
  readonly apiGatewayStageArn?: string;
}

export class WafStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props);

    const { config } = props;

    // =========================================================================
    // IP Set for Rate Limiting Exceptions (e.g., office IPs, monitoring tools)
    // =========================================================================
    const allowedIpSet = new wafv2.CfnIPSet(this, 'AllowedIPSet', {
      name: `${config.stackPrefix}-allowed-ips`,
      description: 'IPs exempt from rate limiting',
      scope: 'REGIONAL', // Use 'CLOUDFRONT' if protecting CloudFront distribution
      ipAddressVersion: 'IPV4',
      addresses: [
        // Add your office/monitoring IPs here if needed
        // '203.0.113.0/24',
      ],
    });

    // =========================================================================
    // WAF Web ACL
    // =========================================================================
    this.webAcl = new wafv2.CfnWebACL(this, 'ApiWebACL', {
      name: `${config.stackPrefix}-api-waf`,
      description: 'WAF rules for BarkBase API Gateway',
      scope: 'REGIONAL',
      defaultAction: {
        allow: {}, // Default allow, rules will block/rate-limit
      },

      // CloudWatch metrics
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${config.stackPrefix}-waf-metrics`,
      },

      rules: [
        // =====================================================================
        // Rule 1: AWS Managed Rules - Core Rule Set
        // =====================================================================
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              // Exclude specific rules if they cause false positives
              // excludedRules: [
              //   { name: 'SizeRestrictions_BODY' },
              // ],
            },
          },
          overrideAction: {
            none: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${config.stackPrefix}-aws-common-rules`,
          },
        },

        // =====================================================================
        // Rule 2: AWS Managed Rules - Known Bad Inputs
        // =====================================================================
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          overrideAction: {
            none: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${config.stackPrefix}-known-bad-inputs`,
          },
        },

        // =====================================================================
        // Rule 3: AWS Managed Rules - SQL Injection Protection
        // =====================================================================
        {
          name: 'AWSManagedRulesSQLiRuleSet',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          overrideAction: {
            none: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${config.stackPrefix}-sqli-protection`,
          },
        },

        // =====================================================================
        // Rule 4: Strict Rate Limiting for Auth Endpoints
        // =====================================================================
        {
          name: 'AuthEndpointRateLimit',
          priority: 10,
          statement: {
            rateBasedStatement: {
              limit: 50, // 50 requests per 5 minutes per IP
              aggregateKeyType: 'IP',
              scopeDownStatement: {
                orStatement: {
                  statements: [
                    {
                      byteMatchStatement: {
                        searchString: '/api/v1/auth/login',
                        fieldToMatch: {
                          uriPath: {},
                        },
                        textTransformations: [
                          {
                            priority: 0,
                            type: 'LOWERCASE',
                          },
                        ],
                        positionalConstraint: 'CONTAINS',
                      },
                    },
                    {
                      byteMatchStatement: {
                        searchString: '/api/v1/auth/register',
                        fieldToMatch: {
                          uriPath: {},
                        },
                        textTransformations: [
                          {
                            priority: 0,
                            type: 'LOWERCASE',
                          },
                        ],
                        positionalConstraint: 'CONTAINS',
                      },
                    },
                    {
                      byteMatchStatement: {
                        searchString: '/api/v1/auth/refresh',
                        fieldToMatch: {
                          uriPath: {},
                        },
                        textTransformations: [
                          {
                            priority: 0,
                            type: 'LOWERCASE',
                          },
                        ],
                        positionalConstraint: 'CONTAINS',
                      },
                    },
                  ],
                },
              },
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 429,
                customResponseBodyKey: 'RateLimitExceeded',
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${config.stackPrefix}-auth-rate-limit`,
          },
        },

        // =====================================================================
        // Rule 5: General API Rate Limiting
        // =====================================================================
        {
          name: 'GeneralRateLimit',
          priority: 20,
          statement: {
            rateBasedStatement: {
              limit: 1000, // 1000 requests per 5 minutes per IP
              aggregateKeyType: 'IP',
            },
          },
          action: {
            block: {
              customResponse: {
                responseCode: 429,
                customResponseBodyKey: 'RateLimitExceeded',
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${config.stackPrefix}-general-rate-limit`,
          },
        },

        // =====================================================================
        // Rule 6: Block requests with missing User-Agent (likely bots)
        // =====================================================================
        {
          name: 'BlockMissingUserAgent',
          priority: 30,
          statement: {
            notStatement: {
              statement: {
                sizeConstraintStatement: {
                  fieldToMatch: {
                    singleHeader: {
                      name: 'user-agent',
                    },
                  },
                  comparisonOperator: 'GE',
                  size: 1,
                  textTransformations: [
                    {
                      priority: 0,
                      type: 'NONE',
                    },
                  ],
                },
              },
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${config.stackPrefix}-missing-user-agent`,
          },
        },
      ],

      // Custom response bodies
      customResponseBodies: {
        RateLimitExceeded: {
          contentType: 'APPLICATION_JSON',
          content: JSON.stringify({
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          }),
        },
      },
    });

    this.webAclArn = this.webAcl.attrArn;

    // =========================================================================
    // Associate WAF with API Gateway (if ARN provided)
    // =========================================================================
    // For HTTP API (API Gateway v2), the resource ARN must be in execute-api format:
    //   arn:aws:execute-api:{region}:{account}:{apiId}/{stageName}
    //
    // NOT the apigateway format:
    //   arn:aws:apigateway:{region}::/apis/{apiId}/stages/{stageName}  <-- WRONG
    // =========================================================================
    if (props.apiGatewayStageArn) {
      new wafv2.CfnWebACLAssociation(this, 'ApiGatewayWafAssociation', {
        resourceArn: props.apiGatewayStageArn,
        webAclArn: this.webAclArn,
      });
    }

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'WebACLId', {
      value: this.webAcl.attrId,
      description: 'WAF Web ACL ID',
      exportName: `${config.stackPrefix}-waf-id`,
    });

    new cdk.CfnOutput(this, 'WebACLArn', {
      value: this.webAclArn,
      description: 'WAF Web ACL ARN',
      exportName: `${config.stackPrefix}-waf-arn`,
    });
  }
}
