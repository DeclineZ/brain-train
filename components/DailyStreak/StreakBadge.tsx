"use client";

import { useState, useEffect } from "react";
import { Flame, Calendar, CheckCircle } from "lucide-react";
import type {
    CheckinStatus,
    CheckinResult,
} from "@/lib/server/dailystreakAction";
import CalendarModal from "./CalendarModal";
import StreakNotification from "./StreakNotification";
import { Button } from "../ui/button";

interface StreakBadgeProps {
    userId: string;
    onAutoCheckin?: () => void;
}

export default function StreakBadge({
    userId,
    onAutoCheckin,
}: StreakBadgeProps) {
    const [status, setStatus] = useState<CheckinStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [notification, setNotification] = useState<CheckinResult | null>(
        null
    );

    // Fetch check-in status on mount
    useEffect(() => {
        fetchStatus();
    }, [userId]);

    const fetchStatus = async () => {
        try {
            const response = await fetch(
                `/api/daily-streak?action=status&userId=${userId}`
            );
            const result = await response.json();
            if (result.ok) {
                setStatus(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch status:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualCheckin = async () => {
        if (!status || status.checked_in_today) return;

        setIsCheckingIn(true);
        try {
            const response = await fetch("/api/daily-streak", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: "checkin",
                    userId: userId,
                }),
            });

            const result = await response.json();
            if (result.ok) {
                setStatus((prev) =>
                    prev
                        ? {
                              ...prev,
                              checked_in_today: true,
                              current_streak: result.data.streak_count,
                              total_checkins: prev.total_checkins + 1,
                              last_checkin_date: new Date().toISOString(),
                          }
                        : null
                );

                // Show notification for successful check-in
                setNotification(result.data);

                // Clear notification after 4 seconds
                setTimeout(() => setNotification(null), 4000);
            }
        } catch (error) {
            console.error("Check-in failed:", error);
        } finally {
            setIsCheckingIn(false);
        }
    };

    const handleAutoCheckin = () => {
        if (!status || status.checked_in_today) return;

        handleManualCheckin();
        onAutoCheckin?.();
    };

    if (isLoading) {
        return (
            <div className="bg-[#EADFD6] rounded-xl p-4 animate-pulse">
                <div className="h-6 bg-gray-300 rounded mb-3"></div>
                <div className="h-4 bg-gray-300 rounded mb-3"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="bg-[#EADFD6] rounded-xl p-4">
                <p className="text-[#51433A] text-sm">
                    ไม่สามารถโหลดข้อมูลสตรีก
                </p>
            </div>
        );
    }

    const getFireColor = (streak: number) => {
        if (streak >= 30) return "text-red-600";
        if (streak >= 7) return "text-orange-500";
        if (streak >= 1) return "text-yellow-600";
        return "text-gray-600";
    };

    const getFireSize = (streak: number) => {
        if (streak >= 30) return "w-8 h-8";
        if (streak >= 7) return "w-7 h-7";
        return "w-6 h-6";
    };

    const weeklyProgress = status.weekly_progress;

    return (
        <>
            <div className="bg-[#EADFD6] space-y-2">
                {/* TOP SECTION: Daily Status */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Flame
                            className={`${getFireSize(status.current_streak)} ${getFireColor(status.current_streak)} ${
                                !status.checked_in_today ? "animate-pulse" : ""
                            }`}
                        />
                        <div>
                            <p className="text-[#3C2924] font-bold text-lg">
                                {status.current_streak} วัน
                            </p>
                            <p className="text-[#51433A] text-xs">
                                สูงสุด {status.longest_streak} วัน
                            </p>
                        </div>
                    </div>

                    <Button
                        variant={"outline"}
                        onClick={() => setShowCalendar(true)}
                        className="p-4  rounded-lg transition-colors"
                    >
                        <Calendar className="w-5 h-5 text-[#51433A]" />
                    </Button>
                </div>

                {/* MIDDLE SECTION: Weekly Progress Bar */}
                <div className="space-y-2">
                    <div className="grid grid-cols-7">
                        {weeklyProgress.week_days.map((day, index) => (
                            <div
                                key={index}
                                className={`flex  items-center justify-center text-xs py-2 gap-1 ${index == 0 ? "rounded-l-lg" : ""} ${index == 6 ? "rounded-r-lg" : ""} ${
                                    day.is_today
                                        ? day.checked_in
                                            ? "bg-[#D75931] text-white"
                                            : "bg-[#EADFD6] border-2 border-[#D75931] text-[#3C2924]"
                                        : day.checked_in
                                          ? "bg-[#D4C5B8] text-white"
                                          : "bg-white/50 text-[#51433A]"
                                }`}
                            >
                                <span className="font-semibold text-[15px] leading-none">
                                    {day.day_name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTTOM SECTION: Action and Summary */}
                <div className="space-y-3">
                    {/* Check-in Status and Button */}
                    <div className="flex items-center justify-between">
                        <p className="text-[#51433A] text-sm pt-2">
                            {status.checked_in_today
                                ? "✓ เช็คอินแล้ววันนี้"
                                : "ยังไม่ได้เช็คอินวันนี้"}
                        </p>

                        {!status.checked_in_today && (
                            <button
                                onClick={handleManualCheckin}
                                disabled={isCheckingIn}
                                className="bg-[#D75931] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#C74A21] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCheckingIn ? "กำลังเช็คอิน..." : "เช็คอิน"}
                            </button>
                        )}
                    </div>

                    {/* Auto check-in indicator */}
                    {!status.checked_in_today && onAutoCheckin && (
                        <p className="text-[#51433A] text-xs italic">
                            หรือเล่นเกมเพื่อเช็คอินอัตโนมัติ
                        </p>
                    )}
                </div>
            </div>

            {/* Calendar Modal */}
            {showCalendar && (
                <CalendarModal
                    userId={userId}
                    onClose={() => setShowCalendar(false)}
                />
            )}

            {/* Notification */}
            {notification && (
                <StreakNotification
                    notification={notification}
                    onClose={() => setNotification(null)}
                />
            )}
        </>
    );
}
