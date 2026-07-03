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
}));

vi.mock('../../src/repositories/meeting-invitation.repo.js', () => ({
  create: vi.fn().mockResolvedValue(undefined),
  queryByPlanningSessionId: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/repositories/timetable-privacy.repo.js', () => ({
  get: vi.fn().mockResolvedValue({ userId: 'test', visibility: 'friends', updatedAt: '' }),
}));

vi.mock('../../src/repositories/friendship.repo.js', () => ({
  getByCanonicalPair: vi.fn().mockResolvedValue({ status: 'active' }),
}));

vi.mock('../../src/services/availability-calculator.js', () => ({
  computeFreePeriods: vi.fn().mockReturnValue([
    { start: '2025-01-20T09:00:00.000Z', end: '2025-01-20T11:00:00.000Z', durationMinutes: 120 },
  ]),
  intersectFreePeriods: vi.fn().mockReturnValue([
    { start: '2025-01-20T09:00:00.000Z', end: '2025-01-20T11:00:00.000Z', durationMinutes: 120 },
  ]),
}));

vi.mock('../../src/services/ai-integration.service.js', () => ({
  rankTimeSlots: vi.fn().mockResolvedValue({
    options: [
      {
        start: '2025-01-20T09:00:00.000Z',
        end: '2025-01-20T10:00:00.000Z',
        explanation: 'Good morning slot',
        score: 85,
      },
    ],
    aiAvailable: true,
  }),
}));

import {
  createPersonalSession,
  acceptOption,
  rejectOption,
  nextOption,
  type CreatePersonalSessionParams,
  type CreateSessionResult,
  type ValidationError,
} from '../../src/services/planning-session.service.js';

/**
 * Tests for PlanningSessionService - createPersonalSession.
 * Validates Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 13.1, 13.2
 */

function buildValidParams(overrides?: Partial<CreatePersonalSessionParams>): CreatePersonalSessionParams {
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    userId: 'user-123',
    activity: 'Study session',
    durationMinutes: 60,
    dateRangeStart: startDate,
    dateRangeEnd: endDate,
    ...overrides,
  };
}

describe('createPersonalSession', () => {
  describe('input validation', () => {
    it('rejects empty activity', async () => {
      const params = buildValidParams({ activity: '' });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect((result.error as ValidationError).field).toBe('activity');
      }
    });

    it('rejects duration below 15 minutes (Requirement 13.1)', async () => {
      const params = buildValidParams({ durationMinutes: 14 });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect((result.error as ValidationError).field).toBe('durationMinutes');
      }
    });

    it('rejects duration above 480 minutes (Requirement 13.1)', async () => {
      const params = buildValidParams({ durationMinutes: 481 });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect((result.error as ValidationError).field).toBe('durationMinutes');
      }
    });

    it('accepts duration of exactly 15 minutes', async () => {
      const params = buildValidParams({ durationMinutes: 15 });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(true);
    });

    it('accepts duration of exactly 480 minutes', async () => {
      const params = buildValidParams({ durationMinutes: 480 });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(true);
    });

    it('rejects dateRangeStart in the past (Requirement 13.2)', async () => {
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const params = buildValidParams({ dateRangeStart: pastDate, dateRangeEnd: endDate });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect((result.error as ValidationError).field).toBe('dateRangeStart');
      }
    });

    it('rejects dateRangeEnd more than 30 days from start (Requirement 13.2)', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const params = buildValidParams({ dateRangeStart: today, dateRangeEnd: endDate });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect((result.error as ValidationError).field).toBe('dateRangeEnd');
      }
    });

    it('rejects dateRangeEnd before dateRangeStart', async () => {
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const params = buildValidParams({ dateRangeStart: startDate, dateRangeEnd: endDate });
      const result = await createPersonalSession(params);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect((result.error as ValidationError).field).toBe('dateRangeEnd');
      }
    });
  });

  describe('successful session creation', () => {
    it('returns success with session data when input is valid', async () => {
      const params = buildValidParams();
      const result = await createPersonalSession(params);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toBeDefined();
        expect(result.data.status).toBe('options-generated');
        expect(result.data.options).toBeInstanceOf(Array);
        expect(result.data.aiAvailable).toBe(true);
      }
    });

    it('returns proposed options with optionId, start, end, explanation, and score', async () => {
      const params = buildValidParams();
      const result = await createPersonalSession(params);
      expect(result.success).toBe(true);
      if (result.success && result.data.options.length > 0) {
        const option = result.data.options[0]!;
        expect(option.optionId).toBeDefined();
        expect(option.start).toBeDefined();
        expect(option.end).toBeDefined();
        expect(option.explanation).toBeDefined();
        expect(option.score).toBeTypeOf('number');
        expect(option.status).toBe('proposed');
      }
    });
  });
});


// ─── Tests for acceptOption, rejectOption, nextOption ─────────────────────────
// Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4

