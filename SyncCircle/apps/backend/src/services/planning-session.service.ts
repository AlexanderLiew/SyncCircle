/**
 * Planning Session Service — Orchestrates the planning workflow.
 *
 * Coordinates between repositories, the availability calculator, and the
 * AI integration service to create personal and group planning sessions.
 */

import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { canonicalPair } from '../utils/canonical-pair.js';
import { computeFreePeriods, intersectFreePeriods } from './availability-calculator.js';
import { rankTimeSlots } from './ai-integration.service.js';
import * as planningSessionRepo from '../repositories/planning-session.repo.js';
import * as calendarEventRepo from '../repositories/calendar-event.repo.js';
import * as meetingInvitationRepo from '../repositories/meeting-invitation.repo.js';
import * as timetablePrivacyRepo from '../repositories/timetable-privacy.repo.js';
import * as friendshipRepo from '../repositories/friendship.repo.js';
import type {
  PlanningSession,
  CreateSessionResponse,
  AcceptOptionResponse,
  RejectOptionResponse,
  NextOptionResponse,
  InvitationActionResponse,
  CancelSessionResponse,
  ProposedTimeOption,
  FreePeriod,
  TimetableClass,
  CalendarEvent,
  MeetingInvitation,
  AIPreferences,
  AvailabilityInput,
} from '../types/ai-planner.types.js';
import {
  PLANNING_SESSION_STATUS,
  PLANNING_MODE,
  PROPOSED_OPTION_STATUS,
  CALENDAR_EVENT_STATUS,
  MEETING_INVITATION_STATUS,
  AI_PLANNER_ERROR_CODES,
  TIMETABLE_VISIBILITY,
} from '../types/ai-planner.types.js';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// ─── DynamoDB client for direct timetable access ─────────────────────────────

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const USER_TIMETABLES_TABLE = process.env.USER_TIMETABLES_TABLE!;

// ─── Default Preferences ─────────────────────────────────────────────────────

const DEFAULT_PREFERENCES: AIPreferences = {
  responseStyle: 'concise',
  planningAggressiveness: 'moderate',
};

// ─── Input Validation ────────────────────────────────────────────────────────

export interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  field?: string;
}

export interface NotFriendsError {
  code: 'NOT_FRIENDS';
  invalidUserIds: string[];
}

export interface ContextUnavailableError {
  code: 'CONTEXT_UNAVAILABLE';
  message: string;
}

export interface NoAvailabilityResponse {
  code: 'NO_AVAILABILITY';
  sessionId: string;
  message: string;
  suggestions: string[];
}

export type CreateSessionError =
  | ValidationError
  | NotFriendsError
  | ContextUnavailableError
  | NoAvailabilityResponse;

export type CreateSessionResult =
  | { success: true; data: CreateSessionResponse }
  | { success: false; error: CreateSessionError };

// ─── Option Action Error Types ───────────────────────────────────────────────

export interface SlotConflictError {
  code: 'SLOT_CONFLICT';
  message: string;
}

export interface ForbiddenError {
  code: 'FORBIDDEN';
  message: string;
}

export interface NotFoundError {
  code: 'NOT_FOUND';
  message: string;
}

export type AcceptOptionError =
  | ForbiddenError
  | NotFoundError
  | SlotConflictError
  | ContextUnavailableError;

export type AcceptOptionResult =
  | { success: true; data: AcceptOptionResponse }
  | { success: false; error: AcceptOptionError };

export type RejectOptionError = ForbiddenError | NotFoundError;

export type RejectOptionResult =
  | { success: true; data: RejectOptionResponse }
  | { success: false; error: RejectOptionError };

export type NextOptionError = ForbiddenError | NotFoundError | ContextUnavailableError;

export type NextOptionResult =
  | { success: true; data: NextOptionResponse }
  | { success: false; error: NextOptionError };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validates common planning request inputs.
 */
function validatePlanningInput(params: {
  activity: string;
  durationMinutes: number;
  dateRangeStart: string;
  dateRangeEnd: string;
}): ValidationError | null {
  const { activity, durationMinutes, dateRangeStart, dateRangeEnd } = params;

  if (!activity || activity.trim().length === 0) {
    return { code: 'VALIDATION_ERROR', message: 'Activity is required', field: 'activity' };
  }

  if (durationMinutes < 15 || durationMinutes > 480) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Duration must be between 15 and 480 minutes',
      field: 'durationMinutes',
    };
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (dateRangeStart < todayStr) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'dateRangeStart must not be in the past',
      field: 'dateRangeStart',
    };
  }

  const startDate = new Date(dateRangeStart + 'T00:00:00Z');
  const endDate = new Date(dateRangeEnd + 'T00:00:00Z');
  const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'dateRangeEnd must be on or after dateRangeStart',
      field: 'dateRangeEnd',
    };
  }

  if (diffDays > 30) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'dateRangeEnd must be within 30 days of dateRangeStart',
      field: 'dateRangeEnd',
    };
  }

  return null;
}

/**
 * Retrieves a user's timetable classes from the UserTimetables table.
 */
async function getUserTimetableClasses(userId: string): Promise<TimetableClass[]> {
  const result = await docClient.send(
    new GetCommand({
      TableName: USER_TIMETABLES_TABLE,
      Key: { userId },
    }),
  );

  if (!result.Item) {
    return [];
  }

  return (result.Item.classes ?? []) as TimetableClass[];
}

/**
 * Retrieves a user's calendar events within a date range.
 */
async function getUserCalendarEvents(
  userId: string,
  dateRangeStart: string,
  dateRangeEnd: string,
): Promise<CalendarEvent[]> {
  return calendarEventRepo.getByUserAndDateRange(userId, dateRangeStart, dateRangeEnd + 'T23:59:59.999Z');
}

/**
 * Maps AI ranked options to ProposedTimeOption format.
 */
