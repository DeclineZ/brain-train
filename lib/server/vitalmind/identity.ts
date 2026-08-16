import { createHmac, randomBytes } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import type { VitalmindVerifyResponse } from "./types";

type PatientRow = {
  auth_user_id: string | null;
};

export class VitalmindIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VitalmindIdentityError";
  }
}

export async function upsertVerifiedPatient(
  verified: VitalmindVerifyResponse,
  identityPepper: string
): Promise<{ authUserId: string; email: string; onboardingComplete: boolean }> {
  const admin = createAdminClient();
  const { patient_id: patientId, profile } = verified;

  const { data: existing, error: existingError } = await admin
    .from("vitalmind_patients")
    .select("auth_user_id")
    .eq("patient_id", patientId)
    .maybeSingle<PatientRow>();

  if (existingError) throw new VitalmindIdentityError("Unable to read patient mapping");

  const { error: mappingError } = await admin.from("vitalmind_patients").upsert(
    {
      patient_id: patientId,
      name: profile.name,
      surname: profile.surname,
      user_type: profile.user_type,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "patient_id" }
  );

  if (mappingError) throw new VitalmindIdentityError("Unable to update patient mapping");

  const email = createSyntheticEmail(patientId, identityPepper);
  let authUserId = existing?.auth_user_id ?? null;

  if (!authUserId) {
    const password = randomBytes(32).toString("base64url");
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${profile.name} ${profile.surname}`.trim(),
        onboarding_complete: false,
      },
      app_metadata: {
        identity_provider: "vitalmind",
        patient_id: patientId,
      },
    });

    authUserId = created.user?.id ?? null;
    if (createError || !authUserId) {
      const { data: recovered, error: recoveryError } = await admin.rpc(
        "find_vitalmind_auth_user_by_email",
        { p_email: email }
      );
      if (recoveryError || typeof recovered !== "string") {
        throw new VitalmindIdentityError("Unable to provision patient session identity");
      }
      authUserId = recovered;
    }

    const { data: claimed, error: claimError } = await admin
      .from("vitalmind_patients")
      .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
      .eq("patient_id", patientId)
      .is("auth_user_id", null)
      .select("auth_user_id")
      .maybeSingle<{ auth_user_id: string }>();

    if (claimError) throw new VitalmindIdentityError("Unable to attach patient identity");
    if (!claimed) {
      const { data: winner, error: winnerError } = await admin
        .from("vitalmind_patients")
        .select("auth_user_id")
        .eq("patient_id", patientId)
        .single<{ auth_user_id: string }>();
      if (winnerError || !winner?.auth_user_id || winner.auth_user_id !== authUserId) {
        throw new VitalmindIdentityError("Concurrent patient identity conflict");
      }
    }
  }

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(authUserId);
  if (authUserError || !authUser.user) {
    throw new VitalmindIdentityError("Provisioned patient identity is unavailable");
  }
  const sessionEmail = authUser.user.email;
  if (!sessionEmail) {
    throw new VitalmindIdentityError("Provisioned patient identity has no sign-in address");
  }

  const onboardingComplete = authUser.user.user_metadata?.onboarding_complete === true;
  const { error: metadataError } = await admin.auth.admin.updateUserById(authUserId, {
    user_metadata: {
      ...authUser.user.user_metadata,
      full_name: `${profile.name} ${profile.surname}`.trim(),
    },
    app_metadata: {
      ...authUser.user.app_metadata,
      identity_provider: "vitalmind",
      patient_id: patientId,
    },
  });
  if (metadataError) throw new VitalmindIdentityError("Unable to synchronize patient identity");

  await syncLocalProfile(authUserId, profile.name, profile.surname);
  return { authUserId, email: sessionEmail, onboardingComplete };
}

export async function syncLocalProfile(authUserId: string, name: string, surname: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_profiles")
    .update({ full_name: `${name} ${surname}`.trim(), last_updated: new Date().toISOString() })
    .eq("user_id", authUserId);
  if (error) throw new VitalmindIdentityError("Unable to synchronize local patient profile");
}

function createSyntheticEmail(patientId: string, identityPepper: string): string {
  const digest = createHmac("sha256", identityPepper).update(patientId).digest("hex");
  return `vitalmind-${digest}@users.invalid`;
}
