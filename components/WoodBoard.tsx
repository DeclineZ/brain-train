import React from "react";

interface WoodBoardProps {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}

export default function WoodBoard({ title, action, children }: WoodBoardProps) {
    return (
        <div className="relative mt-8">
            {/* The Board Container */}
            <div className="bg-wood-pattern rounded-3xl p-6 shadow-sm border-4 border-[#8B5E3C] relative z-10">

                {/* Header Section simulating a nailed-on sign or top section */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#8B5E3C]/20 border-line">
                    <h2 className="text-2xl font-bold text-[#5D4037] drop-shadow-sm flex items-center gap-2">
                        <span className="tracking-wide">{title}</span>
                    </h2>
                    {action && <div>{action}</div>}
                </div>

                {/* Content Area */}
                <div className="relative">
                    {children}
                </div>
            </div>

            {/* Optional: Decorative "Legs" or support if we want it to look like a standing board */}
            <div className="absolute -bottom-6 left-10 w-4 h-8 bg-[#6B4F3F] rounded-b-lg -z-0 shadow-inner"></div>
            <div className="absolute -bottom-6 right-10 w-4 h-8 bg-[#6B4F3F] rounded-b-lg -z-0 shadow-inner"></div>
        </div>
    );
}
