"use client";

import { User } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import ProfilePopup from "./ProfilePopup";
import StreakBadge from "./DailyStreak/StreakBadge";

export default function TopCard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const weekDays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const today = 4; // Friday

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error("Error getting current user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#EADFD6] rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-8 bg-gray-300 rounded mb-4"></div>
        <div className="h-6 bg-gray-300 rounded mb-4"></div>
        <div className="h-3 bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (<>
    <div className="bg-[#EADFD6] rounded-2xl p-6 shadow-sm">
      {/* Header with welcome and user icon */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3C2924]">ยินดีต้อนรับ!</h1>
          <p className="text-[#51433A] mt-1">เริ่มฝึกสมองของคุณวันนี้</p>
        </div>
        <button
          onClick={() => setIsProfileOpen(true)}
          className="w-12 h-12 bg-[#C3A37F] rounded-full flex items-center justify-center hover:bg-[#B39370] transition-colors cursor-pointer"
        >
          <User className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Streak Badge - replacing week row */}
      {userId && (
          <StreakBadge 
            userId={userId}
            onAutoCheckin={() => {
              // This will be called when auto check-in happens from games
              console.log("Auto check-in triggered from game completion");
            }}
          />
      )}

      {/* Original week row - shown if no user */}
      {!userId && (
        <div className="flex gap-2 mb-4">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`flex-1 text-center py-2 rounded-lg ${
                index === today
                  ? "bg-[#D75931] text-white font-semibold"
                  : "bg-white/50 text-[#51433A]"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      )}

    </div>
    
    {/* Profile Popup */}
    <ProfilePopup 
      isOpen={isProfileOpen} 
      onClose={() => setIsProfileOpen(false)} 
    /></>
  );
}
