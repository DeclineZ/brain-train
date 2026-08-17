import { type NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .mp3, .wav, .ogg, .m4a, .json, .woff, .woff2, .ttf)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|m4a|json|woff|woff2|ttf)$).*)",
    ],
};
