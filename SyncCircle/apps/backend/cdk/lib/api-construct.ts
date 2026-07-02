import { CfnOutput } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Props for the ApiConstruct.
 */
export interface ApiConstructProps {
  /** Cognito user pool used for JWT authorization. */
  userPool: cognito.IUserPool;

  /** Allowed CORS origins. Defaults to ["*"] if not provided. */
  allowedOrigins?: string[];

  // ─── Lambda handler references ─────────────────────────────────────
  searchHandler: lambda.IFunction;
  createFriendRequestHandler: lambda.IFunction;
  acceptHandler: lambda.IFunction;
  rejectHandler: lambda.IFunction;
  cancelHandler: lambda.IFunction;
  incomingHandler: lambda.IFunction;
  outgoingHandler: lambda.IFunction;
  validateTokenHandler: lambda.IFunction;
  listFriendsHandler: lambda.IFunction;
  removeFriendHandler: lambda.IFunction;
  relationshipHandler: lambda.IFunction;
  putTimetableHandler: lambda.IFunction;
  getFriendTimetableHandler: lambda.IFunction;
  getUsersHandler: lambda.IFunction;
}

/**
 * ApiConstruct provisions the API Gateway REST API for the SyncCircle
 * Friends Backend.
 *
 * - Cognito JWT authorizer on all routes
 * - CORS configured to the frontend origin (or "*")
 * - Request body validation for POST endpoints
 * - Usage plan with rate limiting (10 req/s, burst 10)
 * - All routes wired to their respective Lambda handlers
 */
