import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { validateApiKey } from "@/lib/server/apiAuth";
import { checkRateLimit } from "@/lib/server/rateLimit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> }
) {
  try {
    // 1. Rate Limit Check (60 requests per minute per IP / API key)
    const clientKey = request.headers.get("x-forwarded-for") || request.headers.get("x-api-key") || "default";
    const rateCheck = checkRateLimit(clientKey, 60, 60000);
    if (rateCheck.limited) {
      return rateCheck.response;
    }

    // 2. Authentication Header Check
    const authCheck = validateApiKey(request);
    if (!authCheck.valid) {
      return authCheck.response;
    }

    // 3. Extract patient_id parameter
    const { patient_id } = await params;
    if (!patient_id) {
      return NextResponse.json({ error: "Missing patient_id parameter" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date"); // Optional specific YYYY-MM-DD
    const includeSent = searchParams.get("include_sent") === "true";

    const supabase = createAdminClient();

    // 4. Query existing columns for patient game sessions
    const { data: allSessions, error } = await supabase
      .from("game_sessions")
      .select("id, game_id, score, duration_seconds, stat_memory, stat_speed, stat_focus, stat_visual, stat_planning, stat_emotion, raw_data, played_at")
      .eq("user_id", patient_id)
      .order("played_at", { ascending: false });

    if (error) {
      console.error("[GET /internal/patients/results] DB query error:", error);
      return NextResponse.json({ error: "Database error fetching results" }, { status: 500 });
    }

    if (!allSessions || allSessions.length === 0) {
      // Vitalmind spec: "ถ้ายังไม่มีผลของผู้ป่วยคนนี้: ตอบกลับด้วย 404"
      return NextResponse.json({ error: "No results found for patient" }, { status: 404 });
    }

    // Helper to format ISO timestamp to YYYY-MM-DD date string
    const getSessionDateString = (isoString: string) => {
      return new Date(isoString).toISOString().split("T")[0];
    };

    // 5. Determine target session_date
    let targetDate: string;

    if (requestedDate) {
      targetDate = requestedDate;
    } else {
      // Default to the latest session date overall
      targetDate = getSessionDateString(allSessions[0].played_at);
    }

    // 6. Filter sessions matching target session_date
    const targetSessions = allSessions.filter(
      (s) => getSessionDateString(s.played_at) === targetDate
    );

    if (targetSessions.length === 0) {
      return NextResponse.json(
        { error: `No results found for patient on date ${targetDate}` },
        { status: 404 }
      );
    }

    // 7. Format games array matching spec
    const games = targetSessions.map((session) => {
      const rawData = session.raw_data || {};
      const maxScore = Number(rawData.maxScore ?? rawData.max_score ?? 100);
      const durationSeconds = Number(session.duration_seconds ?? Math.round((rawData.userTimeMs || 0) / 1000));

      return {
        game_type: session.game_id,
        score: Number(session.score || 0),
        max_score: maxScore,
        duration_seconds: durationSeconds,
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

    // 8. Attempt updating sent_to_vitalmind tracking column if it exists (ignoring column missing error)
    const sessionIdsToMark = targetSessions.map((s) => s.id);
    if (sessionIdsToMark.length > 0) {
      supabase
        .from("game_sessions")
        .update({
          sent_to_vitalmind: true,
          sent_at: new Date().toISOString(),
        } as any)
        .in("id", sessionIdsToMark)
        .then(({ error: updateErr }) => {
          if (updateErr) {
            // Silently ignore if column doesn't exist yet
          }
        });
    }

    // 9. Return JSON payload matching Vitalmind spec
    return NextResponse.json({
      user_id: patient_id,
      session_date: targetDate,
      games,
    });
  } catch (err) {
    console.error("[GET /internal/patients/results] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
