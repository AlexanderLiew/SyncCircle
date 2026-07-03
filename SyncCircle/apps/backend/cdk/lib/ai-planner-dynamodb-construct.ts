import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * AIPlannerDynamoDbConstruct defines the four DynamoDB tables required by the
 * AI Planner Integration feature: PlanningSessions, CalendarEvents,
 * MeetingInvitations, and TimetablePrivacySettings.
 *
 * All tables use on-demand (PAY_PER_REQUEST) billing, point-in-time recovery,
 * and RETAIN removal policy for production safety.
 */
export class AIPlannerDynamoDbConstruct extends Construct {
  public readonly planningSessionsTable: Table;
  public readonly calendarEventsTable: Table;
  public readonly meetingInvitationsTable: Table;
  public readonly timetablePrivacySettingsTable: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ─── PlanningSessions Table ───────────────────────────────────────────
    this.planningSessionsTable = new Table(this, 'PlanningSessionsTable', {
      tableName: 'PlanningSessions',
      partitionKey: { name: 'sessionId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.planningSessionsTable.addGlobalSecondaryIndex({
      indexName: 'creatorUserId-createdAt-index',
      partitionKey: { name: 'creatorUserId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ─── CalendarEvents Table ─────────────────────────────────────────────
    this.calendarEventsTable = new Table(this, 'CalendarEventsTable', {
      tableName: 'CalendarEvents',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'startDateTime', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.calendarEventsTable.addGlobalSecondaryIndex({
      indexName: 'eventId-index',
      partitionKey: { name: 'eventId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ─── MeetingInvitations Table ─────────────────────────────────────────
    this.meetingInvitationsTable = new Table(this, 'MeetingInvitationsTable', {
      tableName: 'MeetingInvitations',
      partitionKey: { name: 'invitationId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.meetingInvitationsTable.addGlobalSecondaryIndex({
      indexName: 'receiverUserId-createdAt-index',
      partitionKey: { name: 'receiverUserId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.meetingInvitationsTable.addGlobalSecondaryIndex({
      indexName: 'planningSessionId-index',
      partitionKey: { name: 'planningSessionId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ─── TimetablePrivacySettings Table ───────────────────────────────────
    this.timetablePrivacySettingsTable = new Table(this, 'TimetablePrivacySettingsTable', {
      tableName: 'TimetablePrivacySettings',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
