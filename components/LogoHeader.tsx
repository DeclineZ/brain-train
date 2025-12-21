import { Zap } from "lucide-react";
import clsx from "clsx";

interface LogoHeaderProps {
    className?: string; // Allow absolute positioning overrides
    variant?: "mobile" | "desktop";
}

export default function LogoHeader({ className, variant }: LogoHeaderProps) {
    // If variant is 'mobile', we use dark text. If 'desktop', we use white text.
    // If no variant is passed, we default to the classes passed in className or expect parent to color it.
    // Given the user request "Use Tailwind responsive classes... to handle the style switching cleanly",
    // and my plan to instantiate it twice, I will rely on the `variant` to set the base colors.

    const isDesktop = variant === "desktop";

    return (
        <div className={clsx("flex items-center gap-3", className)}>
            {/* Icon Placeholder */}
            {/* 40x40px circle */}
            <div
                className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                    isDesktop ? "bg-white text-orange-500" : "bg-orange-500 text-white"
                )}
            >
                {/* Using a placeholder icon or Zap for energy/brain connection temporarily */}
                <Zap className="w-6 h-6 fill-current" />
            </div>

            {/* Brand Name */}
            <span
                className={clsx(
                    "font-bold text-2xl tracking-tight font-nunito",
                    isDesktop ? "text-white" : "text-slate-800"
                )}
            >
                NameArai
            </span>
        </div>
    );
}
