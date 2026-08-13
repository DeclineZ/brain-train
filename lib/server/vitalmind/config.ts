export type AuthMode = "dual" | "vitalmind";

export class VitalmindConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VitalmindConfigurationError";
  }
}

export function getAuthMode(): AuthMode {
  return process.env.AUTH_MODE === "vitalmind" ? "vitalmind" : "dual";
}

export function isDevLoginEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_LOGIN === "true";
}

export function getVitalmindConfiguration() {
  const verifyUrlValue = process.env.VITALMIND_LAUNCH_VERIFY_URL;
  const apiKey = process.env.MODULE_API_KEY;
  const identityPepper = process.env.VITALMIND_IDENTITY_PEPPER;

  if (!verifyUrlValue || !apiKey || !identityPepper) {
    throw new VitalmindConfigurationError(
      "Missing VITALMIND_LAUNCH_VERIFY_URL, MODULE_API_KEY, or VITALMIND_IDENTITY_PEPPER"
    );
  }

  let verifyUrl: URL;
  try {
    verifyUrl = new URL(verifyUrlValue);
  } catch {
    throw new VitalmindConfigurationError("VITALMIND_LAUNCH_VERIFY_URL is not a valid URL");
  }

  const isLocalhost = verifyUrl.hostname === "localhost" || verifyUrl.hostname === "127.0.0.1";
  if (verifyUrl.protocol !== "https:" && !(process.env.NODE_ENV === "development" && isLocalhost)) {
    throw new VitalmindConfigurationError("VITALMIND_LAUNCH_VERIFY_URL must use HTTPS");
  }

  return { verifyUrl: verifyUrl.toString(), apiKey, identityPepper };
}

export function getVitalmindRateLimit(): number {
  const parsed = Number(process.env.VITALMIND_RATE_LIMIT_PER_MINUTE ?? "60");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 60;
}
