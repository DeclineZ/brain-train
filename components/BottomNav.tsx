"use client";

import { Grid3X3, Home, User, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  active?: "all" | "home" | "stats" | "shop";
}

export default function BottomNav({ active: propActive }: BottomNavProps) {
  const pathname = usePathname();

  // Determine active state based on prop or pathname fallback
  const currentPath = pathname?.split('/')[1] || 'home';
  const active = propActive || (currentPath === '' ? 'home' : currentPath);

  const navItems = [
    { id: "home", label: "หน้าหลัก", icon: Home, href: "/" },
    { id: "all", label: "ทุกเกม", icon: Grid3X3, href: "/allgames" },
    { id: "shop", label: "ร้านค้า", icon: Store, href: "/shop" },
    { id: "stats", label: "คุณ", icon: User, href: "/stats" },
  ];

  return (
    <>
      {/* Spacer to prevent content overlap */}
      <div className="h-24 md:h-28" aria-hidden="true" />

      <div className="fixed bottom-0 left-0 right-0 bg-cream border-t-2 border-gray-medium pb-safe pt-2 z-50">
        <div className="max-w-md mx-auto flex justify-around items-end h-16 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            // simplistic active check: exact match for ID or based on prop
            const isActive = active === item.id || (item.id === 'home' && pathname === '/') || (item.id === 'all' && pathname === '/allgames');

            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex flex-col items-center justify-center w-16 relative"
              >
                {/* Active Indicator / Icon Container */}
                <div className={`
                  transition-all duration-200 ease-out p-1 rounded-xl mb-1
                  ${isActive ? '-translate-y-1' : 'hover:-translate-y-0.5'}
                `}>
                  <Icon
                    className={`
                      w-7 h-7 transition-all duration-200
                      ${isActive
                        ? "text-orange-action fill-orange-action/20 stroke-[2.5px]"
                        : "text-gray-text stroke-2 group-hover:text-orange-action/70"
                      }
                    `}
                  />
                </div>

                {/* Label (Hidden on mobile) */}
                <span className={`
                  text-[10px] font-bold tracking-wide transition-colors hidden md:block
                  ${isActive ? "text-orange-action" : "text-gray-text group-hover:text-orange-action/70"}
                `}>
                  {item.label}
                </span>

                {/* Active underline indicator (Optional, Duolingo doesn't really have this but good for clarity) */}
                {/* {isActive && (
                  <div className="absolute -top-2 w-12 h-1 bg-blue rounded-full mx-auto" />
                )} */}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