import type { PlanningSession } from '../../src/types/ai-planner.types.js';

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
      {
        optionId: 'option-2',
        start: '2025-01-21T14:00:00.000Z',
        end: '2025-01-21T15:00:00.000Z',
        durationMinutes: 60,
        explanation: 'Afternoon slot',
        score: 70,
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

describe('acceptOption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns FORBIDDEN when user is not the session creator', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await acceptOption('other-user', 'session-123', 'option-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns NOT_FOUND when session does not exist', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(undefined);

    const result = await acceptOption('user-123', 'nonexistent', 'option-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns NOT_FOUND when option does not exist in session', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await acceptOption('user-123', 'session-123', 'nonexistent-option');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('creates CalendarEvent and returns confirmed for personal mode (Requirement 3.3)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());
    vi.mocked(calendarEventRepo.getByUserAndDateRange).mockResolvedValueOnce([]);

    const result = await acceptOption('user-123', 'session-123', 'option-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('confirmed');
      expect(result.data.event).toBeDefined();
      expect(result.data.event.title).toBe('Study session');
      expect(result.data.event.startDateTime).toBe('2025-01-20T09:00:00.000Z');
      expect(result.data.event.endDateTime).toBe('2025-01-20T10:00:00.000Z');
      expect(result.data.invitations).toBeUndefined();
    }
  });

  it('creates CalendarEvent and MeetingInvitations for group mode (Requirement 3.4)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({
        mode: 'group' as const,
        participantUserIds: ['friend-1', 'friend-2'],
      }),
    );
    vi.mocked(calendarEventRepo.getByUserAndDateRange).mockResolvedValueOnce([]);

    const result = await acceptOption('user-123', 'session-123', 'option-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('creator-accepted');
      expect(result.data.event).toBeDefined();
      expect(result.data.invitations).toBeDefined();
      expect(result.data.invitations!.length).toBe(2);
      expect(result.data.invitations![0]!.receiverUserId).toBe('friend-1');
      expect(result.data.invitations![1]!.receiverUserId).toBe('friend-2');
    }
  });

  it('returns SLOT_CONFLICT when time slot has a conflicting event (Requirement 3.2)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());
    // Return a conflicting event
    vi.mocked(calendarEventRepo.getByUserAndDateRange).mockResolvedValueOnce([
      {
        userId: 'user-123',
        startDateTime: '2025-01-20T09:30:00.000Z',
        eventId: 'conflict-event',
        title: 'Conflicting Event',
        endDateTime: '2025-01-20T10:30:00.000Z',
        durationMinutes: 60,
        participantUserIds: [],
        status: 'active',
        createdAt: '2025-01-18T00:00:00.000Z',
        updatedAt: '2025-01-18T00:00:00.000Z',
      },
    ] as any);

    const result = await acceptOption('user-123', 'session-123', 'option-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('SLOT_CONFLICT');
    }
  });

  it('returns existing event for idempotent re-acceptance (Requirement 3.6 idempotency)', async () => {
    const existingEvent = {
      userId: 'user-123',
      startDateTime: '2025-01-20T09:00:00.000Z',
      eventId: 'existing-event-id',
      title: 'Study session',
      endDateTime: '2025-01-20T10:00:00.000Z',
      durationMinutes: 60,
      planningSessionId: 'session-123',
      participantUserIds: [],
      status: 'active',
      createdAt: '2025-01-19T12:00:00.000Z',
      updatedAt: '2025-01-19T12:00:00.000Z',
    };

    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(
      buildMockSession({ acceptedOptionId: 'option-1', status: 'confirmed' as const }),
    );
    vi.mocked(calendarEventRepo.getByUserAndDateRange).mockResolvedValueOnce([existingEvent] as any);

    const result = await acceptOption('user-123', 'session-123', 'option-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event.eventId).toBe('existing-event-id');
      expect(result.data.status).toBe('confirmed');
    }
  });
});

describe('rejectOption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns FORBIDDEN when user is not the session creator', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await rejectOption('other-user', 'session-123', 'option-1');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns NOT_FOUND when option does not exist', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await rejectOption('user-123', 'session-123', 'nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('marks option as rejected and returns response (Requirement 4.1)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await rejectOption('user-123', 'session-123', 'option-1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rejectedOptionId).toBe('option-1');
      expect(result.data.sessionId).toBe('session-123');
    }
  });

  it('calls addExcludedOptions with the rejected time slot', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    await rejectOption('user-123', 'session-123', 'option-1');

    expect(planningSessionRepo.addExcludedOptions).toHaveBeenCalledWith(
      'session-123',
      [{ start: '2025-01-20T09:00:00.000Z', end: '2025-01-20T10:00:00.000Z' }],
      expect.any(String),
    );
  });
});

describe('nextOption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns FORBIDDEN when user is not the session creator', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await nextOption('other-user', 'session-123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns NOT_FOUND when session does not exist', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(undefined);

    const result = await nextOption('user-123', 'nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('generates new options for personal mode (Requirement 4.2)', async () => {
    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await nextOption('user-123', 'session-123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe('session-123');
      expect(result.data.status).toBe('options-generated');
      expect(result.data.options).toBeInstanceOf(Array);
      expect(result.data.aiAvailable).toBe(true);
    }
  });

  it('returns empty options with message when no slots available (Requirement 4.3)', async () => {
    const { computeFreePeriods } = await import('../../src/services/availability-calculator.js');
    vi.mocked(computeFreePeriods).mockReturnValueOnce([]);

    vi.mocked(planningSessionRepo.getById).mockResolvedValueOnce(buildMockSession());

    const result = await nextOption('user-123', 'session-123');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toHaveLength(0);
      expect(result.data.message).toBeDefined();
    }
  });
});
