import React, { useEffect } from 'react';

interface TimeoutPopupProps {
    onContinue: () => void;
    // Other props no longer needed for rendering, but kept for interface compatibility if strict
    onRestart?: () => void;
    onPreviousLevel?: () => void;
    onGiveUp?: () => void;
    activeLevel?: number;
}

export default function TimeoutPopup({
    onContinue,
}: TimeoutPopupProps) {
    useEffect(() => {
        // Show "Still can continue" immediately, then AUTO RESUME after 1.5s
        const timer = setTimeout(() => {
            onContinue();
        }, 1500);
        return () => clearTimeout(timer);
    }, [onContinue]);

    return (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
            {/* Background Overlay - Fades out with the popup */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-300" />

            {/* Message: Still Can Continue */}
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-md animate-in zoom-in slide-in-from-bottom-5 duration-500 text-center px-4">
                ยังเล่นต่อได้
            </h1>
        </div>
    );
}
