"use client";

import { Grid3X3, Home, BarChart3 } from "lucide-react";
import Link from "next/link";

interface BottomNavProps {
  active?: "all" | "home" | "stats";
}

export default function BottomNav({ active = "home" }: BottomNavProps) {
  const navItems = [
    { id: "all", label: "ทุกเกม", icon: Grid3X3 },
    { id: "home", label: "หน้าหลัก", icon: Home },
    { id: "stats", label: "สถิติ", icon: BarChart3 },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#C3A37F] px-4 py-2 safe-area-inset-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          
          return (
            <Link 
              key={item.id}
              href={item.id === "all" ? "/allgames" : item.id === "stats" ? "/stats" : "/"}
              className={`flex flex-col items-center text-xs ${
                isActive
                  ? "text-[#D75931] font-semibold"
                  : "text-[#51433A]"
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
