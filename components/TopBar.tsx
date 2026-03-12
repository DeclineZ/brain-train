"use client";

import { Flame, Star, Coins } from "lucide-react";
import { useEffect, useState } from "react";
import TopBarMenu from "./TopBarMenu";
import Image from "next/image";

export default function TopBar() {
    const [streak, setStreak] = useState(0);
    const [coinBalance, setCoinBalance] = useState(0);
    const [stars, setStars] = useState(0); // Fetched from user profile later

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch user data via API
                const response = await fetch('/api/user/stats');
                const result = await response.json();

                if (result.streak !== undefined) setStreak(result.streak);
                if (result.balance !== undefined) setCoinBalance(result.balance);
                if (result.stars !== undefined) setStars(result.stars);
            } catch (error) {
                console.error('Failed to fetch user stats:', error);
            }
        };

        fetchUserData();

        // Listen for balance updates
        const handleBalanceUpdate = () => {
            fetchUserData();
        };

        window.addEventListener('balanceUpdate', handleBalanceUpdate);

        return () => {
            window.removeEventListener('balanceUpdate', handleBalanceUpdate);
        };
    }, []);

    return (
        <div className="w-full bg-tan h-16 flex items-center justify-between px-4 sticky top-0 z-50 border-b border-brown-600">
            {/* Left side: Logo (Desktop only) */}
            <div className="flex-1 flex items-center">
                <div className="hidden md:flex items-center gap-2.5 group cursor-pointer transition-transform duration-300 hover:-translate-y-0.5">
                    {/* Native Logo */}
                    <div className="relative w-10 h-10 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                        <Image
                            src="/logo.webp"
                            alt="RunJum Logo"
                            fill
                            className="object-contain drop-shadow-md"
                        />
                    </div>
                    {/* Typography */}
                    <span 
                        className="font-bold text-[1.35rem] tracking-tight text-[var(--color-topbar-text)] drop-shadow-sm transition-colors duration-300 font-sans"
                    >
                        RunJum
                    </span>
                </div>
            </div>

            {/* Center Stats */}
            <div className="flex items-center gap-6">
                {/* Streak */}
                <div className="flex items-center gap-1.5">
                    <Flame className="w-6 h-6 text-[var(--icon-primary-stroke)] fill-[var(--icon-primary-fill)]" />
                    <span className="font-bold text-lg text-[var(--color-topbar-text,#FFFFFF)] drop-shadow-sm">{streak}</span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1.5">
                    <Star className="w-6 h-6 text-[var(--icon-secondary-stroke)] fill-[var(--icon-secondary-fill)]" />
                    <span className="font-bold text-lg text-[var(--color-topbar-text,#FFFFFF)] drop-shadow-sm">{stars}</span>
                </div>

                {/* Coins */}
                <div className="flex items-center gap-1.5">
                    <Coins className="w-6 h-6 text-[var(--icon-secondary-stroke)] fill-[var(--icon-secondary-fill)]" />
                    <span className="font-bold text-lg text-[var(--color-topbar-text,#FFFFFF)] drop-shadow-sm">{coinBalance}</span>
                </div>
            </div>

            {/* Right Side Options */}
            <div className="flex-1 flex justify-end">
                <TopBarMenu />
            </div>
        </div>
    );
}
