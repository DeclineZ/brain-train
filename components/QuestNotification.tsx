"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Trophy, Coins } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

interface QuestNotificationProps {
    onClose: () => void;
}

export default function QuestNotification({ onClose }: QuestNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    }, [onClose]);

    useEffect(() => {
        const animTimer = setTimeout(() => {
            setIsVisible(true);
        }, 50);

        // Auto-close after 6 seconds
        const timer = setTimeout(() => {
            handleClose();
        }, 6000);

        return () => {
            clearTimeout(animTimer);
            clearTimeout(timer);
        };
    }, [handleClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 100, opacity: 0 }}
                    className="fixed top-4 right-4 z-50 pointer-events-auto"
                >
                    <div className="bg-white rounded-xl shadow-2xl border-2 border-yellow-highlight overflow-hidden max-w-sm w-full relative">
                        {/* Header */}
                        <div className="bg-yellow-highlight px-4 py-3 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-white" />
                                <span className="font-bold text-shadow-sm">ภารกิจสำเร็จ!</span>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 bg-cream">
                            <div className="text-center mb-4">
                                <m.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                                    className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2 border-4 border-white shadow-md"
                                >
                                    <span className="text-4xl">🎁</span>
                                </m.div>
                                <h3 className="font-bold text-brown-900 text-lg">
                                    ยินดีด้วย!
                                </h3>
                                <p className="text-sm text-brown-medium">
                                    คุณทำภารกิจประจำวันครบแล้ว
                                </p>
                            </div>

                            {/* Reward Box */}
                            <m.div
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="bg-green-100 p-1.5 rounded-full">
                                        <Coins className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-green-800">รับรางวัล</span>
                                        <span className="text-xs text-green-600">โบนัสภารกิจประจำวัน</span>
                                    </div>
                                </div>
                                <div className="text-green-700 font-black text-xl">
                                    +100
                                </div>
                            </m.div>
                        </div>

                        {/* Progress Bar */}
                        <m.div
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 6, ease: "linear" }}
                            className="h-1 bg-yellow-highlight"
                        />
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}
