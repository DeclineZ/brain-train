import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  fetchEventsPage,
  isAuthorized,
  parseParams,
  ParamError,
  type ErrorCode,
} from "@/lib/server/dashboard/events";

// Dashboard API v1: read-only, server-to-server (Dashboard API Spec v1, openapi.yaml).
// No CORS: only the Dashboard's server calls it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, private" };

function error(status: number, code: ErrorCode, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: NO_STORE },
  );
}

export async function GET(request: NextRequest) {
  if (
    !isAuthorized(
      request.headers.get("authorization"),
      process.env.DASHBOARD_API_KEY,
    )
  ) {
    return error(401, "unauthorized", "Missing or invalid API key");
  }

  let params;
  try {
    params = parseParams(request.nextUrl.searchParams);
  } catch (e) {
    if (e instanceof ParamError)
      return error(400, "invalid_parameter", e.message);
    throw e;
  }

  try {
    const page = await fetchEventsPage(createAdminClient(), params);
    return NextResponse.json(
      { events: page.events, next_cursor: page.next_cursor },
      { status: 200, headers: NO_STORE },
    );
  } catch {
    console.error("[dashboard] events request failed");
    return error(500, "internal", "Internal error");
  }
}
