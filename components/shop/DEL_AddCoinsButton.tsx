"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

interface AddCoinsButtonProps {
  userId: string | null;
  onBalanceUpdate?: (newBalance: number) => void;
}

export default function AddCoinsButton({ userId, onBalanceUpdate }: AddCoinsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddCoins = async () => {
    if (!userId) {
      showToast("กรุณาเข้าสู่ระบบก่อน", "error");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/DEL_add-coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          amount: 100,
          reason: "เติมเหรียญ 100 คะแนน"
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showToast("เติมเหรียญสำเร็จ! +100 เหรียญ", "success");
        
        // Update balance if callback provided
        if (onBalanceUpdate) {
          onBalanceUpdate(result.new_balance);
        }
        
        // Trigger balance update for other components
        window.dispatchEvent(new Event('balanceUpdate'));
      } else {
        showToast(result.error || "เกิดข้อผิดพลาดในการเติมเหรียญ", "error");
      }
    } catch (error) {
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Simple toast function
  const showToast = (message: string, type: "success" | "error") => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg text-white font-medium ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  return (
    <button
      onClick={handleAddCoins}
      disabled={isLoading || !userId}
      className={`
        w-full py-3 px-4 rounded-xl font-semibold text-lg transition-all duration-200
        flex items-center justify-center gap-2 min-h-[52px]
        ${isLoading || !userId
          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg active:scale-95"
        }
      `}
    >
      {isLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>กำลังเติมเหรียญ...</span>
        </>
      ) : (
        <>
          <Plus className="w-5 h-5" />
          <span>เติมเหรียญ +100 (temporary)</span>
        </>
      )}
    </button>
  );
}
