import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

interface ModernDashboardProps {
    title: string;
    totalGames: number;
    completedGames: number;
    action?: React.ReactNode;
    children: React.ReactNode;
}

export default function ModernDashboard({ title, totalGames, completedGames, action, children }: ModernDashboardProps) {
    // Calculate progress percentage
    const progress = Math.round((completedGames / totalGames) * 100) || 0;

    return (
        <div className="relative mt-8 px-1">
            {/* Brown Backboard / Frame */}
            <div className="bg-[#8B5E3C] rounded-3xl pb-2 pt-1 px-1 shadow-[0_8px_0_#5D4037] relative z-0 mx-auto">
                {/* Inner Clean Board */}
                <div className="bg-[#FFFDF7] rounded-[20px] p-5 relative z-10 h-full">

                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-line border-[#E5E5E5]">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-[#5D4037] flex items-center gap-2">
                                {title}
                            </h2>
                            <p className="text-sm text-[#8B5E3C] mt-1 mb-3">
                                {completedGames} จาก {totalGames} เกมสำเร็จแล้ว
                            </p>
                            {action && <div>{action}</div>}
                        </div>

                        {/* Progress Indicator */}
                        <div className="relative w-12 h-12 flex items-center justify-center shrink-0 ml-4">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#E5E5E5"
                                    strokeWidth="4"
                                    fill="transparent"
                                />
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#E84C1C"
                                    strokeWidth="4"
                                    fill="transparent"
                                    strokeDasharray={125.6}
                                    strokeDashoffset={125.6 - (125.6 * progress) / 100}
                                    className="transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-[#E84C1C]">
                                {progress}%
                            </span>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="relative">
                        {children}
                    </div>
                </div>

                {/* Feet/Support visual (Optional, subtle) */}
                <div className="absolute -bottom-3 left-8 w-3 h-6 bg-[#5D4037] rounded-b-md -z-10 shadow-sm" />
                <div className="absolute -bottom-3 right-8 w-3 h-6 bg-[#5D4037] rounded-b-md -z-10 shadow-sm" />
            </div>
        </div>
    );
}
