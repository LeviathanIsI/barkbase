/**
 * =============================================================================
 * BarkBase API CloudFront Stack
 * =============================================================================
 *
 * Creates CloudFront distribution in front of HTTP API Gateway with WAF protection.
 *
 * ARCHITECTURE:
 *   Client → CloudFront (with WAF) → HTTP API Gateway → Lambda
 *
 * WHY CLOUDFRONT + WAF:
 *   - AWS WAF v2 cannot directly attach to HTTP APIs (API Gateway v2)
 *   - CloudFront provides edge caching and global distribution
 *   - WAF attached to CloudFront provides rate limiting & security rules
 *
 * IMPORTANT:
 *   - WAF for CloudFront MUST be deployed in us-east-1 region
 *   - This stack must be deployed in us-east-1
 *   - Uses cross-region references to the API Gateway in us-east-2
 *
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface ApiCloudFrontStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  /**
   * The HTTP API Gateway ID.
   * Example: mxvb0b8l56
   */
  readonly httpApiId: string;
  /**
   * The region where the HTTP API is deployed.
   * Example: us-east-2
   */
  readonly apiRegion: string;
}

export class ApiCloudFrontStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly cloudFrontUrl: string;
  public readonly cloudFrontDomainName: string;
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: ApiCloudFrontStackProps) {
    super(scope, id, props);

    const { config, httpApiId, apiRegion } = props;

    // Construct the API endpoint from the API ID and region
    // Format: {apiId}.execute-api.{region}.amazonaws.com
    const apiEndpoint = `${httpApiId}.execute-api.${apiRegion}.amazonaws.com`;

    // =========================================================================
    // WAF Web ACL for CloudFront (MUST be in us-east-1)
    // =========================================================================
    // This WAF configuration provides:
    // - Rate limiting (50 req/5min for auth, 1000 req/5min general)
    // - AWS Managed Rules (Common, Known Bad Inputs, SQLi)
    // - Bot protection (User-Agent validation)
    // =========================================================================

    // IP Set for Rate Limiting Exceptions (e.g., office IPs, monitoring tools)
    const allowedIpSet = new wafv2.CfnIPSet(this, 'AllowedIPSet', {
      name: `${config.stackPrefix}-allowed-ips`,
      description: 'IPs exempt from rate limiting',
      scope: 'CLOUDFRONT',
      ipAddressVersion: 'IPV4',
      addresses: [
        // Add your office/monitoring IPs here if needed
        // '203.0.113.0/24',
      ],
    });

    this.webAcl = new wafv2.CfnWebACL(this, 'ApiWebACL', {
      name: `${config.stackPrefix}-api-waf`,
      description: 'WAF rules for BarkBase API via CloudFront',
      scope: 'CLOUDFRONT', // MUST be CLOUDFRONT for CloudFront distributions
      defaultAction: {
        allow: {},
      },

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
              excludedRules: [
                // Exclude rules that may cause false positives with API requests
                { name: 'SizeRestrictions_BODY' },
                { name: 'GenericRFI_BODY' },
              ],
            },
          },
          overrideAction: { none: {} },
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
          overrideAction: { none: {} },
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
          overrideAction: { none: {} },
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
                        fieldToMatch: { uriPath: {} },
                        textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                        positionalConstraint: 'CONTAINS',
                      },
                    },
                    {
                      byteMatchStatement: {
                        searchString: '/api/v1/auth/register',
                        fieldToMatch: { uriPath: {} },
                        textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                        positionalConstraint: 'CONTAINS',
                      },
                    },
                    {
                      byteMatchStatement: {
                        searchString: '/api/v1/auth/refresh',
                        fieldToMatch: { uriPath: {} },
                        textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                        positionalConstraint: 'CONTAINS',
                      },
                    },
                    {
                      byteMatchStatement: {
                        searchString: '/api/v1/auth/forgot-password',
                        fieldToMatch: { uriPath: {} },
                        textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
                        positionalConstraint: 'CONTAINS',
                      },
                    },
                    {
                      byteMatchStatement: {
                        searchString: '/api/v1/auth/reset-password',
                        fieldToMatch: { uriPath: {} },
                        textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
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
                    singleHeader: { name: 'user-agent' },
                  },
                  comparisonOperator: 'GE',
                  size: 1,
                  textTransformations: [{ priority: 0, type: 'NONE' }],
                },
              },
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${config.stackPrefix}-missing-user-agent`,
          },
        },
      ],

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
    // CloudFront Origin for HTTP API
    // =========================================================================
    // The origin is the HTTP API Gateway endpoint
    // We need to preserve headers for CORS and authentication
    // =========================================================================

    const apiOrigin = new origins.HttpOrigin(apiEndpoint, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      httpsPort: 443,
      originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
      connectionAttempts: 3,
      connectionTimeout: cdk.Duration.seconds(10),
      readTimeout: cdk.Duration.seconds(30),
      keepaliveTimeout: cdk.Duration.seconds(5),
      // Custom headers to identify requests coming through CloudFront
      customHeaders: {
        'X-Forwarded-Via': 'CloudFront',
      },
    });

    // =========================================================================
    // Cache Policy - Forward Authorization header, disable caching
    // =========================================================================
    // IMPORTANT LESSONS LEARNED:
    // 1. Authorization header MUST go in CachePolicy, NOT OriginRequestPolicy
    // 2. Host header causes API Gateway 403 if forwarded - never include it
    // 3. X-Amz-* headers are handled automatically by CloudFront
    // 4. Use managed origin request policy ALL_VIEWER_EXCEPT_HOST_HEADER
    // =========================================================================
    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `${config.stackPrefix}-api-cache-policy`,
      comment: 'Cache policy for API - forwards auth headers, no caching',
      defaultTtl: cdk.Duration.seconds(0),
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      // Forward Authorization header to origin (required for JWT auth)
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization'),
      // Forward all query strings
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      // Forward all cookies
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      // Enable compression
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // =========================================================================
    // Origin Request Policy - Use AWS Managed Policy
    // =========================================================================
    // ALL_VIEWER_EXCEPT_HOST_HEADER forwards all headers EXCEPT Host.
    // This is critical because:
    // - Forwarding Host header to API Gateway causes 403 Forbidden
    // - CORS headers (Origin, Access-Control-*) are forwarded automatically
    // - Content-Type, Accept, etc. are forwarded automatically
    // - Do NOT create custom OriginRequestPolicy with restricted headers
    // =========================================================================

    // =========================================================================
    // Response Headers Policy - Add security headers
    // =========================================================================
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'ApiResponseHeaders', {
      responseHeadersPolicyName: `${config.stackPrefix}-api-response-headers`,
      comment: 'Response headers policy for API security',
      securityHeadersBehavior: {
        contentTypeOptions: { override: false }, // Let API set this
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: false,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: false,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: false,
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: false,
        },
      },
      // CORS headers - let the origin (API Gateway) handle CORS
      // CloudFront will pass through the CORS headers from the API
    });

    // =========================================================================
    // CloudFront Distribution
    // =========================================================================
    this.distribution = new cloudfront.Distribution(this, 'ApiDistribution', {
      comment: `CloudFront distribution for ${config.stackPrefix} API with WAF`,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,

      // Price class - use cheapest for dev, all edge locations for prod
      priceClass: config.env === 'prod'
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100, // US, Canada, Europe only

      // Minimum TLS version
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,

      // Associate WAF WebACL
      webAclId: this.webAcl.attrArn,

      // Default behavior for all API requests
      defaultBehavior: {
        origin: apiOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,

        // Allow all HTTP methods for API
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,

        // Apply our custom cache policy (forwards Authorization header)
        cachePolicy: apiCachePolicy,

        // Use AWS managed origin request policy - forwards all headers EXCEPT Host
        // This is the battle-tested pattern for CloudFront + API Gateway
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,

        // Apply security response headers
        responseHeadersPolicy: responseHeadersPolicy,

        // Enable compression
        compress: true,
      },

      // Error responses - pass through API errors
      // Don't create custom error pages for API responses
    });

    // Store outputs
    this.cloudFrontDomainName = this.distribution.distributionDomainName;
    this.cloudFrontUrl = `https://${this.cloudFrontDomainName}`;

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID for API',
      exportName: `${config.stackPrefix}-api-cloudfront-id`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.cloudFrontDomainName,
      description: 'CloudFront Domain Name for API',
      exportName: `${config.stackPrefix}-api-cloudfront-domain`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: this.cloudFrontUrl,
      description: 'CloudFront URL for API (use this instead of direct API Gateway URL)',
      exportName: `${config.stackPrefix}-api-cloudfront-url`,
    });

    new cdk.CfnOutput(this, 'WebACLArn', {
      value: this.webAclArn,
      description: 'WAF Web ACL ARN',
      exportName: `${config.stackPrefix}-waf-arn`,
    });

    new cdk.CfnOutput(this, 'WebACLId', {
      value: this.webAcl.attrId,
      description: 'WAF Web ACL ID',
      exportName: `${config.stackPrefix}-waf-id`,
    });

    // Output the API URL comparison
    new cdk.CfnOutput(this, 'ApiUrlComparison', {
      value: `Direct API: https://${apiEndpoint} | CloudFront: ${this.cloudFrontUrl}`,
      description: 'Compare direct API URL vs CloudFront URL',
    });
  }
}
