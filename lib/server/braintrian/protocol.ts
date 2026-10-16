import { createCipheriv, createHash, randomBytes } from "node:crypto";

export const CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const HASH_PATTERN = /^[0-9a-f]{64}$/;
export const BINDING_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const CLAIM_LIFETIME_SECONDS = 24 * 60 * 60;
export const BINDING_COOKIE = "braintrian_browser";
export const PRIVATE_HEADERS = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function encryptCode(
  code: string,
  keyHex: string,
  bindingHash: string,
): string {
  if (!HASH_PATTERN.test(keyHex))
    throw new Error("Invalid claim encryption key");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  cipher.setAAD(Buffer.from(`runjump:${hash(code)}:${bindingHash}`));
  const ciphertext = Buffer.concat([
    cipher.update(code, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return (
    origin === new URL(request.url).origin && (!site || site === "same-origin")
  );
}

export async function readSmallJson(request: Request): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new Error("Expected JSON");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 8192) throw new Error("Request too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
