"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function TopBarWrapper({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const hiddenPaths = ["/login", "/signup", "/onboarding", "/stats", "/play"];

    // Hide if path starts with any of hidden paths (to handle sub-routes like /onboarding/step1)
    const shouldHide = hiddenPaths.some((path) => pathname.startsWith(path));

    if (shouldHide) {
        return null;
    }

    return (
        <>
            {children}
        </>
    );
}
