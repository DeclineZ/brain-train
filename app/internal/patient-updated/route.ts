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
      60_000,
    );
    if (rateCheck.limited) return withPrivateHeaders(rateCheck.response);

    const payload = parsePatientUpdate(await request.json());
    if (!payload) {
      return json({ error: "Invalid patient update payload" }, 400);
    }

    const admin = createAdminClient();
    const { data: existing, error: updateError } = await admin
      .rpc("update_vitalmind_patient_profile", {
        p_patient_id: payload.patient_id,
        p_name: payload.current.name,
        p_surname: payload.current.surname,
      })
      .maybeSingle<ExistingPatient>();

    if (updateError) {
      console.error("[Vitalmind patient update] Mapping update failed", {
        code: updateError.code,
        message: updateError.message,
      });
      return json({ error: "Unable to update patient" }, 500);
    }

    if (!existing) {
      return json(
        {
          error: "Patient is unavailable",
          code: "PATIENT_NOT_FOUND",
        },
        404,
      );
    }

    if (existing.auth_user_id) {
      const { data: authUser, error: authReadError } =
        await admin.auth.admin.getUserById(existing.auth_user_id);
      if (authReadError || !authUser.user)
        return json({ error: "Unable to update patient" }, 500);

      const { error: metadataError } = await admin.auth.admin.updateUserById(
        existing.auth_user_id,
        {
          user_metadata: {
            ...authUser.user.user_metadata,
            full_name:
              `${payload.current.name} ${payload.current.surname}`.trim(),
          },
        },
      );
      if (metadataError)
        return json({ error: "Unable to update patient" }, 500);

      await syncLocalProfile(
        existing.auth_user_id,
        payload.current.name,
        payload.current.surname,
      );
    }

    return json({ ok: true }, 200);
  } catch (error) {
    if (error instanceof SyntaxError)
      return json({ error: "Invalid JSON body" }, 400);
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
