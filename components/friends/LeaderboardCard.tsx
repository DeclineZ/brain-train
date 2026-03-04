"use client";

import { Star, Trophy, Medal, Award, Crown } from "lucide-react";
import { getAvatarSrc } from "@/lib/utils";
import Image from "next/image";

interface LeaderboardCardProps {
    rank: number;
    avatarUrl: string | null;
    displayName: string;
    value: number;
    valueLabel: string;
    valueIcon?: "star" | "trophy";
    isSelf: boolean;
    isTopThree: boolean;
}

const RANK_STYLES: Record<number, { bg: string; border: string; badge: string; text: string }> = {
    1: {
        bg: 'bg-gradient-to-r from-yellow-highlight/20 to-yellow-highlight2/10',
        border: 'border-yellow-highlight',
        badge: 'bg-gradient-to-r from-yellow-highlight to-yellow-highlight2 text-white',
        text: 'text-yellow-highlight',
    },
    2: {
        bg: 'bg-gradient-to-r from-gray-lighter to-gray-light',
        border: 'border-gray-text',
        badge: 'bg-gradient-to-r from-gray-text to-gray-dark text-white',
        text: 'text-gray-dark',
    },
    3: {
        bg: 'bg-gradient-to-r from-orange-dark-2/20 to-orange-dark/10',
        border: 'border-orange-dark-2',
        badge: 'bg-gradient-to-r from-orange-dark-2 to-orange-dark text-white',
        text: 'text-orange-dark',
    },
};

export default function LeaderboardCard({
    rank,
    avatarUrl,
    displayName,
    value,
    valueLabel,
    valueIcon = "star",
    isSelf,
    isTopThree,
}: LeaderboardCardProps) {
    const rankStyle = RANK_STYLES[rank];
    const isChampion = rank === 1;

    return (
        <div
            className={`
        flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200
        ${isSelf
                    ? 'bg-orange-action/10 border-2 border-orange-action/30 ring-1 ring-orange-action/10'
                    : rankStyle
                        ? `${rankStyle.bg} border border-${rankStyle.border}/30`
                        : 'bg-cream border border-brown-border/50'
                }
      `}
        >
            {/* Rank Badge */}
            <div
                className={`
          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
          ${rankStyle
                        ? rankStyle.badge
                        : 'bg-tan-light text-brown-medium border border-brown-border'
                    }
          ${isChampion ? 'shadow-md ring-2 ring-yellow-highlight/30' : ''}
        `}
            >
                {rank === 1 ? (
                    <Crown className="w-4 h-4 text-white drop-shadow" />
                ) : rank === 2 ? (
                    <Medal className="w-4 h-4 text-white drop-shadow" />
                ) : rank === 3 ? (
                    <Award className="w-4 h-4 text-white drop-shadow" />
                ) : (
                    <span className="text-xs font-bold">{rank}</span>
                )}
            </div>

            {/* Avatar */}
            <div
                className={`
          w-10 h-10 rounded-full overflow-hidden flex-shrink-0
          ${isSelf
                        ? 'ring-2 ring-orange-action shadow-sm'
                        : 'border-2 border-brown-border'
                    }
        `}
            >
                <Image
                    src={getAvatarSrc(avatarUrl)}
                    alt="avatar"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <p className={`
          text-sm font-bold truncate
          ${isSelf ? 'text-orange-action' : 'text-brown-darkest'}
        `}>
                    {displayName}
                    {isSelf && (
                        <span className="ml-1 text-xs font-normal text-orange-action/70">(คุณ)</span>
                    )}
                </p>
            </div>

            {/* Value */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1">
                    {valueIcon === "trophy" ? (
                        <Trophy className="w-4 h-4 text-blue" />
                    ) : (
                        <Star className="w-4 h-4 text-yellow-highlight fill-yellow-highlight" />
                    )}
                    <span className={`
            text-sm font-bold
            ${isSelf ? 'text-orange-action' : 'text-brown-darkest'}
          `}>
                        {value.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
