"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { flush, markPendingLogin, track } from "@/lib/analytics/track";

export default function ClaimContent() {
  const search = useSearchParams();
  const started = useRef(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  async function claim() {
    if (busy.current) return;
    const claimId = search.get("claim");
    if (!claimId || search.has("error")) {
      setError(
        search.get("error") === "unavailable"
          ? "ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"
          : "ลิงก์นี้ไม่ถูกต้อง กรุณากลับไปที่ LINE OA เพื่อรับลิงก์ใหม่",
      );
      return;
    }
    busy.current = true;
    setError(null);
    setRetryable(false);
    // Send the previous user's queued events before the session switches.
    await flush();
    try {
      const response = await fetch("/auth/line-bot/claim", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
        signal: AbortSignal.timeout(55_000),
      });
      const result = await response.json();
      if (
        response.ok &&
        (result.next === "/" || result.next === "/onboarding")
      ) {
        markPendingLogin("line_oa");
        // Full navigation discards the previous participant's in-memory client state.
        window.location.replace(result.next);
        return;
      }
      track("login_failed", {
        method: "line_oa",
        error_category: typeof result.error === "string" ? result.error : "unknown",
      });
      setRetryable(result.retryable === true);
      setError(
        result.retryable === true
          ? "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง"
          : "เปิดลิงก์นี้ไม่ได้ กรุณากลับไปที่ LINE OA เพื่อรับลิงก์ใหม่",
      );
    } catch {
      setRetryable(true);
      setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void claim();
    // Each mounted page claims once; manual retries retain the URL's claim ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 text-center text-brown-900 shadow-lg"
        aria-live="polite"
      >
        <h1 className="mb-4 text-xl font-bold">
          {error ? "เข้าสู่ระบบไม่สำเร็จ" : "กำลังเข้าสู่ RunJump…"}
        </h1>
        <p>{error ?? "กรุณารอสักครู่"}</p>
        {error && (
          <div className="mt-6 flex flex-col gap-3">
            {retryable && (
              <button
                className="rounded-xl bg-orange-action px-6 py-3 font-bold text-white"
                onClick={() => void claim()}
              >
                ลองอีกครั้ง
              </button>
            )}
            <a
              className="rounded-xl border px-6 py-3"
              href="https://line.me/R/ti/p/%40636yjpzm"
            >
              กลับไปที่ LINE OA
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
