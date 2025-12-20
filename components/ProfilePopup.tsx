"use client";

import { LogOut, User, Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      onClose();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 m-4 min-w-[280px]">
        <div className="flex flex-col items-center">
          {/* Profile Icon */}
          <div className="w-20 h-20 bg-[#C3A37F] rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          
          <h3 className="text-lg font-semibold text-[#3C2924] mb-2">โปรไฟล์</h3>
          <p className="text-sm text-[#51433A] mb-6">จัดการบัญชีของคุณ</p>
          
          {/* Menu Items */}
          <div className="w-full space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#F5F0EB] transition-colors text-left">
              <Settings className="w-5 h-5 text-[#51433A]" />
              <span className="text-[#3C2924]">ตั้งค่า</span>
            </button>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors text-left"
            >
              <LogOut className="w-5 h-5 text-red-600" />
              <span className="text-red-600">ออกจากระบบ</span>
            </button>
          </div>
          
          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="mt-6 w-full px-4 py-2 bg-[#EADFD6] text-[#3C2924] rounded-lg hover:bg-[#D5C8BB] transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
