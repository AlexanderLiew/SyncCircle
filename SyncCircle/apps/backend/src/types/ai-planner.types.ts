/**
 * Type definitions for the AI Planner Integration feature.
 *
 * Covers planning sessions, calendar events, meeting invitations,
 * availability computation, AI ranking, and timetable privacy settings.
 */

// ─── Status Unions ───────────────────────────────────────────────────────────

/**
 * Lifecycle status of a planning session.
 *
 * Flow: draft → generating → options-generated → creator-accepted → confirmed
 *       ↘ cancelled (from any state by creator)
 *       ↘ rejected (all participants rejected in group mode)
 */
export type PlanningSessionStatus =
  | 'draft'
  | 'generating'
  | 'options-generated'
  | 'creator-accepted'
  | 'confirmed'
  | 'cancelled'
  | 'rejected';

export const PLANNING_SESSION_STATUS = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  OPTIONS_GENERATED: 'options-generated',
  CREATOR_ACCEPTED: 'creator-accepted',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
} as const satisfies Record<string, PlanningSessionStatus>;

/** Planning session mode: individual or group coordination. */
export type PlanningMode = 'personal' | 'group';

export const PLANNING_MODE = {
  PERSONAL: 'personal',
  GROUP: 'group',
} as const satisfies Record<string, PlanningMode>;

/** Status of a proposed time option within a session. */
export type ProposedOptionStatus = 'proposed' | 'accepted' | 'rejected';

