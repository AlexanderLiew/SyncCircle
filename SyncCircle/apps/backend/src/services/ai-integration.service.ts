/**
 * AI Integration Service for ranking time slots using an external AI model.
 *
 * Communicates with OpenAI/Gemini API to rank free periods based on user
 * preferences and activity context. Implements timeout handling, graceful
 * fallback, and post-validation of AI recommendations.
 *
 * Key behaviors:
 * - 15-second timeout on AI API calls
 * - On timeout/error: returns free periods unranked with aiAvailable: false
 * - Post-validates every AI suggestion falls within a computed free period
 * - Never sends raw timetable data — only validated FreePeriods
 */

import { logger } from '../utils/logger.js';
import type {
  AIRankingRequest,
  AIRankingResponse,
  AIRankedOption,
  FreePeriod,
} from '../types/ai-planner.types.js';

// ─── Configuration ───────────────────────────────────────────────────────────

/** AI provider API key from environment. */
const AI_API_KEY = process.env.AI_API_KEY ?? '';

/** AI provider endpoint URL from environment. */
const AI_API_ENDPOINT = process.env.AI_API_ENDPOINT ?? '';

/** AI model identifier (e.g., "gpt-4o-mini", "gemini-1.5-flash"). */
const AI_MODEL = process.env.AI_MODEL ?? 'gpt-4o-mini';

/** Timeout for AI API calls in milliseconds. */
const AI_TIMEOUT_MS = 15_000;

// ─── Prompt Construction ─────────────────────────────────────────────────────

/**
 * Builds the system prompt for the AI model.
 * Instructs the AI to return ranked time slots in a specific JSON format.
 */
function buildSystemPrompt(preferences: AIRankingRequest['preferences']): string {
  const styleInstruction =
    preferences.responseStyle === 'concise'
      ? 'Keep explanations brief (1-2 sentences).'
      : 'Provide detailed explanations for each recommendation.';

  const aggressivenessInstruction = {
    relaxed: 'Prefer time slots with buffer time around them. Avoid back-to-back scheduling.',
    moderate: 'Balance between efficiency and comfort. Some buffer time is good but not required.',
    aggressive: 'Maximize schedule efficiency. Pack activities tightly where possible.',
  }[preferences.planningAggressiveness];

  return [
    'You are a scheduling assistant that ranks available time slots for activities.',
    'You will receive a list of free time periods, an activity description, and a duration requirement.',
    'Your job is to rank the best time slots for this activity and explain why each is a good fit.',
    '',
    `Scheduling style: ${aggressivenessInstruction}`,
    `Response style: ${styleInstruction}`,
    '',
    'IMPORTANT: You must ONLY suggest times that fall entirely within the provided free periods.',
    'Each suggestion must have a start time, end time, explanation, and a score from 0-100.',
    '',
    'Respond ONLY with a valid JSON array of objects with this exact format:',
    '[{"start": "ISO8601", "end": "ISO8601", "explanation": "string", "score": number}]',
    '',
    'Return up to 5 options ranked from best (highest score) to worst (lowest score).',
    'Do not include any text outside the JSON array.',
  ].join('\n');
}

/**
 * Builds the user prompt containing only validated FreePeriods and activity context.
 * PRIVACY: Never includes raw timetable data (class titles, module codes, locations).
 * Only computed FreePeriod time ranges are sent to the AI model (Requirements 11.1, 18.4).
 */
function buildUserPrompt(request: AIRankingRequest): string {
  const { freePeriods, activity, durationMinutes, participantCount } = request;

  const periodsDescription = freePeriods
    .map(
      (fp) =>
        `- ${fp.start} to ${fp.end} (${fp.durationMinutes} minutes available)`,
    )
    .join('\n');

  const participantInfo = participantCount
    ? `\nThis is a group activity with ${participantCount} participants.`
    : '';

  return [
    `Activity: ${activity}`,
    `Required duration: ${durationMinutes} minutes`,
    participantInfo,
    '',
    'Available free periods:',
    periodsDescription,
    '',
    `Please suggest the best ${durationMinutes}-minute time slots for "${activity}" from the free periods above.`,
  ].join('\n');
}

// ─── AI API Communication ────────────────────────────────────────────────────

/**
 * Detects whether the configured endpoint is Google Gemini.
 */
function isGeminiProvider(): boolean {
  return AI_API_ENDPOINT.includes('generativelanguage.googleapis.com') ||
    AI_MODEL.startsWith('gemini');
}

/**
 * Calls the AI API with the constructed prompt and a 15-second timeout.
 * Supports both OpenAI-compatible and Google Gemini API formats.
 * Returns the raw response text or null on failure.
 */
