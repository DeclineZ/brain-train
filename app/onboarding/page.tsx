"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight, Check, User, ChevronLeft } from "lucide-react";

import Image from "next/image";

// Placeholder Avatar Options (In real app, these would be image URLs)
const AVATAR_OPTIONS = [
    { id: 'avatar-1', src: '/avatars/avatar-11.png', label: 'หมาป่า ยอดนักไหวพริบ' },
    { id: 'avatar-2', src: '/avatars/avatar-2.png', label: 'ปลาหมึก จอมวางแผน' },
    { id: 'avatar-3', src: '/avatars/avatar-3.png', label: 'ช้าง ผู้เฝ้ารักษาความจำ' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [step, setStep] = useState(1);
    const [dob, setDob] = useState("");
    const [gender, setGender] = useState("");
    const [avatar, setAvatar] = useState("");
    const [loading, setLoading] = useState(false);

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("No user found");

            // 1. Update Profile in DB
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({
                    dob: dob,
                    gender: gender,
                    avatar_url: avatar
                })
                .eq('user_id', user.id);

            if (profileError) throw profileError;

            // 2. Update Auth Metadata to flag onboarding as complete
            const { error: metaError } = await supabase.auth.updateUser({
                data: { onboarding_complete: true }
            });

            if (metaError) throw metaError;

            // 3. Redirect to dashboard
            router.refresh();
            router.push("/");

        } catch (error: any) {
            console.error("Error updating profile object:", JSON.stringify(error, null, 2));
            console.error("Error message:", error?.message);
            console.error("Error details:", error?.details);
            alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error?.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-0 md:p-6 text-brown-900 font-sans overflow-hidden relative">
            {/* Clean Background - No Animations */}

            <div className="w-full h-full md:h-auto md:max-w-lg relative flex flex-col items-center justify-center z-10">

                {/* Progress Bar (Floating on Desktop, Top on Mobile) */}
                <div className="w-[80%] md:w-full h-2 bg-brown-900/10 rounded-full overflow-hidden absolute top-8 md:-top-12 left-1/2 -translate-x-1/2 z-20">
                    <motion.div
                        className="h-full bg-orange-action shadow-[0_0_10px_rgba(234,88,12,0.5)]"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white md:bg-white/80 md:backdrop-blur-md w-full min-h-screen md:min-h-0 md:h-auto p-6 pt-24 md:p-12 rounded-none md:rounded-3xl shadow-none md:shadow-2xl border-none md:border md:border-white/50 flex flex-col justify-center relative"
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-brown-900 mb-4 text-center">
                                วันเกิดของคุณ
                            </h2>
                            <p className="text-lg text-brown-600 text-center mb-10">
                                เราใช้ข้อมูลนี้เพื่อปรับแต่งระดับความยากของเกมให้เหมาะสมกับวัยของคุณ
                            </p>

                            <div className="space-y-6">
                                <div className="relative">
                                    <label className="block text-sm font-semibold text-brown-600 mb-2 ml-1">
                                        เลือกวันที่
                                    </label>
                                    <input
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="w-full h-16 pl-4 pr-4 text-xl font-medium rounded-2xl border-2 border-brown-200 bg-white text-brown-900 focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all cursor-pointer shadow-sm"
                                    />
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={!dob}
                                    className="w-full h-14 bg-brown-900 hover:bg-brown-800 disabled:bg-brown-100 disabled:text-brown-400 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    ถัดไป <ChevronRight className="h-6 w-6" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white md:bg-white/80 md:backdrop-blur-md w-full min-h-screen md:min-h-0 md:h-auto p-6 pt-24 md:p-12 rounded-none md:rounded-3xl shadow-none md:shadow-2xl border-none md:border md:border-white/50 flex flex-col justify-center relative"
                        >
                            <button
                                onClick={handleBack}
                                className="absolute top-12 md:top-6 left-6 text-brown-400 hover:text-brown-600 transition-colors p-2 -ml-2"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>

                            <h2 className="text-3xl md:text-4xl font-bold text-brown-900 mb-4 text-center">
                                เพศของคุณ
                            </h2>
                            <p className="text-lg text-brown-600 text-center mb-8">
                                ข้อมูลนี้จะช่วยในการวิเคราะห์ผลลัพธ์ทางการแพทย์
                            </p>

                            <div className="grid grid-cols-1 gap-4 mb-8">
                                {['male', 'female', 'other'].map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGender(g)}
                                        className={`h-16 rounded-2xl border-2 text-xl font-bold transition-all flex items-center px-6 gap-4 shadow-sm
                                            ${gender === g
                                                ? 'border-orange-action bg-orange-50 text-orange-900 shadow-md ring-2 ring-orange-action/20'
                                                : 'border-brown-200 bg-white text-brown-600 hover:bg-brown-50 hover:border-brown-300'
                                            }
                                        `}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                            ${gender === g ? 'border-orange-action' : 'border-brown-300'}
                                        `}>
                                            {gender === g && <div className="w-3 h-3 rounded-full bg-orange-action" />}
                                        </div>
                                        {g === 'male' ? 'ชาย' : g === 'female' ? 'หญิง' : 'อื่นๆ'}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!gender}
                                className="w-full h-14 bg-brown-900 hover:bg-brown-800 disabled:bg-brown-100 disabled:text-brown-400 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                ถัดไป <ChevronRight className="h-6 w-6" />
                            </button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white md:bg-white/80 md:backdrop-blur-md w-full min-h-screen md:min-h-0 md:h-auto p-6 pt-24 md:p-12 rounded-none md:rounded-3xl shadow-none md:shadow-2xl border-none md:border md:border-white/50 flex flex-col justify-center relative"
                        >
                            <button
                                onClick={handleBack}
                                className="absolute top-18 md:top-6 left-6 text-brown-400 hover:text-brown-600 transition-colors p-2 -ml-2"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>

                            <h2 className="text-3xl md:text-4xl font-bold text-brown-900 mb-4 text-center">
                                เลือกรูปประจำตัว
                            </h2>
                            <p className="text-lg text-brown-600 text-center mb-8">
                                เลือกรูปแทนตัวที่คุณชื่นชอบ
                            </p>

                            <div className="grid grid-cols-3 gap-4 mb-12">
                                {AVATAR_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setAvatar(opt.id)}
                                        className={`flex flex-col gap-3 group`}
                                    >
                                        <div className={`aspect-square w-full rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden
                                            ${avatar === opt.id
                                                ? 'border-orange-action bg-orange-50 ring-4 ring-orange-action/20 scale-105 shadow-xl'
                                                : 'border-brown-200 bg-white hover:border-brown-300 hover:bg-brown-50'
                                            }
                                        `}>
                                            <div className="w-full h-full relative">
                                                <Image
                                                    src={opt.src}
                                                    alt={`Avatar ${opt.label}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>

                                            {avatar === opt.id && (
                                                <div className="absolute top-2 right-2 bg-orange-action text-white rounded-full p-1 shadow-md z-10 index-10">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-lg font-bold text-center transition-colors ${avatar === opt.id ? 'text-orange-action' : 'text-brown-600'}`}>
                                            {opt.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleFinish}
                                disabled={!avatar || loading}
                                className="w-full h-14 bg-green-success hover:bg-green-600 disabled:bg-brown-100 disabled:text-brown-400 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? "กำลังบันทึก..." : "เริ่มต้นใช้งาน"}
                                {!loading && <Check className="h-6 w-6" />}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
