"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type LaunchResult = {
  session?: { access_token?: string; refresh_token?: string };
  onboardingComplete?: boolean;
  error?: string;
  code?: string;
};

type FunctionErrorWithContext = Error & {
  context?: Response;
};

function VitalmindLaunchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const launchToken = searchParams.get("launch_token")?.trim();
    // Remove the one-time credential from the address bar and browser history promptly.
    window.history.replaceState({}, "", "/auth/launch");

    if (!launchToken) {
      setError("The VitalMind launch link is missing or invalid.");
      return;
    }

    async function authenticate() {
      try {
        const supabase = createClient();
        const { data, error: functionError } =
          await supabase.functions.invoke<LaunchResult>("vitalmind-auth", {
            body: { launchToken },
          });

        if (functionError) {
          const context = (functionError as FunctionErrorWithContext).context;
          let message =
            functionError.message || "VitalMind authentication failed.";

          if (context) {
            try {
              const errorBody: unknown = await context.clone().json();
              const parsedError = parseFunctionError(errorBody);
              if (parsedError.message) message = parsedError.message;

              // Log only diagnostic status/code/message, never request or session tokens.
              console.error(
                "[VitalMind launch] Edge Function rejected request",
                {
                  status: context.status,
                  code: parsedError.code,
                  message: parsedError.message,
                },
              );
            } catch {
              console.error(
                "[VitalMind launch] Edge Function rejected request",
                {
                  status: context.status,
                },
              );
            }
          }

          throw new Error(message);
        }

        if (data?.error) {
          console.error("[VitalMind launch] Edge Function returned an error", {
            code: data.code,
            message: data.error,
          });
          throw new Error(data.error);
        }

        const accessToken = data?.session?.access_token;
        const refreshToken = data?.session?.refresh_token;
        if (!accessToken || !refreshToken)
          throw new Error("No login session was returned.");

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;

        router.replace(data.onboardingComplete ? "/" : "/onboarding");
        router.refresh();
      } catch (cause) {
        console.error("[VitalMind launch] Authentication failed", cause);
        setError(
          cause instanceof Error
            ? cause.message
            : "VitalMind authentication failed.",
        );
      }
    }

    void authenticate();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-100 bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl text-red-500">⚠️</div>
          <h1 className="mb-2 text-xl font-bold text-stone-800">
            Login failed
          </h1>
          <p className="text-stone-600">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-50">
      <Loader2 className="h-12 w-12 animate-spin text-stone-700" />
      <p className="font-medium text-stone-600">Signing in with VitalMind…</p>
    </main>
  );
}

function parseFunctionError(value: unknown): {
  message?: string;
  code?: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.error === "string" ? { message: record.error } : {}),
    ...(typeof record.code === "string" ? { code: record.code } : {}),
  };
}

export default function VitalmindLaunchContent() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-stone-50" />}>
      <VitalmindLaunchInner />
    </Suspense>
  );
}
