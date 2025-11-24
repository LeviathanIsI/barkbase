import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface AuthStackProps extends cdk.StackProps {
  stage: string;
  userPoolId: string;
  userPoolClientId: string;
  cognitoDomainPrefix?: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly userPoolDomain?: cognito.IUserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    this.userPool = cognito.UserPool.fromUserPoolId(
      this,
      'ImportedUserPool',
      props.userPoolId,
    );

    this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      this,
      'ImportedUserPoolClient',
      props.userPoolClientId,
    );

    if (props.cognitoDomainPrefix) {
      // TODO: wire up domain-related concerns later if necessary.
    }

    // TODO: Attach Cognito trigger Lambdas later (preSignUp/postConfirmation/etc.)

    cdk.Tags.of(this).add('Stage', props.stage);
  }
}




