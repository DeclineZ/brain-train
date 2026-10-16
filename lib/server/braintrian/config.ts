import { HASH_PATTERN } from "./protocol";

export function isOaEnabled(): boolean {
  return process.env.BRAINTRIAN_OA_TESTING === "true";
}

export function getBraintrianConfig() {
  const encryptionKey = process.env.BRAINTRIAN_CLAIM_ENCRYPTION_KEY ?? "";
  const serverKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (
    !HASH_PATTERN.test(encryptionKey) ||
    !serverKey ||
    !supabaseUrl ||
    !publicKey
  ) {
    throw new Error("Braintrian authentication is not configured");
  }
  const url = new URL(supabaseUrl);
  const local =
    process.env.NODE_ENV === "development" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local)
    throw new Error("Supabase URL must use HTTPS");
  return { encryptionKey, serverKey, supabaseUrl: url.origin, publicKey };
}
