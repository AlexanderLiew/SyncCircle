import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Props accepted by the AIPlannerConstruct.
 * References to existing DynamoDB tables, the API Gateway, Cognito user pool,
 * and the four new AI Planner DynamoDB tables.
 */
export interface AIPlannerConstructProps {
  /** Existing API Gateway REST API to add routes to */
  api: apigateway.RestApi;
  /** Cognito User Pool for JWT authorization */
  userPool: cognito.IUserPool;

  // ─── New AI Planner DynamoDB Tables ──────────────────────────────────
  /** PlanningSessions table */
  planningSessionsTable: dynamodb.ITable;
  /** CalendarEvents table */
  calendarEventsTable: dynamodb.ITable;
  /** MeetingInvitations table */
  meetingInvitationsTable: dynamodb.ITable;
  /** TimetablePrivacySettings table */
  timetablePrivacySettingsTable: dynamodb.ITable;

  // ─── Existing DynamoDB Tables (needed for planning logic) ────────────
  /** Existing UserTimetables table */
  userTimetablesTable: dynamodb.ITable;
  /** Existing Friendships table */
  friendshipsTable: dynamodb.ITable;
}

/**
 * AIPlannerConstruct defines the Lambda functions and API Gateway routes
 * for the AI Planner Integration feature.
 *
 * It creates 14 Lambda handlers, wires them to API Gateway routes with
 * Cognito JWT authorization, and grants least-privilege DynamoDB access.
 */
