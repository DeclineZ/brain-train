"use client";

import { Flame, Star, Coins, Zap } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import TopBarMenu from "./TopBarMenu";

export default function TopBar() {
    const [streak, setStreak] = useState(0);
    const [coinBalance, setCoinBalance] = useState(0);
    const [stars, setStars] = useState(12); // Mocked - could be fetched from user profile later

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
        <div className="w-full bg-[#C8A27A] h-16 flex items-center justify-between px-4 sticky top-0 z-50 border-b border-[#a68b6c]">
            {/* Left side: Logo (Desktop only) */}
            <div className="flex-1 flex items-center">
                <div className="hidden md:flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white font-sans">
                        NameArai
                    </span>
                </div>
            </div>

            {/* Center Stats */}
            <div className="flex items-center gap-6">
                {/* Streak */}
                <div className="flex items-center gap-1.5">
                    <Flame className="w-6 h-6 text-orange-600 fill-orange-500" />
                    <span className="font-bold text-lg text-white drop-shadow-sm">{streak}</span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1.5">
                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-lg text-white drop-shadow-sm">{stars}</span>
                </div>

                {/* Coins */}
                <div className="flex items-center gap-1.5">
                    <Coins className="w-6 h-6 text-yellow-500 fill-yellow-400" />
                    <span className="font-bold text-lg text-white drop-shadow-sm">{coinBalance}</span>
                </div>
            </div>

            {/* Right Side Options */}
            <div className="flex-1 flex justify-end">
                <TopBarMenu />
            </div>
        </div>
    );
}