export class ApiConstruct extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const allowedOrigins = props.allowedOrigins ?? ['*'];

    // ─── API Gateway Access Log Group (14-day retention) ─────────────────
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: '/aws/apigateway/SyncCircle-Friends-API',
      retention: logs.RetentionDays.TWO_WEEKS,
    });

    // ─── REST API ────────────────────────────────────────────────────────
    this.api = new apigateway.RestApi(this, 'FriendsApi', {
      restApiName: 'SyncCircle Friends API',
      description: 'REST API for the SyncCircle Friends Backend',
      cloudWatchRole: true,
      defaultCorsPreflightOptions: {
        allowOrigins: allowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: false,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: false,
        }),
      },
    });

    // ─── Cognito Authorizer ──────────────────────────────────────────────
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      {
        cognitoUserPools: [props.userPool],
        identitySource: 'method.request.header.Authorization',
      },
    );

    const authorizerOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // ─── Gateway Responses (CORS headers on 4XX/5XX) ─────────────────────
    // API Gateway doesn't include CORS headers on authorizer rejections by default
    this.api.addGatewayResponse('Unauthorized', {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
      },
      templates: {
        'application/json': '{"error":"Unauthorized","code":"UNAUTHORIZED"}',
      },
    });

    this.api.addGatewayResponse('AccessDenied', {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
      },
      templates: {
        'application/json': '{"error":"Access denied","code":"FORBIDDEN"}',
      },
    });

    this.api.addGatewayResponse('Default4XX', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    this.api.addGatewayResponse('Default5XX', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        'Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
      },
    });

    // ─── Request Validators ──────────────────────────────────────────────
    const bodyValidator = new apigateway.RequestValidator(
      this,
      'BodyValidator',
      {
        restApi: this.api,
        requestValidatorName: 'body-validator',
        validateRequestBody: true,
        validateRequestParameters: false,
      },
    );

    // ─── Request Body Models ─────────────────────────────────────────────
    const searchModel = this.api.addModel('SearchModel', {
      contentType: 'application/json',
      modelName: 'SearchModel',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['email', 'displayName'],
        properties: {
          email: {
            type: apigateway.JsonSchemaType.STRING,
            maxLength: 254,
          },
          displayName: {
            type: apigateway.JsonSchemaType.STRING,
            minLength: 1,
            maxLength: 100,
          },
        },
      },
    });

    const createFriendRequestModel = this.api.addModel(
      'CreateFriendRequestModel',
      {
        contentType: 'application/json',
        modelName: 'CreateFriendRequestModel',
        schema: {
          type: apigateway.JsonSchemaType.OBJECT,
          required: ['recipientEmail', 'recipientDisplayName'],
          properties: {
            recipientEmail: {
              type: apigateway.JsonSchemaType.STRING,
              maxLength: 254,
            },
            recipientDisplayName: {
              type: apigateway.JsonSchemaType.STRING,
              minLength: 1,
              maxLength: 100,
            },
          },
        },
      },
    );

    // ─── Route Definitions ───────────────────────────────────────────────

    // POST /friends/search
    const friends = this.api.root.addResource('friends');
    const friendsSearch = friends.addResource('search');
    friendsSearch.addMethod(
      'POST',
      new apigateway.LambdaIntegration(props.searchHandler),
      {
        ...authorizerOptions,
        requestValidator: bodyValidator,
        requestModels: { 'application/json': searchModel },
      },
    );

    // POST /friend-requests
    const friendRequests = this.api.root.addResource('friend-requests');
    friendRequests.addMethod(
      'POST',
      new apigateway.LambdaIntegration(props.createFriendRequestHandler),
      {
        ...authorizerOptions,
        requestValidator: bodyValidator,
        requestModels: { 'application/json': createFriendRequestModel },
      },
    );

    // GET /friend-requests/incoming
    const incoming = friendRequests.addResource('incoming');
    incoming.addMethod(
      'GET',
      new apigateway.LambdaIntegration(props.incomingHandler),
      authorizerOptions,
    );

    // GET /friend-requests/outgoing
    const outgoing = friendRequests.addResource('outgoing');
    outgoing.addMethod(
      'GET',
      new apigateway.LambdaIntegration(props.outgoingHandler),
      authorizerOptions,
    );

    // GET /friend-requests/invite/{token}
    const invite = friendRequests.addResource('invite');
    const inviteToken = invite.addResource('{token}');
    inviteToken.addMethod(
      'GET',
      new apigateway.LambdaIntegration(props.validateTokenHandler),
      authorizerOptions,
    );

    // /friend-requests/{requestId}
    const requestById = friendRequests.addResource('{requestId}');

    // POST /friend-requests/{requestId}/accept
    const accept = requestById.addResource('accept');
    accept.addMethod(
      'POST',
      new apigateway.LambdaIntegration(props.acceptHandler),
      authorizerOptions,
    );

    // POST /friend-requests/{requestId}/reject
    const reject = requestById.addResource('reject');
    reject.addMethod(
      'POST',
      new apigateway.LambdaIntegration(props.rejectHandler),
      authorizerOptions,
    );

    // POST /friend-requests/{requestId}/cancel
    const cancel = requestById.addResource('cancel');
    cancel.addMethod(
      'POST',
      new apigateway.LambdaIntegration(props.cancelHandler),
      authorizerOptions,
    );

    // GET /friends (list friends)
    friends.addMethod(
      'GET',
      new apigateway.LambdaIntegration(props.listFriendsHandler),
      authorizerOptions,
    );

    // DELETE /friends/{friendId}
    const friendById = friends.addResource('{friendId}');
    friendById.addMethod(
      'DELETE',
      new apigateway.LambdaIntegration(props.removeFriendHandler),
      authorizerOptions,
    );

    // GET /friends/{friendId}/relationship
    const relationship = friendById.addResource('relationship');
    relationship.addMethod(
      'GET',
      new apigateway.LambdaIntegration(props.relationshipHandler),
      authorizerOptions,
    );

    // PUT /timetable
    const timetable = this.api.root.addResource('timetable');
    timetable.addMethod(
      'PUT',
      new apigateway.LambdaIntegration(props.putTimetableHandler),
      authorizerOptions,
    );

    // GET /friends/{friendId}/timetable
    const friendTimetable = friendById.addResource('timetable');
    friendTimetable.addMethod(
      'GET',
      new apigateway.LambdaIntegration(props.getFriendTimetableHandler),
      authorizerOptions,
    );

    // GET /users (user discovery)
    const users = this.api.root.addResource('users');
    users.addMethod(
      'GET',
      new apigateway.LambdaIntegration(props.getUsersHandler),
      authorizerOptions,
    );

    // ─── Usage Plan & Rate Limiting ──────────────────────────────────────
    const plan = this.api.addUsagePlan('FriendsApiUsagePlan', {
      name: 'FriendsApiUsagePlan',
      description: 'Rate limiting for SyncCircle Friends API',
      throttle: {
        rateLimit: 10,
        burstLimit: 10,
      },
    });

    plan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // ─── Outputs ─────────────────────────────────────────────────────────
    new CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'SyncCircle Friends API URL',
      exportName: 'FriendsApiUrl',
    });
  }
}
