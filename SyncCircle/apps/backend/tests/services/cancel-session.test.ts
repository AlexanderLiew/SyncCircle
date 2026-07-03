import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing the service
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: vi.fn().mockResolvedValue({ Item: { userId: 'user-123', classes: [] } }) }),
  },
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  QueryCommand: vi.fn(),
  UpdateCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/utils/canonical-pair.js', () => ({
  canonicalPair: (a: string, b: string) => {
    const [low, high] = [a, b].sort();
    return { userIdLow: low, userIdHigh: high };
  },
}));

vi.mock('../../src/repositories/planning-session.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  getById: vi.fn().mockResolvedValue(undefined),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  updateOptions: vi.fn().mockResolvedValue(undefined),
  setAcceptedOption: vi.fn().mockResolvedValue(undefined),
  addExcludedOptions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/repositories/calendar-event.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  getByUserAndDateRange: vi.fn().mockResolvedValue([]),
  getByEventId: vi.fn().mockResolvedValue(undefined),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/repositories/meeting-invitation.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  getById: vi.fn().mockResolvedValue(undefined),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  queryByReceiverUserId: vi.fn().mockResolvedValue([]),
  queryByPlanningSessionId: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/repositories/timetable-privacy.repo.js', () => ({
  get: vi.fn().mockResolvedValue({ userId: 'test', visibility: 'friends', updatedAt: '' }),
}));

vi.mock('../../src/repositories/friendship.repo.js', () => ({
  getByCanonicalPair: vi.fn().mockResolvedValue({ status: 'active' }),
}));

vi.mock('../../src/services/availability-calculator.js', () => ({
  computeFreePeriods: vi.fn().mockReturnValue([]),
  intersectFreePeriods: vi.fn().mockReturnValue([]),
}));

vi.mock('../../src/services/ai-integration.service.js', () => ({
  rankTimeSlots: vi.fn().mockResolvedValue({ options: [], aiAvailable: true }),
}));

import { cancelSession } from '../../src/services/planning-session.service.js';
import type { PlanningSession, MeetingInvitation, CalendarEvent } from '../../src/types/ai-planner.types.js';

const planningSessionRepo = await import('../../src/repositories/planning-session.repo.js');
const calendarEventRepo = await import('../../src/repositories/calendar-event.repo.js');
const meetingInvitationRepo = await import('../../src/repositories/meeting-invitation.repo.js');

function buildMockSession(overrides?: Partial<PlanningSession>): PlanningSession {
  return {
    sessionId: 'session-123',
    creatorUserId: 'user-123',
    mode: 'personal' as const,
    status: 'options-generated' as const,
    activity: 'Study session',
    durationMinutes: 60,
    dateRangeStart: '2025-01-20',
    dateRangeEnd: '2025-01-27',
    participantUserIds: [],
    proposedOptions: [
      {
        optionId: 'option-1',
        start: '2025-01-20T09:00:00.000Z',
        end: '2025-01-20T10:00:00.000Z',
        durationMinutes: 60,
        explanation: 'Good morning slot',
        score: 85,
        status: 'proposed' as const,
      },
    ],
    excludedOptions: [],
    privacyExclusions: [],
    preferences: { responseStyle: 'concise' as const, planningAggressiveness: 'moderate' as const },
    createdAt: '2025-01-19T10:00:00.000Z',
    updatedAt: '2025-01-19T10:00:00.000Z',
    ...overrides,
  };
}

function buildMockInvitation(overrides?: Partial<MeetingInvitation>): MeetingInvitation {
  return {
    invitationId: 'inv-1',
    planningSessionId: 'session-123',
    eventId: 'event-creator-123',
    senderUserId: 'user-123',
    receiverUserId: 'friend-1',
    status: 'pending' as const,
    createdAt: '2025-01-19T12:00:00.000Z',
    expiresAt: '2025-01-22T12:00:00.000Z',
    ...overrides,
  };
}

