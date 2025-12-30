"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import LogoHeader from "@/components/LogoHeader";
import LineLoginButton from "@/components/Login/LineLoginButton";

export default function SignupPage() {
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
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
            if (!error) {
                setSuccess(true);
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
                    scopes: provider === 'facebook' ? 'public_profile' : undefined,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-cream flex md:gap-4 font-sans text-brown-800">

            {/* Desktop Left - Editorial Image Card */}
            <section className="hidden md:flex flex-1 bg-tan rounded-r-[2.5rem] relative overflow-hidden flex-col justify-end p-12 lg:p-16 text-white">
                <h1 className="absolute z-20 top-24 left-8 text-3xl font-bold text-brown-900">สมองฟิต ความคิดคม เริ่มต้นที่ความสนุก</h1>
                <LogoHeader className="absolute top-8 left-8 z-20" variant="desktop" />
                {/* Placeholder for future image */}
                <Image src="/bannera-no.png" layout="fill" objectFit="cover" alt="banner" />
            </section>

            {/* Right Pane - Signup Form */}
            <section className="flex-1 min-h-screen md:min-h-0 relative flex flex-col justify-center items-center p-6 md:p-12 lg:p-24 bg-cream">

                {/* Mobile Header */}
                <div className="md:hidden w-full absolute top-0 left-0 p-6 flex justify-center">
                    <LogoHeader variant="mobile" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[400px] space-y-8"
                >
                    <div className="translate-y-2">
                        <h2 className="font-sans text-4xl md:text-5xl text-brown-800 mb-3 tracking-tight font-bold">
                            เริ่มต้นใช้งาน
                        </h2>
                        <p className="text-brown-medium text-base">
                            สร้างบัญชีใหม่ของคุณวันนี้
                        </p>
                    </div>

                    {!success ? (
                        <form onSubmit={handleSignup} className="space-y-5">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-brown-800 ml-1">
                                        ชื่อ-นามสกุล
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-14 px-5 rounded-xl border-2 border-brown-border bg-white text-brown-800 placeholder:text-brown-light focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all font-medium text-lg"
                                        placeholder="ระบุชื่อของคุณ"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-brown-800 ml-1">
                                        อีเมล
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 px-5 rounded-xl border-2 border-brown-border bg-white text-brown-800 placeholder:text-brown-light focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all font-medium text-lg"
                                        placeholder="ระบุอีเมลของคุณ"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-sm font-bold text-brown-800 ml-1">
                                        รหัสผ่าน
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 px-5 rounded-xl border-2 border-brown-border bg-white text-brown-800 placeholder:text-brown-light focus:border-orange-action focus:ring-4 focus:ring-orange-action/10 outline-none transition-all font-medium text-lg"
                                        placeholder="ตั้งรหัสผ่าน"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold flex items-center gap-2 border border-red-100">
                                    <CheckCircle2 className="h-5 w-5 rotate-45" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 bg-orange-action hover:bg-orange-hover text-white text-lg font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 tracking-wide"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "ลงทะเบียน"}
                            </button>
                        </form>
                    ) : (
                        <div className="p-8 rounded-3xl bg-green-50 border border-green-200 text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-green-800 mb-2">ลงทะเบียนสำเร็จ!</h3>
                            <p className="text-green-700 font-medium">
                                กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <LineLoginButton />
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={() => handleOAuth("google")}
                                disabled={loading}
                                className="h-12 flex items-center justify-center gap-2 rounded-xl border-2 border-brown-border bg-white hover:bg-cream hover:border-orange-action text-brown-800 text-sm font-bold transition-all"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                                เข้าสู่ระบบด้วย Google
                            </button>
                        </div>
                    </div>

                    <div className="text-center pt-4">
                        <p className="text-sm text-brown-medium font-medium">
                            มีบัญชีอยู่แล้ว?{' '}
                            <a href="/login" className="text-orange-action font-bold hover:text-orange-hover hover:underline transition-all text-base">
                                เข้าสู่ระบบ
                            </a>
                        </p>
                    </div>
                </motion.div>
            </section>
        </main>
    );
}