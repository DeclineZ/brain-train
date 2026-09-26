import { clampGameLevel } from "@/lib/gameLevels";

export const INCOMPLETE_OR_FAILED_STATUSES = new Set([
  "started",
  "incomplete",
  "interrupted",
  "quit",
  "abandoned",
  "failed",
]);

/**
 * Checks whether a game session represents a genuinely completed attempt.
 *
 * Rules:
 * 1. Null/undefined session is not completed.
 * 2. Explicit failure (`raw_data.success === false`) is never completed.
 * 3. Explicit non-completion statuses ('started', 'incomplete', 'interrupted',
 *    'quit', 'abandoned', 'failed') are never completed, even when `success` is absent.
 * 4. Backward compatibility: Old completion records that lack a `status` field
 *    (or lack `raw_data`) count as completed provided `success !== false`.
 */
export function isCompletedSession(
  session: { raw_data?: any; status?: string } | null | undefined
): boolean {
  if (!session) return false;

  // Check top-level session status if present on the record
  const topStatus =
    typeof (session as any).status === "string"
      ? (session as any).status.toLowerCase().trim()
      : undefined;
  if (topStatus && INCOMPLETE_OR_FAILED_STATUSES.has(topStatus)) {
    return false;
  }

  const raw = session.raw_data;
  if (!raw) return true; // Legacy rows without raw_data count as completed

  if (raw.success === false) return false;

  const rawStatus =
    typeof raw.status === "string" ? raw.status.toLowerCase().trim() : undefined;
  if (rawStatus && INCOMPLETE_OR_FAILED_STATUSES.has(rawStatus)) {
    return false;
  }

  return true;
}

/**
 * Recognizes tutorial payloads consistently using explicit flags and level fields.
 * Handles conflicting level fields where any level field indicates level 0.
 * Distinguishes game internal rule modes (e.g. Floating Market Level 1 rule mode)
 * from actual session tutorial identity when positive levels are present.
 */
export function isTutorialPayload(rawData: any): boolean {
  if (!rawData) return false;

  if (
    rawData.mode === "tutorial" ||
    rawData.isTutorial === true ||
    rawData.status === "tutorial"
  ) {
    return true;
  }

  if (
    (rawData.level !== undefined && rawData.level !== null && Number(rawData.level) === 0) ||
    (rawData.levelPlayed !== undefined && rawData.levelPlayed !== null && Number(rawData.levelPlayed) === 0) ||
    (rawData.current_played !== undefined && rawData.current_played !== null && Number(rawData.current_played) === 0)
  ) {
    return true;
  }

  return false;
}

/**
 * Normalizes level indicator and rawData for tutorials and training attempts.
 * If isTutorial is true, levelPlayed is strictly 0 (never a positive training level),
 * preventing payloads like { isTutorial: true, level: 1 } from persisting as training
 * and subsequently unlocking Level 2.
 */
export function normalizeLevelPlayed(rawData: any): {
  levelPlayed: number;
  isTutorial: boolean;
  normalizedRawData: any;
} {
  const isTutorial = isTutorialPayload(rawData);
  const normalizedRawData = rawData ? { ...rawData } : {};

  if (isTutorial) {
    normalizedRawData.level = 0;
    normalizedRawData.current_played = 0;
    if ("levelPlayed" in normalizedRawData) {
      normalizedRawData.levelPlayed = 0;
    }
    return {
      levelPlayed: 0,
      isTutorial: true,
      normalizedRawData,
    };
  }

  const parsed = Math.max(
    0,
    Math.floor(
      Number(
        rawData?.level ??
          rawData?.levelPlayed ??
          rawData?.current_played ??
          1
      )
    ) || 0
  );

  return {
    levelPlayed: parsed,
    isTutorial: parsed === 0,
    normalizedRawData,
  };
}

/**
 * Paginates through game sessions to find the latest genuinely completed session,
 * ensuring no fixed query cap hides an older completed session behind many unfinished attempts.
 */
export async function getLatestCompletedSession(
  supabase: any,
  userId: string,
  gameId: string,
  pageSize = 50,
  maxPages = 20
): Promise<any | null> {
  let from = 0;
  for (let page = 0; page < maxPages; page++) {
    const to = from + pageSize - 1;
    const { data: batch, error } = await supabase
      .from("game_sessions")
      .select("id, current_played, played_at, raw_data")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .order("played_at", { ascending: false })
      .range(from, to);

    if (error || !batch || batch.length === 0) {
      return null;
    }

    const found = batch.find(isCompletedSession);
    if (found) {
      return found;
    }

    if (batch.length < pageSize) {
      return null;
    }

    from += pageSize;
  }
  return null;
}

export interface ProgressionResolutionParams {
  gameId: string;
  completedSession: { current_played?: number | null } | null | undefined;
  hasValidParamLevel: boolean;
  safeParamLevel: number | null;
}

/**
 * Resolves active and next levels according to game-specific progression rules,
 * level-0 tutorial completion, explicit level queries, and max level clamping.
 */
export function resolveGameProgression({
  gameId,
  completedSession,
  hasValidParamLevel,
  safeParamLevel,
}: ProgressionResolutionParams): { activeLevel: number; nextLevel: number } {
  let nextLevel = 1;
  const hasCompleted =
    completedSession &&
    completedSession.current_played !== null &&
    completedSession.current_played !== undefined;

  if (hasCompleted) {
    if (completedSession.current_played === 0) {
      nextLevel = 1;
    } else {
      nextLevel = clampGameLevel(gameId, completedSession.current_played! + 1);
    }
  }

  if (gameId === "game-14-wordrecognize") {
    nextLevel = 1;
  } else if (gameId === "game-18-runforyourlife") {
    if (!completedSession) nextLevel = 0;
  }

  let activeLevel = 0;
  if (safeParamLevel !== null) {
    activeLevel = safeParamLevel;
  }

  if (!hasValidParamLevel) {
    if (gameId === "game-14-wordrecognize") {
      // Game 14 logic: returning player starts at Level 1, new player at tutorial (0)
      activeLevel = completedSession ? 1 : 0;
    } else if (gameId === "game-18-runforyourlife") {
      activeLevel = completedSession ? 1 : 0;
    } else if (gameId === "game-17-floatingmarket") {
      activeLevel = completedSession ? 1 : 0;
    } else if (gameId === "game-19-cashier") {
      activeLevel = completedSession ? nextLevel : 0;
    } else if (completedSession) {
      activeLevel = nextLevel;
    } else {
      activeLevel = 0;
    }
  }

  return { activeLevel, nextLevel };
}