async function callAIAPI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!AI_API_KEY) {
    logger.warn('AI API not configured: missing AI_API_KEY');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    let response: Response;
    let content: string | undefined;

    if (isGeminiProvider()) {
      // ─── Google Gemini API format ────────────────────────────────────
      const geminiEndpoint = AI_API_ENDPOINT ||
        `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;
      const url = `${geminiEndpoint}?key=${AI_API_KEY}`;

      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        logger.error('Gemini API returned non-OK status', {
          status: response.status,
          statusText: response.statusText,
          body: errBody.slice(0, 200),
        });
        return null;
      }

      const geminiData = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      // ─── OpenAI-compatible API format ────────────────────────────────
      const endpoint = AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        logger.error('AI API returned non-OK status', {
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      content = data.choices?.[0]?.message?.content;
    }

    if (!content) {
      logger.warn('AI API response missing content field');
      return null;
    }

    return content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout =
      error instanceof Error && error.name === 'AbortError';

    if (isTimeout) {
      logger.warn('AI API call timed out after 15 seconds');
    } else {
      logger.error('AI API call failed', { errorMessage });
    }

    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Response Parsing ────────────────────────────────────────────────────────

/**
 * Parses the AI response text into AIRankedOption objects.
 * Returns an empty array if parsing fails.
 */
function parseAIResponse(responseText: string): AIRankedOption[] {
  try {
    // Extract JSON array from the response (AI might wrap it in markdown code blocks)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn('AI response does not contain a JSON array');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as unknown[];

    if (!Array.isArray(parsed)) {
      logger.warn('AI response parsed value is not an array');
      return [];
    }

    const options: AIRankedOption[] = [];

    for (const item of parsed) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'start' in item &&
        'end' in item &&
        'explanation' in item &&
        'score' in item
      ) {
        const option = item as Record<string, unknown>;
        if (
          typeof option['start'] === 'string' &&
          typeof option['end'] === 'string' &&
          typeof option['explanation'] === 'string' &&
          typeof option['score'] === 'number'
        ) {
          options.push({
            start: option['start'] as string,
            end: option['end'] as string,
            explanation: option['explanation'] as string,
            score: option['score'] as number,
          });
        }
      }
    }

    return options;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Failed to parse AI response', { errorMessage });
    return [];
  }
}

// ─── Post-Validation ─────────────────────────────────────────────────────────

/**
 * Validates that a recommended time slot falls entirely within at least one free period.
 * Returns true if valid, false if the option should be discarded.
 */
function isOptionWithinFreePeriod(option: AIRankedOption, freePeriods: FreePeriod[]): boolean {
  const optionStart = new Date(option.start).getTime();
  const optionEnd = new Date(option.end).getTime();

  // Reject if dates are invalid
  if (isNaN(optionStart) || isNaN(optionEnd) || optionStart >= optionEnd) {
    return false;
  }

  return freePeriods.some((fp) => {
    const fpStart = new Date(fp.start).getTime();
    const fpEnd = new Date(fp.end).getTime();
    return optionStart >= fpStart && optionEnd <= fpEnd;
  });
}

/**
 * Filters AI options to only those that fall within computed free periods.
 * Logs warnings for discarded options.
 */
function validateOptions(options: AIRankedOption[], freePeriods: FreePeriod[]): AIRankedOption[] {
  const validOptions: AIRankedOption[] = [];

  for (const option of options) {
    if (isOptionWithinFreePeriod(option, freePeriods)) {
      validOptions.push(option);
    } else {
      logger.warn('Discarding AI recommendation outside free periods', {
        start: option.start,
        end: option.end,
      });
    }
  }

  return validOptions;
}

// ─── Fallback Generation ─────────────────────────────────────────────────────

/**
 * Generates unranked fallback options from free periods when AI is unavailable.
 * Returns free periods as options without ranking or AI-generated explanations.
 */
function generateFallbackOptions(
  freePeriods: FreePeriod[],
  durationMinutes: number,
): AIRankedOption[] {
  return freePeriods
    .filter((fp) => fp.durationMinutes >= durationMinutes)
    .slice(0, 5)
    .map((fp, index) => ({
      start: fp.start,
      end: new Date(new Date(fp.start).getTime() + durationMinutes * 60_000).toISOString(),
      explanation: 'AI ranking unavailable — showing available time slots.',
      score: 50 - index, // Arbitrary descending score for ordering
    }));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Ranks time slots using the AI model.
 *
 * Sends only validated FreePeriods (never raw timetable data) to the AI model.
 * Implements a 15-second timeout. On timeout or error, returns free periods
 * unranked with `aiAvailable: false`.
 *
 * Post-validates that every AI suggestion falls within a computed free period;
 * discards any invalid recommendations.
 */
export async function rankTimeSlots(request: AIRankingRequest): Promise<AIRankingResponse> {
  const { freePeriods, durationMinutes, preferences } = request;

  // If no free periods provided, return empty response
  if (freePeriods.length === 0) {
    return { options: [], aiAvailable: true };
  }

  // Build prompts (only FreePeriods are sent, never raw timetable data)
  const systemPrompt = buildSystemPrompt(preferences);
  const userPrompt = buildUserPrompt(request);

  // Call AI API with 15-second timeout
  const responseText = await callAIAPI(systemPrompt, userPrompt);

  // On failure: return fallback unranked options
  if (responseText === null) {
    logger.info('Returning fallback unranked options due to AI unavailability');
    return {
      options: generateFallbackOptions(freePeriods, durationMinutes),
      aiAvailable: false,
    };
  }

  // Parse AI response
  const parsedOptions = parseAIResponse(responseText);

  if (parsedOptions.length === 0) {
    logger.warn('AI returned no parseable options, using fallback');
    return {
      options: generateFallbackOptions(freePeriods, durationMinutes),
      aiAvailable: false,
    };
  }

  // Post-validate: discard any option not within a computed free period
  const validatedOptions = validateOptions(parsedOptions, freePeriods);

  if (validatedOptions.length === 0) {
    logger.warn('All AI options failed validation, using fallback');
    return {
      options: generateFallbackOptions(freePeriods, durationMinutes),
      aiAvailable: false,
    };
  }

  // Sort by score descending
  validatedOptions.sort((a, b) => b.score - a.score);

  return {
    options: validatedOptions,
    aiAvailable: true,
  };
}
