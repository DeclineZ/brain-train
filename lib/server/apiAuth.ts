import { NextRequest, NextResponse } from "next/server";

export function validateApiKey(request: NextRequest): { valid: true } | { valid: false; response: NextResponse } {
  const apiKey = request.headers.get("x-api-key");
  const validKey = process.env.MODULE_API_KEY || process.env.SYNC_API_KEY;

  if (!apiKey || (validKey && apiKey !== validKey)) {
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
