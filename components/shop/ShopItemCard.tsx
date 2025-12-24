"use client";

import { Coins, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { ShopItem } from "@/lib/server/shopAction";

interface ShopItemCardProps {
  item: ShopItem;
  userBalance: number;
  onPurchase: (item: ShopItem) => void;
  isLoading?: boolean;
}

export default function ShopItemCard({ item, userBalance, onPurchase, isLoading = false }: ShopItemCardProps) {
  const canAfford = userBalance >= item.price;
  const isDisabled = !canAfford || isLoading;

  const categoryColors: Record<string, string> = {
    powerup: "bg-blue-100 text-blue-800 border-blue-200",
    theme: "bg-purple-100 text-purple-800 border-purple-200",
    avatar: "bg-pink-100 text-pink-800 border-pink-200",
    bonus: "bg-green-100 text-green-800 border-green-200",
    weapon: "bg-red-100 text-red-800 border-red-200",
    consumable: "bg-yellow-100 text-yellow-800 border-yellow-200",
    default: "bg-gray-100 text-gray-800 border-gray-200"
  };

  const categoryNames: Record<string, string> = {
    powerup: "พาวเวอร์อัพ",
    theme: "ธีม",
    avatar: "อวาตาร์",
    bonus: "โบนัส",
    weapon: "อาวุธ",
    consumable: "สิ่งของ",
    default: "อื่นๆ"
  };

  // Get icon based on item type
  const getItemIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      powerup: "💡",
      theme: "🎨",
      avatar: "👤",
      bonus: "🎁",
      weapon: "⚔️",
      consumable: "🧪",
      default: "📦"
    };
    return iconMap[type] || iconMap.default;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-medium overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      {/* Item Header */}
      <div className="bg-gradient-to-r from-tan-light to-yellow-light p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-4xl">{getItemIcon(item.type)}</div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[item.type]}`}>
            {categoryNames[item.type] || categoryNames.default}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-brown-900 mb-1">{item.name}</h3>
        <p className="text-brown-800 text-sm leading-relaxed">{item.description}</p>
      </div>

      {/* Price and Purchase Section */}
      <div className="p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-orange-action" />
            <span className="text-2xl font-bold text-orange-action">{item.price}</span>
            <span className="text-brown-light text-sm">เหรียญ</span>
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={() => onPurchase(item)}
          disabled={isDisabled}
          className={`
            w-full py-2 px-4 rounded-xl font-semibold text-lg transition-all duration-200
            flex items-center justify-center gap-2 min-h-[44px]
            ${isDisabled
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : canAfford
                ? "bg-orange-action hover:bg-orange-hover text-white shadow-md hover:shadow-lg active:scale-95"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>กำลังดำเนินการ...</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              <span>
                {!canAfford ? "เหรียญไม่พอ" : "ซื้อเลย"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
