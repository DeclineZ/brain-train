export type VitalmindVerifyResponse = {
  user_id?: string;
  patient_id: string;
  profile: {
    name: string;
    surname: string;
    user_type: string;
    consent: boolean;
  };
};

export type VitalmindPatientUpdate = {
  patient_id: string;
  previous?: { name?: string; surname?: string };
  current: { name: string; surname: string; user_type?: string };
  updated_at: string;
};

export function parseVerifyResponse(value: unknown): VitalmindVerifyResponse | null {
  if (!isRecord(value) || !isRecord(value.profile)) return null;
  const profile = value.profile;
  if (
    !isNonBlankString(value.patient_id) ||
    !isNonBlankString(profile.name) ||
    !isNonBlankString(profile.surname) ||
    !isNonBlankString(profile.user_type) ||
    typeof profile.consent !== "boolean"
  ) {
    return null;
  }

  return {
    ...(isNonBlankString(value.user_id) ? { user_id: value.user_id.trim() } : {}),
    patient_id: value.patient_id.trim(),
    profile: {
      name: profile.name.trim(),
      surname: profile.surname.trim(),
      user_type: profile.user_type.trim(),
      consent: profile.consent,
    },
  };
}

export function parsePatientUpdate(value: unknown): VitalmindPatientUpdate | null {
  if (!isRecord(value) || !isRecord(value.current)) return null;
  const current = value.current;
  if (
    !isNonBlankString(value.patient_id) ||
    !isNonBlankString(current.name) ||
    !isNonBlankString(current.surname) ||
    (current.user_type !== undefined && !isNonBlankString(current.user_type)) ||
    !isNonBlankString(value.updated_at)
  ) {
    return null;
  }

  const updatedAt = new Date(value.updated_at);
  if (Number.isNaN(updatedAt.getTime())) return null;

  return {
    patient_id: value.patient_id.trim(),
    current: {
      name: current.name.trim(),
      surname: current.surname.trim(),
      user_type: typeof current.user_type === "string" ? current.user_type.trim() : undefined,
    },
    updated_at: updatedAt.toISOString(),
  };
}

export function isAuthorizedPatient(value: VitalmindVerifyResponse): boolean {
  return value.profile.user_type === "patient" && value.profile.consent === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
