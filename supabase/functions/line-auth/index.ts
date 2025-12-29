import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('LINE Auth Function initializing...')

Deno.serve(async (req: Request) => {
    // CORS Support
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        console.log('Received request')
        const body = await req.json()
        const { code, redirectUri } = body
        console.log('Request body parsed. Code present:', !!code)

        if (!code) {
            console.error('No code provided in body')
            return new Response(JSON.stringify({ error: 'No code provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const channelId = Deno.env.get('LINE_CHANNEL_ID')
        const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET')
        const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

        if (!channelId || !channelSecret || !serviceRoleKey) {
            console.error('Missing Secrets:', {
                hasId: !!channelId,
                hasSecret: !!channelSecret,
                hasServiceKey: !!serviceRoleKey
            })
            throw new Error('Supabase Secrets are not configured correctly.')
        }

        console.log('Secrets verified. Exchanging code for token...')

        // 1. Exchange code for access token
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                client_id: channelId,
                client_secret: channelSecret,
            }),
        })

        const tokenData = await tokenResponse.json()
        console.log('Token response status:', tokenResponse.status)

        if (!tokenResponse.ok) {
            console.error('LINE Token Error Body:', JSON.stringify(tokenData))
            throw new Error(tokenData.error_description || 'Failed to exchange code')
        }

        // 2. Get User Profile
        console.log('Token received. Fetching profile...')
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })

        const profileData = await profileResponse.json()
        console.log('Profile response status:', profileResponse.status)

        if (!profileResponse.ok) {
            console.error('LINE Profile Error:', profileData)
            throw new Error('Failed to fetch user profile')
        }

        const { userId, displayName, pictureUrl } = profileData
        console.log('Profile fetched for user:', userId)

        // 3. User Management Strategy
        // 3. User Management Strategy
        const email = `line_${userId}@example.com`
        // Truncate password to avoid 72-byte bcrypt limit. 
        // Using a combination of secret + userId, sliced to 64 chars.
        const password = (channelSecret + userId + 'BrainTrainLineAuth').substring(0, 64)

        console.log('Connecting to Supabase Admin...')
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // A. Attempt to Sign In
        console.log('Attempting sign in...')
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        })

        if (!signInError && signInData.session) {
            console.log('Sign in successful.')
            // Optional: Update profile
            await supabaseAdmin.auth.updateUser({
                data: {
                    full_name: displayName,
                    avatar_url: pictureUrl,
                    line_user_id: userId
                }
            })

            return new Response(JSON.stringify({
                session: signInData.session,
                user: signInData.user
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            })
        }

        // B. Create User
        console.log('Sign in failed (expected if new user). Creating user...')
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: displayName,
                avatar_url: pictureUrl,
                provider: 'line',
                line_user_id: userId
            }
        })

        if (createError) {
            console.error('Create User Error:', createError)
            throw new Error('Failed to create user record: ' + createError.message)
        }

        console.log('User created. Signing in...')
        // C. Sign In the new user
        const { data: finalSignIn, error: finalError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
        })

        if (finalError) {
            console.error('Final Sign In Error:', finalError)
            throw finalError
        }

        console.log('Final sign in successful.')
        return new Response(JSON.stringify({
            session: finalSignIn.session,
            user: finalSignIn.user
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        })

    } catch (error) {
        console.error('Unhandled Error in Handler:', error)
        return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            }
        })
    }
})
