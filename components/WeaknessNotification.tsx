"use client";

import { useEffect, useState } from "react";
import { X, Brain, Lightbulb } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

interface WeaknessNotificationProps {
    message: string;
}

export default function WeaknessNotification({ message }: WeaknessNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show if it hasn't been shown during this session
        const hasNotified = sessionStorage.getItem("weakness_notified");
        if (!hasNotified) {
            const animTimer = setTimeout(() => {
                setIsVisible(true);
            }, 50);
            sessionStorage.setItem("weakness_notified", "true");

            // Auto-close after 7 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 7000);

            return () => {
                clearTimeout(animTimer);
                clearTimeout(timer);
            };
        }
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                    initial={{ x: 150, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 150, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="fixed top-20 right-4 z-50 pointer-events-auto max-w-sm w-full px-4 sm:px-0"
                >
                    <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border-2 border-orange-light overflow-hidden relative">
                        {/* Colorful Accent Bar */}
                        <div className="bg-orange-action px-4 py-3 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-white fill-white/20 animate-pulse" />
                                <span className="font-black text-sm text-shadow-sm">คำแนะนำจากทักษะสมอง</span>
                            </div>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                                aria-label="Close notification"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 bg-cream flex gap-3 items-start">
                            <div className="bg-yellow-100 border border-yellow-200 p-2 rounded-xl shrink-0 mt-0.5 shadow-sm">
                                <Brain className="w-6 h-6 text-orange-action" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-brown-900 text-sm mb-1 leading-snug">
                                    ฝึกฝนเพื่อพัฒนาทักษะสมอง
                                </h3>
                                <p className="text-xs text-brown-medium font-semibold leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar timer */}
                        <m.div
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 7, ease: "linear" }}
                            className="h-1 bg-orange-action"
                        />
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}