function buildMockCalendarEvent(overrides?: Partial<CalendarEvent>): CalendarEvent {
  return {
    userId: 'user-123',
    startDateTime: '2025-01-20T09:00:00.000Z',
    eventId: 'event-creator-123',
    title: 'Study session',
    endDateTime: '2025-01-20T10:00:00.000Z',
    durationMinutes: 60,
    planningSessionId: 'session-123',
    participantUserIds: ['friend-1', 'friend-2'],
    status: 'active' as const,
    createdAt: '2025-01-19T12:00:00.000Z',
    updatedAt: '2025-01-19T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * Tests for cancelSession
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 12.4
 */
describe('cancelSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns NOT_FOUND when session does not exist (Requirement 6.1)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(undefined);

    const result = await cancelSession('user-123', 'nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns FORBIDDEN when user is not the session creator (Requirement 6.4, 12.4)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await cancelSession('other-user', 'session-123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns success idempotently when session is already cancelled', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({ status: 'cancelled' as const }),
    );

    const result = await cancelSession('user-123', 'session-123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe('session-123');
      expect(result.data.status).toBe('cancelled');
    }
    // Should NOT call updateStatus since already cancelled
    expect(planningSessionRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('sets session status to cancelled (Requirement 6.1)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValueOnce([]);

    const result = await cancelSession('user-123', 'session-123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('cancelled');
    }
    expect(planningSessionRepo.updateStatus).toHaveBeenCalledWith(
      'session-123',
      'cancelled',
      expect.any(String),
    );
  });

  it('cancels all pending invitations (Requirement 6.2)', async () => {
    const pendingInv1 = buildMockInvitation({ invitationId: 'inv-1', status: 'pending' as const });
    const pendingInv2 = buildMockInvitation({ invitationId: 'inv-2', receiverUserId: 'friend-2', status: 'pending' as const });
    const acceptedInv = buildMockInvitation({ invitationId: 'inv-3', receiverUserId: 'friend-3', status: 'accepted' as const });

    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({
        mode: 'group' as const,
        status: 'creator-accepted' as const,
        acceptedOptionId: 'option-1',
        participantUserIds: ['friend-1', 'friend-2', 'friend-3'],
      }),
    );
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValueOnce([
      pendingInv1,
      pendingInv2,
      acceptedInv,
    ]);

    // Mock the creator event lookup (for event deletion)
    vi.mocked(calendarEventRepo.getByEventId).mockResolvedValue(buildMockCalendarEvent());
    vi.mocked(calendarEventRepo.getByUserAndDateRange).mockResolvedValue([
      buildMockCalendarEvent({ userId: 'friend-3', eventId: 'event-friend-3' }),
    ]);

    await cancelSession('user-123', 'session-123');

    // Verify pending invitations are cancelled
    expect(meetingInvitationRepo.updateStatus).toHaveBeenCalledWith(
      'inv-1',
      'cancelled',
      expect.any(String),
    );
    expect(meetingInvitationRepo.updateStatus).toHaveBeenCalledWith(
      'inv-2',
      'cancelled',
      expect.any(String),
    );
    // Accepted invitation should NOT have its status changed to cancelled
    expect(meetingInvitationRepo.updateStatus).not.toHaveBeenCalledWith(
      'inv-3',
      'cancelled',
      expect.any(String),
    );
  });

  it('deletes creator calendar event when session has acceptedOptionId (Requirement 6.3)', async () => {
    const creatorEvent = buildMockCalendarEvent();

    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({
        mode: 'group' as const,
        status: 'creator-accepted' as const,
        acceptedOptionId: 'option-1',
        participantUserIds: ['friend-1'],
      }),
    );
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValueOnce([
      buildMockInvitation({ status: 'pending' as const }),
    ]);
    vi.mocked(calendarEventRepo.getByEventId).mockResolvedValueOnce(creatorEvent);

    await cancelSession('user-123', 'session-123');

    expect(calendarEventRepo.deleteEvent).toHaveBeenCalledWith(
      'user-123',
      '2025-01-20T09:00:00.000Z',
    );
  });

  it('deletes accepted participants calendar events (Requirement 6.3)', async () => {
    const creatorEvent = buildMockCalendarEvent();
    const participantEvent = buildMockCalendarEvent({
      userId: 'friend-1',
      eventId: 'event-friend-1',
    });

    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({
        mode: 'group' as const,
        status: 'creator-accepted' as const,
        acceptedOptionId: 'option-1',
        participantUserIds: ['friend-1'],
      }),
    );
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValueOnce([
      buildMockInvitation({ status: 'accepted' as const, receiverUserId: 'friend-1' }),
    ]);
    // First call for creator's event (via invitations[0].eventId)
    vi.mocked(calendarEventRepo.getByEventId)
      .mockResolvedValueOnce(creatorEvent)   // for creator event lookup
      .mockResolvedValueOnce(creatorEvent);  // for participant event lookup (uses same eventId from invitation)
    vi.mocked(calendarEventRepo.getByUserAndDateRange).mockResolvedValueOnce([participantEvent]);

    await cancelSession('user-123', 'session-123');

    // Verify participant's event is deleted
    expect(calendarEventRepo.deleteEvent).toHaveBeenCalledWith(
      'friend-1',
      '2025-01-20T09:00:00.000Z',
    );
  });

  it('handles personal session cancellation with accepted option (no invitations)', async () => {
    const creatorEvent = buildMockCalendarEvent();

    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({
        mode: 'personal' as const,
        status: 'confirmed' as const,
        acceptedOptionId: 'option-1',
      }),
    );
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValueOnce([]);
    vi.mocked(calendarEventRepo.getByUserAndDateRange).mockResolvedValueOnce([creatorEvent]);

    const result = await cancelSession('user-123', 'session-123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('cancelled');
    }

    // Should delete creator's event found via date range search
    expect(calendarEventRepo.deleteEvent).toHaveBeenCalledWith(
      'user-123',
      '2025-01-20T09:00:00.000Z',
    );
  });

  it('handles session with no accepted option (no events to delete)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({ status: 'options-generated' as const }),
    );
    vi.mocked(meetingInvitationRepo.queryByPlanningSessionId).mockResolvedValueOnce([]);

    const result = await cancelSession('user-123', 'session-123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('cancelled');
    }

    // No events to delete
    expect(calendarEventRepo.deleteEvent).not.toHaveBeenCalled();
  });
});
