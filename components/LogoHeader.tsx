import clsx from "clsx";
import Image from "next/image";

interface LogoHeaderProps {
    className?: string; // Allow absolute positioning overrides
    variant?: "mobile" | "desktop";
}

export default function LogoHeader({ className, variant }: LogoHeaderProps) {
    const isDesktop = variant === "desktop";

    return (
        <div className={clsx("flex items-center gap-4 group cursor-pointer", className)}>
            {/* Native Logo without background container */}
            <div className="relative w-16 h-16 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                <Image
                    src="/logo.webp"
                    alt="RunJum Logo"
                    fill
                    className="object-contain drop-shadow-md"
                />
            </div>

            {/* Brand Name */}
            <span
                className={clsx(
                    "font-bold text-4xl tracking-tight transition-all duration-300 drop-shadow-sm font-sans",
                    isDesktop ? "text-brown-900" : "text-slate-800"
                )}
            >
                RunJum
            </span>
        </div>
    );
}
