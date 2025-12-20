"use client";

import { User } from "lucide-react";
import { useState } from "react";
import ProfilePopup from "./ProfilePopup";

export default function TopCard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const weekDays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];
  const today = 4; // Friday

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

      {/* Week row */}
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

      {/* Progress bar */}
      <div className="bg-white/50 rounded-full h-3 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#D75931] to-[#E67E5A] rounded-full" style={{ width: "65%" }}></div>
      </div>
    </div>
    
    {/* Profile Popup */}
    <ProfilePopup 
      isOpen={isProfileOpen} 
      onClose={() => setIsProfileOpen(false)} 
    /></>
  );
}
