import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DynamoDbConstruct } from './dynamodb-construct';
import { LambdaConstruct } from './lambda-construct';
import { CognitoConstruct } from './cognito-construct';
import { ApiConstruct } from './api-construct';
import { SesConstruct } from './ses-construct';

/**
 * Props for the FriendsStack allowing deployment-time configuration.
 */
export interface FriendsStackProps extends StackProps {
  /** Verified SES sender email address. */
  sesSenderEmail: string;
  /** Frontend base URL for invitation links (e.g., https://app.synccircle.com). */
  frontendBaseUrl: string;
  /** Allowed CORS origins for API Gateway. Defaults to ["*"]. */
  allowedOrigins?: string[];
}

/**
 * FriendsStack is the main CDK stack for the SyncCircle Friends Backend.
 * It composes all infrastructure constructs required for the friends feature:
 * - DynamoDB tables (UserProfiles, FriendRequests, Friendships)
 * - Lambda functions for business logic (with 14-day CloudWatch log retention)
 * - Cognito user pool for authentication
 * - API Gateway REST API with Cognito authorizer and access logging
 * - SES email configuration
 */
export class FriendsStack extends Stack {
  constructor(scope: Construct, id: string, props: FriendsStackProps) {
    super(scope, id, props);

    // ─── DynamoDB Tables ─────────────────────────────────────────────────
    const dynamodb = new DynamoDbConstruct(this, 'DynamoDb');

    // ─── SES Sender Identity ─────────────────────────────────────────────
    new SesConstruct(this, 'Ses', {
      senderEmail: props.sesSenderEmail,
    });

    // ─── Lambda Functions ────────────────────────────────────────────────
    // Each Lambda has logRetention: 14 days configured via the construct.
    const lambdas = new LambdaConstruct(this, 'Lambdas', {
      userProfilesTable: dynamodb.userProfilesTable,
      friendRequestsTable: dynamodb.friendRequestsTable,
      friendshipsTable: dynamodb.friendshipsTable,
      userTimetablesTable: dynamodb.userTimetablesTable,
      sesSenderEmail: props.sesSenderEmail,
      frontendBaseUrl: props.frontendBaseUrl,
    });

    // ─── Cognito User Pool ───────────────────────────────────────────────
    const cognito = new CognitoConstruct(this, 'Cognito', {
      postConfirmationHandler: lambdas.postConfirmationHandler,
    });

    // ─── API Gateway ─────────────────────────────────────────────────────
    // Access logging with 14-day retention is configured within the construct.
    new ApiConstruct(this, 'Api', {
      userPool: cognito.userPool,
      allowedOrigins: props.allowedOrigins,
      searchHandler: lambdas.searchHandler,
      createFriendRequestHandler: lambdas.createFriendRequestHandler,
      acceptHandler: lambdas.acceptHandler,
      rejectHandler: lambdas.rejectHandler,
      cancelHandler: lambdas.cancelHandler,
      incomingHandler: lambdas.incomingHandler,
      outgoingHandler: lambdas.outgoingHandler,
      validateTokenHandler: lambdas.validateTokenHandler,
      listFriendsHandler: lambdas.listFriendsHandler,
      removeFriendHandler: lambdas.removeFriendHandler,
      relationshipHandler: lambdas.relationshipHandler,
      putTimetableHandler: lambdas.putTimetableHandler,
      getFriendTimetableHandler: lambdas.getFriendTimetableHandler,
      getUsersHandler: lambdas.getUsersHandler,
    });
  }
}
