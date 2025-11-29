/**
 * =============================================================================
 * BarkBase Auth Stack
 * =============================================================================
 * 
 * Creates Cognito infrastructure:
 * - User Pool with email sign-in
 * - App Client with USER_PASSWORD_AUTH
 * - Custom domain for OAuth
 * - Lambda triggers for auto-confirmation (dev)
 * 
 * =============================================================================
 */

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { BarkbaseConfig } from './shared/config';

export interface AuthStackProps extends cdk.StackProps {
  readonly config: BarkbaseConfig;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly userPoolDomain: cognito.IUserPoolDomain;
  public readonly cognitoDomainUrl: string;
  public readonly jwksUrl: string;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Generate a unique suffix for the domain
    const domainSuffix = cdk.Fn.select(0, cdk.Fn.split('-', cdk.Fn.select(2, cdk.Fn.split('/', this.stackId))));

    // Create pre-signup Lambda for auto-confirmation in dev
    const preSignUpLambda = new lambda.Function(this, 'PreSignUpTrigger', {
      functionName: `${config.stackPrefix}-pre-signup`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  // Auto-confirm users and mark email as verified
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  return event;
};
      `),
      timeout: cdk.Duration.seconds(10),
      description: 'Auto-confirm user signups for BarkBase',
    });

    // Create User Pool
    const userPool = new cognito.UserPool(this, 'BarkbaseUserPool', {
      userPoolName: `${config.stackPrefix}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        tenantId: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 256,
        }),
        role: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 50,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: config.env === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      lambdaTriggers: {
        preSignUp: preSignUpLambda,
      },
      email: cognito.UserPoolEmail.withCognito('noreply@verificationemail.com'),
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      deviceTracking: {
        challengeRequiredOnNewDevice: false,
        deviceOnlyRememberedOnUserPrompt: true,
      },
    });

    this.userPool = userPool;

    // Create User Pool Domain
    this.userPoolDomain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: `${config.stackPrefix}-${domainSuffix}`,
      },
    });

    // Calculate the Cognito domain URL
    this.cognitoDomainUrl = `${config.stackPrefix}-${domainSuffix}.auth.${config.region}.amazoncognito.com`;

    // JWKS URL for token validation
    this.jwksUrl = `https://cognito-idp.${config.region}.amazonaws.com/${userPool.userPoolId}/.well-known/jwks.json`;

    // Define OAuth callback and logout URLs based on environment
    // NOTE: After deploying frontend, add the CloudFront URL to Cognito via AWS Console or CLI:
    // aws cognito-idp update-user-pool-client --user-pool-id <id> --client-id <id> \
    //   --callback-urls "existing-urls" "https://<cloudfront>.cloudfront.net/auth/callback"
    const callbackUrls = config.env === 'dev'
      ? [
          'http://localhost:5173/auth/callback',
          'http://localhost:3000/auth/callback',
          'http://127.0.0.1:5173/auth/callback',
        ]
      : [
          'https://barkbase.io/auth/callback',
          'https://app.barkbase.io/auth/callback',
        ];

    const logoutUrls = config.env === 'dev'
      ? [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
        ]
      : [
          'https://barkbase.io',
          'https://app.barkbase.io',
        ];

    // Create App Client
    this.userPoolClient = userPool.addClient('BarkbaseAppClient', {
      userPoolClientName: `${config.stackPrefix}-app-client`,
      generateSecret: false, // No client secret for public clients
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: false,
        adminUserPassword: false,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls,
        logoutUrls,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
    });

    // =========================================================================
    // Stack Outputs
    // =========================================================================

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${config.stackPrefix}-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `${config.stackPrefix}-user-pool-arn`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID',
      exportName: `${config.stackPrefix}-client-id`,
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: this.cognitoDomainUrl,
      description: 'Cognito Domain URL',
      exportName: `${config.stackPrefix}-cognito-domain`,
    });

    new cdk.CfnOutput(this, 'JwksUrl', {
      value: this.jwksUrl,
      description: 'JWKS URL for token validation',
      exportName: `${config.stackPrefix}-jwks-url`,
    });

    new cdk.CfnOutput(this, 'CognitoIssuerUrl', {
      value: `https://cognito-idp.${config.region}.amazonaws.com/${userPool.userPoolId}`,
      description: 'Cognito Issuer URL',
      exportName: `${config.stackPrefix}-issuer-url`,
    });
  }
}

