"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Mail, Lock, Brain, Trophy, Zap, CheckCircle2, User, Calendar, Users } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    // const [dob, setDob] = useState(""); // Moved to /onboarding
    // const [gender, setGender] = useState(""); // Moved to /onboarding
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) throw error;
            // If signup is successful (and auto-confirm is enabled or unused), redirect to onboarding
            // Note: If email confirmation is required, this flow stops here until they click the link.
            // Assuming immediate login or non-strict for now:
            if (!error) {
                // We can't easily auto-login after signup without email confirm usually, 
                // but let's assume successful creation leads us to show a success message
                // OR if session exists, push to onboarding.
                setSuccess(true);
                // Optional: router.push('/onboarding'); // Only if we know they are logged in
            }
        } catch (err: any) {
            setError(err.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: "google" | "facebook") => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-cream flex flex-col md:flex-row-reverse text-brown-800 font-sans">
            {/* Right Side (Desktop) / Top (Mobile) - Signup Form */}
            <section className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-24 bg-white/50 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none z-10">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brown-900 mb-2">
                            สร้างบัญชีใหม่
                        </h2>
                        <p className="text-lg text-brown-600">
                            เข้าร่วมกับเราเพื่อเริ่มการฝึกสมอง
                        </p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="fullName"
                                    className="block text-lg font-medium mb-2 text-brown-800"
                                >
                                    ชื่อ-นามสกุล
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-brown-600" />
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-brown-900/20 bg-white text-lg focus:border-orange-action focus:ring-2 focus:ring-orange-action/20 outline-none transition-all placeholder:text-brown-600/50"
                                        placeholder="สมชาย ใจดี"
                                    />
                                </div>
                            </div>



                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-lg font-medium mb-2 text-brown-800"
                                >
                                    อีเมล
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-brown-600" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-brown-900/20 bg-white text-lg focus:border-orange-action focus:ring-2 focus:ring-orange-action/20 outline-none transition-all placeholder:text-brown-600/50"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-lg font-medium mb-2 text-brown-800"
                                >
                                    รหัสผ่าน
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-brown-600" />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-brown-900/20 bg-white text-lg focus:border-orange-action focus:ring-2 focus:ring-orange-action/20 outline-none transition-all placeholder:text-brown-600/50"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 text-base">
                                    <CheckCircle2 className="h-5 w-5 rotate-45 text-red-600" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-orange-action hover:bg-orange-600 text-white text-xl font-bold rounded-xl shadow-lg shadow-orange-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        กำลังลงทะเบียน...
                                    </>
                                ) : (
                                    "ลงทะเบียน"
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="p-8 rounded-2xl bg-green-50 border border-green-200 text-center space-y-4">
                            <CheckCircle2 className="h-16 w-16 text-green-success mx-auto" />
                            <h3 className="text-2xl font-bold text-green-800">ลงทะเบียนสำเร็จ!</h3>
                            <p className="text-green-700 text-lg">
                                กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี
                            </p>
                        </div>
                    )}

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t-2 border-brown-900/10" />
                        </div>
                        <div className="relative flex justify-center text-base uppercase">
                            <span className="bg-cream px-4 text-brown-600 font-semibold">
                                หรือลงทะเบียนด้วย
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => handleOAuth("google")}
                            disabled={loading}
                            className="h-14 flex items-center justify-center gap-2 rounded-xl border-2 border-brown-900/20 bg-white hover:bg-orange-50 text-brown-900 font-semibold text-lg transition-all active:scale-[0.98]"
                        >
                            <svg className="h-6 w-6" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Google
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOAuth("facebook")}
                            disabled={loading}
                            className="h-14 flex items-center justify-center gap-2 rounded-xl border-2 border-brown-900/20 bg-white hover:bg-orange-50 text-brown-900 font-semibold text-lg transition-all active:scale-[0.98]"
                        >
                            <svg className="h-6 w-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v2.225l-.333.006c-2.769 0-3.853 1.18-3.853 3.845v1.185h4.8l-.673 3.667h-4.127v7.98h-2.738z" />
                            </svg>
                            Facebook
                        </button>
                    </div>

                    <div className="text-center pt-4">
                        <a href="/login" className="text-lg font-medium text-orange-action hover:text-orange-600 hover:underline underline-offset-4">
                            มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                        </a>
                    </div>
                </div>
            </section>

            {/* Left Side (Desktop) / Bottom (Mobile) - App Info */}
            <section className="flex-1 bg-tan/20 flex flex-col justify-center items-center p-8 md:p-12 lg:p-24 border-t-4 md:border-t-0 md:border-r-4 border-brown-900/10">
                <div className="max-w-md text-center md:text-left space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-brown-900 leading-tight">
                            เริ่มต้นการเดินทาง <br />
                            <span className="text-orange-action">สู่สมองที่แข็งแรง</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-brown-800 leading-relaxed font-medium">
                            สมัครสมาชิกวันนี้เพื่อเข้าถึงแบบฝึกหัดพัฒนาสมองระดับคลินิก
                        </p>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-4 bg-white/60 p-4 rounded-2xl shadow-sm border border-brown-900/5">
                            <div className="h-12 w-12 rounded-full bg-orange-action/10 flex items-center justify-center flex-shrink-0">
                                <Brain className="h-7 w-7 text-orange-action" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-lg text-brown-900">ฝึกฝนทุกวัน</h3>
                                <p className="text-brown-600">โปรแกรมที่ปรับให้เหมาะกับคุณ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/60 p-4 rounded-2xl shadow-sm border border-brown-900/5">
                            <div className="h-12 w-12 rounded-full bg-green-success/10 flex items-center justify-center flex-shrink-0">
                                <Trophy className="h-7 w-7 text-green-success" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-lg text-brown-900">ดูผลลัพธ์จริง</h3>
                                <p className="text-brown-600">ติดตามพัฒนาการของคุณอย่างต่อเนื่อง</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
