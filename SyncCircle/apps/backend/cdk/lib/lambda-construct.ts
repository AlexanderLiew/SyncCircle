import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Props accepted by the LambdaConstruct.
 * DynamoDB table references come from the DynamoDB construct;
 * environment config is supplied by the parent stack.
 */
export interface LambdaConstructProps {
  /** DynamoDB UserProfiles table */
  userProfilesTable: dynamodb.ITable;
  /** DynamoDB FriendRequests table */
  friendRequestsTable: dynamodb.ITable;
  /** DynamoDB Friendships table */
  friendshipsTable: dynamodb.ITable;
  /** DynamoDB UserTimetables table */
  userTimetablesTable: dynamodb.ITable;
  /** Verified SES sender email address */
  sesSenderEmail: string;
  /** Frontend base URL for invitation links */
  frontendBaseUrl: string;
}

/**
 * LambdaConstruct defines all Lambda functions for the Friends Backend.
 * Each function uses Node.js 20 runtime with esbuild bundling for TypeScript.
 * IAM policies follow least-privilege — each function only gets the
 * specific DynamoDB actions on the specific tables it needs.
 */
export class LambdaConstruct extends Construct {
  public readonly searchHandler: nodejs.NodejsFunction;
  public readonly createFriendRequestHandler: nodejs.NodejsFunction;
  public readonly acceptHandler: nodejs.NodejsFunction;
  public readonly rejectHandler: nodejs.NodejsFunction;
  public readonly cancelHandler: nodejs.NodejsFunction;
  public readonly incomingHandler: nodejs.NodejsFunction;
  public readonly outgoingHandler: nodejs.NodejsFunction;
  public readonly validateTokenHandler: nodejs.NodejsFunction;
  public readonly listFriendsHandler: nodejs.NodejsFunction;
  public readonly removeFriendHandler: nodejs.NodejsFunction;
  public readonly relationshipHandler: nodejs.NodejsFunction;
  public readonly postConfirmationHandler: nodejs.NodejsFunction;
  public readonly putTimetableHandler: nodejs.NodejsFunction;
  public readonly getFriendTimetableHandler: nodejs.NodejsFunction;
  public readonly getUsersHandler: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    const {
      userProfilesTable,
      friendRequestsTable,
      friendshipsTable,
      userTimetablesTable,
      sesSenderEmail,
      frontendBaseUrl,
    } = props;

    // Resolve the handlers source directory relative to this CDK file.
    // CDK lib is at cdk/lib/, handlers are at src/handlers/
    const handlersDir = path.join(__dirname, '..', '..', 'src', 'handlers');

    // Shared environment variables for all functions
    const commonEnv: Record<string, string> = {
      USER_PROFILES_TABLE: userProfilesTable.tableName,
      FRIEND_REQUESTS_TABLE: friendRequestsTable.tableName,
      FRIENDSHIPS_TABLE: friendshipsTable.tableName,
      USER_TIMETABLES_TABLE: userTimetablesTable.tableName,
      SES_SENDER_EMAIL: sesSenderEmail,
      FRONTEND_BASE_URL: frontendBaseUrl,
      EMAIL_ADAPTER: 'local',
    };

