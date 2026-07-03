/**
 * Availability Calculator — Pure computation module.
 *
 * Computes free time periods by subtracting timetable classes and calendar events
 * from available hours windows (default 08:00–23:00). Supports individual and
 * group (intersection) calculations.
 *
 * No external I/O — all data is passed in as arguments.
 */

import type {
  TimeSlot,
  FreePeriod,
  AvailabilityInput,
  TimetableClass,
  CalendarEvent,
} from '../types/ai-planner.types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns an array of ISO date strings (YYYY-MM-DD) from start to end (inclusive).
 */
function getDateRange(dateRangeStart: string, dateRangeEnd: string): string[] {
  const dates: string[] = [];
  const start = new Date(dateRangeStart + 'T00:00:00Z');
  const end = new Date(dateRangeEnd + 'T00:00:00Z');

  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Maps a JavaScript Date weekday (0=Sunday..6=Saturday) to the TimetableClass
 * dayOfWeek convention (Monday=0 through Friday=4). Returns -1 for weekends.
 */
function jsWeekdayToTimetableDow(jsDay: number): number {
  // jsDay: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // TimetableClass: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
  if (jsDay >= 1 && jsDay <= 5) {
    return jsDay - 1;
  }
  return -1; // Weekend
}

/**
 * Constructs an ISO 8601 datetime string (UTC) from a date string and HH:mm time.
 * For simplicity, we treat the available hours and class times as UTC-referenced
 * since this is a pure computation module. The caller is responsible for ensuring
 * inputs are in a consistent timezone context.
 *
 * Format: "YYYY-MM-DDTHH:mm:00.000Z"
 */
function buildLocalDateTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00.000Z`;
}

/**
 * Parse an ISO datetime string to a timestamp (milliseconds) for comparison.
 */
function toTimestamp(isoStr: string): number {
  return new Date(isoStr).getTime();
}

/**
 * Compute duration in minutes between two ISO datetime strings.
 */
function durationMinutes(start: string, end: string): number {
  return (toTimestamp(end) - toTimestamp(start)) / (1000 * 60);
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Merges overlapping or adjacent busy periods into a sorted, non-overlapping list.
 *
 * @param slots - Array of time slots (potentially overlapping/unsorted)
 * @returns Sorted array of non-overlapping merged time slots
 */
export function mergeBusyPeriods(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];

  // Sort by start time, then by end time for ties
  const sorted = [...slots].sort((a, b) => {
    const startDiff = toTimestamp(a.start) - toTimestamp(b.start);
    if (startDiff !== 0) return startDiff;
    return toTimestamp(a.end) - toTimestamp(b.end);
  });

  const merged: TimeSlot[] = [{ start: sorted[0]!.start, end: sorted[0]!.end }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;

    // Overlapping or adjacent (current.start <= last.end)
    if (toTimestamp(current.start) <= toTimestamp(last.end)) {
      // Extend the end if current extends further
      if (toTimestamp(current.end) > toTimestamp(last.end)) {
        last.end = current.end;
      }
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }

  return merged;
}

/**
 * Maps recurring TimetableClasses to specific date TimeSlots based on dayOfWeek matching.
 *
 * @param classes - Recurring timetable classes
 * @param dates - Array of date strings (YYYY-MM-DD) within the range
 * @returns Array of TimeSlot for the matched classes on specific dates
 */
function mapClassesToDates(classes: TimetableClass[], dates: string[]): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const date of dates) {
    const jsDay = new Date(date + 'T12:00:00Z').getUTCDay();
    const timetableDow = jsWeekdayToTimetableDow(jsDay);

    if (timetableDow === -1) continue; // Skip weekends

    for (const cls of classes) {
      if (cls.dayOfWeek === timetableDow) {
        slots.push({
          start: buildLocalDateTime(date, cls.startTime),
          end: buildLocalDateTime(date, cls.endTime),
        });
      }
    }
  }

  return slots;
}

/**
 * Maps CalendarEvents within the date range to TimeSlots.
 *
 * @param events - Calendar events
 * @param dateRangeStart - Start of range (YYYY-MM-DD)
 * @param dateRangeEnd - End of range (YYYY-MM-DD)
 * @param availableHoursStart - Start of daily window (HH:mm)
 * @param availableHoursEnd - End of daily window (HH:mm)
 * @returns Array of TimeSlot for events within the date range
 */
function mapEventsToSlots(
  events: CalendarEvent[],
  dateRangeStart: string,
  dateRangeEnd: string,
  availableHoursStart: string,
  availableHoursEnd: string,
): TimeSlot[] {
  const rangeStartTs = toTimestamp(buildLocalDateTime(dateRangeStart, availableHoursStart));
  const rangeEndTs = toTimestamp(buildLocalDateTime(dateRangeEnd, availableHoursEnd));

  const slots: TimeSlot[] = [];

  for (const event of events) {
    if (event.status === 'cancelled') continue;

    const eventStartTs = toTimestamp(event.startDateTime);
    const eventEndTs = toTimestamp(event.endDateTime);

    // Check if event overlaps with the date range
    if (eventEndTs <= rangeStartTs || eventStartTs >= rangeEndTs) continue;

    slots.push({
      start: event.startDateTime,
      end: event.endDateTime,
    });
  }

  return slots;
}

/**
 * Subtracts busy periods from a single available window, returning free periods.
 *
 * @param windowStart - Start of available window (ISO datetime)
 * @param windowEnd - End of available window (ISO datetime)
 * @param busyPeriods - Sorted, non-overlapping busy periods
 * @returns Array of free TimeSlot within the window
 */
function subtractBusyFromWindow(
  windowStart: string,
  windowEnd: string,
  busyPeriods: TimeSlot[],
): TimeSlot[] {
  const free: TimeSlot[] = [];
  let currentStart = toTimestamp(windowStart);
  const windowEndTs = toTimestamp(windowEnd);

  for (const busy of busyPeriods) {
    const busyStartTs = toTimestamp(busy.start);
    const busyEndTs = toTimestamp(busy.end);

    // Skip busy periods that end before or at our current start
    if (busyEndTs <= currentStart) continue;

    // Stop if busy period starts at or after window end
    if (busyStartTs >= windowEndTs) break;

    // If there's a gap before this busy period, it's free time
    if (busyStartTs > currentStart) {
      const freeEnd = Math.min(busyStartTs, windowEndTs);
      free.push({
        start: new Date(currentStart).toISOString(),
        end: new Date(freeEnd).toISOString(),
      });
    }

    // Advance current start past this busy period
    currentStart = Math.max(currentStart, busyEndTs);
  }

  // Remaining time after all busy periods
  if (currentStart < windowEndTs) {
    free.push({
      start: new Date(currentStart).toISOString(),
      end: new Date(windowEndTs).toISOString(),
    });
  }

  return free;
}

/**
 * Computes free periods by subtracting busy times from available windows
 * across the date range.
 *
 * Algorithm:
 * 1. For each date in the range, create available window [availableHoursStart, availableHoursEnd]
 * 2. Map recurring TimetableClasses to specific dates (dayOfWeek matching)
 * 3. Collect CalendarEvents within the date range
 * 4. Merge overlapping/adjacent busy periods into a sorted list
 * 5. Subtract merged busy periods from available windows
 * 6. Filter resulting free slots by minimum duration requirement
 *
 * @param input - Availability computation input
 * @param minimumDurationMinutes - Minimum duration for free periods (default: 30)
 * @returns Array of FreePeriod sorted by start time
 */
export function computeFreePeriods(
  input: AvailabilityInput,
  minimumDurationMinutes: number = 30,
): FreePeriod[] {
  const {
    timetableClasses,
    calendarEvents,
    dateRangeStart,
    dateRangeEnd,
    availableHoursStart,
    availableHoursEnd,
  } = input;

  const dates = getDateRange(dateRangeStart, dateRangeEnd);

  // Step 2: Map recurring classes to specific dates
  const classSlots = mapClassesToDates(timetableClasses, dates);

  // Step 3: Collect calendar events within range
  const eventSlots = mapEventsToSlots(
    calendarEvents,
    dateRangeStart,
    dateRangeEnd,
    availableHoursStart,
    availableHoursEnd,
  );

  // Step 4: Merge all busy periods
  const allBusy = mergeBusyPeriods([...classSlots, ...eventSlots]);

  // Step 1 + 5: For each date, create window and subtract busy periods
  const freePeriods: FreePeriod[] = [];

  for (const date of dates) {
    const windowStart = buildLocalDateTime(date, availableHoursStart);
    const windowEnd = buildLocalDateTime(date, availableHoursEnd);

    // Get busy periods relevant to this day's window
    const windowStartTs = toTimestamp(windowStart);
    const windowEndTs = toTimestamp(windowEnd);

    // Filter busy periods that overlap this window
    const relevantBusy = allBusy.filter((slot) => {
      const busyStart = toTimestamp(slot.start);
      const busyEnd = toTimestamp(slot.end);
      return busyEnd > windowStartTs && busyStart < windowEndTs;
    });

    // Clamp busy periods to the window boundaries
    const clampedBusy: TimeSlot[] = relevantBusy.map((slot) => ({
      start: new Date(Math.max(toTimestamp(slot.start), windowStartTs)).toISOString(),
      end: new Date(Math.min(toTimestamp(slot.end), windowEndTs)).toISOString(),
    }));

    const dayFree = subtractBusyFromWindow(windowStart, windowEnd, clampedBusy);

    // Step 6: Filter by minimum duration
    for (const slot of dayFree) {
      const duration = durationMinutes(slot.start, slot.end);
      if (duration >= minimumDurationMinutes) {
        freePeriods.push({
          start: slot.start,
          end: slot.end,
          durationMinutes: duration,
        });
      }
    }
  }

  return freePeriods;
}

/**
 * Computes the intersection of multiple users' free periods for group planning.
 *
 * Uses a sorted merge intersection algorithm: finds time ranges where ALL users
 * are simultaneously free.
 *
 * @param periodsPerUser - Array of FreePeriod arrays, one per user
 * @param minimumDurationMinutes - Minimum duration for intersected periods (default: 30)
 * @returns Array of FreePeriod representing common free time across all users
 */
export function intersectFreePeriods(
  periodsPerUser: FreePeriod[][],
  minimumDurationMinutes: number = 30,
): FreePeriod[] {
  if (periodsPerUser.length === 0) return [];
  if (periodsPerUser.length === 1) {
    return periodsPerUser[0]!.filter((p) => p.durationMinutes >= minimumDurationMinutes);
  }

  // Start with the first user's periods and intersect with each subsequent user
  let result: TimeSlot[] = periodsPerUser[0]!.map((p) => ({ start: p.start, end: p.end }));

  for (let i = 1; i < periodsPerUser.length; i++) {
    const other: TimeSlot[] = periodsPerUser[i]!.map((p) => ({ start: p.start, end: p.end }));
    result = intersectTwoSortedLists(result, other);

    // Early exit if no intersection remains
    if (result.length === 0) return [];
  }

  // Convert to FreePeriod and filter by minimum duration
  return result
    .map((slot) => ({
      start: slot.start,
      end: slot.end,
      durationMinutes: durationMinutes(slot.start, slot.end),
    }))
    .filter((p) => p.durationMinutes >= minimumDurationMinutes);
}

/**
 * Intersects two sorted lists of non-overlapping time slots.
 * Returns the sorted list of time ranges where both lists overlap.
 */
function intersectTwoSortedLists(listA: TimeSlot[], listB: TimeSlot[]): TimeSlot[] {
  const result: TimeSlot[] = [];
  let i = 0;
  let j = 0;

  while (i < listA.length && j < listB.length) {
    const a = listA[i]!;
    const b = listB[j]!;

    const overlapStart = Math.max(toTimestamp(a.start), toTimestamp(b.start));
    const overlapEnd = Math.min(toTimestamp(a.end), toTimestamp(b.end));

    if (overlapStart < overlapEnd) {
      result.push({
        start: new Date(overlapStart).toISOString(),
        end: new Date(overlapEnd).toISOString(),
      });
    }

    // Advance the pointer with the earlier end time
    if (toTimestamp(a.end) < toTimestamp(b.end)) {
      i++;
    } else {
      j++;
    }
  }

  return result;
}
