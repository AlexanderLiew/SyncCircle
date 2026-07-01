import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * DynamoDbConstruct defines the three DynamoDB tables required by the
 * Friends Backend: UserProfiles, FriendRequests, and Friendships.
 *
 * All tables use on-demand (PAY_PER_REQUEST) billing, point-in-time recovery,
 * and RETAIN removal policy for production safety.
 */
export class DynamoDbConstruct extends Construct {
  public readonly userProfilesTable: Table;
  public readonly friendRequestsTable: Table;
  public readonly friendshipsTable: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ─── UserProfiles Table ──────────────────────────────────────────────
    this.userProfilesTable = new Table(this, 'UserProfilesTable', {
      tableName: 'UserProfiles',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.userProfilesTable.addGlobalSecondaryIndex({
      indexName: 'normalizedEmail-index',
      partitionKey: { name: 'normalizedEmail', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ─── FriendRequests Table ────────────────────────────────────────────
    this.friendRequestsTable = new Table(this, 'FriendRequestsTable', {
      tableName: 'FriendRequests',
      partitionKey: { name: 'requestId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.friendRequestsTable.addGlobalSecondaryIndex({
      indexName: 'senderUserId-createdAt-index',
      partitionKey: { name: 'senderUserId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.friendRequestsTable.addGlobalSecondaryIndex({
      indexName: 'receiverUserId-createdAt-index',
      partitionKey: { name: 'receiverUserId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.friendRequestsTable.addGlobalSecondaryIndex({
      indexName: 'normalizedReceiverEmail-index',
      partitionKey: { name: 'normalizedReceiverEmail', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.friendRequestsTable.addGlobalSecondaryIndex({
      indexName: 'tokenHash-index',
      partitionKey: { name: 'tokenHash', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ─── Friendships Table ───────────────────────────────────────────────
    this.friendshipsTable = new Table(this, 'FriendshipsTable', {
      tableName: 'Friendships',
      partitionKey: { name: 'friendshipId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.friendshipsTable.addGlobalSecondaryIndex({
      indexName: 'userIdLow-index',
      partitionKey: { name: 'userIdLow', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.friendshipsTable.addGlobalSecondaryIndex({
      indexName: 'userIdHigh-index',
      partitionKey: { name: 'userIdHigh', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
  }
}
