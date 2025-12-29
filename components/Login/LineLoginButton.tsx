'use client'

import { useState } from 'react'

export default function LineLoginButton() {
    const [loading, setLoading] = useState(false)

    const handleLineLogin = () => {
        setLoading(true)
        // Construct the LINE authorization URL
        const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '', // Assuming you'll expose this or we need to pass it differently
            redirect_uri: `${window.location.origin}/auth/callback/line`,
            state: crypto.randomUUID(), // Simple state for CSRF protection
            scope: 'profile openid',
        })

        // Note: NEXT_PUBLIC_LINE_CHANNEL_ID needs to be added to .env.local if not present,
        // or we can hardcode for now if the user gave it in the prompt, but env is better.
        // The user provided LINE_CHANNEL_ID in .env.local, but without NEXT_PUBLIC prefix it won't be available here.
        // We will assume for now we might need to use a server action or just ask user to rename/expose it.
        // Wait, the user shared .env.local content and it had LINE_CHANNEL_ID (no NEXT_PUBLIC).
        // I will use a hardcoded fallback with the ID they provided if env is missing, or instructed them.
        // User ID: 2008794022

        if (!params.get('client_id')) {
            params.set('client_id', '2008794022')
        }

        lineAuthUrl.search = params.toString()
        window.location.href = lineAuthUrl.toString()
    }

    return (
        <button
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-95 shadow-md"
        >
            {/* LINE Icon (SVG) */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M20.3 10.9C20.3 6.9 16.6 3.6 12 3.6C7.4 3.6 3.7 6.9 3.7 10.9C3.7 14.3 6.2 17.2 9.4 17.9V20.7C9.4 20.7 9.3 21.2 9.6 21.3C10 21.5 10.4 21.1 10.5 21L13.8 18.2H14.1C18.4 18.2 22 14.6 22 10.9H20.3ZM10.2 9H9.4V11.2H10.2V12H9.4V12.9H11.5V13.7H8.6V8.1H11.5V9H10.2ZM12.7 13.7H11.9V8.1H12.7V13.7ZM15.2 13.7L14.4 9.5V13.7H13.6V8.1H14.3L15.1 12.3V8.1H16V13.7H15.2ZM19.2 11.2H17.4V12H19.2V12.9H17.4V13.7H16.6V8.1H19.2V9H17.4V11.2H19.2V11.2Z" />
            </svg>
            {loading ? 'Connecting...' : 'Continue with LINE'}
        </button>
    )
}
