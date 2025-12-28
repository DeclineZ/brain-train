"use client";

import { Coins, Lock, Check } from "lucide-react";
import type { ShopItemWithOwnership } from "@/types";

interface ShopItemCardProps {
  item: ShopItemWithOwnership;
  userBalance: number;
  onPurchase: (item: ShopItemWithOwnership) => void;
  onUseAvatar?: (item: ShopItemWithOwnership) => void;
  onEquip?: (item: ShopItemWithOwnership) => void;
  isLoading?: boolean;
  currentAvatar?: string | null;
}

export default function ShopItemCard({ item, userBalance, onPurchase, onUseAvatar, onEquip, isLoading = false, currentAvatar }: ShopItemCardProps) {
  const canAfford = userBalance >= item.price;
  const isLocked = !item.isOwned;
  const isAvatar = item.type === 'avatar';
  const isCurrentlyEquipped = isAvatar && currentAvatar === item.item_key;
  const canUseAvatar = isAvatar && !isLocked && !!onUseAvatar && !isCurrentlyEquipped;
  const isDisabled = isLoading || ((isLocked && !canAfford) || (!isLocked && !onEquip) && !canUseAvatar);

  // Get icon based on item type (fallback when no image is available)
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

  // Check if item has an image and use it, otherwise fallback to emoji
  const itemImage = item.image;
  const hasImage = itemImage && itemImage.trim() !== '';

  const handleCardClick = () => {
    if (isDisabled) return;

    if (isLocked) {
      onPurchase(item);
    } else if (item.isOwned && onEquip) {
      onEquip(item);
    }
  };

  const handleUseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canUseAvatar && onUseAvatar) {
      onUseAvatar(item);
    }
  };

  return (
    <div
      className={`
        bg-white border border-brown-border rounded-2xl shadow-sm overflow-hidden 
        transition-all duration-200 hover:shadow-md active:scale-98
        ${isLocked && !isDisabled ? 'cursor-pointer' : 'cursor-default'}
      `}
      onClick={handleCardClick}
    >
      {/* Preview Area */}
      <div className="relative h-32 bg-gradient-to-br from-tan-light to-yellow-light p-4">
        {/* Subtle highlight gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>

        {/* Item Icon/Image */}
        <div className="relative z-10 flex items-center justify-center h-full w-full px-4">
          {item.name.toLowerCase().includes("pastel") && item.type === "theme" ? (
            <div className="w-full h-20 rounded-lg bg-[#F0F0F0] border border-gray-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1/3 bg-[#FFF9C4]"></div>
              <div className="absolute top-1/3 left-0 w-full h-1/3 bg-[#AED581]"></div>
              <div className="absolute bottom-0 left-0 w-full h-1/3 bg-[#81D4FA]"></div>
            </div>
          ) : hasImage ? (
            <img
              src={`/${itemImage}`}
              alt={item.name}
              className="max-w-full max-h-full object-contain rounded-lg"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
          ) : (
            <div className="text-5xl filter drop-shadow-sm">
              {getItemIcon(item.type)}
            </div>
          )}
          {/* Hidden Fallback for Image Error */}
          {hasImage && (
            <div className="hidden text-5xl filter drop-shadow-sm">
              {getItemIcon(item.type)}
            </div>
          )}
        </div>

        {/* Lock Badge for Locked Items */}
        {isLocked && (
          <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full border border-brown-border flex items-center justify-center shadow-sm">
            <Lock className="w-4 h-4 text-brown-800" />
          </div>
        )}

        {/* Equipped Badge for Currently Equipped Avatar */}
        {isCurrentlyEquipped && (
          <div className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full border border-blue-600 flex items-center justify-center shadow-sm">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-bold text-brown-900 text-base leading-tight line-clamp-2">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-brown-light text-sm leading-relaxed line-clamp-2 mt-1">
              {item.description}
            </p>
          )}
        </div>

        {/* Meta Row */}
        <div className="flex items-center justify-between">
          {isLocked ? (
            // Price for locked items
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-orange-action" />
              <span className="text-lg font-bold text-orange-action">{item.price}</span>
            </div>
          ) : (
            // Ownership status for owned items
            <div className="flex items-center gap-2 text-green-success">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">เป็นเจ้าของแล้ว</span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isDisabled) return;

            if (isLocked) {
              onPurchase(item);
            } else if (canUseAvatar) {
              handleUseClick(e);
            } else if (item.isOwned && onEquip) {
              onEquip(item);
            }
          }}
          disabled={isDisabled}
          className={`
            w-full py-2.5 px-4 rounded-xl font-semibold text-base transition-all duration-200
            flex items-center justify-center gap-2 min-h-[44px] focus:outline-none 
            focus:ring-2 focus:ring-orange-action/50 focus:ring-offset-2
            ${isLocked && !isDisabled
              ? "bg-orange-action hover:bg-orange-hover text-white shadow-sm hover:shadow-md active:scale-95"
              : canUseAvatar
                ? "bg-green-success hover:bg-green-600 text-white shadow-sm hover:shadow-md active:scale-95"
                : isCurrentlyEquipped
                  ? "bg-blue-500 text-white border border-blue-600 cursor-default"
                  : item.isOwned
                    ? "bg-brown-light hover:bg-brown-medium text-white border border-brown-light hover:border-brown-medium"
                    : "bg-gray-medium text-gray-text cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>กำลังดำเนินการ...</span>
            </>
          ) : isLocked ? (
            <>
              <span>{!canAfford ? "เหรียญไม่พอ" : "ซื้อเลย"}</span>
            </>
          ) : canUseAvatar ? (
            <>
              <span>ใช้</span>
            </>
          ) : isCurrentlyEquipped ? (
            <>
              <span>กำลังใช้งาน</span>
            </>
          ) : (
            <>
              <span>เป็นเจ้าของแล้ว</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
