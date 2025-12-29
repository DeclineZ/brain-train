"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, LogOut, MoreHorizontal } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface TopBarMenuProps {
    variant?: "default" | "dark";
}

export default function TopBarMenu({ variant = "default" }: TopBarMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    // ... (rest of hook logic unchanged)

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push("/login");
            setIsOpen(false);
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const isDark = variant === "dark";

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer
                    ${isDark
                        ? "border-brown-800/20 bg-brown-800/5 hover:bg-brown-800/10"
                        : "border-white/40 bg-black/5 hover:bg-black/10"
                    }`}
            >
                <MoreHorizontal className={`w-5 h-5 ${isDark ? "text-brown-800" : "text-white"}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                        {/* <button
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-lighter transition-colors text-left text-sm font-medium text-brown-darkest"
                            onClick={() => setIsOpen(false)}
                        >
                            <Settings className="w-4 h-4 text-brown-medium" />
                            ตั้งค่า
                        </button> */}

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors text-left text-sm font-medium text-red-600"
                        >
                            <LogOut className="w-4 h-4" />
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
