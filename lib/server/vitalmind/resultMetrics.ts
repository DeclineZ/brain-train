const elapsedTimeFields: Record<string, string> = {
  "game-03-billiards-math": "totalTimeMs",
  "game-04-floating-ball-math": "totalTimeMs",
  "game-09-tube-sort": "completionTimeMs",
  "game-15-taxidriver": "totalTimeMs",
  "game-17-floatingmarket": "totalTimeMs",
};

function nonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function resultMetrics(session: {
  game_id: string;
  score: unknown;
  duration_seconds: unknown;
  raw_data: Record<string, unknown> | null;
}) {
  const raw = session.raw_data ?? {};
  const storedDuration = nonNegativeNumber(session.duration_seconds);
  const measuredMs =
    nonNegativeNumber(raw.userTimeMs) ??
    nonNegativeNumber(raw[elapsedTimeFields[session.game_id]]);
  // The save action writes zero when userTimeMs is absent. Recover only known elapsed-time fields.
  const duration =
    storedDuration !== null && storedDuration > 0
      ? storedDuration
      : measuredMs === null
        ? null
        : measuredMs / 1000;
  const maximum =
    nonNegativeNumber(raw.maxScore) ?? nonNegativeNumber(raw.max_score);

  return {
    score: nonNegativeNumber(session.score),
    max_score: maximum !== null && maximum > 0 ? maximum : null,
    duration_seconds: duration,
  };
}
