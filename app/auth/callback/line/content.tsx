'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

function LineCallbackInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState('Initializing...')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code')
            const errorParam = searchParams.get('error')

            if (errorParam) {
                setError('LINE Login failed or was cancelled.')
                return
            }

            if (!code) {
                // Wait a bit, sometimes params are slow to mount? Unlikely but safe.
                // Actually, if no code, it's an error.
                setError('No authentication code received.')
                return
            }

            try {
                setStatus('Verifying with LINE...')
                const supabase = createClient()

                const { data, error: funcError } = await supabase.functions.invoke('line-auth', {
                    body: {
                        code,
                        redirectUri: `${window.location.origin}/auth/callback/line`
                    }
                })

                if (funcError) {
                    console.error('Function Error:', funcError)
                    throw new Error(funcError.message || 'Failed to authenticate with server.')
                }

                if (data?.session) {
                    setStatus('Logging you in...')
                    const { error: sessionError } = await supabase.auth.setSession(data.session)

                    if (sessionError) throw sessionError

                    router.push('/')
                    router.refresh()
                } else {
                    throw new Error('No session returned from server.')
                }

            } catch (err: any) {
                console.error('Login Error:', err)
                setError(err.message || 'An unexpected error occurred.')
            }
        }

        handleCallback()
    }, [searchParams, router])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-stone-100">
                    <div className="text-red-500 mb-4 text-5xl">⚠️</div>
                    <h1 className="text-xl font-bold text-stone-800 mb-2">Login Failed</h1>
                    <p className="text-stone-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full bg-stone-800 text-white py-3 rounded-xl font-medium hover:bg-stone-700 transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF9]">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-[#06C755] animate-spin" />
                <p className="text-stone-600 font-medium animate-pulse">{status}</p>
            </div>
        </div>
    )
}

export default function LineCallbackContent() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <LineCallbackInner />
        </Suspense>
    )
}