    // Default function configuration
    const defaultFunctionProps: Partial<nodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.TWO_WEEKS,
      depsLockFilePath: path.join(__dirname, '..', '..', 'package-lock.json'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        format: nodejs.OutputFormat.ESM,
        mainFields: ['module', 'main'],
        forceDockerBundling: false,
      },
    };

    // -------------------------------------------------------------------
    // Search Handler
    // Needs: UserProfiles (Query), FriendRequests (Query), Friendships (Query)
    // -------------------------------------------------------------------
    this.searchHandler = new nodejs.NodejsFunction(this, 'SearchHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'search.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Search',
      environment: commonEnv,
    });

    userProfilesTable.grant(this.searchHandler, 'dynamodb:Query');
    friendRequestsTable.grant(this.searchHandler, 'dynamodb:Query');
    friendshipsTable.grant(this.searchHandler, 'dynamodb:Query');

    // -------------------------------------------------------------------
    // Create Friend Request Handler
    // Needs: FriendRequests (PutItem, Query), UserProfiles (Query),
    //        Friendships (Query), SES (SendEmail)
    // -------------------------------------------------------------------
    this.createFriendRequestHandler = new nodejs.NodejsFunction(this, 'CreateFriendRequestHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friend-requests', 'create.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-CreateRequest',
      environment: commonEnv,
    });

    friendRequestsTable.grant(this.createFriendRequestHandler, 'dynamodb:PutItem', 'dynamodb:Query');
    userProfilesTable.grant(this.createFriendRequestHandler, 'dynamodb:Query');
    friendshipsTable.grant(this.createFriendRequestHandler, 'dynamodb:Query');
    this.createFriendRequestHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'ses:FromAddress': sesSenderEmail,
        },
      },
    }));

    // -------------------------------------------------------------------
    // Accept Friend Request Handler
    // Needs: FriendRequests (GetItem, UpdateItem), Friendships (PutItem)
    // -------------------------------------------------------------------
    this.acceptHandler = new nodejs.NodejsFunction(this, 'AcceptHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friend-requests', 'accept.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Accept',
      environment: commonEnv,
    });

    friendRequestsTable.grant(this.acceptHandler, 'dynamodb:GetItem', 'dynamodb:UpdateItem');
    friendshipsTable.grant(this.acceptHandler, 'dynamodb:PutItem');

    // -------------------------------------------------------------------
    // Reject Friend Request Handler
    // Needs: FriendRequests (GetItem, UpdateItem)
    // -------------------------------------------------------------------
    this.rejectHandler = new nodejs.NodejsFunction(this, 'RejectHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friend-requests', 'reject.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Reject',
      environment: commonEnv,
    });

    friendRequestsTable.grant(this.rejectHandler, 'dynamodb:GetItem', 'dynamodb:UpdateItem');

    // -------------------------------------------------------------------
    // Cancel Friend Request Handler
    // Needs: FriendRequests (GetItem, UpdateItem)
    // -------------------------------------------------------------------
    this.cancelHandler = new nodejs.NodejsFunction(this, 'CancelHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friend-requests', 'cancel.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Cancel',
      environment: commonEnv,
    });

    friendRequestsTable.grant(this.cancelHandler, 'dynamodb:GetItem', 'dynamodb:UpdateItem');

    // -------------------------------------------------------------------
    // Incoming Friend Requests Handler
    // Needs: FriendRequests (Query), UserProfiles (BatchGetItem)
    // -------------------------------------------------------------------
    this.incomingHandler = new nodejs.NodejsFunction(this, 'IncomingHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friend-requests', 'incoming.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Incoming',
      environment: commonEnv,
    });

    friendRequestsTable.grant(this.incomingHandler, 'dynamodb:Query');
    userProfilesTable.grant(this.incomingHandler, 'dynamodb:BatchGetItem');

    // -------------------------------------------------------------------
    // Outgoing Friend Requests Handler
    // Needs: FriendRequests (Query)
    // -------------------------------------------------------------------
    this.outgoingHandler = new nodejs.NodejsFunction(this, 'OutgoingHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friend-requests', 'outgoing.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Outgoing',
      environment: commonEnv,
    });

    friendRequestsTable.grant(this.outgoingHandler, 'dynamodb:Query');

    // -------------------------------------------------------------------
    // Validate Token Handler
    // Needs: FriendRequests (Query), UserProfiles (GetItem)
    // -------------------------------------------------------------------
    this.validateTokenHandler = new nodejs.NodejsFunction(this, 'ValidateTokenHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friend-requests', 'validate-token.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-ValidateToken',
      environment: commonEnv,
    });

    friendRequestsTable.grant(this.validateTokenHandler, 'dynamodb:Query');
    userProfilesTable.grant(this.validateTokenHandler, 'dynamodb:GetItem');

    // -------------------------------------------------------------------
    // List Friends Handler
    // Needs: Friendships (Query), UserProfiles (BatchGetItem)
    // -------------------------------------------------------------------
    this.listFriendsHandler = new nodejs.NodejsFunction(this, 'ListFriendsHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friends', 'list.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-List',
      environment: commonEnv,
    });

    friendshipsTable.grant(this.listFriendsHandler, 'dynamodb:Query');
    userProfilesTable.grant(this.listFriendsHandler, 'dynamodb:BatchGetItem');

    // -------------------------------------------------------------------
    // Remove Friend Handler
    // Needs: Friendships (GetItem, UpdateItem)
    // -------------------------------------------------------------------
    this.removeFriendHandler = new nodejs.NodejsFunction(this, 'RemoveFriendHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friends', 'remove.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Remove',
      environment: commonEnv,
    });

    friendshipsTable.grant(this.removeFriendHandler, 'dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:Query');

    // -------------------------------------------------------------------
    // Relationship Handler
    // Needs: Friendships (Query), FriendRequests (Query)
    // -------------------------------------------------------------------
    this.relationshipHandler = new nodejs.NodejsFunction(this, 'RelationshipHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'friends', 'relationship.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-Relationship',
      environment: commonEnv,
    });

    friendshipsTable.grant(this.relationshipHandler, 'dynamodb:Query');
    friendRequestsTable.grant(this.relationshipHandler, 'dynamodb:Query');

    // -------------------------------------------------------------------
    // Post-Confirmation Trigger Handler (Cognito)
    // Needs: UserProfiles (PutItem), FriendRequests (Query, UpdateItem)
    // Longer timeout for registration processing
    // -------------------------------------------------------------------
    this.postConfirmationHandler = new nodejs.NodejsFunction(this, 'PostConfirmationHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'triggers', 'post-confirmation.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Friends-PostConfirmation',
      timeout: Duration.seconds(60),
      environment: commonEnv,
    });

    userProfilesTable.grant(this.postConfirmationHandler, 'dynamodb:PutItem');
    friendRequestsTable.grant(this.postConfirmationHandler, 'dynamodb:Query', 'dynamodb:UpdateItem');

    // -------------------------------------------------------------------
    // Put Timetable Handler
    // Needs: UserTimetables (PutItem)
    // -------------------------------------------------------------------
    this.putTimetableHandler = new nodejs.NodejsFunction(this, 'PutTimetableHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'timetable', 'put.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Timetable-Put',
      environment: commonEnv,
    });

    userTimetablesTable.grant(this.putTimetableHandler, 'dynamodb:PutItem');

    // -------------------------------------------------------------------
    // Get Friend Timetable Handler
    // Needs: UserTimetables (GetItem), Friendships (Query)
    // -------------------------------------------------------------------
    this.getFriendTimetableHandler = new nodejs.NodejsFunction(this, 'GetFriendTimetableHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'timetable', 'get-friend.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Timetable-GetFriend',
      environment: commonEnv,
    });

    userTimetablesTable.grant(this.getFriendTimetableHandler, 'dynamodb:GetItem');
    friendshipsTable.grant(this.getFriendTimetableHandler, 'dynamodb:Query');

    // -------------------------------------------------------------------
    // Get Users Handler
    // Needs: UserProfiles (Scan) — returns all registered users for discovery
    // -------------------------------------------------------------------
    this.getUsersHandler = new nodejs.NodejsFunction(this, 'GetUsersHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'users', 'get-users.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-Users-GetUsers',
      environment: commonEnv,
    });

    userProfilesTable.grant(this.getUsersHandler, 'dynamodb:Scan');
  }
}
