"use client";

import { useEffect, useState } from "react";
import { X, Trophy, Flame, Star, Coins } from "lucide-react";
import type { CheckinResult } from "@/types";

interface StreakNotificationProps {
  notification: CheckinResult;
  onClose: () => void;
}

export default function StreakNotification({ notification, onClose }: StreakNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto-close after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 10000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getStreakMilestone = (streak: number) => {
    if (streak === 1) return { icon: "🌱", message: "เริ่มต้นได้เยี่ยม!" };
    if (streak === 3) return { icon: "🔥", message: "3 วันติดต่อกัน!" };
    if (streak === 7) return { icon: "💪", message: "สัปดาห์แห่งความมุ่งมั่น!" };
    if (streak === 30) return { icon: "🏆", message: "เดือนแห่งความมุ่งมั่น!" };
    if (streak === 100) return { icon: "👑", message: "ระดับตำนาน!" };
    return { icon: "🔥", message: `${streak} วันติดต่อกัน!` };
  };

  const milestone = getStreakMilestone(notification.streak_count);

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="bg-white rounded-xl shadow-2xl border-2 border-orange-dark max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-dark to-orange-dark-2 px-4 py-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <span className="font-bold">เช็คอินสำเร็จ!</span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Main message */}
          <div className="text-center">
            <div className="text-3xl mb-2">{milestone.icon}</div>
            <h3 className="font-bold text-brown-900 text-lg">
              {milestone.message}
            </h3>
            <p className="text-brown-medium text-sm mt-1">
              {notification.message}
            </p>
          </div>

          {/* Streak info */}
          <div className="bg-tan-light rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-action" />
              <span className="text-sm font-medium text-brown-900">
                สตรีกปัจจุบัน
              </span>
            </div>
            <span className="text-xl font-bold text-orange-dark">
              {notification.streak_count}
            </span>
          </div>

          {/* Coin rewards */}
          {notification.coins_earned && (
            <div className="bg-green-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-900">
                    รับเหรียญรางวัล!
                  </span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  +{notification.coins_earned}
                </span>
              </div>
              
              {notification.base_amount && notification.multiplier && (
                <div className="text-xs text-green-700 text-center bg-green-100 rounded px-2 py-1">
                  {notification.base_amount} × {notification.multiplier}x = {notification.coins_earned} เหรียญ
                </div>
              )}
              
              {notification.new_balance !== undefined && (
                <div className="text-xs text-green-600 text-center">
                  ยอดเงินคงเหลือ: {notification.new_balance} เหรียญ
                </div>
              )}
            </div>
          )}

          {/* New badges */}
          {notification.new_badges.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-brown-900 flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-highlight" />
                ปลดล็อคเครื่องหมายใหม่!
              </p>
              <div className="space-y-1">
                {notification.new_badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 bg-yellow-50 rounded-lg p-2"
                  >
                    <span className="text-lg">{badge.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-brown-900">
                        {badge.name}
                      </p>
                      <p className="text-xs text-brown-medium">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keep going message */}
          <div className="text-center pt-2 border-t">
            <p className="text-xs text-brown-medium italic">
              {notification.streak_count < 7 
                ? "อีกไม่กี่วันจะถึงสัปดาห์แห่งความมุ่งมั่น!"
                : notification.streak_count < 30
                ? "อย่าหยุด! เดือนแห่งความมุ่งมั่นรออยู่!"
                : "คุณเป็นแรงบันดาลใจของผู้อื่น!"
              }
            </p>
          </div>
        </div>

        {/* Progress bar animation */}
        <div className="h-1 bg-gradient-to-r from-transparent via-orange-dark to-transparent animate-pulse"></div>
      </div>
    </div>
  );
}
