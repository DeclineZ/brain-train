import { NextResponse } from "next/server";

// In-memory sliding window store: Map<key, timestamp_array>
const requestsMap = new Map<string, number[]>();

/**
 * Checks if a key (e.g. IP or API Key) has exceeded the rate limit.
 * @param key Identification key for the requester
 * @param limit Max allowed requests within windowMs
 * @param windowMs Time window in milliseconds (default: 60000ms = 1 min)
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000
): { limited: false } | { limited: true; response: NextResponse } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (requestsMap.get(key) || []).filter((ts) => ts > windowStart);

  if (timestamps.length >= limit) {
    const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
    return {
      limited: true,
      response: NextResponse.json(
        { error: "Rate limit exceeded. Too many requests." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter > 0 ? retryAfter : 1),
          },
        }
      ),
    };
  }

  timestamps.push(now);
  requestsMap.set(key, timestamps);

  return { limited: false };
}
