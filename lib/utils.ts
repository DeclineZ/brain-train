import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const getAvatarSrc = (url: string | null) => {
    if (!url) return "/avatars/avatar-1.webp"; // Default to fox

    // Check if it's already a full path or URL
    if (url.startsWith("http") || url.startsWith("/")) return url;

    // Handle legacy keys explicitly if needed, but the dynamic fallback should cover them too 
    // if the files are named consistent with the keys.
    // However, keeping legacy mapping for safety if file names match keys exactly:
    // avatar-1 -> /avatars/avatar-1.webp

    // Dynamic mapping for all keys (e.g. avatar-knight-1 -> /avatars/avatar-knight-1.webp)
    return `/avatars/${url}.webp`;
};
