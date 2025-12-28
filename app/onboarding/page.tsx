"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronRight, Check, User, ChevronLeft } from "lucide-react";

import Image from "next/image";
import LogoHeader from "@/components/LogoHeader";

// Placeholder Avatar Options (In real app, these would be image URLs)
const AVATAR_OPTIONS = [
    { id: 'avatar-1', src: '/avatars/avatar1.webp', label: 'หมาป่า ยอดนักไหวพริบ' },
    { id: 'avatar-2', src: '/avatars/avatar2.webp', label: 'ปลาหมึก จอมวางแผน' },
    { id: 'avatar-3', src: '/avatars/avatar3.webp', label: 'ช้าง ผู้เฝ้ารักษาความจำ' },
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
                body: JSON.stringify({ avatarId: avatar }),
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
            console.error("Error in onboarding avatar selection:", JSON.stringify(error, null, 2));
            console.error("Error message:", error?.message);
            console.error("Error details:", error?.details);
            alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error?.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="h-screen bg-cream md:bg-cream flex flex-col items-center justify-start md:justify-center p-0 md:p-6 text-brown-900 font-sans overflow-hidden relative">
            {/* Clean Background - No Animations */}

            {/* Desktop Logo */}
            <div className="hidden md:block absolute top-10 left-10 z-50">
                <LogoHeader variant="desktop" />
            </div>

            {/* Desktop Progress Bar (Fixed Top) */}
            <div className="hidden md:block absolute top-19 left-1/2 -translate-x-1/2 z-50 w-64 lg:w-96 h-2 bg-brown-900/10 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-orange-action shadow-[0_0_10px_rgba(234,88,12,0.5)]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(step / 3) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>

            {/* --- Mobile Header Layout (Visible < md) --- */}
            <div className="md:hidden w-full flex-none bg-white z-50 px-6 pt-6 pb-2 shadow-sm border-b border-brown-900/5">
                <div className="flex items-center justify-between mb-4 relative">
                    {/* Back Button (Mobile) */}
                    <div className="w-10">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="text-brown-400 hover:text-brown-600 transition-colors"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                        )}
                    </div>

                    {/* Logo (Center) */}
                    <div className="flex justify-center">
                        <LogoHeader className="transform scale-90" variant="mobile" />
                    </div>

                    {/* Spacer for balance */}
                    <div className="w-10"></div>
                </div>

                {/* Progress Bar (Mobile) */}
                <div className="w-full h-1.5 bg-brown-900/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-orange-action"
                        initial={{ width: "0%" }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                </div>
            </div>

            {/* --- Desktop Layout Container --- */}
            <div className="w-full flex-1 md:flex-none md:h-auto md:max-w-2xl relative flex flex-col items-center justify-center z-10">



                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-transparent md:bg-white/90 md:backdrop-blur-xl w-full md:w-[600px] md:h-[75vh] md:max-h-[800px] overflow-y-auto p-6 md:p-10 lg:p-16 rounded-none md:rounded-3xl shadow-none md:shadow-lg md:mt-16 border-none md:border md:border-white/50 flex flex-col justify-start md:justify-center relative"
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-brown-900 mb-4 text-center">
                                วันเกิดของคุณ
                            </h2>
                            <p className="text-lg text-brown-600 text-center mb-10">
                                เราใช้ข้อมูลนี้เพื่อปรับแต่งระดับความยากของเกมให้เหมาะสมกับวัยของคุณ
                            </p>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-brown-600 ml-1">
                                        วัน / เดือน / ปีเกิด
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {/* Day Selector */}
                                        <div className="relative">
                                            <select
                                                value={dob ? dob.split("-")[2] : ""}
                                                onChange={(e) => {
                                                    const d = e.target.value;
                                                    const m = dob ? dob.split("-")[1] : "01";
                                                    const y = dob ? dob.split("-")[0] : new Date().getFullYear().toString();
                                                    setDob(`${y}-${m}-${d}`);
                                                }}
                                                className="w-full h-14 pl-3 pr-8 text-lg font-medium rounded-2xl border-2 border-brown-200 bg-white text-brown-900 focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all cursor-pointer shadow-sm appearance-none"
                                            >
                                                <option value="" disabled>วัน</option>
                                                {(() => {
                                                    // Dynamic Max Days Logic
                                                    const currentY = dob ? parseInt(dob.split("-")[0]) : new Date().getFullYear();
                                                    const currentM = dob ? parseInt(dob.split("-")[1]) : 1;
                                                    const daysInMonth = new Date(currentY, currentM, 0).getDate();

                                                    return Array.from({ length: daysInMonth }, (_, i) => {
                                                        const day = (i + 1).toString().padStart(2, "0");
                                                        return <option key={day} value={day}>{parseInt(day)}</option>;
                                                    });
                                                })()}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brown-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>

                                        {/* Month Selector */}
                                        <div className="relative">
                                            <select
                                                value={dob ? dob.split("-")[1] : ""}
                                                onChange={(e) => {
                                                    const m = e.target.value;
                                                    const d = dob ? dob.split("-")[2] : "01";
                                                    const y = dob ? dob.split("-")[0] : new Date().getFullYear().toString();
                                                    setDob(`${y}-${m}-${d}`);
                                                }}
                                                className="w-full h-14 pl-3 pr-8 text-lg font-medium rounded-2xl border-2 border-brown-200 bg-white text-brown-900 focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all cursor-pointer shadow-sm appearance-none"
                                            >
                                                <option value="" disabled>เดือน</option>
                                                {["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."].map((month, index) => {
                                                    const value = (index + 1).toString().padStart(2, "0");
                                                    return <option key={value} value={value}>{month}</option>;
                                                })}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brown-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>

                                        {/* Year Selector */}
                                        <div className="relative">
                                            <select
                                                value={dob ? dob.split("-")[0] : ""}
                                                onChange={(e) => {
                                                    const y = e.target.value;
                                                    const m = dob ? dob.split("-")[1] : "01";
                                                    const d = dob ? dob.split("-")[2] : "01";
                                                    setDob(`${y}-${m}-${d}`);
                                                }}
                                                className="w-full h-14 pl-3 pr-8 text-lg font-medium rounded-2xl border-2 border-brown-200 bg-white text-brown-900 focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all cursor-pointer shadow-sm appearance-none"
                                            >
                                                <option value="" disabled>ปี</option>
                                                {Array.from({ length: 100 }, (_, i) => {
                                                    const adYear = new Date().getFullYear() - i;
                                                    const beYear = adYear + 543;
                                                    return <option key={adYear} value={adYear}>{beYear}</option>;
                                                })}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brown-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={!dob || dob.split("-").length < 3}
                                    className="w-full h-14 bg-brown-900 hover:bg-brown-800 disabled:bg-brown-100 disabled:text-brown-400 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 flex-none"
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
                            className="bg-transparent md:bg-white/90 md:backdrop-blur-xl w-full md:w-[600px] md:h-[75vh] md:max-h-[800px] overflow-y-auto p-6 md:p-10 lg:p-16 rounded-none md:rounded-3xl shadow-none md:shadow-lg md:mt-16 border-none md:border md:border-white/50 flex flex-col justify-start md:justify-center relative"
                        >
                            <button
                                onClick={handleBack}
                                className="hidden md:block absolute top-6 left-6 text-brown-400 hover:text-brown-600 transition-colors p-2 -ml-2"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>

                            <h2 className="text-3xl md:text-4xl font-bold text-brown-900 mb-4 text-center">
                                เพศของคุณ
                            </h2>
                            <p className="text-lg text-brown-600 text-center mb-8">
                                ข้อมูลนี้จะช่วยในการวิเคราะห์ผลลัพธ์ทางการแพทย์
                            </p>

                            <div className="flex flex-col gap-4 mb-8">
                                {['male', 'female', 'other'].map((g) => (
                                    <button
                                        key={g}
                                        onClick={() => setGender(g)}
                                        className={`w-full group relative overflow-hidden rounded-2xl border-2 text-left transition-all p-6 hover:shadow-md
                                            ${gender === g
                                                ? 'border-orange-action bg-orange-50/50 shadow-md ring-1 ring-orange-action/20'
                                                : 'border-black/5 bg-gray-50/50 hover:bg-white hover:border-orange-action/30'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-8 h-8 rounded-full border-2 flex-none flex items-center justify-center transition-colors
                                                ${gender === g ? 'border-orange-action bg-white' : 'border-gray-300 group-hover:border-orange-action/50'}
                                            `}>
                                                {gender === g && <div className="w-4 h-4 rounded-full bg-orange-action" />}
                                            </div>

                                            <div className="flex flex-col">
                                                <span className={`text-xl font-bold transition-colors mb-1
                                                    ${gender === g ? 'text-orange-900' : 'text-brown-900'}
                                                `}>
                                                    {g === 'male' ? 'ชาย' : g === 'female' ? 'หญิง' : 'อื่นๆ'}
                                                </span>
                                                <span className="text-sm text-brown-400 group-hover:text-brown-600 transition-colors">
                                                    {g === 'male' ? 'สำหรับผู้ชาย' : g === 'female' ? 'สำหรับผู้หญิง' : 'ไม่ระบุเพศ'}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleNext}
                                disabled={!gender}
                                className="w-full h-14 bg-brown-900 hover:bg-brown-800 disabled:bg-brown-100 disabled:text-brown-400 disabled:cursor-not-allowed text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 flex-none"
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
                            className="bg-transparent md:bg-white/90 md:backdrop-blur-xl w-full md:w-[600px] md:h-[75vh] md:max-h-[800px] overflow-y-auto p-6 md:p-10 lg:p-16 rounded-none md:rounded-3xl shadow-none md:shadow-lg md:mt-16 border-none md:border md:border-white/50 flex flex-col justify-start md:justify-center relative"
                        >
                            <button
                                onClick={handleBack}
                                className="hidden md:block absolute top-6 left-6 text-brown-400 hover:text-brown-600 transition-colors p-2 -ml-2"
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
                                                    className="object-cover scale-108"
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
