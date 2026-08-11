import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { validateApiKey } from "@/lib/server/apiAuth";
import { checkRateLimit } from "@/lib/server/rateLimit";
import { getVitalmindRateLimit } from "@/lib/server/vitalmind/config";
import { syncLocalProfile } from "@/lib/server/vitalmind/identity";
import { parsePatientUpdate } from "@/lib/server/vitalmind/types";
import { createAdminClient } from "@/utils/supabase/admin";

type ExistingPatient = {
  auth_user_id: string | null;
  user_type: string;
  source_updated_at: string | null;
};

export async function POST(request: NextRequest) {
  const authCheck = validateApiKey(request);
  if (!authCheck.valid) return withPrivateHeaders(authCheck.response);

  const apiKey = request.headers.get("x-api-key")!;
  try {
    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const rateCheck = checkRateLimit(
      `patient-updated:${keyHash}`,
      getVitalmindRateLimit(),
      60_000
    );
    if (rateCheck.limited) return withPrivateHeaders(rateCheck.response);

    const payload = parsePatientUpdate(await request.json());
    if (!payload || (payload.current.user_type && payload.current.user_type !== "patient")) {
      return json({ error: "Invalid patient update payload" }, 400);
    }

    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from("vitalmind_patients")
      .select("auth_user_id, user_type, source_updated_at")
      .eq("patient_id", payload.patient_id)
      .maybeSingle<ExistingPatient>();

    if (readError) {
      console.error("[Vitalmind patient update] Mapping read failed", {
        code: readError.code,
        message: readError.message,
      });
      return json({ error: "Unable to update patient" }, 500);
    }

    const existingTimestamp = existing?.source_updated_at
      ? new Date(existing.source_updated_at).getTime()
      : null;
    const incomingTimestamp = new Date(payload.updated_at).getTime();
    if (existingTimestamp !== null && existingTimestamp > incomingTimestamp) {
      return json({ ok: true }, 200);
    }

    if (existingTimestamp !== incomingTimestamp) {
      const { error: writeError } = await admin.from("vitalmind_patients").upsert(
        {
          patient_id: payload.patient_id,
          name: payload.current.name,
          surname: payload.current.surname,
          user_type: payload.current.user_type ?? existing?.user_type ?? "patient",
          source_updated_at: payload.updated_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "patient_id" }
      );

      if (writeError) {
        console.error("[Vitalmind patient update] Mapping write failed", {
          code: writeError.code,
          message: writeError.message,
        });
        return json({ error: "Unable to update patient" }, 500);
      }
    }

    if (existing?.auth_user_id) {
      const { data: authUser, error: authReadError } = await admin.auth.admin.getUserById(
        existing.auth_user_id
      );
      if (authReadError || !authUser.user) return json({ error: "Unable to update patient" }, 500);

      const { error: metadataError } = await admin.auth.admin.updateUserById(existing.auth_user_id, {
        user_metadata: {
          ...authUser.user.user_metadata,
          full_name: `${payload.current.name} ${payload.current.surname}`.trim(),
        },
      });
      if (metadataError) return json({ error: "Unable to update patient" }, 500);

      await syncLocalProfile(
        existing.auth_user_id,
        payload.current.name,
        payload.current.surname
      );
    }

    return json({ ok: true }, 200);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON body" }, 400);
    console.error("[Vitalmind patient update] Unexpected failure", error);
    return json({ error: "Internal server error" }, 500);
  }
}

function json(body: object, status: number) {
  return withPrivateHeaders(NextResponse.json(body, { status }));
}

function withPrivateHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
