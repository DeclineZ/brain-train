"use client";

import { Coins } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserBalance } from "@/lib/server/shopAction";

interface BalanceDisplayProps {
  userId: string | null;
  className?: string;
}

export default function BalanceDisplay({ userId, className = "" }: BalanceDisplayProps) {
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!userId) {
      setBalance({ balance: 0, updated_at: new Date().toISOString() });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/shop?userId=${userId}`);
      const result = await response.json();

      if (result.balance) {
        setBalance(result.balance);
      } else {
        console.error("Failed to fetch balance:", result.error);
        setBalance({ balance: 0, updated_at: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Balance fetch error:", error);
      setBalance({ balance: 0, updated_at: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  // Listen for custom event to refresh balance
  useEffect(() => {
    const handleBalanceUpdate = () => {
      fetchBalance();
    };

    window.addEventListener('balanceUpdate', handleBalanceUpdate);
    return () => window.removeEventListener('balanceUpdate', handleBalanceUpdate);
  }, [userId]);

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-yellow-highlight2 to-yellow-highlight rounded-2xl p-6 shadow-lg ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-12 h-12 bg-white/30 rounded-full"></div>
            <div className="h-8 bg-white/30 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-yellow-highlight2 to-yellow-highlight rounded-2xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-[var(--color-balance-icon-bg)] p-3 rounded-full">
            <Coins className="w-8 h-8 text-[var(--color-balance-icon)]" />
          </div>
          <div>
            <p className="text-[var(--color-balance-label)] text-lg font-medium">เหรียญของคุณ</p>
            <p className="text-[var(--color-balance-text)] text-3xl font-bold">
              {balance?.balance.toLocaleString('th-TH') || 0}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