function mapToProposedOptions(
  aiOptions: { start: string; end: string; explanation: string; score: number }[],
  durationMinutes: number,
): ProposedTimeOption[] {
  return aiOptions.map((option) => ({
    optionId: randomUUID(),
    start: option.start,
    end: option.end,
    durationMinutes,
    explanation: option.explanation,
    score: option.score,
    status: PROPOSED_OPTION_STATUS.PROPOSED,
  }));
}

// ─── Personal Planning ───────────────────────────────────────────────────────

export interface CreatePersonalSessionParams {
  userId: string;
  activity: string;
  durationMinutes: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  preferences?: AIPreferences;
}

/**
 * Creates a personal planning session.
 *
 * Flow:
 * 1. Validate input
 * 2. Create session record (status: generating)
 * 3. Retrieve timetable + events
 * 4. Compute free periods
 * 5. Invoke AI ranking
 * 6. Map options and update session
 * 7. Return response
 */
export async function createPersonalSession(
  params: CreatePersonalSessionParams,
): Promise<CreateSessionResult> {
  const { userId, activity, durationMinutes, dateRangeStart, dateRangeEnd, preferences } = params;

  // Step 1: Validate input
  const validationError = validatePlanningInput({ activity, durationMinutes, dateRangeStart, dateRangeEnd });
  if (validationError) {
    return { success: false, error: validationError };
  }

  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const sessionPreferences = preferences ?? DEFAULT_PREFERENCES;

  // Step 2: Create session record
  const session: PlanningSession = {
    sessionId,
    creatorUserId: userId,
    mode: PLANNING_MODE.PERSONAL,
    status: PLANNING_SESSION_STATUS.GENERATING,
    activity,
    durationMinutes,
    dateRangeStart,
    dateRangeEnd,
    participantUserIds: [],
    proposedOptions: [],
    excludedOptions: [],
    privacyExclusions: [],
    preferences: sessionPreferences,
    createdAt: now,
    updatedAt: now,
  };

  await planningSessionRepo.create(session);

  // Step 3: Retrieve timetable + events
  let timetableClasses: TimetableClass[];
  let calendarEvents: CalendarEvent[];

  try {
    [timetableClasses, calendarEvents] = await Promise.all([
      getUserTimetableClasses(userId),
      getUserCalendarEvents(userId, dateRangeStart, dateRangeEnd),
    ]);
  } catch (err) {
    logger.error('Failed to retrieve user context', {
      userId,
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Revert session to draft
    await planningSessionRepo.updateStatus(sessionId, PLANNING_SESSION_STATUS.DRAFT, new Date().toISOString());
    return {
      success: false,
      error: { code: 'CONTEXT_UNAVAILABLE', message: 'Failed to retrieve timetable or event data' },
    };
  }

  // Step 4: Compute free periods
  const availabilityInput: AvailabilityInput = {
    timetableClasses,
    calendarEvents,
    dateRangeStart,
    dateRangeEnd,
    timezone: 'UTC',
    availableHoursStart: '08:00',
    availableHoursEnd: '23:00',
  };

  const freePeriods = computeFreePeriods(availabilityInput, durationMinutes);

  // If no free periods, return no-availability
  if (freePeriods.length === 0) {
    await planningSessionRepo.updateStatus(sessionId, PLANNING_SESSION_STATUS.OPTIONS_GENERATED, new Date().toISOString());
    return {
      success: false,
      error: {
        code: 'NO_AVAILABILITY',
        sessionId,
        message: 'No available time slots found for the requested duration within the date range.',
        suggestions: [
          'Try extending the date range',
          'Try reducing the duration',
          'Check if you have conflicting events that could be rescheduled',
        ],
      },
    };
  }

  // Step 5: Invoke AI ranking
  const aiResponse = await rankTimeSlots({
    freePeriods,
    activity,
    durationMinutes,
    preferences: sessionPreferences,
  });

  // Step 6: Map options
  const proposedOptions = mapToProposedOptions(aiResponse.options, durationMinutes);

  // Step 7: Update session with options
  await planningSessionRepo.updateOptions(
    sessionId,
    proposedOptions,
    PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
    new Date().toISOString(),
  );

  return {
    success: true,
    data: {
      sessionId,
      status: PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
      options: proposedOptions,
      aiAvailable: aiResponse.aiAvailable,
    },
  };
}

// ─── Group Planning ──────────────────────────────────────────────────────────

export interface CreateGroupSessionParams {
  userId: string;
  activity: string;
  durationMinutes: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  participantUserIds: string[];
  preferences?: AIPreferences;
}

/**
 * Creates a group planning session.
 *
 * Privacy Enforcement (Requirements 8.3, 8.4, 18.1–18.4):
 * - Participants with privacy "none" are excluded from calculations entirely.
 *   Their availability is reported as "unknown" without revealing timetable existence.
 * - Individual TimetableClass titles, module codes, and locations are NEVER included
 *   in API responses. Only aggregated common FreePeriod time ranges are returned.
 * - The AI model receives only computed FreePeriods (intersected common slots),
 *   never raw participant timetable data.
 * - The response contains no per-user free period attribution.
 *
 * Flow:
 * 1. Validate input (duration, date range, activity, 1–10 participants)
 * 2. Verify friendships for all participants
 * 3. If any participant is not a friend: return NOT_FRIENDS error
 * 4. Check TimetablePrivacySetting for each participant
 * 5. Create PlanningSession record (status: generating, mode: group)
 * 6. Retrieve timetable + events for creator AND each consenting participant
 * 7. Compute individual free periods per user
 * 8. Intersect free periods for common slots
 * 9. If no common slots: return no-availability with suggestions
 * 10. Invoke AI ranking with participantCount
 * 11. Map AIRankedOptions to ProposedTimeOptions
 * 12. Update session with options + status "options-generated"
 * 13. Return CreateSessionResponse including privacyExclusions
 */
export async function createGroupSession(
  params: CreateGroupSessionParams,
): Promise<CreateSessionResult> {
  const {
    userId,
    activity,
    durationMinutes,
    dateRangeStart,
    dateRangeEnd,
    participantUserIds,
    preferences,
  } = params;

  // Step 1: Validate input
  const validationError = validatePlanningInput({ activity, durationMinutes, dateRangeStart, dateRangeEnd });
  if (validationError) {
    return { success: false, error: validationError };
  }

  if (!participantUserIds || participantUserIds.length === 0) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'At least 1 participant is required for group planning',
        field: 'participantUserIds',
      },
    };
  }

  if (participantUserIds.length > 10) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Maximum 10 participants allowed for group planning',
        field: 'participantUserIds',
      },
    };
  }

  // Step 2: Verify friendships for all participants
  const invalidFriendIds: string[] = [];

  const friendshipChecks = await Promise.all(
    participantUserIds.map(async (participantId) => {
      const { userIdLow, userIdHigh } = canonicalPair(userId, participantId);
      const friendship = await friendshipRepo.getByCanonicalPair(userIdLow, userIdHigh);
      return {
        participantId,
        isActiveFriend: friendship?.status === 'active',
      };
    }),
  );

  for (const check of friendshipChecks) {
    if (!check.isActiveFriend) {
      invalidFriendIds.push(check.participantId);
    }
  }

  // Step 3: If any participant is not a friend, return NOT_FRIENDS error
  if (invalidFriendIds.length > 0) {
    return {
      success: false,
      error: {
        code: 'NOT_FRIENDS',
        invalidUserIds: invalidFriendIds,
      },
    };
  }

  // Step 4: Check TimetablePrivacySetting for each participant
  const privacyExclusions: string[] = [];
  const consentingParticipantIds: string[] = [];

  const privacyChecks = await Promise.all(
    participantUserIds.map(async (participantId) => {
      const setting = await timetablePrivacyRepo.get(participantId);
      return { participantId, visibility: setting.visibility };
    }),
  );

  for (const check of privacyChecks) {
    if (check.visibility === TIMETABLE_VISIBILITY.NONE) {
      privacyExclusions.push(check.participantId);
    } else {
      consentingParticipantIds.push(check.participantId);
    }
  }

  // Step 5: Create PlanningSession record
  const sessionId = randomUUID();
  const now = new Date().toISOString();
  const sessionPreferences = preferences ?? DEFAULT_PREFERENCES;

  const session: PlanningSession = {
    sessionId,
    creatorUserId: userId,
    mode: PLANNING_MODE.GROUP,
    status: PLANNING_SESSION_STATUS.GENERATING,
    activity,
    durationMinutes,
    dateRangeStart,
    dateRangeEnd,
    participantUserIds,
    proposedOptions: [],
    excludedOptions: [],
    privacyExclusions,
    preferences: sessionPreferences,
    createdAt: now,
    updatedAt: now,
  };

  await planningSessionRepo.create(session);

  // Step 6: Retrieve timetable + events for creator AND each consenting participant
  const allUserIds = [userId, ...consentingParticipantIds];
  let userDataMap: Map<string, { classes: TimetableClass[]; events: CalendarEvent[] }>;

  try {
    const userDataEntries = await Promise.all(
      allUserIds.map(async (uid) => {
        const [classes, events] = await Promise.all([
          getUserTimetableClasses(uid),
          getUserCalendarEvents(uid, dateRangeStart, dateRangeEnd),
        ]);
        return [uid, { classes, events }] as const;
      }),
    );
    userDataMap = new Map(userDataEntries);
  } catch (err) {
    logger.error('Failed to retrieve group context', {
      userId,
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    await planningSessionRepo.updateStatus(sessionId, PLANNING_SESSION_STATUS.DRAFT, new Date().toISOString());
    return {
      success: false,
      error: { code: 'CONTEXT_UNAVAILABLE', message: 'Failed to retrieve timetable or event data' },
    };
  }

  // Step 7: Compute individual free periods per user
  const periodsPerUser: FreePeriod[][] = [];

  for (const uid of allUserIds) {
    const userData = userDataMap.get(uid)!;
    const input: AvailabilityInput = {
      timetableClasses: userData.classes,
      calendarEvents: userData.events,
      dateRangeStart,
      dateRangeEnd,
      timezone: 'UTC',
      availableHoursStart: '08:00',
      availableHoursEnd: '23:00',
    };
    const freePeriods = computeFreePeriods(input, durationMinutes);
    periodsPerUser.push(freePeriods);
  }

  // Step 8: Intersect free periods for common slots
  const commonSlots = intersectFreePeriods(periodsPerUser, durationMinutes);

  // Step 9: If no common slots, return no-availability with suggestions
  if (commonSlots.length === 0) {
    await planningSessionRepo.updateOptions(
      sessionId,
      [],
      PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
      new Date().toISOString(),
    );
    return {
      success: false,
      error: {
        code: 'NO_AVAILABILITY',
        sessionId,
        message: 'No common available time slots found for all participants within the date range.',
        suggestions: [
          'Try extending the date range',
          'Try reducing the duration',
          'Try with fewer participants',
          privacyExclusions.length > 0
            ? `${privacyExclusions.length} participant(s) have unknown availability due to privacy settings, which may reduce accuracy`
            : '',
        ].filter(Boolean),
      },
    };
  }

  // Step 10: Invoke AI ranking with participantCount
  // PRIVACY: Only intersected commonSlots (FreePeriods) are sent to the AI model.
  // No individual participant timetable data (titles, module codes, locations) is included.
  // This satisfies Requirements 11.1, 18.4.
  const totalParticipantCount = participantUserIds.length + 1; // include creator
  const aiResponse = await rankTimeSlots({
    freePeriods: commonSlots,
    activity,
    durationMinutes,
    preferences: sessionPreferences,
    participantCount: totalParticipantCount,
  });

  // Step 11: Map AIRankedOptions to ProposedTimeOptions
  const proposedOptions = mapToProposedOptions(aiResponse.options, durationMinutes);

  // Step 12: Update session with options + status "options-generated"
  await planningSessionRepo.updateOptions(
    sessionId,
    proposedOptions,
    PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
    new Date().toISOString(),
  );

  // Step 13: Return CreateSessionResponse including privacyExclusions
  // PRIVACY: The response contains ONLY:
  // - Common time slot options (start/end/duration/explanation/score) — no per-user attribution
  // - privacyExclusions: user IDs whose availability is "unknown" (does NOT reveal timetable existence)
  // - No TimetableClass titles, module codes, or locations are included (Requirements 18.1, 18.2, 18.3)
  return {
    success: true,
    data: {
      sessionId,
      status: PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
      options: proposedOptions,
      aiAvailable: aiResponse.aiAvailable,
      privacyExclusions: privacyExclusions.length > 0 ? privacyExclusions : undefined,
    },
  };
}


// ─── Meeting Invitation Lifecycle ────────────────────────────────────────────

export interface ExpiredError {
  code: 'EXPIRED';
  message: string;
}

export type InvitationActionError = ForbiddenError | NotFoundError | ExpiredError;

export type InvitationActionResult =
  | { success: true; data: InvitationActionResponse }
  | { success: false; error: InvitationActionError };

/**
 * Checks if an invitation has expired (createdAt + 72h < now).
 * If expired and still pending, marks it as expired in the database.
 * Returns true if the invitation is expired.
 */
async function checkAndMarkExpired(invitation: MeetingInvitation): Promise<boolean> {
  if (invitation.status !== MEETING_INVITATION_STATUS.PENDING) {
    return invitation.status === MEETING_INVITATION_STATUS.EXPIRED;
  }

  const now = new Date();
  const expiresAt = new Date(invitation.expiresAt);

  if (now > expiresAt) {
    // Mark as expired on read
    await meetingInvitationRepo.updateStatus(
      invitation.invitationId,
      MEETING_INVITATION_STATUS.EXPIRED,
      now.toISOString(),
    );
    return true;
  }

  return false;
}

/**
 * Performs session status rollup after an invitation response.
 *
 * Logic:
 * - Query all invitations for the planning session
 * - If all are responded (accepted/rejected/expired, none pending):
 *   - If at least one is "accepted": update session to "confirmed"
 *   - If all are "rejected" or "expired": update session to "rejected"
 */
async function performSessionStatusRollup(planningSessionId: string): Promise<void> {
  const invitations = await meetingInvitationRepo.queryByPlanningSessionId(planningSessionId);

  if (invitations.length === 0) {
    return;
  }

  // Check if all invitations have been responded to (none are pending)
  const hasPending = invitations.some(
    (inv) => inv.status === MEETING_INVITATION_STATUS.PENDING,
  );

  if (hasPending) {
    return; // Not all responded yet
  }

  // All have been responded — determine final session status
  const hasAccepted = invitations.some(
    (inv) => inv.status === MEETING_INVITATION_STATUS.ACCEPTED,
  );

  const now = new Date().toISOString();

  if (hasAccepted) {
    await planningSessionRepo.updateStatus(
      planningSessionId,
      PLANNING_SESSION_STATUS.CONFIRMED,
      now,
    );
  } else {
    // All rejected or expired
    await planningSessionRepo.updateStatus(
      planningSessionId,
      PLANNING_SESSION_STATUS.REJECTED,
      now,
    );
  }
}

/**
 * Accepts a meeting invitation.
 *
 * Flow:
 * 1. Get invitation by ID
 * 2. Verify userId === invitation.receiverUserId (else FORBIDDEN)
 * 3. If invitation already accepted/rejected: return current status (idempotent)
 * 4. Check if invitation is expired: mark as expired, return error
 * 5. Update invitation status to "accepted", set respondedAt
 * 6. Create CalendarEvent for the participant (copy event details from creator's event)
 * 7. Check session status rollup
 * 8. Return InvitationActionResponse with event
 */
export async function acceptInvitation(
  userId: string,
  invitationId: string,
): Promise<InvitationActionResult> {
  // Step 1: Get invitation by ID
  const invitation = await meetingInvitationRepo.getById(invitationId);

  if (!invitation) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Invitation not found' },
    };
  }

  // Step 2: Verify userId === invitation.receiverUserId
  if (userId !== invitation.receiverUserId) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only the invitation receiver can respond' },
    };
  }

  // Step 3: If invitation already accepted/rejected: return current status (idempotent)
  if (
    invitation.status === MEETING_INVITATION_STATUS.ACCEPTED ||
    invitation.status === MEETING_INVITATION_STATUS.REJECTED
  ) {
    return {
      success: true,
      data: {
        invitationId: invitation.invitationId,
        status: invitation.status,
        respondedAt: invitation.respondedAt!,
      },
    };
  }

  // Step 4: Check if invitation is expired
  const isExpired = await checkAndMarkExpired(invitation);
  if (isExpired) {
    return {
      success: false,
      error: { code: 'EXPIRED', message: 'This invitation has expired (72h limit exceeded)' },
    };
  }

  // Step 5: Update invitation status to "accepted", set respondedAt
  const now = new Date().toISOString();
  await meetingInvitationRepo.updateStatus(
    invitationId,
    MEETING_INVITATION_STATUS.ACCEPTED,
    now,
  );

  // Step 6: Create CalendarEvent for the participant (copy from creator's event)
  const creatorEvent = await calendarEventRepo.getByEventId(invitation.eventId);

  let participantEvent: CalendarEvent | undefined;

  if (creatorEvent) {
    participantEvent = {
      userId,
      startDateTime: creatorEvent.startDateTime,
      eventId: randomUUID(),
      title: creatorEvent.title,
      endDateTime: creatorEvent.endDateTime,
      durationMinutes: creatorEvent.durationMinutes,
      location: creatorEvent.location,
      planningSessionId: creatorEvent.planningSessionId,
      participantUserIds: creatorEvent.participantUserIds,
      status: CALENDAR_EVENT_STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    await calendarEventRepo.create(participantEvent);
  }

  // Step 7: Check session status rollup
  await performSessionStatusRollup(invitation.planningSessionId);

  // Step 8: Return InvitationActionResponse with event
  return {
    success: true,
    data: {
      invitationId: invitation.invitationId,
      status: MEETING_INVITATION_STATUS.ACCEPTED,
      respondedAt: now,
      event: participantEvent,
    },
  };
}

