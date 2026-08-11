import { getVitalmindConfiguration } from "./config";
import {
  isAuthorizedPatient,
  parseVerifyResponse,
  type VitalmindVerifyResponse,
} from "./types";

export class VitalmindVerificationError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid" | "used" | "upstream"
  ) {
    super(message);
    this.name = "VitalmindVerificationError";
  }
}

export async function verifyLaunchToken(launchToken: string): Promise<{
  verified: VitalmindVerifyResponse;
  identityPepper: string;
}> {
  const { verifyUrl, apiKey, identityPepper } = getVitalmindConfiguration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ launch_token: launchToken }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await readJson(response);
      const detail = isRecord(errorBody) && isRecord(errorBody.detail) ? errorBody.detail : null;
      const code = detail && typeof detail.code === "string" ? detail.code : null;
      if (response.status === 401 && code === "TOKEN_ALREADY_USED") {
        throw new VitalmindVerificationError("Launch token has already been used", "used");
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new VitalmindVerificationError("Launch token is invalid or expired", "invalid");
      }
      throw new VitalmindVerificationError("Vitalmind verification is unavailable", "upstream");
    }

    const parsed = parseVerifyResponse(await readJson(response));
    if (!parsed) {
      throw new VitalmindVerificationError("Vitalmind returned an invalid response", "upstream");
    }
    if (!isAuthorizedPatient(parsed)) {
      throw new VitalmindVerificationError("Patient is not authorized for this module", "invalid");
    }

    return { verified: parsed, identityPepper };
  } catch (error) {
    if (error instanceof VitalmindVerificationError) throw error;
    throw new VitalmindVerificationError("Vitalmind verification is unavailable", "upstream");
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
