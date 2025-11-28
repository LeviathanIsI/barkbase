/**
 * FrontendStack
 * 
 * Purpose: Frontend hosting and CDN distribution for BarkBase SPA.
 * 
 * Domain Boundaries:
 * - S3 bucket for static assets (private, no public access)
 * - CloudFront distribution with Origin Access Control (OAC)
 * - SPA routing (403/404 → index.html)
 * - Dev-optimized cache behaviors (short TTLs)
 * 
 * Note: 
 * - Custom domains and SSL certificates are NOT configured here (future phase)
 * - For dev, uses CloudFront default domain (*.cloudfront.net)
 * 
 * Dependencies:
 * - None (hosts static files only)
 * - API endpoints are injected at build time via env vars
 * 
 * Deployment Notes:
 * - Build frontend with `npm run build` 
 * - Sync dist/ folder to S3 bucket
 * - Invalidate CloudFront cache after deployment
 * - Environment config injected at build time (VITE_* vars)
 */

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  /**
   * Deployment stage (dev, staging, prod)
   */
  stage: string;

  /**
   * Environment name
   */
  environment: string;
}

export class FrontendStack extends cdk.Stack {
  /**
   * S3 bucket for frontend assets
   */
  public readonly bucket: s3.Bucket;

  /**
   * CloudFront distribution
   */
  public readonly distribution: cloudfront.Distribution;

  /**
   * CloudFront distribution domain name
   */
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // =========================================================================
    // S3 Bucket for SPA Assets
    // =========================================================================
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      // Let CDK generate unique bucket name
      bucketName: undefined,
      
      // Block all public access - CloudFront will access via OAC
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      
      // Enable versioning for rollback capability
      versioned: true,
      
      // Dev-only: Allow bucket deletion with objects
      // TODO: Change to RETAIN for production
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      
      // Encryption at rest
      encryption: s3.BucketEncryption.S3_MANAGED,
      
      // CORS not needed - CloudFront serves same domain
      cors: [],
    });

    cdk.Tags.of(this.bucket).add('Service', 'barkbase-frontend');
    cdk.Tags.of(this.bucket).add('Stage', props.stage);

    // =========================================================================
    // CloudFront Distribution with OAC
    // =========================================================================
    this.distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: `BarkBase ${props.stage} Frontend Distribution`,
      
      // Default behavior for SPA
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        
        // Only allow GET and HEAD for static assets
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        
        // Cache GET and HEAD requests
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        
        // Redirect HTTP to HTTPS
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        
        // Enable compression (gzip, brotli)
        compress: true,
        
        // Dev-friendly cache policy: short TTLs for faster iteration
        // TODO: For production, use cloudfront.CachePolicy.CACHING_OPTIMIZED
        cachePolicy: new cloudfront.CachePolicy(this, 'DevCachePolicy', {
          cachePolicyName: `barkbase-${props.stage}-frontend-cache`,
          comment: 'Dev cache policy with short TTLs for fast iteration',
          defaultTtl: cdk.Duration.minutes(5),
          minTtl: cdk.Duration.minutes(1),
          maxTtl: cdk.Duration.hours(1),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
        }),
      },
      
      // SPA default root object
      defaultRootObject: 'index.html',
      
      // SPA routing: serve index.html for 403/404 errors
      // This enables client-side routing (React Router)
      errorResponses: [
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
      ],
      
      // Price class: Use only NA and EU edge locations for cost savings
      // TODO: For production with global users, consider PRICE_CLASS_ALL
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      
      // Enable IPv6
      enableIpv6: true,
      
      // Enable access logging (optional, can be enabled for prod)
      // enableLogging: true,
      // logBucket: loggingBucket,
      // logFilePrefix: 'cloudfront/',
      
      // HTTP/2 and HTTP/3 for better performance
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    cdk.Tags.of(this.distribution).add('Service', 'barkbase-frontend');
    cdk.Tags.of(this.distribution).add('Stage', props.stage);
    cdk.Tags.of(this.distribution).add('Environment', props.environment);

    this.distributionDomainName = this.distribution.distributionDomainName;

    // =========================================================================
    // Stack Outputs
    // =========================================================================
    
    // Frontend CloudFront domain (for browser URL and VITE_* env vars)
    new cdk.CfnOutput(this, 'FrontendDistributionDomain', {
      value: this.distributionDomainName,
      description: 'CloudFront distribution domain for frontend',
      exportName: `${this.stackName}-DistributionDomain`,
    });

    new cdk.CfnOutput(this, 'FrontendDistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
      exportName: `${this.stackName}-DistributionId`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for frontend assets',
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketArn', {
      value: this.bucket.bucketArn,
      description: 'S3 bucket ARN for IAM policies',
      exportName: `${this.stackName}-BucketArn`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${this.distributionDomainName}`,
      description: 'Full frontend URL',
      exportName: `${this.stackName}-Url`,
    });
  }
}
