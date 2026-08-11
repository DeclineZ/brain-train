import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthMode } from "@/lib/server/vitalmind/config";

export async function updateSession(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const isVitalmindAuthRoute = pathname.startsWith("/auth/launch") || pathname.startsWith("/auth/required");
    const isLegacyAuthRoute =
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/auth/callback");

    if (getAuthMode() === "vitalmind" && isLegacyAuthRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/required";
        url.search = "";
        return NextResponse.redirect(url);
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (
        !user &&
        !isLegacyAuthRoute &&
        !isVitalmindAuthRoute &&
        !pathname.startsWith("/internal") &&
        !pathname.startsWith("/api")
    ) {
        // no user, potentially respond by redirecting the user to the login page
        const url = request.nextUrl.clone();
        url.pathname = getAuthMode() === "vitalmind" ? "/auth/required" : "/login";
        return NextResponse.redirect(url);
    }

    // --- Onboarding Check (Only if user exists) ---
    const isServiceRoute =
        isLegacyAuthRoute ||
        isVitalmindAuthRoute ||
        pathname.startsWith("/internal") ||
        pathname.startsWith("/api");
    if (user && !isServiceRoute) {
        const onboardingComplete = user.user_metadata?.onboarding_complete === true;
        const isOnboardingPage = pathname.startsWith("/onboarding");

        // 1. If not complete and NOT on onboarding page -> Force Onboarding
        if (!onboardingComplete && !isOnboardingPage) {
            const url = request.nextUrl.clone();
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
        }

        // 2. If complete and ON onboarding page -> Redirect to Home/Dashboard
        if (onboardingComplete && isOnboardingPage) {
            const url = request.nextUrl.clone();
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}
