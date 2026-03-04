"use client";

import { useState } from "react";
import { X, Copy, UserPlus, Check, Loader2 } from "lucide-react";

interface AddFriendModalProps {
    friendCode: string;
    onClose: () => void;
    onFriendAdded: () => void;
}

export default function AddFriendModal({ friendCode, onClose, onFriendAdded }: AddFriendModalProps) {
    const [inputCode, setInputCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(friendCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = friendCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSendRequest = async () => {
        if (inputCode.length !== 4) {
            setError("กรุณากรอกรหัส 4 หลัก");
            return;
        }

        if (inputCode === friendCode) {
            setError("ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ friendCode: inputCode }),
            });
            const json = await res.json();

            if (json.ok) {
                setSuccess("ส่งคำขอเป็นเพื่อนแล้ว!");
                setInputCode("");
                onFriendAdded();
                setTimeout(() => onClose(), 1500);
            } else {
                setError(json.error || "เกิดข้อผิดพลาด");
            }
        } catch {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-overlay/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-popup-bg rounded-2xl shadow-2xl w-full max-w-[calc(100vw-2rem)] sm:max-w-sm border-2 border-brown-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-action to-orange-dark px-5 py-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        เพิ่มเพื่อน
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                    {/* Your Code Section */}
                    <div>
                        <label className="block text-sm font-bold text-brown-darkest mb-2">
                            รหัสของคุณ
                        </label>
                        <div className="flex items-center gap-2 bg-cream rounded-xl border-2 border-brown-border px-3 py-2.5">
                            <span className="flex-1 text-xl sm:text-2xl font-mono font-bold text-brown-darkest tracking-[0.15em] sm:tracking-[0.25em] text-center select-all">
                                {friendCode}
                            </span>
                            <button
                                onClick={handleCopy}
                                className={`p-2 rounded-lg transition-all duration-200 active:scale-95 ${copied
                                    ? 'bg-green-success text-white'
                                    : 'bg-tan-light text-brown-medium hover:bg-gray-medium'
                                    }`}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-brown-medium mt-1 text-center">
                            บอกรหัสนี้ให้เพื่อนเพื่อเพิ่มคุณ
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-brown-border" />
                        <span className="text-xs text-brown-medium font-medium">หรือ</span>
                        <div className="flex-1 h-px bg-brown-border" />
                    </div>

                    {/* Add Friend Section */}
                    <div>
                        <label className="block text-sm font-bold text-brown-darkest mb-2">
                            กรอกรหัสเพื่อน
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                maxLength={4}
                                value={inputCode}
                                onChange={(e) => {
                                    setInputCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                                    setError(null);
                                    setSuccess(null);
                                }}
                                placeholder="XXXX"
                                className="flex-1 text-center text-xl sm:text-2xl font-mono font-bold tracking-[0.15em] sm:tracking-[0.25em] bg-cream border-2 border-brown-border rounded-xl px-3 py-2.5 text-brown-darkest placeholder:text-brown-lightest focus:outline-none focus:border-orange-action focus:ring-2 focus:ring-orange-action/20 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Error / Success Messages */}
                    {error && (
                        <div className="bg-red/10 border border-red/30 rounded-xl px-4 py-2 text-sm text-red font-medium text-center">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-success/10 border border-green-success/30 rounded-xl px-4 py-2 text-sm text-green-success font-medium text-center">
                            {success}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSendRequest}
                        disabled={loading || inputCode.length !== 4}
                        className="w-full flex items-center justify-center gap-2 bg-orange-action text-white py-3 rounded-xl font-bold shadow-md hover:bg-orange-hover disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5 transition-all duration-200"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <UserPlus className="w-5 h-5" />
                        )}
                        {loading ? "กำลังส่ง..." : "ส่งคำขอเป็นเพื่อน"}
                    </button>
                </div>
            </div>
        </div>
    );
}
