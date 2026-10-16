import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getBraintrianConfig,
  isOaEnabled,
} from "@/lib/server/braintrian/config";
import {
  BINDING_COOKIE,
  BINDING_PATTERN,
  hash,
  isRecord,
  isSameOrigin,
  PRIVATE_HEADERS,
  readSmallJson,
  UUID_PATTERN,
} from "@/lib/server/braintrian/protocol";

export const runtime = "nodejs";
export const maxDuration = 60;

function failure(code: string, status: number, retryable = false) {
  return NextResponse.json(
    { error: code, retryable },
    { status, headers: PRIVATE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  if (!isOaEnabled()) return failure("unavailable", 503);
  if (!isSameOrigin(request)) return failure("forbidden", 403);
  let body: unknown;
  try {
    body = await readSmallJson(request);
  } catch {
    return failure("invalid_request", 400);
  }
  const binding = request.cookies.get(BINDING_COOKIE)?.value ?? "";
  if (
    !isRecord(body) ||
    typeof body.claimId !== "string" ||
    !UUID_PATTERN.test(body.claimId) ||
    !BINDING_PATTERN.test(binding)
  ) {
    return failure("invalid_claim", 400);
  }
  try {
    const config = getBraintrianConfig();
    const bindingHash = hash(binding);
    const upstream = await fetch(
      `${config.supabaseUrl}/functions/v1/braintrian-bot`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.serverKey,
        },
        body: JSON.stringify({
          claimId: body.claimId,
          browserBindingHash: bindingHash,
        }),
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
        redirect: "error",
      },
    );
    const result: unknown = await upstream.json();
    if (!upstream.ok) {
      const retryable = upstream.status >= 500 || upstream.status === 429;
      const safeCodes = [
        "INVALID_CODE",
        "APP_MISMATCH",
        "ALREADY_REDEEMED",
        "EXPIRED_CODE",
        "invalid_claim",
        "claim_expired",
      ];
      const code =
        isRecord(result) &&
        typeof result.code === "string" &&
        safeCodes.includes(result.code)
          ? result.code
          : "unavailable";
      return failure(code, retryable ? 503 : 400, retryable);
    }
    if (
      !isRecord(result) ||
      !isRecord(result.session) ||
      typeof result.session.access_token !== "string" ||
      typeof result.session.refresh_token !== "string"
    ) {
      return failure("unavailable", 503, true);
    }
    // Stage cookies; do not deliver a partial or unverified session on failure.
    const staged: { name: string; value: string; options: CookieOptions }[] =
      [];
    const supabase = createServerClient(config.supabaseUrl, config.publicKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          for (const cookie of values)
            request.cookies.set(cookie.name, cookie.value);
          staged.push(...values);
        },
      },
    });
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    if (
      sessionError ||
      !data.user ||
      data.user.app_metadata.identity_provider !== "braintrian_bot"
    ) {
      return failure("unavailable", 503, true);
    }
    const admin = createAdminClient();
    const { data: mapping, error: mappingError } = await admin
      .from("braintrian_participants")
      .select("participant_id")
      .eq("auth_user_id", data.user.id)
      .single();
    if (
      mappingError ||
      !mapping ||
      mapping.participant_id !== data.user.app_metadata.participant_id
    ) {
      return failure("unavailable", 503, true);
    }
    const { data: attached, error: attachError } = await admin
      .from("braintrian_auth_claims")
      .update({ status: "attached" })
      .eq("id", body.claimId)
      .eq("app_id", "runjump")
      .eq("browser_binding_hash", bindingHash)
      .eq("participant_id", mapping.participant_id)
      .in("status", ["redeemed", "attached"])
      .gt("expires_at", new Date().toISOString())
      .select("id")
      .single();
    if (attachError || !attached) return failure("unavailable", 503, true);
    const response = NextResponse.json(
      {
        next:
          data.user.user_metadata.onboarding_complete === true
            ? "/"
            : "/onboarding",
      },
      { headers: PRIVATE_HEADERS },
    );
    for (const cookie of staged)
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    console.error("[Braintrian claim] Session attachment unavailable");
    return failure("unavailable", 503, true);
  }
}
