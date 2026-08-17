"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { m } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

import Image from "next/image";
import LogoHeader from "@/components/LogoHeader";

const AVATAR_OPTIONS = [
    { id: 'avatar-1', src: '/avatars/avatar-1.webp', label: 'หมาป่า ยอดนักไหวพริบ' },
    { id: 'avatar-2', src: '/avatars/avatar-2.webp', label: 'ปลาหมึก จอมวางแผน' },
    { id: 'avatar-3', src: '/avatars/avatar-3.webp', label: 'ช้าง ผู้เฝ้ารักษาความจำ' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [avatar, setAvatar] = useState("avatar-1");
    const [loading, setLoading] = useState(false);

    const handleFinish = async () => {
        if (!avatar) {
            alert("กรุณาเลือกอวาตาร์ก่อน");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/onboarding/avatar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    avatarId: avatar,
                }),
            });

            const result = await response.json();

            if (!result.ok) {
                alert(result.error || 'ไม่สามารถเลือกอวาตาร์ได้');
                return;
            }

            // 1. Update Auth Metadata to flag onboarding as complete
            const { error: metaError } = await supabase.auth.updateUser({
                data: { onboarding_complete: true }
            });

            if (metaError) throw metaError;

            // 2. Redirect to dashboard
            router.refresh();
            router.push("/");

        } catch (error: any) {
            console.error("Error in onboarding avatar selection:", error);
            alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error?.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-cream flex flex-col items-center justify-start md:justify-center p-4 md:p-6 text-brown-900 font-sans overflow-y-auto relative">
            {/* Desktop Logo */}
            <div className="hidden md:block absolute top-10 left-10 z-50">
                <LogoHeader variant="desktop" />
            </div>

            {/* Mobile Header Layout */}
            <div className="md:hidden w-full flex justify-center pt-4 pb-2">
                <LogoHeader variant="mobile" />
            </div>

            {/* Main Card Container */}
            <div className="w-full flex-1 md:flex-none max-w-xl relative flex flex-col items-center justify-center z-10 py-6 md:py-0">
                <m.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white/95 backdrop-blur-xl w-full p-6 sm:p-8 md:p-12 rounded-3xl shadow-xl border border-white/60 flex flex-col items-center text-center"
                >
                    <h1 className="text-3xl md:text-4xl font-extrabold text-brown-900 mb-3 tracking-tight">
                        เลือกรูปประจำตัวของคุณ
                    </h1>
                    <p className="text-base sm:text-lg text-brown-600 mb-8 max-w-md">
                        เลือกตัวละครแทนตัวที่คุณชื่นชอบเพื่อเริ่มต้นการฝึกสมอง
                    </p>

                    {/* Avatar Selection Grid */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full mb-8">
                        {AVATAR_OPTIONS.map((opt) => {
                            const isSelected = avatar === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setAvatar(opt.id)}
                                    className="flex flex-col gap-2.5 group cursor-pointer focus:outline-none"
                                >
                                    <div className={`aspect-square w-full rounded-2xl border-3 flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden
                                        ${isSelected
                                            ? 'border-orange-action ring-4 ring-orange-action/25 scale-105 shadow-lg'
                                            : 'border-brown-200 hover:border-orange-action/40 hover:scale-[1.02]'
                                        }
                                    `}>
                                        <div className="w-full h-full relative">
                                            <Image
                                                src={opt.src}
                                                alt={`Avatar ${opt.label}`}
                                                fill
                                                className="object-cover scale-108"
                                                priority
                                            />
                                        </div>

                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-orange-action text-white rounded-full p-1 shadow-md z-10 animate-in zoom-in-75 duration-200">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-sm sm:text-base font-bold text-center transition-colors line-clamp-2 ${isSelected ? 'text-orange-action' : 'text-brown-700 group-hover:text-brown-900'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={handleFinish}
                        disabled={!avatar || loading}
                        className="w-full h-14 bg-green-success hover:bg-green-600 disabled:bg-brown-200 disabled:text-brown-400 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span>กำลังบันทึก...</span>
                            </>
                        ) : (
                            <>
                                <span>เริ่มต้นใช้งาน</span>
                                <Check className="h-6 w-6 stroke-[3]" />
                            </>
                        )}
                    </button>
                </m.div>
            </div>
        </main>
    );
}
