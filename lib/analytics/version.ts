import packageJson from "@/package.json";

// Stamped on every analytics event (Dashboard API Spec v1: app_version, content_version).

/** Deployed code version. */
export const APP_VERSION: string = packageJson.version;

/**
 * Version of the game content (games, levels, scoring). Bump it in the same commit
 * whenever games or levels change, e.g. "games-2026.12". Rows recorded before this
 * field existed are reported as "games-2026.11" by analytics_dashboard_events_v1.
 */
export const CONTENT_VERSION = "games-2026.11";