/**
 * Rejects a meeting invitation.
 *
 * Flow:
 * 1. Get invitation by ID
 * 2. Verify userId === invitation.receiverUserId (else FORBIDDEN)
 * 3. If invitation already accepted/rejected: return current status (idempotent)
 * 4. Check if expired: mark as expired, return error
 * 5. Update invitation status to "rejected", set respondedAt
 * 6. Check session status rollup
 * 7. Return InvitationActionResponse (no event)
 */
export async function rejectInvitation(
  userId: string,
  invitationId: string,
): Promise<InvitationActionResult> {
  // Step 1: Get invitation by ID
  const invitation = await meetingInvitationRepo.getById(invitationId);

  if (!invitation) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Invitation not found' },
    };
  }

  // Step 2: Verify userId === invitation.receiverUserId
  if (userId !== invitation.receiverUserId) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only the invitation receiver can respond' },
    };
  }

  // Step 3: If invitation already accepted/rejected: return current status (idempotent)
  if (
    invitation.status === MEETING_INVITATION_STATUS.ACCEPTED ||
    invitation.status === MEETING_INVITATION_STATUS.REJECTED
  ) {
    return {
      success: true,
      data: {
        invitationId: invitation.invitationId,
        status: invitation.status,
        respondedAt: invitation.respondedAt!,
      },
    };
  }

  // Step 4: Check if expired
  const isExpired = await checkAndMarkExpired(invitation);
  if (isExpired) {
    return {
      success: false,
      error: { code: 'EXPIRED', message: 'This invitation has expired (72h limit exceeded)' },
    };
  }

  // Step 5: Update invitation status to "rejected", set respondedAt
  const now = new Date().toISOString();
  await meetingInvitationRepo.updateStatus(
    invitationId,
    MEETING_INVITATION_STATUS.REJECTED,
    now,
  );

  // Step 6: Check session status rollup
  await performSessionStatusRollup(invitation.planningSessionId);

  // Step 7: Return InvitationActionResponse (no event)
  return {
    success: true,
    data: {
      invitationId: invitation.invitationId,
      status: MEETING_INVITATION_STATUS.REJECTED,
      respondedAt: now,
    },
  };
}


