"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Flame, Star, Coins, Zap, Trophy, Map, Brain, Eye, Target, Heart, Award } from "lucide-react";
import Image from "next/image";
import BadgesSection from "./BadgesSection";
import TopBarMenu from "@/components/TopBarMenu";
import AvatarEditModal from "@/components/AvatarEditModal";
import { getAvatarSrc } from "@/lib/utils";
import { useTheme } from "@/app/providers/ThemeProvider";
import type { ShopItemWithOwnership } from "@/types";
import { Palette } from "lucide-react";

interface ProfileData {
  full_name: string;
  avatar_url: string;
  created_at: string;
  global_planning: number;
  global_memory: number;
  global_visual: number;
  global_focus: number;
  global_speed: number;
  global_emotion: number;
  active_theme_id?: string;
}

interface StatsPageClientProps {
  profile: ProfileData;
  balance: number;
  stars: number;
  checkinStatus: any;
  badges: any[];
  userId: string;
  ownedThemes: ShopItemWithOwnership[];
}

export default function StatsPageClient({
  profile,
  balance,
  stars,
  checkinStatus,
  badges,
  userId,
  ownedThemes

}: StatsPageClientProps) {
  const { theme, setTheme } = useTheme();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(profile?.avatar_url || null);

  // Mock total XP since we don't have a direct field for it yet, or use sum of stats
  const cognitiveStats = [
    { key: "global_planning", label: "การวางแผน", color: "bg-green", icon: Map, val: profile?.global_planning || 0 },
    { key: "global_memory", label: "ความจำ", color: "bg-yellow", icon: Brain, val: profile?.global_memory || 0 },
    { key: "global_visual", label: "มิติสัมพันธ์", color: "bg-blue", icon: Eye, val: profile?.global_visual || 0 },
    { key: "global_focus", label: "สมาธิ", color: "bg-red", icon: Target, val: profile?.global_focus || 0 },
    { key: "global_speed", label: "ความเร็ว", color: "bg-blue-dark", icon: Zap, val: profile?.global_speed || 0 },
    { key: "global_emotion", label: "การควบคุมอารมณ์", color: "bg-purple", icon: Heart, val: profile?.global_emotion || 0 },
  ];

  // Helper to format join date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(date);
  };

  // Calculate scaled score: (Stat * 15) + 500
  const getScaledScore = (val: number) => Math.round((val * 15) + 500);



  const handleAvatarSelect = async (avatarId: string) => {
    if (isUpdatingAvatar) return;

    setIsUpdatingAvatar(true);
    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl: avatarId }),
      });

      const result = await response.json();

      if (result.ok) {
        setCurrentAvatar(avatarId);
        // Close modal after successful update
        setTimeout(() => {
          setIsAvatarModalOpen(false);
        }, 500);
      } else {
        console.error('Avatar update failed:', result.error);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Avatar update error:', error);
      // You could show a toast notification here
    } finally {
      setIsUpdatingAvatar(false);
    }
  };
  // Determine effective theme key from profile or local state
  // We need to map the DB's active_theme_id (UUID) to our CSS theme key (e.g. "pastel")
  const getThemeKeyFromId = (id: string | undefined | null) => {
    if (!id || id === "default") return "default";

    // Find the item in ownedThemes
    const item = ownedThemes.find(i => i.id === id);
    if (!item) return "default";

    // Map Name/Type to CSS Key
    if (item.item_key === "theme-pastel" || item.name.includes("Pastel")) return "pastel";
    if (item.item_key === "theme-neon" || item.name.includes("Neon") || item.name.includes("Dark")) return "neon";

    // Fallback: if we named it 'theme_something', use that
    // But since we have UUIDs, we rely on Name mapping for now.
    return "default";
  };

  // Sync ThemeProvider with Profile on mount/update
  useEffect(() => {
    if (profile?.active_theme_id) {
      const expectedTheme = getThemeKeyFromId(profile.active_theme_id);
      if (theme !== expectedTheme) {
        setTheme(expectedTheme as "default" | "pastel" | "neon");
      }
    }
  }, [profile?.active_theme_id, ownedThemes]);


  const handleThemeSelect = async (themeId: string) => {
    // If selecting default
    if (themeId === "default") {
      if (theme === "default") return;

      setIsUpdatingTheme(true);
      try {
        const response = await fetch('/api/user/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId: "default" }),
        });
        if (response.ok) setTheme("default");
      } catch (e) { console.error(e) }
      finally { setIsUpdatingTheme(false); }
      return;
    }

    // Selecting a paid theme
    const visualKey = getThemeKeyFromId(themeId); // Maps UUID -> "pastel" | "neon"

    // Don't update if already visually set (though we might want to ensure DB matches)
    // But let's allow it to ensure DB consistency

    setIsUpdatingTheme(true);
    try {
      const response = await fetch('/api/user/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId: themeId }), // Save UUID to DB
      });

      const result = await response.json();

      if (result.ok) {
        setTheme(visualKey as "default" | "pastel" | "neon");
        // Optional: Show toast
      } else {
        console.error('Theme update failed:', result.error);
      }
    } catch (error) {
      console.error('Theme update error:', error);
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-32">
      {/* Rustic Header Section - Matches TopCard style */}
      <div className="bg-tan-light border-b-4 border-brown-lightest pt-8 pb-10 px-4 rounded-b-[40px] shadow-sm">
        <div className="max-w-2xl mx-auto flex items-start gap-6">
          <div
            className="w-24 h-24 relative rounded-full border-4 border-white shadow-md overflow-hidden bg-brown-lightest flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setIsAvatarModalOpen(true)}
          >
            {currentAvatar ? (
              <Image
                src={getAvatarSrc(currentAvatar)}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <span className="text-4xl font-bold">{profile?.full_name?.charAt(0) || "?"}</span>
              </div>
            )}

            {/* Hover indicator */}
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white/90 rounded-full p-2">
                <svg className="w-6 h-6 text-brown-darkest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex-1 pt-1">
            <h1 className="text-2xl font-bold text-brown-darkest mb-1 drop-shadow-sm">{profile?.full_name || "Guest User"}</h1>
            <p className="text-brown-medium font-medium flex items-center gap-2 text-sm">
              <span>เข้าร่วมเมื่อ {formatDate(profile.created_at)}</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="Thailand">🇹🇭</span>
            </div>
          </div>

          {/* Settings Menu */}
          <div className="ml-auto mt-3">
            <TopBarMenu variant="dark" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-8">
        {/* Quick Stats Grid - Rustic Board */}
        <section className="relative">
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_var(--shadow-card-color)] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <h2 className="text-xl font-bold text-brown-800 mb-4 flex items-center gap-2">
                สถิติการฝึก
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Streak */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Flame className="w-8 h-8 text-orange-600 fill-orange-500" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{checkinStatus?.current_streak || 0}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">สตรีกวัน</div>
                  </div>
                </div>

                {/* Total XP / Stars */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Star className="w-8 h-8 text-[var(--icon-secondary-stroke)] fill-[var(--icon-secondary-fill)]" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{stars}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">คะแนนสะสม</div>
                  </div>
                </div>

                {/* Coins */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Coins className="w-8 h-8 text-[var(--icon-secondary-stroke)] fill-[var(--icon-secondary-fill)]" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{balance}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">เหรียญ</div>
                  </div>
                </div>

                {/* Total Badges - Replaced League */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Award className="w-8 h-8 text-[var(--color-yellow-highlight2)] fill-[var(--color-yellow-highlight)]" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">
                      {badges.filter(b => b.unlocked).length}
                    </div>
                    <div className="text-xs text-brown-light font-bold uppercase">เหรียญรางวัล</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cognitive Stats Chart - Rustic Board */}
        <section className="relative">
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_var(--shadow-card-color)] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-brown-800">ทักษะสมอง</h2>
              </div>

              <div className="space-y-4">
                {cognitiveStats.map((stat) => (
                  <div key={stat.key} className="group">
                    <div className="flex justify-between items-end text-sm font-bold text-brown-light mb-1">
                      <div className="flex items-center gap-2">
                        <stat.icon className="w-5 h-5 text-brown-lightest" />
                        <span>{stat.label}</span>
                      </div>
                      <span className="text-brown-darkest">{getScaledScore(stat.val)}</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="h-4 w-full bg-gray-medium rounded-full overflow-hidden relative shadow-inner">
                      {/* Progress Bar Fill */}
                      <div
                        className={`h-full ${stat.color} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${Math.max(5, stat.val)}%` }}
                      />
                      {/* Highlight effect */}
                      <div className="absolute top-1 left-2 right-2 h-1 bg-white opacity-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Badges Section - Rustic Board Wrapper */}
        <section className="relative">
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_var(--shadow-card-color)] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <BadgesSection badges={badges} />
            </div>
          </div>
        </section>

        {/* Themes Section - Rustic Board Wrapper */}
        <section className="relative">
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_var(--shadow-card-color)] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <h2 className="text-xl font-bold text-brown-800 mb-4 flex items-center gap-2">
                <Palette className="w-6 h-6 text-brown-600" />
                ธีมของคุณ
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Default Theme Option */}
                <button
                  onClick={() => handleThemeSelect("default")}
                  className={`
                    relative p-3 rounded-xl border-2 transition-all group
                    ${theme === 'default'
                      ? 'bg-brown-lightest border-brown-600 shadow-inner'
                      : 'bg-white border-gray-medium hover:border-brown-light shadow-sm hover:-translate-y-1'
                    }
                  `}
                >
                  <div className="w-full aspect-video rounded-lg bg-[#FFFDF6] border border-gray-200 mb-2 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1/3 bg-[#3E2723]"></div>
                    <div className="absolute top-1/3 left-0 w-full h-1/3 bg-[#FFC107]"></div>
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-[#E84C1C]"></div>
                  </div>
                  <span className={`text-sm font-bold ${theme === 'default' ? 'text-brown-900' : 'text-brown-medium'}`}>
                    ดั้งเดิม
                  </span>
                  {theme === 'default' && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      ใช้อยู่
                    </div>
                  )}
                </button>

                {/* Owned Themes */}
                {ownedThemes.map((item) => {
                  const itemVisualKey = getThemeKeyFromId(item.id);
                  const isEquipped = theme === itemVisualKey;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleThemeSelect(item.id)}
                      className={`
                            relative p-3 rounded-xl border-2 transition-all group
                            ${isEquipped
                          ? 'bg-brown-lightest border-brown-600 shadow-inner'
                          : 'bg-white border-gray-medium hover:border-brown-light shadow-sm hover:-translate-y-1'
                        }
                          `}
                    >
                      <div className="w-full aspect-video rounded-lg mb-2 relative overflow-hidden bg-gray-100 border border-gray-200">
                        {/* Visual based on mapped Key */}
                        {itemVisualKey === 'pastel' ? (
                          <>
                            <div className="absolute top-0 left-0 w-full h-1/3 bg-[#FFF9C4]"></div>
                            <div className="absolute top-1/3 left-0 w-full h-1/3 bg-[#AED581]"></div>
                            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-[#81D4FA]"></div>
                          </>
                        ) : itemVisualKey === 'neon' ? (
                          <>
                            <div className="absolute top-0 left-0 w-full h-1/3 bg-[#050505]"></div>
                            <div className="absolute top-1/3 left-0 w-full h-1/2 bg-[#FF00FF]"></div>
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[#00FFFF]"></div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl">{item.image || "🎨"}</div>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${isEquipped ? 'text-brown-900' : 'text-brown-medium'}`}>
                        {item.name}
                      </span>
                      {isEquipped && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          ใช้อยู่
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      <BottomNav active="stats" />

      {/* Avatar Edit Modal */}
      <AvatarEditModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={currentAvatar}
        onAvatarSelect={handleAvatarSelect}
        isLoading={isUpdatingAvatar}
        userId={userId}
      />
    </div>
  );
}
