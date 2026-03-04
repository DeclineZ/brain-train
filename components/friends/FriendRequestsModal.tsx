"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { getAvatarSrc } from "@/lib/utils";
import Image from "next/image";

interface FriendRequest {
    id: string;
    from_user_id: string;
    from_avatar_url: string | null;
    from_display_name: string;
    created_at: string;
}

interface FriendRequestsModalProps {
    onClose: () => void;
    onRequestHandled: () => void;
}

export default function FriendRequestsModal({ onClose, onRequestHandled }: FriendRequestsModalProps) {
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/friends/requests");
            const json = await res.json();
            if (json.ok) {
                setRequests(json.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch requests:", err);
        }
        setLoading(false);
    };

    const handleAction = async (requestId: string, action: "accept" | "reject") => {
        setActionLoading(requestId);
        try {
            const res = await fetch("/api/friends/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, action }),
            });
            const json = await res.json();
            if (json.ok) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
                onRequestHandled();
            }
        } catch (err) {
            console.error("Failed to handle request:", err);
        }
        setActionLoading(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-overlay/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-popup-bg rounded-2xl shadow-2xl w-full max-w-sm border-2 border-brown-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue to-blue-dark px-5 py-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">
                        คำขอเป็นเพื่อน
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 text-blue animate-spin" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-brown-medium text-sm">ไม่มีคำขอเป็นเพื่อน</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((req) => (
                                <div
                                    key={req.id}
                                    className="flex items-center gap-3 bg-cream rounded-xl border border-brown-border p-3"
                                >
                                    {/* Avatar */}
                                    <div className="w-11 h-11 rounded-full overflow-hidden bg-tan-light border-2 border-brown-border flex-shrink-0">
                                        <Image
                                            src={getAvatarSrc(req.from_avatar_url)}
                                            alt="avatar"
                                            width={44}
                                            height={44}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-brown-darkest truncate">
                                            {req.from_display_name}
                                        </p>
                                        <p className="text-xs text-brown-medium">
                                            {new Date(req.created_at).toLocaleDateString('th-TH', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {actionLoading === req.id ? (
                                            <Loader2 className="w-5 h-5 text-brown-medium animate-spin" />
                                        ) : (
                                            <>
                                                {/* Accept - Green Checkmark */}
                                                <button
                                                    onClick={() => handleAction(req.id, "accept")}
                                                    className="w-9 h-9 rounded-full bg-green-success flex items-center justify-center text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                                                    aria-label="รับเพื่อน"
                                                >
                                                    <Check className="w-5 h-5" strokeWidth={3} />
                                                </button>

                                                {/* Reject - Red X */}
                                                <button
                                                    onClick={() => handleAction(req.id, "reject")}
                                                    className="w-9 h-9 rounded-full bg-red flex items-center justify-center text-white shadow-md hover:brightness-110 active:scale-95 transition-all"
                                                    aria-label="ไม่รับเพื่อน"
                                                >
                                                    <X className="w-5 h-5" strokeWidth={3} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