// ─── Option Acceptance ───────────────────────────────────────────────────────

/**
 * Accepts a proposed time option for a planning session.
 *
 * Flow:
 * 1. Load session, verify creator authorization
 * 2. Find the option by optionId in proposedOptions
 * 3. Idempotency: if already accepted this option, return existing event
 * 4. Revalidate the time slot against current timetable + events
 * 5. If conflict: return SLOT_CONFLICT error
 * 6. Create CalendarEvent for the creator
 * 7. Update session (set acceptedOptionId, mark option accepted)
 * 8. For personal mode: set status to confirmed
 * 9. For group mode: set status to creator-accepted, create MeetingInvitations
 * 10. Return AcceptOptionResponse
 */
export async function acceptOption(
  userId: string,
  sessionId: string,
  optionId: string,
): Promise<AcceptOptionResult> {
  // Step 1: Load session and verify authorization
  const session = await planningSessionRepo.getById(sessionId);
  if (!session) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Planning session not found' } };
  }

  if (session.creatorUserId !== userId) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only the session creator can accept options' } };
  }

  // Step 2: Find the option
  const option = session.proposedOptions.find((o) => o.optionId === optionId);
  if (!option) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Option not found in session' } };
  }

  // Step 3: Idempotency — if already accepted this option, return existing event
  if (session.acceptedOptionId === optionId) {
    // Retrieve the existing event
    const existingEvents = await calendarEventRepo.getByUserAndDateRange(
      userId,
      option.start,
      option.end,
    );
    const existingEvent = existingEvents.find((e) => e.planningSessionId === sessionId);

    if (existingEvent) {
      // Return existing event (idempotent)
      const invitations = session.mode === PLANNING_MODE.GROUP
        ? await meetingInvitationRepo.queryByPlanningSessionId(sessionId)
        : undefined;

      return {
        success: true,
        data: {
          sessionId,
          status: session.status,
          event: existingEvent,
          invitations: invitations && invitations.length > 0 ? invitations : undefined,
        },
      };
    }
  }

  // Step 4: Revalidate — check if time slot is still free
  let timetableClasses: TimetableClass[];
  let calendarEvents: CalendarEvent[];

  try {
    [timetableClasses, calendarEvents] = await Promise.all([
      getUserTimetableClasses(userId),
      getUserCalendarEvents(userId, session.dateRangeStart, session.dateRangeEnd),
    ]);
  } catch (err) {
    logger.error('Failed to retrieve user context for revalidation', {
      userId,
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      error: { code: 'CONTEXT_UNAVAILABLE', message: 'Failed to retrieve timetable or event data for revalidation' },
    };
  }

  // Check for conflicts: see if the option's time slot overlaps with any busy period
  const optionStart = new Date(option.start).getTime();
  const optionEnd = new Date(option.end).getTime();

  const hasConflict = calendarEvents.some((event) => {
    if (event.status !== CALENDAR_EVENT_STATUS.ACTIVE) return false;
    const eventStart = new Date(event.startDateTime).getTime();
    const eventEnd = new Date(event.endDateTime).getTime();
    // Overlap check: two intervals overlap if one starts before the other ends
    return optionStart < eventEnd && optionEnd > eventStart;
  });

  if (hasConflict) {
    return {
      success: false,
      error: {
        code: 'SLOT_CONFLICT',
        message: 'The selected time slot is no longer available. Please request new options.',
      },
    };
  }

  // Also check against timetable classes for the option's date
  const optionDate = new Date(option.start);
  const optionDayOfWeek = optionDate.getUTCDay(); // 0=Sunday, 1=Monday... adjust: Mon=0 through Fri=4
  // Convert JS day (0=Sun,1=Mon,...6=Sat) to our format (Mon=0,...Fri=4)
  const mappedDay = optionDayOfWeek === 0 ? -1 : optionDayOfWeek - 1; // -1 for Sunday (not in timetable)

  const timetableConflict = timetableClasses.some((cls) => {
    if (cls.dayOfWeek !== mappedDay) return false;
    // Build class start/end on the option's date
    const dateStr = option.start.slice(0, 10); // "YYYY-MM-DD"
    const classStart = new Date(`${dateStr}T${cls.startTime}:00.000Z`).getTime();
    const classEnd = new Date(`${dateStr}T${cls.endTime}:00.000Z`).getTime();
    return optionStart < classEnd && optionEnd > classStart;
  });

  if (timetableConflict) {
    return {
      success: false,
      error: {
        code: 'SLOT_CONFLICT',
        message: 'The selected time slot conflicts with a timetable class. Please request new options.',
      },
    };
  }

  // Step 6: Create CalendarEvent for the creator
  const now = new Date().toISOString();
  const eventId = randomUUID();

  const calendarEvent: CalendarEvent = {
    userId,
    startDateTime: option.start,
    eventId,
    title: session.activity,
    endDateTime: option.end,
    durationMinutes: option.durationMinutes,
    planningSessionId: sessionId,
    participantUserIds: session.mode === PLANNING_MODE.GROUP ? session.participantUserIds : [],
    status: CALENDAR_EVENT_STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };

  await calendarEventRepo.create(calendarEvent);

  // Step 7 & 8: Update session based on mode
  const newStatus = session.mode === PLANNING_MODE.PERSONAL
    ? PLANNING_SESSION_STATUS.CONFIRMED
    : PLANNING_SESSION_STATUS.CREATOR_ACCEPTED;

  // Update option status to accepted
  const updatedOptions = session.proposedOptions.map((o) =>
    o.optionId === optionId
      ? { ...o, status: PROPOSED_OPTION_STATUS.ACCEPTED }
      : o,
  );

  await planningSessionRepo.updateOptions(sessionId, updatedOptions, newStatus, now);
  await planningSessionRepo.setAcceptedOption(sessionId, optionId, newStatus, now);

  // Step 9: For group mode, create MeetingInvitations
  let invitations: MeetingInvitation[] | undefined;

  if (session.mode === PLANNING_MODE.GROUP && session.participantUserIds.length > 0) {
    invitations = [];
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours

    for (const participantId of session.participantUserIds) {
      const invitation: MeetingInvitation = {
        invitationId: randomUUID(),
        planningSessionId: sessionId,
        eventId,
        senderUserId: userId,
        receiverUserId: participantId,
        status: MEETING_INVITATION_STATUS.PENDING,
        createdAt: now,
        expiresAt,
      };
      await meetingInvitationRepo.create(invitation);
      invitations.push(invitation);
    }
  }

  // Step 10: Return response
  return {
    success: true,
    data: {
      sessionId,
      status: newStatus,
      event: calendarEvent,
      invitations: invitations && invitations.length > 0 ? invitations : undefined,
    },
  };
}

