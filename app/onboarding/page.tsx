"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, ChevronRight, Check } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [step, setStep] = useState(1);
    const [dob, setDob] = useState("");
    const [gender, setGender] = useState("");
    const [loading, setLoading] = useState(false);

    const handleNext = () => {
        if (step === 1 && dob) setStep(2);
    };

    const handleFinish = async () => {
        if (!gender) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้");

            // 1. Update the Database Profile (Your source of truth)
            const { error: profileError } = await supabase.from("user_profiles").update({
                dob: dob,
                gender: gender,
                last_updated: new Date().toISOString()
            }).eq("user_id", user.id);

            if (profileError) throw profileError;

            // 2. Update Auth Metadata (For fast middleware checks)
            const { error: authError } = await supabase.auth.updateUser({
                data: { onboarding_complete: true }
            });

            if (authError) throw authError;

            router.push("/"); // Go to Dashboard/Home
        } catch (error) {
            console.error("Onboarding failed:", error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-6 text-brown-800 font-sans overflow-hidden">
            <div className="w-full max-w-lg relative">

                {/* Progress Bar */}
                <div className="absolute -top-12 left-0 w-full h-2 bg-brown-900/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-orange-action"
                        initial={{ width: "0%" }}
                        animate={{ width: step === 1 ? "50%" : "100%" }}
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
                            className="bg-white/80 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-xl border border-white/50"
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-brown-900 mb-4 text-center">
                                วันเกิดของคุณ
                            </h2>
                            <p className="text-lg text-brown-600 text-center mb-8">
                                เพื่อให้เราปรับระดับเกมให้เหมาะสมกับวัยของคุณ
                            </p>

                            <div className="space-y-6">
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 text-orange-action" />
                                    <input
                                        type="date"
                                        value={dob}
                                        onChange={(e) => setDob(e.target.value)}
                                        className="w-full h-20 pl-16 pr-8 text-2xl font-medium rounded-2xl border-2 border-brown-900/10 bg-white focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all cursor-pointer"
                                    />
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={!dob}
                                    className="w-full h-16 bg-brown-900 hover:bg-brown-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
                            className="bg-white/80 backdrop-blur-md p-8 md:p-12 rounded-3xl shadow-xl border border-white/50"
                        >
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
                                        className={`h-20 rounded-2xl border-2 text-2xl font-bold transition-all flex items-center px-6 gap-4
                                            ${gender === g
                                                ? 'border-orange-action bg-orange-50 text-orange-800 shadow-md ring-2 ring-orange-action/20'
                                                : 'border-brown-900/10 bg-white text-brown-600 hover:bg-brown-50 hover:border-brown-900/20'
                                            }
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center
                                            ${gender === g ? 'border-orange-action' : 'border-gray-300'}
                                        `}>
                                            {gender === g && <div className="w-4 h-4 rounded-full bg-orange-action" />}
                                        </div>
                                        {g === 'male' ? 'ชาย' : g === 'female' ? 'หญิง' : 'อื่นๆ'}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleFinish}
                                disabled={!gender || loading}
                                className="w-full h-16 bg-green-success hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
