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
    const name = userProfile?.full_name || "คุณนักฝึกสมอง";
    const avatarUrl = getAvatarSrc(userProfile?.avatar_url ?? null);

    return (
        <div className="bg-tan-light rounded-3xl p-5 md:p-6 shadow-sm border border-brown-border/30 relative overflow-hidden">
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/25 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

            {/* Header with welcome and user avatar */}
            <div className="flex justify-between items-center mb-5 relative z-10 gap-4">
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-brown-darkest truncate leading-tight">
                        ยินดีต้อนรับ, {name}
                    </h1>
                    <p className="text-brown-medium mt-1 text-sm md:text-base font-medium">
                        เล่นเกมเพื่อเช็คอินรายวัน
                    </p>
                </div>

                <div className="shrink-0">
                    <Link
                        href="/stats"
                        className="group block relative"
                        title="ดูสถิติส่วนตัว"
                    >
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white ring-4 ring-white/90 shadow-md overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt="Stats Avatar"
                                    width={64}
                                    height={64}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <User className="w-8 h-8 text-brown-medium" />
                            )}
                        </div>
                    </Link>
                </div>
            </div>

            {/* Streak / Status Section */}
            {userId && checkinStatus ? (
                <StreakBadge userId={userId} initialData={checkinStatus} />
            ) : (
                /* Guest View */
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 shadow-sm">
                    <div className="flex gap-2">
                        {weekDays.map((day, index) => (
                            <div
                                key={index}
                                className={`flex-1 text-center py-2.5 rounded-xl text-sm font-bold transition-all ${
                                    index === today
                                        ? "bg-orange-action text-white shadow-sm"
                                        : "bg-white/60 text-brown-medium"
                                }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
