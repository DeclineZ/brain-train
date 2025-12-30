"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import QuestNotification from "./QuestNotification";

function QuestNotificationManagerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        if (searchParams.get("questComplete") === "true") {
            setShowNotification(true);

            // Clean up the URL
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete("questComplete");
            router.replace(`/?${newParams.toString()}`, { scroll: false });
        }
    }, [searchParams, router]);

    if (!showNotification) return null;

    return (
        <QuestNotification onClose={() => setShowNotification(false)} />
    );
}

export default function QuestNotificationManager() {
    return (
        <Suspense fallback={null}>
            <QuestNotificationManagerContent />
        </Suspense>
    );
}
