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
        <div className="relative flex-1 flex flex-col h-full w-full">
            {/* Brown Backboard / Frame */}
            <div className="bg-brown-light rounded-3xl pb-2 pt-1 shadow-[0_8px_0_var(--shadow-card-color)] relative z-0 mx-auto w-full flex-1 flex flex-col px-1">
                {/* Inner Clean Board */}
                <div className="bg-cream rounded-[20px] p-5 relative z-10 flex-1 flex flex-col justify-between">

                    {/* Header Section */}
                    <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-line border-gray-medium gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl md:text-2xl font-bold text-brown-800 flex items-center gap-2 leading-tight">
                                {title}
                            </h2>
                            <p className="text-sm text-brown-light mt-1 mb-3">
                                {completedGames} จาก {totalGames} เกมสำเร็จแล้ว
                            </p>
                            {action && <div>{action}</div>}
                        </div>

                        {/* Progress Indicator */}
                        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="28"
                                    cy="28"
                                    r="22"
                                    stroke="var(--color-gray-medium)"
                                    strokeWidth="4.5"
                                    fill="transparent"
                                />
                                <circle
                                    cx="28"
                                    cy="28"
                                    r="22"
                                    stroke="var(--color-orange-action)"
                                    strokeWidth="4.5"
                                    fill="transparent"
                                    strokeDasharray={138.2}
                                    strokeDashoffset={138.2 - (138.2 * progress) / 100}
                                    className="transition-all duration-1000 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute text-xs font-bold text-orange-action">
                                {progress}%
                            </span>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="relative flex-1">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
