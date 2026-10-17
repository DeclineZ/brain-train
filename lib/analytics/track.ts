"use client";

// Fire-and-forget analytics client. Never throws, never blocks the caller.
// Events are queued and posted in batches to app/api/analytics.
// See docs/analytics.md and docs/gametrackinghandoff.md section 2.2.

import { createClient } from "@/utils/supabase/client";
import type { EventName, LoginMethod, StepId } from "./events";

export type TrackContext = {
  stepId?: StepId;
  gameId?: string | null;
  level?: number | null;
  attemptId?: string | null;
  seq?: number | null;
  tMs?: number | null;
};

type QueuedEvent = {
  event_id: string;
  event: EventName;
  occurred_at: string;
  // User id when the event was created. The server drops events whose uid no
  // longer matches the session, so A's queued events are never stored as B's.
  uid: string | null;
  step_id: string | null;
  game_id: string | null;
  level: number | null;
  attempt_id: string | null;
  seq: number | null;
  t_ms: number | null;
  props: Record<string, unknown>;
  tries: number;
};

const ENDPOINT = "/api/analytics";
const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 50;
const MAX_BODY_BYTES = 60_000;
const MAX_QUEUE = 500;
const MAX_TRIES = 3;
const SESSION_KEY = "analytics_session_id";
const OPT_OUT_KEY = "analytics_opt_out";
const PENDING_LOGIN_KEY = "analytics_pending_login";
const isDev = process.env.NODE_ENV === "development";

let queue: QueuedEvent[] = [];
let currentUid: string | null = null;
let started = false;
let flushing = false;
let sessionId: string | null = null;

export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // RFC 4122 v4 fallback for non-secure contexts.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = newId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch {
    sessionId = sessionId ?? newId();
  }
  return sessionId;
}

function isOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function getDevice() {
  const ua = navigator.userAgent;
  const os = /android/i.test(ua)
    ? "android"
    : /iphone|ipad|ipod/i.test(ua)
      ? "ios"
      : /windows/i.test(ua)
        ? "windows"
        : /mac os/i.test(ua)
          ? "macos"
          : /linux/i.test(ua)
            ? "linux"
            : "other";
  const browser = /line\//i.test(ua)
    ? "line"
    : /edg\//i.test(ua)
      ? "edge"
      : /chrome|crios/i.test(ua)
        ? "chrome"
        : /firefox|fxios/i.test(ua)
          ? "firefox"
          : /safari/i.test(ua)
            ? "safari"
            : "other";
  return {
    os,
    browser,
    screen_w: window.screen.width,
    screen_h: window.screen.height,
    dpr: window.devicePixelRatio,
    touch: navigator.maxTouchPoints > 0,
  };
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      currentUid = data.session?.user.id ?? null;
      if (currentUid) completePendingLogin();
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      currentUid = session?.user.id ?? null;
    });
  } catch {
    // Analytics must work even if auth is unavailable.
  }
  setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush({ keepalive: true });
  });
  window.addEventListener("pagehide", () => void flush({ keepalive: true }));
}

/** Record an event. Safe to call anywhere on the client; errors are swallowed. */
export function track(
  event: EventName,
  props: Record<string, unknown> = {},
  ctx: TrackContext = {},
): void {
  try {
    if (typeof window === "undefined" || isOptedOut()) return;
    start();
    const item: QueuedEvent = {
      event_id: newId(),
      event,
      occurred_at: new Date().toISOString(),
      uid: currentUid,
      step_id: ctx.stepId ?? null,
      game_id: ctx.gameId ?? null,
      level: ctx.level ?? null,
      attempt_id: ctx.attemptId ?? null,
      seq: ctx.seq ?? null,
      t_ms: ctx.tMs ?? null,
      props,
      tries: 0,
    };
    if (isDev) console.log(`[analytics] ${event}`, { ...ctx, ...props });
    queue.push(item);
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    if (queue.length >= MAX_BATCH) void flush();
  } catch {
    // Never break the caller.
  }
}

/**
 * Remember a login that finishes after a redirect (OAuth, LINE Login). The next
 * page that tracks anything with a session logs login_succeeded.
 */
export function markPendingLogin(method: LoginMethod) {
  try {
    sessionStorage.setItem(PENDING_LOGIN_KEY, method);
  } catch {
    // Ignore.
  }
}

/** Pending redirect login method, cleared on read. */
export function takePendingLogin(): LoginMethod | null {
  try {
    const method = sessionStorage.getItem(PENDING_LOGIN_KEY) as LoginMethod | null;
    sessionStorage.removeItem(PENDING_LOGIN_KEY);
    return method;
  } catch {
    return null;
  }
}

function completePendingLogin() {
  const method = takePendingLogin();
  if (method) track("login_succeeded", { method });
}

/** Shorthand for step_viewed. */
export function trackStep(stepId: StepId, props: Record<string, unknown> = {}, ctx: TrackContext = {}) {
  track("step_viewed", props, { ...ctx, stepId });
}

function takeBatch(): QueuedEvent[] {
  const batch: QueuedEvent[] = [];
  let bytes = 0;
  while (queue.length && batch.length < MAX_BATCH) {
    const size = JSON.stringify(queue[0]).length;
    if (batch.length && bytes + size > MAX_BODY_BYTES) break;
    bytes += size;
    batch.push(queue.shift()!);
  }
  return batch;
}

/**
 * Send everything queued. Await it before signing out or switching users so
 * the previous user's events are not dropped.
 */
export async function flush(options: { keepalive?: boolean } = {}): Promise<void> {
  if (typeof window === "undefined" || (flushing && !options.keepalive)) return;
  flushing = true;
  try {
    while (queue.length) {
      const batch = takeBatch();
      const body = JSON.stringify({
        session_id: getSessionId(),
        device: getDevice(),
        events: batch.map(({ tries: _tries, ...rest }) => rest),
      });
      let ok = false;
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: options.keepalive,
          credentials: "same-origin",
        });
        // 4xx means the batch itself is bad; retrying would not help.
        ok = res.ok || (res.status >= 400 && res.status < 500);
      } catch {
        if (options.keepalive && navigator.sendBeacon) {
          ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }));
        }
      }
      if (!ok) {
        const retry = batch.filter((e) => ++e.tries < MAX_TRIES);
        queue = [...retry, ...queue];
        break;
      }
    }
  } catch {
    // Swallow.
  } finally {
    flushing = false;
  }
}

