import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

export function validateApiKey(request: NextRequest): { valid: true } | { valid: false; response: NextResponse } {
  const apiKey = request.headers.get("x-api-key");
  const validKey = process.env.MODULE_API_KEY;

  if (!validKey) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Service authentication is not configured" },
        { status: 503 }
      ),
    };
  }

  if (!apiKey || !safeEqual(apiKey, validKey)) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { valid: true };
}

function safeEqual(received: string, expected: string): boolean {
  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}
