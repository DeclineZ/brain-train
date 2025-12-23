"use client";

import { Grid3X3, Palette, User, Gift, Package, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { ShopItem } from "@/lib/server/shopAction";

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  items?: ShopItem[];
}

export default function CategoryTabs({ activeCategory, onCategoryChange, items = [] }: CategoryTabsProps) {
  const [categories, setCategories] = useState<Array<{
    id: string;
    name: string;
    icon: any;
    color: string;
  }>>([]);

  useEffect(() => {
    // Get unique item types from the items
    const uniqueTypes = [...new Set(items.map(item => item.type))];
    
    // Map item types to category configurations
    const typeConfig: Record<string, { name: string; icon: any; color: string }> = {
      powerup: { name: "พาวเวอร์อัพ", icon: Zap, color: "text-blue-600 border-blue-600" },
      theme: { name: "ธีม", icon: Palette, color: "text-purple-600 border-purple-600" },
      avatar: { name: "อวาตาร์", icon: User, color: "text-pink-600 border-pink-600" },
      bonus: { name: "โบนัส", icon: Gift, color: "text-green-600 border-green-600" },
      weapon: { name: "อาวุธ", icon: Package, color: "text-red-600 border-red-600" },
      consumable: { name: "สิ่งของ", icon: Package, color: "text-yellow-600 border-yellow-600" },
    };

    // Build categories array dynamically
    const dynamicCategories = [
      {
        id: "all",
        name: "ทั้งหมด",
        icon: Grid3X3,
        color: "text-[#5D4037] border-[#5D4037]"
      },
      ...uniqueTypes.map(type => ({
        id: type,
        name: typeConfig[type]?.name || type,
        icon: typeConfig[type]?.icon || Package,
        color: typeConfig[type]?.color || "text-gray-600 border-gray-600"
      }))
    ];

    setCategories(dynamicCategories);
  }, [items]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 -mx-1">
      {categories.map((category) => {
        const Icon = category.icon;
        const isActive = activeCategory === category.id;
        
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-lg
              whitespace-nowrap transition-all duration-200 min-h-[48px]
              border-2
              ${isActive
                ? `${category.color} bg-white shadow-md`
                : "text-[#8B5E3C] border-[#E5E5E5] bg-[#F9F9F9] hover:bg-[#F0F0F0]"
              }
            `}
          >
            <Icon className="w-5 h-5" />
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