export class AIPlannerConstruct extends Construct {
  public readonly personalPlanHandler: nodejs.NodejsFunction;
  public readonly groupPlanHandler: nodejs.NodejsFunction;
  public readonly listSessionsHandler: nodejs.NodejsFunction;
  public readonly getSessionHandler: nodejs.NodejsFunction;
  public readonly acceptOptionHandler: nodejs.NodejsFunction;
  public readonly rejectOptionHandler: nodejs.NodejsFunction;
  public readonly nextOptionHandler: nodejs.NodejsFunction;
  public readonly cancelSessionHandler: nodejs.NodejsFunction;
  public readonly listInvitationsHandler: nodejs.NodejsFunction;
  public readonly getInvitationHandler: nodejs.NodejsFunction;
  public readonly acceptInvitationHandler: nodejs.NodejsFunction;
  public readonly rejectInvitationHandler: nodejs.NodejsFunction;
  public readonly putPrivacyHandler: nodejs.NodejsFunction;
  public readonly getPrivacyHandler: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: AIPlannerConstructProps) {
    super(scope, id);

    const {
      api,
      userPool,
      planningSessionsTable,
      calendarEventsTable,
      meetingInvitationsTable,
      timetablePrivacySettingsTable,
      userTimetablesTable,
      friendshipsTable,
    } = props;

    // Resolve the handlers source directory relative to this CDK file.
    // CDK lib is at cdk/lib/, handlers are at src/handlers/
    const handlersDir = path.join(__dirname, '..', '..', 'src', 'handlers', 'ai-planner');

    // ─── AI API Key from SSM Parameter Store ─────────────────────────────
    const aiApiKey = ssm.StringParameter.valueForStringParameter(
      this,
      '/synccircle/ai-planner/api-key',
    );
    const aiApiEndpoint = ssm.StringParameter.valueForStringParameter(
      this,
      '/synccircle/ai-planner/api-endpoint',
    );
    const aiModel = ssm.StringParameter.valueForStringParameter(
      this,
      '/synccircle/ai-planner/model',
    );

    // ─── Shared Environment Variables ────────────────────────────────────
    const commonEnv: Record<string, string> = {
      PLANNING_SESSIONS_TABLE: planningSessionsTable.tableName,
      CALENDAR_EVENTS_TABLE: calendarEventsTable.tableName,
      MEETING_INVITATIONS_TABLE: meetingInvitationsTable.tableName,
      TIMETABLE_PRIVACY_TABLE: timetablePrivacySettingsTable.tableName,
      USER_TIMETABLES_TABLE: userTimetablesTable.tableName,
      FRIENDSHIPS_TABLE: friendshipsTable.tableName,
      AI_API_KEY: aiApiKey,
      AI_API_ENDPOINT: aiApiEndpoint,
      AI_MODEL: aiModel,
    };

    // ─── Default Lambda Function Configuration ───────────────────────────
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

    // ─── Cognito Authorizer ──────────────────────────────────────────────
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'AIPlannerCognitoAuthorizer',
      {
        cognitoUserPools: [userPool],
        identitySource: 'method.request.header.Authorization',
      },
    );

    const authorizerOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // ===================================================================
    // LAMBDA FUNCTIONS
    // ===================================================================

    // -------------------------------------------------------------------
    // Personal Plan Handler
    // POST /ai-planner/personal
    // -------------------------------------------------------------------
    this.personalPlanHandler = new nodejs.NodejsFunction(this, 'PersonalPlanHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'personal-plan.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-PersonalPlan',
      timeout: Duration.seconds(60), // AI calls may take up to 15s
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Group Plan Handler
    // POST /ai-planner/group
    // -------------------------------------------------------------------
    this.groupPlanHandler = new nodejs.NodejsFunction(this, 'GroupPlanHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'group-plan.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-GroupPlan',
      timeout: Duration.seconds(60), // AI calls may take up to 15s
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // List Sessions Handler
    // GET /planning-sessions
    // -------------------------------------------------------------------
    this.listSessionsHandler = new nodejs.NodejsFunction(this, 'ListSessionsHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'list-sessions.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-ListSessions',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Get Session Handler
    // GET /planning-sessions/{sessionId}
    // -------------------------------------------------------------------
    this.getSessionHandler = new nodejs.NodejsFunction(this, 'GetSessionHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'get-session.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-GetSession',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Accept Option Handler
    // POST /planning-sessions/{sessionId}/accept-option
    // -------------------------------------------------------------------
    this.acceptOptionHandler = new nodejs.NodejsFunction(this, 'AcceptOptionHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'accept-option.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-AcceptOption',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Reject Option Handler
    // POST /planning-sessions/{sessionId}/reject-option
    // -------------------------------------------------------------------
    this.rejectOptionHandler = new nodejs.NodejsFunction(this, 'RejectOptionHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'reject-option.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-RejectOption',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Next Option Handler
    // POST /planning-sessions/{sessionId}/next-option
    // -------------------------------------------------------------------
    this.nextOptionHandler = new nodejs.NodejsFunction(this, 'NextOptionHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'next-option.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-NextOption',
      timeout: Duration.seconds(60), // AI calls may take up to 15s
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Cancel Session Handler
    // POST /planning-sessions/{sessionId}/cancel
    // -------------------------------------------------------------------
    this.cancelSessionHandler = new nodejs.NodejsFunction(this, 'CancelSessionHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'cancel-session.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-CancelSession',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // List Invitations Handler
    // GET /meeting-invitations
    // -------------------------------------------------------------------
    this.listInvitationsHandler = new nodejs.NodejsFunction(this, 'ListInvitationsHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'list-invitations.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-ListInvitations',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Get Invitation Handler
    // GET /meeting-invitations/{invitationId}
    // -------------------------------------------------------------------
    this.getInvitationHandler = new nodejs.NodejsFunction(this, 'GetInvitationHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'get-invitation.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-GetInvitation',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Accept Invitation Handler
    // POST /meeting-invitations/{invitationId}/accept
    // -------------------------------------------------------------------
    this.acceptInvitationHandler = new nodejs.NodejsFunction(this, 'AcceptInvitationHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'accept-invitation.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-AcceptInvitation',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Reject Invitation Handler
    // POST /meeting-invitations/{invitationId}/reject
    // -------------------------------------------------------------------
    this.rejectInvitationHandler = new nodejs.NodejsFunction(this, 'RejectInvitationHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'reject-invitation.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-RejectInvitation',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Put Privacy Handler
    // PUT /timetable/privacy
    // -------------------------------------------------------------------
    this.putPrivacyHandler = new nodejs.NodejsFunction(this, 'PutPrivacyHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'put-privacy.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-PutPrivacy',
      environment: commonEnv,
    });

    // -------------------------------------------------------------------
    // Get Privacy Handler
    // GET /timetable/privacy
    // -------------------------------------------------------------------
    this.getPrivacyHandler = new nodejs.NodejsFunction(this, 'GetPrivacyHandler', {
      ...defaultFunctionProps,
      entry: path.join(handlersDir, 'get-privacy.ts'),
      handler: 'handler',
      functionName: 'SyncCircle-AIPlanner-GetPrivacy',
      environment: commonEnv,
    });

    // ===================================================================
    // IAM PERMISSIONS — Least-privilege DynamoDB access
    // ===================================================================

    // Personal Plan: needs timetables, calendar events, planning sessions
    planningSessionsTable.grantReadWriteData(this.personalPlanHandler);
    calendarEventsTable.grantReadData(this.personalPlanHandler);
    userTimetablesTable.grantReadData(this.personalPlanHandler);

    // Group Plan: needs all tables for friendship verification, privacy, timetables
    planningSessionsTable.grantReadWriteData(this.groupPlanHandler);
    calendarEventsTable.grantReadData(this.groupPlanHandler);
    userTimetablesTable.grantReadData(this.groupPlanHandler);
    friendshipsTable.grantReadData(this.groupPlanHandler);
    timetablePrivacySettingsTable.grantReadData(this.groupPlanHandler);

    // List Sessions: read planning sessions
    planningSessionsTable.grantReadData(this.listSessionsHandler);

    // Get Session: read planning sessions
    planningSessionsTable.grantReadData(this.getSessionHandler);

    // Accept Option: read/write sessions, read/write calendar events, read/write invitations
    planningSessionsTable.grantReadWriteData(this.acceptOptionHandler);
    calendarEventsTable.grantReadWriteData(this.acceptOptionHandler);
    meetingInvitationsTable.grantReadWriteData(this.acceptOptionHandler);
    userTimetablesTable.grantReadData(this.acceptOptionHandler);

    // Reject Option: read/write sessions
    planningSessionsTable.grantReadWriteData(this.rejectOptionHandler);

    // Next Option: read/write sessions, read calendar events, read timetables
    planningSessionsTable.grantReadWriteData(this.nextOptionHandler);
    calendarEventsTable.grantReadData(this.nextOptionHandler);
    userTimetablesTable.grantReadData(this.nextOptionHandler);

    // Cancel Session: read/write sessions, read/write invitations, read/write calendar events
    planningSessionsTable.grantReadWriteData(this.cancelSessionHandler);
    meetingInvitationsTable.grantReadWriteData(this.cancelSessionHandler);
    calendarEventsTable.grantReadWriteData(this.cancelSessionHandler);

    // List Invitations: read invitations
    meetingInvitationsTable.grantReadData(this.listInvitationsHandler);

    // Get Invitation: read invitations, read calendar events
    meetingInvitationsTable.grantReadData(this.getInvitationHandler);
    calendarEventsTable.grantReadData(this.getInvitationHandler);

    // Accept Invitation: read/write invitations, read/write calendar events, read/write sessions
    meetingInvitationsTable.grantReadWriteData(this.acceptInvitationHandler);
    calendarEventsTable.grantReadWriteData(this.acceptInvitationHandler);
    planningSessionsTable.grantReadWriteData(this.acceptInvitationHandler);

    // Reject Invitation: read/write invitations, read/write sessions
    meetingInvitationsTable.grantReadWriteData(this.rejectInvitationHandler);
    planningSessionsTable.grantReadWriteData(this.rejectInvitationHandler);

    // Put Privacy: read/write privacy settings
    timetablePrivacySettingsTable.grantReadWriteData(this.putPrivacyHandler);

    // Get Privacy: read privacy settings
    timetablePrivacySettingsTable.grantReadData(this.getPrivacyHandler);

    // ===================================================================
    // API GATEWAY ROUTES
    // ===================================================================

    // ─── /ai-planner ─────────────────────────────────────────────────────
    const aiPlanner = api.root.addResource('ai-planner');

    // POST /ai-planner/personal
    const aiPlannerPersonal = aiPlanner.addResource('personal');
    aiPlannerPersonal.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.personalPlanHandler),
      authorizerOptions,
    );

    // POST /ai-planner/group
    const aiPlannerGroup = aiPlanner.addResource('group');
    aiPlannerGroup.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.groupPlanHandler),
      authorizerOptions,
    );

    // ─── /planning-sessions ──────────────────────────────────────────────
    const planningSessions = api.root.addResource('planning-sessions');

    // GET /planning-sessions
    planningSessions.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.listSessionsHandler),
      authorizerOptions,
    );

    // /planning-sessions/{sessionId}
    const sessionById = planningSessions.addResource('{sessionId}');

    // GET /planning-sessions/{sessionId}
    sessionById.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.getSessionHandler),
      authorizerOptions,
    );

    // POST /planning-sessions/{sessionId}/accept-option
    const acceptOption = sessionById.addResource('accept-option');
    acceptOption.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.acceptOptionHandler),
      authorizerOptions,
    );

    // POST /planning-sessions/{sessionId}/reject-option
    const rejectOption = sessionById.addResource('reject-option');
    rejectOption.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.rejectOptionHandler),
      authorizerOptions,
    );

    // POST /planning-sessions/{sessionId}/next-option
    const nextOption = sessionById.addResource('next-option');
    nextOption.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.nextOptionHandler),
      authorizerOptions,
    );

    // POST /planning-sessions/{sessionId}/cancel
    const cancelSession = sessionById.addResource('cancel');
    cancelSession.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.cancelSessionHandler),
      authorizerOptions,
    );

    // ─── /meeting-invitations ────────────────────────────────────────────
    const meetingInvitations = api.root.addResource('meeting-invitations');

    // GET /meeting-invitations
    meetingInvitations.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.listInvitationsHandler),
      authorizerOptions,
    );

    // /meeting-invitations/{invitationId}
    const invitationById = meetingInvitations.addResource('{invitationId}');

    // GET /meeting-invitations/{invitationId}
    invitationById.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.getInvitationHandler),
      authorizerOptions,
    );

    // POST /meeting-invitations/{invitationId}/accept
    const acceptInvitation = invitationById.addResource('accept');
    acceptInvitation.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.acceptInvitationHandler),
      authorizerOptions,
    );

    // POST /meeting-invitations/{invitationId}/reject
    const rejectInvitation = invitationById.addResource('reject');
    rejectInvitation.addMethod(
      'POST',
      new apigateway.LambdaIntegration(this.rejectInvitationHandler),
      authorizerOptions,
    );

    // ─── /timetable/privacy ──────────────────────────────────────────────
    // Note: /timetable resource may already exist from existing ApiConstruct.
    // We add the /privacy sub-resource to the existing /timetable resource.
    let timetableResource: apigateway.IResource;
    try {
      timetableResource = api.root.getResource('timetable') ?? api.root.addResource('timetable');
    } catch {
      timetableResource = api.root.addResource('timetable');
    }

    const privacy = timetableResource.addResource('privacy');

    // PUT /timetable/privacy
    privacy.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(this.putPrivacyHandler),
      authorizerOptions,
    );

    // GET /timetable/privacy
    privacy.addMethod(
      'GET',
      new apigateway.LambdaIntegration(this.getPrivacyHandler),
      authorizerOptions,
    );
  }
}
