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
    initialData?: CheckinStatus | null;
}

export default function StreakBadge({
    userId,
    onAutoCheckin,
    initialData,
}: StreakBadgeProps) {
    const [status, setStatus] = useState<CheckinStatus | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [notification, setNotification] = useState<CheckinResult | null>(
        null
    );

    // Fetch check-in status on mount only if no initial data
    useEffect(() => {
        if (!initialData) {
            fetchStatus();
        }
    }, [userId, initialData]);

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
                            weekly_progress: {
                                ...prev.weekly_progress,
                                days_checked_in: prev.weekly_progress.days_checked_in + 1,
                                week_days: prev.weekly_progress.week_days.map(d =>
                                    d.is_today ? { ...d, checked_in: true } : d
                                )
                            }
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
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 animate-pulse">
                <div className="h-6 bg-gray-300 rounded mb-3"></div>
                <div className="h-4 bg-gray-300 rounded mb-3"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                <p className="text-brown-medium text-sm">
                    ไม่สามารถโหลดข้อมูลสตรีก
                </p>
            </div>
        );
    }

    const getFireColor = (checkedIn: boolean) => {
        if (checkedIn) return "text-orange-500 fill-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]";
        return "text-gray-300 fill-gray-200";
    };

    const getFireSize = (streak: number) => {
        if (streak >= 30) return "w-8 h-8";
        if (streak >= 7) return "w-7 h-7";
        return "w-6 h-6";
    };

    const weeklyProgress = status.weekly_progress;

    return (
        <>
            {/* Desktop View (Mobile-style) */}
            <div className="hidden md:block bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm transition-all hover:bg-white/70">
                {/* Header with Streak Info and Calendar Button */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Flame Icon */}
                        <div className="w-10 h-10 flex items-center justify-center">
                            <Flame
                                className={`transition-all duration-500 ${getFireSize(status.current_streak)} ${getFireColor(status.checked_in_today)} ${status.checked_in_today ? "animate-flame-wind drop-shadow-[0_-5px_10px_rgba(249,115,22,0.4)]" : ""
                                    }`}
                            />
                        </div>

                        {/* Streak Number */}
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-brown-darkest leading-none drop-shadow-sm">
                                {status.current_streak}
                            </span>
                            <span className="text-sm font-bold text-brown-mute">วัน</span>
                        </div>
                    </div>

                    {/* Calendar Button */}
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="bg-red-100 text-red-500 hover:bg-red-200 text-xs px-2"
                            onClick={() => {
                                setNotification({
                                    success: true,
                                    streak_count: 3,
                                    new_badges: [{
                                        id: 'three_day_streak',
                                        name: 'เครื่องร้อน',
                                        description: 'เช็คอินติดต่อกัน 3 วัน',
                                        icon: '🔥',
                                        threshold: 3,
                                        metric: 'STREAK',
                                        unlocked: true
                                    }],
                                    message: 'ทดสอบ: เช็คอินสำเร็จ! สตรีกปัจจุบัน 3 วัน 🔥'
                                });
                            }}
                        >
                            Test 3d
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="bg-green-100 text-green-600 hover:bg-green-200 text-xs px-2"
                            onClick={() => {
                                setNotification({
                                    success: true, // Should logic be modified for strictness? Mock payload assumes valid
                                    streak_count: 1,
                                    new_badges: [{
                                        id: 'first_checkin',
                                        name: 'การเริ่มต้น',
                                        description: 'เช็คอินครั้งแรก',
                                        icon: '🌱',
                                        threshold: 1,
                                        metric: 'TOTAL',
                                        unlocked: true
                                    }],
                                    message: 'ทดสอบ: เริ่มต้นได้เยี่ยม!'
                                });
                            }}
                        >
                            Test 1st
                        </Button>
                        <Button
                            variant={"outline"}
                            onClick={() => setShowCalendar(true)}
                            className="p-3 h-auto rounded-xl border-2 border-tan-light hover:bg-tan-light hover:text-brown-darkest transition-all text-brown-mute"
                        >
                            <Calendar className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Mobile-style Weekly Progress */}
                <div className="flex w-full items-center mb-4">
                    {weeklyProgress.week_days.map((day, index) => {
                        const isCompleted = day.checked_in;
                        const isToday = day.is_today;
                        const nextDay = weeklyProgress.week_days[index + 1];
                        const isNextCompleted = nextDay?.checked_in;

                        // Logic for connection line color:
                        // Connect if BOTH current and next are checked in.
                        const isConnected = isCompleted && isNextCompleted;

                        return (
                            <div
                                key={index}
                                className="flex-1 relative flex flex-col items-center gap-1 group"
                                onClick={(e) => {
                                    if (isToday && !isCompleted) {
                                        e.stopPropagation();
                                        handleManualCheckin();
                                    }
                                }}
                            >
                                {/* Connection Line (To the right, except for last item) */}
                                {index < weeklyProgress.week_days.length - 1 && (
                                    <div
                                        className={`absolute top-[36px] left-[50%] w-full h-1 rounded-full -z-10
                                            ${isConnected ? "bg-orange-dark/80" : "bg-brown-border/30"}
                                        `}
                                    />
                                )}

                                {/* Today Indicator */}
                                {isToday && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brown-darkest text-white text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap opacity-90 font-bold tracking-wide">
                                        วันนี้
                                    </div>
                                )}

                                <span className={`h-4 flex items-center text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-orange-dark" : "text-brown-mute/70"}`}>
                                    {day.day_name}
                                </span>

                                <div className={`h-8 w-8 flex items-center justify-center transition-all duration-300 relative z-10 ${isToday && !isCompleted ? "cursor-pointer hover:scale-110" : ""}`}
                                >
                                    {isCompleted ? (
                                        <div className="w-8 h-8 flex items-center justify-center">
                                            <Flame className="w-full h-full text-orange-500 fill-orange-500 drop-shadow-sm animate-flame-wind" />
                                        </div>
                                    ) : isToday ? (
                                        <div className="w-7 h-7 bg-tan-light border-2 border-orange-dark rounded-full shadow-md animate-pulse flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 bg-orange-dark rounded-full" />
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 bg-white/80 rounded-full border border-brown-border flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-brown-border/50 rounded-full" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Section: Action and Status */}
                <div className="flex items-center justify-between pt-2 border-t border-brown-border/20">
                    <p className="text-brown-medium text-sm">
                        {status.checked_in_today
                            ? "✓ เช็คอินแล้ววันนี้"
                            : "ยังไม่ได้เช็คอินวันนี้"}
                    </p>

                    {!status.checked_in_today && (
                        <button
                            onClick={handleManualCheckin}
                            disabled={isCheckingIn}
                            className="bg-orange-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCheckingIn ? "กำลังเช็คอิน..." : "เช็คอิน"}
                        </button>
                    )}
                </div>

                {/* Auto check-in indicator */}
                {!status.checked_in_today && onAutoCheckin && (
                    <p className="text-brown-medium text-xs italic text-center mt-2">
                        หรือเล่นเกมเพื่อเช็คอินอัตโนมัติ
                    </p>
                )}
            </div>
            {/* Mobile View (Compact Mode) */}
            <div
                className="md:hidden block bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm transition-all hover:bg-white/70 active:scale-[0.99] cursor-pointer"
                onClick={() => setShowCalendar(true)}
            >
                <div className="flex w-full items-center">
                    {weeklyProgress.week_days.map((day, index) => {
                        const isCompleted = day.checked_in;
                        const isToday = day.is_today;
                        const nextDay = weeklyProgress.week_days[index + 1];
                        const isNextCompleted = nextDay?.checked_in;

                        // Logic for connection line color:
                        // Connect if BOTH current and next are checked in.
                        const isConnected = isCompleted && isNextCompleted;

                        return (
                            <div
                                key={index}
                                className="flex-1 relative flex flex-col items-center gap-1 group"
                                onClick={(e) => {
                                    if (isToday && !isCompleted) {
                                        e.stopPropagation();
                                        handleManualCheckin();
                                    }
                                }}
                            >
                                {/* Connection Line (To the right, except for last item) */}
                                {index < weeklyProgress.week_days.length - 1 && (
                                    <div
                                        className={`absolute top-[36px] left-[50%] w-full h-1 rounded-full -z-10
                                            ${isConnected ? "bg-orange-dark/80" : "bg-brown-border/30"}
                                        `}
                                    />
                                )}

                                {/* Today Indicator */}
                                {isToday && (
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brown-darkest text-white text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap opacity-90 font-bold tracking-wide">
                                        วันนี้
                                    </div>
                                )}

                                <span className={`h-4 flex items-center text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-orange-dark" : "text-brown-mute/70"}`}>
                                    {day.day_name}
                                </span>

                                <div className={`h-8 w-8 flex items-center justify-center transition-all duration-300 relative z-10`}
                                >
                                    {isCompleted ? (
                                        <div className="w-8 h-8 flex items-center justify-center">
                                            <Flame className="w-full h-full text-orange-500 fill-orange-500 drop-shadow-sm animate-flame-wind" />
                                        </div>
                                    ) : isToday ? (
                                        <div className="w-7 h-7 bg-tan-light border-2 border-orange-dark rounded-full shadow-md animate-pulse flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 bg-orange-dark rounded-full" />
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 bg-white/80 rounded-full border border-brown-border flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-brown-border/50 rounded-full" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
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
