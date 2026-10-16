import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getBraintrianConfig,
  isOaEnabled,
} from "@/lib/server/braintrian/config";
import {
  BINDING_COOKIE,
  BINDING_PATTERN,
  CLAIM_LIFETIME_SECONDS,
  CODE_PATTERN,
  encryptCode,
  hash,
  PRIVATE_HEADERS,
} from "@/lib/server/braintrian/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destination = new URL("/auth/line-bot/continue", request.url);
  const redirect = () =>
    NextResponse.redirect(destination, {
      status: 303,
      headers: PRIVATE_HEADERS,
    });
  if (!isOaEnabled()) {
    destination.searchParams.set("error", "unavailable");
    return redirect();
  }
  const codes = request.nextUrl.searchParams.getAll("code");
  const code = codes.length === 1 ? codes[0] : "";
  if (!CODE_PATTERN.test(code)) {
    destination.searchParams.set("error", "invalid");
    return redirect();
  }
  try {
    const config = getBraintrianConfig();
    const currentBinding = request.cookies.get(BINDING_COOKIE)?.value ?? "";
    const binding = BINDING_PATTERN.test(currentBinding)
      ? currentBinding
      : randomBytes(32).toString("base64url");
    const bindingHash = hash(binding);
    const codeHash = hash(code);
    const admin = createAdminClient();
    // DO NOTHING on conflict: never replace an existing claim's retry key or state.
    const { error: insertError } = await admin
      .from("braintrian_auth_claims")
      .upsert(
        {
          app_id: "runjump",
          browser_binding_hash: bindingHash,
          code_hash: codeHash,
          encrypted_code: encryptCode(code, config.encryptionKey, bindingHash),
        },
        {
          onConflict: "app_id,browser_binding_hash,code_hash",
          ignoreDuplicates: true,
        },
      );
    if (insertError) throw new Error("Claim storage unavailable");
    const { data: claim, error } = await admin
      .from("braintrian_auth_claims")
      .select("id,expires_at")
      .eq("app_id", "runjump")
      .eq("browser_binding_hash", bindingHash)
      .eq("code_hash", codeHash)
      .single();
    if (error || !claim || Date.parse(claim.expires_at) <= Date.now()) {
      destination.searchParams.set("error", "invalid");
      return redirect();
    }
    destination.searchParams.set("claim", claim.id);
    const response = redirect();
    response.cookies.set(BINDING_COOKIE, binding, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      path: "/",
      maxAge: CLAIM_LIFETIME_SECONDS,
    });
    return response;
  } catch {
    // Never log the request URL, raw code, or database error payload.
    console.error("[Braintrian entry] Pending claim preparation failed");
    destination.searchParams.set("error", "unavailable");
    return redirect();
  }
}