export const PROPOSED_OPTION_STATUS = {
  PROPOSED: 'proposed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const satisfies Record<string, ProposedOptionStatus>;

/** Status of a meeting invitation sent to a participant. */
export type MeetingInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export const MEETING_INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, MeetingInvitationStatus>;

/** Status of a calendar event. */
export type CalendarEventStatus = 'active' | 'cancelled';

export const CALENDAR_EVENT_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, CalendarEventStatus>;

/** Timetable visibility for group planning. */
export type TimetableVisibility = 'friends' | 'none';

export const TIMETABLE_VISIBILITY = {
  FRIENDS: 'friends',
  NONE: 'none',
} as const satisfies Record<string, TimetableVisibility>;

// ─── Core Data Interfaces ────────────────────────────────────────────────────

/** A contiguous time range defined by ISO 8601 start and end. */
export interface TimeSlot {
  /** ISO 8601 datetime */
  start: string;
  /** ISO 8601 datetime */
  end: string;
}

/** A free period returned by the availability calculator. */
export interface FreePeriod {
  /** ISO 8601 datetime */
  start: string;
  /** ISO 8601 datetime */
  end: string;
  /** Duration of this free period in minutes */
  durationMinutes: number;
}

/**
 * Timetable class structure matching the existing UserTimetables table schema.
 * Represents a recurring weekly class.
 */
export interface TimetableClass {
  id: string;
  title: string;
  moduleCode: string;
  location: string;
  /** Day of week: Monday=0 through Friday=4 */
  dayOfWeek: number;
  /** "HH:mm" format */
  startTime: string;
  /** "HH:mm" format */
  endTime: string;
  color: string;
  source: string;
}

// ─── Availability Calculator ─────────────────────────────────────────────────

/** Input to the backend availability calculator. */
export interface AvailabilityInput {
  timetableClasses: TimetableClass[];
  calendarEvents: CalendarEvent[];
  /** ISO 8601 date (start of range) */
  dateRangeStart: string;
  /** ISO 8601 date (end of range) */
  dateRangeEnd: string;
  /** IANA timezone identifier (e.g., "Asia/Singapore") */
  timezone: string;
  /** Earliest available hour, "HH:mm" format (default: "08:00") */
  availableHoursStart: string;
  /** Latest available hour, "HH:mm" format (default: "23:00") */
  availableHoursEnd: string;
}

// ─── AI Integration ──────────────────────────────────────────────────────────

/** User preferences that influence AI recommendations. */
export interface AIPreferences {
  /** How verbose AI explanations should be */
  responseStyle: 'concise' | 'detailed';
  /** How aggressively to pack the schedule */
  planningAggressiveness: 'relaxed' | 'moderate' | 'aggressive';
}

/** Request payload sent to the AI ranking service. */
export interface AIRankingRequest {
  freePeriods: FreePeriod[];
  activity: string;
  durationMinutes: number;
  preferences: AIPreferences;
  /** Number of participants (for group mode context) */
  participantCount?: number;
}

/** A single ranked time slot returned by the AI model. */
export interface AIRankedOption {
  /** ISO 8601 datetime */
  start: string;
  /** ISO 8601 datetime */
  end: string;
  /** Natural-language explanation for this recommendation */
  explanation: string;
  /** Numeric ranking score (higher = better) */
  score: number;
}

/** Response from the AI ranking service. */
export interface AIRankingResponse {
  options: AIRankedOption[];
  /** false when AI timed out and unranked fallback was used */
  aiAvailable: boolean;
}

// ─── Planning Session ────────────────────────────────────────────────────────

/** A proposed time option stored on a planning session. */
export interface ProposedTimeOption {
  optionId: string;
  /** ISO 8601 datetime */
  start: string;
  /** ISO 8601 datetime */
  end: string;
  durationMinutes: number;
  /** AI-generated explanation for this time slot */
  explanation: string;
  /** Numeric ranking score */
  score: number;
  status: ProposedOptionStatus;
}

/** A planning session record stored in the PlanningSessions DynamoDB table. */
export interface PlanningSession {
  /** UUID — partition key */
  sessionId: string;
  /** Authenticated user who created the session */
  creatorUserId: string;
  mode: PlanningMode;
  status: PlanningSessionStatus;
  /** Description of the planned activity */
  activity: string;
  /** Requested duration in minutes (15–480) */
  durationMinutes: number;
  /** ISO 8601 date */
  dateRangeStart: string;
  /** ISO 8601 date */
  dateRangeEnd: string;
  /** Selected friends for group mode */
  participantUserIds: string[];
  /** Generated time options */
  proposedOptions: ProposedTimeOption[];
  /** Previously rejected time slots */
  excludedOptions: TimeSlot[];
  /** The option ID the creator accepted */
  acceptedOptionId?: string;
  /** UserIds whose timetable was excluded due to privacy */
  privacyExclusions: string[];
  /** AI preferences for this session */
  preferences: AIPreferences;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// ─── Calendar Event ──────────────────────────────────────────────────────────

/** A one-off calendar event stored in the CalendarEvents DynamoDB table. */
export interface CalendarEvent {
  /** Owner of this event — partition key */
  userId: string;
  /** ISO 8601 start time — sort key (enables range queries) */
  startDateTime: string;
  /** UUID — unique event identifier */
  eventId: string;
  /** Event title/activity name */
  title: string;
  /** ISO 8601 end time */
  endDateTime: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** Optional location */
  location?: string;
  /** Link back to the originating planning session */
  planningSessionId?: string;
  /** Other participants (group events) */
  participantUserIds: string[];
  status: CalendarEventStatus;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// ─── Meeting Invitation ──────────────────────────────────────────────────────

/** A meeting invitation record stored in the MeetingInvitations DynamoDB table. */
export interface MeetingInvitation {
  /** UUID — partition key */
  invitationId: string;
  /** Links to the originating planning session */
  planningSessionId: string;
  /** Links to the created Calendar_Event */
  eventId: string;
  /** The creator who sent the invitation */
  senderUserId: string;
  /** The participant receiving the invitation */
  receiverUserId: string;
  status: MeetingInvitationStatus;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** ISO 8601 timestamp (when responded) */
  respondedAt?: string;
  /** ISO 8601 timestamp (createdAt + 72h) */
  expiresAt: string;
}

// ─── Timetable Privacy Setting ───────────────────────────────────────────────

/** Per-user privacy setting for timetable sharing in group planning. */
export interface TimetablePrivacySetting {
  /** The user this setting belongs to — partition key */
  userId: string;
  /** "friends" = all active friends can view; "none" = no one can view */
  visibility: TimetableVisibility;
  /** ISO 8601 timestamp */
  updatedAt: string;
}

// ─── API Request Types ───────────────────────────────────────────────────────

/** POST /ai-planner/personal — request body */
export interface CreatePersonalSessionRequest {
  activity: string;
  durationMinutes: number;
  /** ISO 8601 date */
  dateRangeStart: string;
  /** ISO 8601 date */
  dateRangeEnd: string;
  preferences?: AIPreferences;
}

/** POST /ai-planner/group — request body */
export interface CreateGroupSessionRequest extends CreatePersonalSessionRequest {
  /** 1–10 participant user IDs (must be active friends) */
  participantUserIds: string[];
}

/** POST /planning-sessions/{sessionId}/accept-option — request body */
export interface AcceptOptionRequest {
  optionId: string;
}

/** POST /planning-sessions/{sessionId}/reject-option — request body */
export interface RejectOptionRequest {
  optionId: string;
}

/** PUT /timetable/privacy — request body */
export interface UpdatePrivacySettingRequest {
  visibility: TimetableVisibility;
}

// ─── API Response Types ──────────────────────────────────────────────────────

/** Response for session creation (personal or group) */
export interface CreateSessionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  options: ProposedTimeOption[];
  aiAvailable: boolean;
  /** UserIds excluded due to privacy (group mode only) */
  privacyExclusions?: string[];
}

/** Response for accept-option endpoint */
export interface AcceptOptionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  event: CalendarEvent;
  /** Invitations created (group mode only) */
  invitations?: MeetingInvitation[];
}

/** Response for reject-option endpoint */
export interface RejectOptionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  rejectedOptionId: string;
}

