"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Flame, Star, Coins, Zap, Trophy, Map, Brain, Eye, Target, Heart } from "lucide-react";
import Image from "next/image";
import BadgesSection from "./BadgesSection";
import TopBarMenu from "@/components/TopBarMenu";
import AvatarEditModal from "@/components/AvatarEditModal";
import { getAvatarSrc } from "@/lib/utils";

interface ProfileData {
  full_name: string ;
  avatar_url: string ;
  created_at: string;
  global_planning: number ;
  global_memory: number ;
  global_visual: number ;
  global_focus: number ;
  global_speed: number;
  global_emotion: number ;
}

interface StatsPageClientProps {
  profile: ProfileData ;
  balance: number;
  checkinStatus: any;
  badges: any[];
  userId: string;
}

export default function StatsPageClient({ 
  profile, 
  balance, 
  checkinStatus, 
  badges,
  userId
}: StatsPageClientProps) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
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
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_#5D4037] relative z-0">
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
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{balance}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">คะแนนสะสม</div>
                  </div>
                </div>

                {/* Coins */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Coins className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">{balance}</div>
                    <div className="text-xs text-brown-light font-bold uppercase">เหรียญ</div>
                  </div>
                </div>

                {/* Top League */}
                <div className="border-2 border-gray-medium rounded-2xl p-4 flex items-center gap-3 bg-white shadow-sm">
                  <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-400" />
                  <div>
                    <div className="text-xl font-bold text-brown-darkest">-</div>
                    <div className="text-xs text-brown-light font-bold uppercase">ลีกสูงสุด</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cognitive Stats Chart - Rustic Board */}
        <section className="relative">
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_#5D4037] relative z-0">
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
          <div className="bg-brown-light rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_#5D4037] relative z-0">
            <div className="bg-cream rounded-[20px] p-5 relative z-10">
              <BadgesSection badges={badges} />
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