// ─── Option Rejection ────────────────────────────────────────────────────────

/**
 * Rejects a proposed time option.
 *
 * Flow:
 * 1. Load session, verify creator authorization
 * 2. Find the option by optionId
 * 3. Mark option as rejected in proposedOptions
 * 4. Add the rejected time slot to excludedOptions list
 * 5. Return RejectOptionResponse
 */
export async function rejectOption(
  userId: string,
  sessionId: string,
  optionId: string,
): Promise<RejectOptionResult> {
  // Step 1: Load session and verify authorization
  const session = await planningSessionRepo.getById(sessionId);
  if (!session) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Planning session not found' } };
  }

  if (session.creatorUserId !== userId) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only the session creator can reject options' } };
  }

  // Step 2: Find the option
  const option = session.proposedOptions.find((o) => o.optionId === optionId);
  if (!option) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Option not found in session' } };
  }

  // Step 3: Mark option as rejected
  const now = new Date().toISOString();
  const updatedOptions = session.proposedOptions.map((o) =>
    o.optionId === optionId
      ? { ...o, status: PROPOSED_OPTION_STATUS.REJECTED }
      : o,
  );

  await planningSessionRepo.updateOptions(
    sessionId,
    updatedOptions,
    session.status,
    now,
  );

  // Step 4: Add to excludedOptions list
  const excludedSlot = { start: option.start, end: option.end };
  await planningSessionRepo.addExcludedOptions(sessionId, [excludedSlot], now);

  // Step 5: Return response
  return {
    success: true,
    data: {
      sessionId,
      status: session.status,
      rejectedOptionId: optionId,
    },
  };
}

