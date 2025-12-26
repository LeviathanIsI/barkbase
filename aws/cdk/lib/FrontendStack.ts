/**
 * =============================================================================
 * BarkBase Frontend Stack
 * =============================================================================
 *
 * Creates S3 bucket and CloudFront distribution for hosting the React frontend
 * - S3 bucket for static assets with versioning
 * - CloudFront CDN for global distribution
 * - SPA-friendly error handling
 * - Custom domain support (optional)
 *
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface FrontendStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
  readonly apiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly frontendBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly cloudFrontUrl: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { config, apiUrl } = props;

    // =========================================================================
    // S3 Bucket for Frontend
    // =========================================================================

    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `${config.stackPrefix}-frontend`,
      versioned: config.env === 'prod', // Enable versioning in production
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access, serve via CloudFront only
      removalPolicy: config.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.env !== 'prod', // Auto-delete objects in non-prod
      lifecycleRules: config.env === 'prod' ? [
        {
          id: 'delete-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ] : [],
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.PUT, // For file uploads via presigned URLs
          ],
          allowedOrigins: config.corsOrigins,
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });

    // =========================================================================
    // CloudFront Origin Access Identity
    // =========================================================================

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${config.stackPrefix} frontend`,
    });

    // Grant CloudFront access to the S3 bucket
    this.frontendBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${this.frontendBucket.bucketArn}/*`],
        principals: [originAccessIdentity.grantPrincipal],
      })
    );

    // =========================================================================
    // CloudFront Distribution
    // =========================================================================

    // Custom error responses for SPA routing
    const errorResponses: cloudfront.ErrorResponse[] = [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(5),
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(5),
      },
    ];

    // Cache behaviors
    const defaultCacheBehavior: cloudfront.BehaviorOptions = {
      origin: new origins.S3Origin(this.frontendBucket, {
        originAccessIdentity,
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      compress: true,
      cachePolicy: new cloudfront.CachePolicy(this, 'FrontendCachePolicy', {
        cachePolicyName: `${config.stackPrefix}-frontend-cache`,
        comment: 'Cache policy for BarkBase frontend',
        defaultTtl: cdk.Duration.hours(24),
        maxTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.seconds(0),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
        headerBehavior: cloudfront.CacheHeaderBehavior.none(),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      }),
      responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
        responseHeadersPolicyName: `${config.stackPrefix}-security-headers`,
        comment: 'Security headers for BarkBase frontend',
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true
          },
          strictTransportSecurity: {
            accessControlMaxAge: cdk.Duration.days(365),
            includeSubdomains: true,
            override: true
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true
          },
        },
        corsBehavior: {
          accessControlAllowOrigins: config.corsOrigins,
          accessControlAllowHeaders: ['*'],
          accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
          accessControlAllowCredentials: false,
          originOverride: true,
        },
      }),
    };

    // Additional cache behaviors for static assets
    const staticAssetsBehavior: cloudfront.BehaviorOptions = {
      origin: new origins.S3Origin(this.frontendBucket, {
        originAccessIdentity,
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      compress: true,
      cachePolicy: new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
        cachePolicyName: `${config.stackPrefix}-static-assets-cache`,
        comment: 'Cache policy for static assets',
        defaultTtl: cdk.Duration.days(30),
        maxTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.days(1),
      }),
    };

    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: `CloudFront distribution for ${config.stackPrefix} frontend`,
      defaultRootObject: 'index.html',
      defaultBehavior: defaultCacheBehavior,
      additionalBehaviors: {
        '*.js': staticAssetsBehavior,
        '*.css': staticAssetsBehavior,
        '*.ico': staticAssetsBehavior,
        '*.png': staticAssetsBehavior,
        '*.jpg': staticAssetsBehavior,
        '*.jpeg': staticAssetsBehavior,
        '*.gif': staticAssetsBehavior,
        '*.svg': staticAssetsBehavior,
        '*.woff': staticAssetsBehavior,
        '*.woff2': staticAssetsBehavior,
        '*.ttf': staticAssetsBehavior,
        '*.eot': staticAssetsBehavior,
      },
      errorResponses,
      priceClass: config.env === 'prod'
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Store the CloudFront URL
    this.cloudFrontUrl = `https://${this.distribution.distributionDomainName}`;

    // =========================================================================
    // Deployment (optional - can be handled by CI/CD)
    // =========================================================================

    // Uncomment to automatically deploy frontend build to S3
    // Note: This requires the frontend to be built first
    /*
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../../frontend/dist')],
      destinationBucket: this.frontendBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
    */

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
      description: 'S3 Bucket for frontend hosting',
      exportName: `${config.stackPrefix}-frontend-bucket`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${config.stackPrefix}-cloudfront-id`,
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: this.cloudFrontUrl,
      description: 'CloudFront Distribution URL',
      exportName: `${config.stackPrefix}-cloudfront-url`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${config.stackPrefix}-cloudfront-domain`,
    });

    // Output deployment commands for convenience
    new cdk.CfnOutput(this, 'DeploymentInstructions', {
      value: `aws s3 sync ../../../frontend/dist s3://${this.frontendBucket.bucketName} --delete && aws cloudfront create-invalidation --distribution-id ${this.distribution.distributionId} --paths "/*"`,
      description: 'Command to deploy frontend to S3 and invalidate CloudFront cache',
    });
  }
}