import { Duration } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for the CognitoConstruct.
 */
export interface CognitoConstructProps {
  /** Lambda function to attach as a post-confirmation trigger. */
  postConfirmationHandler: lambda.IFunction;
}

/**
 * CognitoConstruct provisions the Cognito User Pool and User Pool Client
 * for the SyncCircle Friends Backend.
 *
 * - Email sign-in with self-signup enabled
 * - Auto-verify email
 * - Password policy: min 8, uppercase, lowercase, digit, special char
 * - Custom attributes: displayName (string, mutable), course (string, mutable)
 * - Token validity: access 1h, refresh 30d
 * - Post-confirmation Lambda trigger
 */
export class CognitoConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      customAttributes: {
        displayName: new cognito.StringAttribute({ mutable: true }),
        course: new cognito.StringAttribute({ mutable: true }),
      },
      lambdaTriggers: {
        postConfirmation: props.postConfirmationHandler,
      },
    });

    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
    });
  }
}
