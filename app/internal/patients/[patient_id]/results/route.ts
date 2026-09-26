import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { validateApiKey } from "@/lib/server/apiAuth";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { createHash } from "node:crypto";
import { getVitalmindRateLimit } from "@/lib/server/vitalmind/config";
import {
  isCompletedSession,
  isTutorialPayload,
} from "@/lib/sessionProgression";
import { resultMetrics } from "@/lib/server/vitalmind/resultMetrics";

const SESSION_COLUMNS =
  "id, game_id, current_played, score, duration_seconds, stat_memory, stat_speed, stat_focus, stat_visual, stat_planning, stat_emotion, raw_data, played_at";
const PAGE_SIZE = 200;

function isTrainingResult(session: {
  current_played: number | null;
  raw_data: unknown;
}) {
  return (
    isCompletedSession(session) &&
    session.current_played !== 0 &&
    !isTutorialPayload(session.raw_data)
  );
}

function json(body: object, status = 200) {
  return withPrivateHeaders(NextResponse.json(body, { status }));
}

function withPrivateHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> },
) {
  const authCheck = validateApiKey(request);
  if (!authCheck.valid) return withPrivateHeaders(authCheck.response);

  try {
    const keyHash = createHash("sha256")
      .update(request.headers.get("x-api-key")!)
      .digest("hex");
    const rateCheck = checkRateLimit(
      `patient-results:${keyHash}`,
      getVitalmindRateLimit(),
      60_000,
    );
    if (rateCheck.limited) {
      return withPrivateHeaders(rateCheck.response);
    }

    const { patient_id } = await params;
    if (!patient_id) {
      return json({ error: "Missing patient_id parameter" }, 400);
    }

    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date"); // Optional specific YYYY-MM-DD

    if (
      requestedDate !== null &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ||
        !Number.isFinite(Date.parse(`${requestedDate}T00:00:00.000Z`)) ||
        new Date(`${requestedDate}T00:00:00.000Z`)
          .toISOString()
          .slice(0, 10) !== requestedDate)
    ) {
      return json({ error: "date must be a valid YYYY-MM-DD date" }, 400);
    }

    const supabase = createAdminClient();
    const { data: patient, error: mappingError } = await supabase
      .from("vitalmind_patients")
      .select("auth_user_id")
      .eq("patient_id", patient_id)
      .maybeSingle<{ auth_user_id: string | null }>();
    if (mappingError) {
      console.error("[Vitalmind results] Patient mapping lookup failed", {
        code: mappingError.code,
      });
      return json({ error: "Database error fetching results" }, 500);
    }
    if (!patient?.auth_user_id) {
      return json({ error: "No results found for patient" }, 404);
    }

    // Keep UTC days until VitalMind's contract specifies a different timezone.
    let targetDate = requestedDate;
    const readStartedAt = new Date().toISOString();
    const sessionQuery = () =>
      supabase
        .from("game_sessions")
        .select(SESSION_COLUMNS)
        .eq("user_id", patient.auth_user_id!)
        .lte("played_at", readStartedAt)
        .order("played_at", { ascending: false })
        .order("id", { ascending: false });

    if (!targetDate) {
      for (let offset = 0; ; ) {
        const { data: batch, error } = await sessionQuery().range(
          offset,
          offset + PAGE_SIZE - 1,
        );
        if (error) throw error;
        if (!batch?.length) break;
        const latest = batch.find(isTrainingResult);
        if (latest) {
          targetDate = new Date(latest.played_at).toISOString().slice(0, 10);
          break;
        }
        offset += batch.length;
      }
    }

    if (!targetDate)
      return json({ error: "No results found for patient" }, 404);

    const dayStart = `${targetDate}T00:00:00.000Z`;
    const dayEnd = new Date(Date.parse(dayStart) + 86_400_000).toISOString();
    const targetSessions = [];
    for (let offset = 0; ; ) {
      const { data: batch, error } = await sessionQuery()
        .gte("played_at", dayStart)
        .lt("played_at", dayEnd)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!batch?.length) break;
      targetSessions.push(...batch.filter(isTrainingResult));
      offset += batch.length;
    }

    if (targetSessions.length === 0) {
      return json(
        { error: `No results found for patient on date ${targetDate}` },
        404,
      );
    }

    const games = targetSessions.map((session) => {
      return {
        game_type: session.game_id,
        ...resultMetrics(session),
        brain_stats: {
          memory: session.stat_memory ?? null,
          speed: session.stat_speed ?? null,
          focus: session.stat_focus ?? null,
          visual: session.stat_visual ?? null,
          planning: session.stat_planning ?? null,
          emotion: session.stat_emotion ?? null,
        },
      };
    });

    return json({
      user_id: patient_id,
      session_date: targetDate,
      games,
    });
  } catch (err) {
    console.error("[GET /internal/patients/results] Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
}