// ─── Next Option Generation ──────────────────────────────────────────────────

/**
 * Generates new proposed time options excluding previously rejected slots.
 *
 * Flow:
 * 1. Load session, verify creator authorization
 * 2. Retrieve timetable + events again
 * 3. Compute free periods
 * 4. Exclude all previously rejected slots from free periods
 * 5. Re-invoke AI ranking
 * 6. Store new options on session
 * 7. Return NextOptionResponse
 */
export async function nextOption(
  userId: string,
  sessionId: string,
): Promise<NextOptionResult> {
  // Step 1: Load session and verify authorization
  const session = await planningSessionRepo.getById(sessionId);
  if (!session) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Planning session not found' } };
  }

  if (session.creatorUserId !== userId) {
    return { success: false, error: { code: 'FORBIDDEN', message: 'Only the session creator can request new options' } };
  }

  // Step 2: Retrieve timetable + events
  let timetableClasses: TimetableClass[];
  let calendarEvents: CalendarEvent[];

  if (session.mode === PLANNING_MODE.GROUP) {
    // For group mode: retrieve for all consenting participants + creator
    const allUserIds = [userId];
    const consentingParticipantIds: string[] = [];

    const privacyChecks = await Promise.all(
      session.participantUserIds.map(async (participantId) => {
        const setting = await timetablePrivacyRepo.get(participantId);
        return { participantId, visibility: setting.visibility };
      }),
    );

    for (const check of privacyChecks) {
      if (check.visibility !== TIMETABLE_VISIBILITY.NONE) {
        consentingParticipantIds.push(check.participantId);
      }
    }

    allUserIds.push(...consentingParticipantIds);

    try {
      const userDataEntries = await Promise.all(
        allUserIds.map(async (uid) => {
          const [classes, events] = await Promise.all([
            getUserTimetableClasses(uid),
            getUserCalendarEvents(uid, session.dateRangeStart, session.dateRangeEnd),
          ]);
          return { uid, classes, events };
        }),
      );

      // Compute individual free periods and intersect
      const periodsPerUser: FreePeriod[][] = [];
      for (const userData of userDataEntries) {
        const input: AvailabilityInput = {
          timetableClasses: userData.classes,
          calendarEvents: userData.events,
          dateRangeStart: session.dateRangeStart,
          dateRangeEnd: session.dateRangeEnd,
          timezone: 'UTC',
          availableHoursStart: '08:00',
          availableHoursEnd: '23:00',
        };
        const freePeriods = computeFreePeriods(input, session.durationMinutes);
        periodsPerUser.push(freePeriods);
      }

      const commonSlots = intersectFreePeriods(periodsPerUser, session.durationMinutes);

      // Use common slots as the base free periods and filter excluded
      const excludedSlots = session.excludedOptions ?? [];
      const filteredPeriods = filterExcludedSlots(commonSlots, excludedSlots);

      if (filteredPeriods.length === 0) {
        const now = new Date().toISOString();
        await planningSessionRepo.updateOptions(
          sessionId,
          [],
          PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
          now,
        );
        return {
          success: true,
          data: {
            sessionId,
            status: PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
            options: [],
            aiAvailable: true,
            message: 'No further options are available. Try modifying your date range or duration.',
          },
        };
      }

      // Re-invoke AI ranking
      const totalParticipantCount = session.participantUserIds.length + 1;
      const aiResponse = await rankTimeSlots({
        freePeriods: filteredPeriods,
        activity: session.activity,
        durationMinutes: session.durationMinutes,
        preferences: session.preferences,
        participantCount: totalParticipantCount,
      });

      const proposedOptions = mapToProposedOptions(aiResponse.options, session.durationMinutes);
      const now = new Date().toISOString();

      await planningSessionRepo.updateOptions(
        sessionId,
        proposedOptions,
        PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
        now,
      );

      return {
        success: true,
        data: {
          sessionId,
          status: PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
          options: proposedOptions,
          aiAvailable: aiResponse.aiAvailable,
        },
      };
    } catch (err) {
      logger.error('Failed to retrieve group context for next-option', {
        userId,
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        success: false,
        error: { code: 'CONTEXT_UNAVAILABLE', message: 'Failed to retrieve timetable or event data' },
      };
    }
  } else {
    // Personal mode
    try {
      [timetableClasses, calendarEvents] = await Promise.all([
        getUserTimetableClasses(userId),
        getUserCalendarEvents(userId, session.dateRangeStart, session.dateRangeEnd),
      ]);
    } catch (err) {
      logger.error('Failed to retrieve user context for next-option', {
        userId,
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        success: false,
        error: { code: 'CONTEXT_UNAVAILABLE', message: 'Failed to retrieve timetable or event data' },
      };
    }

    // Step 3: Compute free periods
    const availabilityInput: AvailabilityInput = {
      timetableClasses,
      calendarEvents,
      dateRangeStart: session.dateRangeStart,
      dateRangeEnd: session.dateRangeEnd,
      timezone: 'UTC',
      availableHoursStart: '08:00',
      availableHoursEnd: '23:00',
    };

    const freePeriods = computeFreePeriods(availabilityInput, session.durationMinutes);

    // Step 4: Filter out excluded slots
    const excludedSlots = session.excludedOptions ?? [];
    const filteredPeriods = filterExcludedSlots(freePeriods, excludedSlots);

    if (filteredPeriods.length === 0) {
      const now = new Date().toISOString();
      await planningSessionRepo.updateOptions(
        sessionId,
        [],
        PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
        now,
      );
      return {
        success: true,
        data: {
          sessionId,
          status: PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
          options: [],
          aiAvailable: true,
          message: 'No further options are available. Try modifying your date range or duration.',
        },
      };
    }

    // Step 5: Re-invoke AI ranking
    const aiResponse = await rankTimeSlots({
      freePeriods: filteredPeriods,
      activity: session.activity,
      durationMinutes: session.durationMinutes,
      preferences: session.preferences,
    });

    // Step 6: Store new options
    const proposedOptions = mapToProposedOptions(aiResponse.options, session.durationMinutes);
    const now = new Date().toISOString();

    await planningSessionRepo.updateOptions(
      sessionId,
      proposedOptions,
      PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
      now,
    );

    // Step 7: Return response
    return {
      success: true,
      data: {
        sessionId,
        status: PLANNING_SESSION_STATUS.OPTIONS_GENERATED,
        options: proposedOptions,
        aiAvailable: aiResponse.aiAvailable,
      },
    };
  }
}

// ─── Helper: Filter excluded slots from free periods ─────────────────────────

/**
 * Filters out free periods that overlap with any excluded (rejected) time slot.
 * A free period is excluded if it fully overlaps with any rejected slot.
 */
function filterExcludedSlots(
  freePeriods: FreePeriod[],
  excludedSlots: { start: string; end: string }[],
): FreePeriod[] {
  if (excludedSlots.length === 0) return freePeriods;

  return freePeriods.filter((period) => {
    const periodStart = new Date(period.start).getTime();
    const periodEnd = new Date(period.end).getTime();

    // Exclude this free period if it overlaps with any rejected slot
    const isExcluded = excludedSlots.some((excluded) => {
      const excludedStart = new Date(excluded.start).getTime();
      const excludedEnd = new Date(excluded.end).getTime();
      // Overlap check: periods overlap if one starts before the other ends
      return periodStart < excludedEnd && periodEnd > excludedStart;
    });

    return !isExcluded;
  });
}


// ─── Session Cancellation ────────────────────────────────────────────────────

export type CancelSessionError = ForbiddenError | NotFoundError;

export type CancelSessionResult =
  | { success: true; data: CancelSessionResponse }
  | { success: false; error: CancelSessionError };

/**
 * Cancels a planning session with cascade to invitations and events.
 *
 * Flow:
 * 1. Get session by ID (NOT_FOUND if not exists)
 * 2. Verify userId === session.creatorUserId (FORBIDDEN otherwise)
 * 3. If session.status is already "cancelled": return success (idempotent)
 * 4. Set session status to "cancelled"
 * 5. Cancel all pending MeetingInvitations for this session
 * 6. Delete associated CalendarEvents (creator + accepted participants)
 * 7. Return CancelSessionResponse
 */
export async function cancelSession(
  userId: string,
  sessionId: string,
): Promise<CancelSessionResult> {
  // Step 1: Get session by ID
  const session = await planningSessionRepo.getById(sessionId);
  if (!session) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Planning session not found' },
    };
  }

  // Step 2: Verify userId === session.creatorUserId
  if (session.creatorUserId !== userId) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only the session creator can cancel a session' },
    };
  }

  // Step 3: If session.status is already "cancelled", return success (idempotent)
  if (session.status === PLANNING_SESSION_STATUS.CANCELLED) {
    return {
      success: true,
      data: { sessionId, status: 'cancelled' },
    };
  }

  // Step 4: Set session status to "cancelled"
  const now = new Date().toISOString();
  await planningSessionRepo.updateStatus(sessionId, PLANNING_SESSION_STATUS.CANCELLED, now);

  // Step 5: Cancel all pending MeetingInvitations for this session
  const invitations = await meetingInvitationRepo.queryByPlanningSessionId(sessionId);
  const acceptedInvitations: MeetingInvitation[] = [];

  for (const invitation of invitations) {
    if (invitation.status === MEETING_INVITATION_STATUS.PENDING) {
      await meetingInvitationRepo.updateStatus(
        invitation.invitationId,
        MEETING_INVITATION_STATUS.CANCELLED,
        now,
      );
    }
    if (invitation.status === MEETING_INVITATION_STATUS.ACCEPTED) {
      acceptedInvitations.push(invitation);
    }
  }

  // Step 6: Delete associated CalendarEvents
  // 6a: Delete the creator's event (if acceptedOptionId exists, meaning an event was created)
  if (session.acceptedOptionId && invitations.length > 0) {
    // The eventId on invitations points to the creator's event
    const creatorEvent = await calendarEventRepo.getByEventId(invitations[0].eventId);
    if (creatorEvent) {
      await calendarEventRepo.deleteEvent(creatorEvent.userId, creatorEvent.startDateTime);
    }
  } else if (session.acceptedOptionId) {
    // Personal mode or group with no invitations yet — find creator's event by session
    // The accepted option tells us the time range
    const acceptedOption = session.proposedOptions.find(
      (o) => o.optionId === session.acceptedOptionId,
    );
    if (acceptedOption) {
      // Query creator's events in that time range and find the one linked to this session
      const creatorEvents = await calendarEventRepo.getByUserAndDateRange(
        userId,
        acceptedOption.start,
        acceptedOption.end,
      );
      const sessionEvent = creatorEvents.find((e) => e.planningSessionId === sessionId);
      if (sessionEvent) {
        await calendarEventRepo.deleteEvent(sessionEvent.userId, sessionEvent.startDateTime);
      }
    }
  }

  // 6b: Delete accepted participants' events
  for (const invitation of acceptedInvitations) {
    // Each accepted participant has an event with the same startDateTime as the creator's event
    // We need to find it via the creator's event startDateTime
    const creatorEvent = await calendarEventRepo.getByEventId(invitation.eventId);
    if (creatorEvent) {
      // The participant's event has the same startDateTime, same planningSessionId
      const participantEvents = await calendarEventRepo.getByUserAndDateRange(
        invitation.receiverUserId,
        creatorEvent.startDateTime,
        creatorEvent.endDateTime,
      );
      const participantEvent = participantEvents.find(
        (e) => e.planningSessionId === sessionId,
      );
      if (participantEvent) {
        await calendarEventRepo.deleteEvent(
          participantEvent.userId,
          participantEvent.startDateTime,
        );
      }
    }
  }

  // Step 7: Return CancelSessionResponse
  return {
    success: true,
    data: { sessionId, status: 'cancelled' },
  };
}
