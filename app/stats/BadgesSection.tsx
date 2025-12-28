"use client";

import { Lock, Award, Zap, Calendar, Target, Trophy, Flame, ChevronDown, ChevronUp, Sprout } from "lucide-react";
import { useState } from "react";
import { StreakBadge } from "@/lib/server/dailystreakAction";

interface BadgesSectionProps {
    badges: StreakBadge[];
}

export default function BadgesSection({ badges }: BadgesSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // If we have very few badges, showing expanded state might be redundant, 
    // but sticking to user request to add "expand" capability.
    // Let's show first 3 by default, or 6 if expanded.

    const displayedBadges = isExpanded ? badges : badges.slice(0, 3);

    // Helper function to map badge IDs to icons
    const getIconById = (id: string, unlocked: boolean) => {
        const className = `w-8 h-8 ${unlocked ? 'text-white' : 'text-gray-text'}`;
        switch (id) {
            case 'first_checkin': return <Sprout className={className} />;
            case 'three_day_streak': return <Flame className={className} />;
            case 'week_streak': return <Flame className={className} />;
            case 'month_streak': return <Calendar className={className} />;
            case 'hundred_days': return <Trophy className={className} />;
            case 'fifty_total': return <Target className={className} />;
            case 'hundred_total': return <Zap className={className} />;
            default: return <Award className={className} />;
        }
    }

    const unlockedCount = badges.filter(b => b.unlocked).length;
    const totalCount = badges.length;

    return (
        <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-brown-800">
                    เหรียญรางวัล <span className="text-base font-normal opacity-80">({unlockedCount}/{totalCount})</span>
                </h2>
                {badges.length > 3 && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-orange-action font-bold text-sm uppercase tracking-wide hover:text-orange-hover-2 flex items-center gap-1"
                    >
                        {isExpanded ? "ย่อมุมมอง" : "ดูทั้งหมด"}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {displayedBadges.map((badge) => (
                    <div
                        key={badge.id}
                        className={`
              relative overflow-hidden group
              border-2 ${badge.unlocked ? 'border-yellow bg-cream' : 'border-gray-medium bg-white'} 
              rounded-2xl p-4 flex flex-col items-center text-center transition-all shadow-sm
              ${!badge.unlocked && 'opacity-75 grayscale hover:grayscale-0 hover:opacity-100'}
            `}
                    >
                        {/* Badge Icon Circle */}
                        <div className={`
                w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-md transition-transform group-hover:scale-110
                ${badge.unlocked
                                ? 'bg-gradient-to-br from-yellow to-yellow-highlight ring-4 ring-yellow/30'
                                : 'bg-gray-lightest ring-4 ring-gray-medium'
                            }
            `}>
                            {getIconById(badge.id, badge.unlocked)}
                        </div>

                        <h3 className={`font-bold text-sm mb-1 line-clamp-1 ${badge.unlocked ? 'text-yellow-highlight2' : 'text-brown-light'}`}>
                            {badge.name}
                        </h3>
                        <p className="text-xs text-brown-light/80 line-clamp-2">
                            {badge.description}
                        </p>

                        {/* Locked overlay icon */}
                        {!badge.unlocked && (
                            <div className="absolute top-2 right-2 text-brown-lightest">
                                <Lock className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
