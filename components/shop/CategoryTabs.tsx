"use client";

import { Palette, User } from "lucide-react";
import type { ShopItem } from "@/types";

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  items?: ShopItem[];
}

export default function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  // Fixed categories for avatar and theme only
  const categories = [
    {
      id: "avatar",
      name: "รูปโปรไฟล์",
      icon: User,
    },
    {
      id: "theme",
      name: "ธีมสี",
      icon: Palette,
    }
  ];

  return (
    <div className="flex justify-center px-4 py-2">
      <div className="inline-flex gap-2 p-1 bg-gray-medium rounded-2xl">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-base
                whitespace-nowrap transition-all duration-200 min-h-[44px] min-w-fit
                focus:outline-none focus:ring-2 focus:ring-orange-action/50 focus:ring-offset-2
                ${isActive
                  ? "bg-white text-orange-action shadow-sm"
                  : "text-gray-text hover:text-brown-light"
                }
              `}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="select-none">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
