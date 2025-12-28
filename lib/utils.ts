import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Avatar lookup similar to onboarding
export const getAvatarSrc = (url: string | null) => {
    if (!url) return "/avatars/avatar1.webp";
    if (url === "avatar-1") return "/avatars/avatar-1.webp";
    if (url === "avatar-2") return "/avatars/avatar-2.webp";
    if (url === "avatar-3") return "/avatars/avatar-3.webp";

    // Check if it's a valid URL or path
    if (url.startsWith("http") || url.startsWith("/")) return url;

    // Fallback for unknown strings to prevent crashes
    return "/avatars/avatar-1.webp";
};
