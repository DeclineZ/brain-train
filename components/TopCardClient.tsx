"use client";

import { User } from "lucide-react";
import StreakBadge from "./DailyStreak/StreakBadge";
import Image from "next/image";
import type { CheckinStatus } from "@/types";
import Link from "next/link";
import { getAvatarSrc } from "@/lib/utils";

interface TopCardClientProps {
    userProfile: {
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    checkinStatus: CheckinStatus | null;
    userId: string | null;
}

export default function TopCardClient({ userProfile, checkinStatus, userId }: TopCardClientProps) {
    const weekDays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
    const today = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // Adjust JS Day (0=Sun) to match Thai Mon-Sun array index

    // Default values
    const name = userProfile?.full_name || "Guest";
    const avatarUrl = getAvatarSrc(userProfile?.avatar_url ?? null)
    return (
        <>
            <div className="bg-tan-light rounded-2xl p-4 md:p-6 shadow-sm relative overflow-hidden">
                {/* Background Decorative Elements (Optional for 'fun') */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />

                {/* Header with welcome and user icon */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-brown-darkest">
                            ยินดีต้อนรับคุณ, {name}
                        </h1>
                        <p className="text-brown-medium mt-1 text-base font-medium">
                            เล่นเกมส์เพื่อเช็คอินรายวัน
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="w-14 h-14 rounded-full bg-brown-lightest border-4 border-white shadow-md overflow-hidden flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer">
                                {avatarUrl ? (
                                    <Link href="/stats">
                                        <Image
                                            src={avatarUrl}
                                            alt="Stats"
                                            width={56}
                                            height={56}
                                            className="object-cover w-full h-full"
                                        />
                                    </Link>
                                ) : (
                                    <User className="w-7 h-7 text-white" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Streak / Status Section */}
                {userId && checkinStatus ? (
                    <StreakBadge userId={userId} initialData={checkinStatus} />
                ) : (
                    /* Guest View */
                    <div className="flex gap-2">
                        {weekDays.map((day, index) => (
                            <div
                                key={index}
                                className={`flex-1 text-center py-2 rounded-lg text-sm ${index === today
                                    ? "bg-orange-dark text-white font-semibold shadow-md"
                                    : "bg-white/50 text-brown-medium"
                                    }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