/** Response for next-option endpoint */
export interface NextOptionResponse {
  sessionId: string;
  status: PlanningSessionStatus;
  options: ProposedTimeOption[];
  aiAvailable: boolean;
  /** Message when no further options are available */
  message?: string;
}

/** Response for cancel-session endpoint */
export interface CancelSessionResponse {
  sessionId: string;
  status: 'cancelled';
}

/** Response for list-sessions endpoint */
export interface ListSessionsResponse {
  sessions: PlanningSession[];
}

/** Response for get-session endpoint */
export interface GetSessionResponse {
  session: PlanningSession;
}

/** Response for accept/reject invitation endpoints */
export interface InvitationActionResponse {
  invitationId: string;
  status: MeetingInvitationStatus;
  respondedAt: string;
  /** Event created for participant (accept only) */
  event?: CalendarEvent;
}

/** Response for list-invitations endpoint */
export interface ListInvitationsResponse {
  invitations: MeetingInvitation[];
}

/** Response for get-invitation endpoint */
export interface GetInvitationResponse {
  invitation: MeetingInvitation;
  /** Associated event details */
  event?: CalendarEvent;
}

/** Response for get/put privacy setting endpoints */
export interface PrivacySettingResponse {
  userId: string;
  visibility: TimetableVisibility;
  updatedAt: string;
}

// ─── AI Planner Error Codes ──────────────────────────────────────────────────

/**
 * Additional error codes specific to the AI Planner feature.
 * Extends the base ERROR_CODES from @synccircle/shared.
 */
export const AI_PLANNER_ERROR_CODES = {
  /** Cannot retrieve user's timetable/event data (HTTP 503) */
  CONTEXT_UNAVAILABLE: 'CONTEXT_UNAVAILABLE',
  /** Participant is not an active friend of the creator (HTTP 403) */
  NOT_FRIENDS: 'NOT_FRIENDS',
  /** Selected time slot is no longer available (HTTP 409) */
  SLOT_CONFLICT: 'SLOT_CONFLICT',
  /** No free periods found (informational, HTTP 200) */
  NO_AVAILABILITY: 'NO_AVAILABILITY',
  /** AI timed out; returning unranked options (informational, HTTP 200) */
  AI_UNAVAILABLE: 'AI_UNAVAILABLE',
} as const;

export type AIPlannerErrorCode =
  (typeof AI_PLANNER_ERROR_CODES)[keyof typeof AI_PLANNER_ERROR_CODES];

// ─── API Paths ───────────────────────────────────────────────────────────────

/**
 * API endpoint paths for the AI Planner feature.
 */
export const AI_PLANNER_API_PATHS = {
  /** POST — Create personal planning session */
  PERSONAL: '/ai-planner/personal',
  /** POST — Create group planning session */
  GROUP: '/ai-planner/group',
  /** GET — List planning sessions */
  SESSIONS: '/planning-sessions',
  /** GET — Get session detail (append /{sessionId}) */
  SESSION_DETAIL: '/planning-sessions/:sessionId',
  /** POST — Accept a proposed time (append /{sessionId}/accept-option) */
  ACCEPT_OPTION: '/planning-sessions/:sessionId/accept-option',
  /** POST — Reject a proposed time (append /{sessionId}/reject-option) */
  REJECT_OPTION: '/planning-sessions/:sessionId/reject-option',
  /** POST — Request new options (append /{sessionId}/next-option) */
  NEXT_OPTION: '/planning-sessions/:sessionId/next-option',
  /** POST — Cancel a session (append /{sessionId}/cancel) */
  CANCEL_SESSION: '/planning-sessions/:sessionId/cancel',
  /** GET — List meeting invitations */
  INVITATIONS: '/meeting-invitations',
  /** GET — Get invitation detail (append /{invitationId}) */
  INVITATION_DETAIL: '/meeting-invitations/:invitationId',
  /** POST — Accept invitation (append /{invitationId}/accept) */
  ACCEPT_INVITATION: '/meeting-invitations/:invitationId/accept',
  /** POST — Reject invitation (append /{invitationId}/reject) */
  REJECT_INVITATION: '/meeting-invitations/:invitationId/reject',
  /** PUT/GET — Timetable privacy settings */
  PRIVACY: '/timetable/privacy',
} as const;
