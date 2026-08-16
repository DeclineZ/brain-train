# VitalMind authentication and Supabase setup

This document lists the environment variables and deployment steps for the
VitalMind launch/login flow and the internal module endpoints.

## Environment separation

Keep Next.js variables and Supabase Edge Function secrets separate. Never use a
`NEXT_PUBLIC_` prefix for a service-role/secret key, `MODULE_API_KEY`, or the
identity pepper.

### Next.js (`.env.local`)

```env
# Authentication mode: dual keeps legacy login available; vitalmind disables it.
AUTH_MODE=dual

# Development-only legacy login switch. Keep false in production.
ENABLE_DEV_LOGIN=false

# Public Supabase values used by the browser and Supabase SSR client.
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

# Server-only Supabase key used by Next.js internal routes.
# Never expose this value to the browser or commit it to Git.
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY

# Shared service-to-service key supplied by VitalMind.
# Used to authenticate POST /internal/patient-updated and
# GET /internal/patients/{patient_id}/results.
MODULE_API_KEY=YOUR_MODULE_API_KEY

# In-memory request limit per MODULE_API_KEY for each Next.js instance.
VITALMIND_RATE_LIMIT_PER_MINUTE=60
```

`SUPABASE_SERVICE_ROLE_KEY` is supported as a legacy fallback by the current
admin client, but use `SUPABASE_SECRET_KEY` for new configuration. Do not set
both unless required during migration.

After changing `.env.local`, restart Next.js:

```sh
npm run dev
```

### Supabase Edge Function secrets

The `vitalmind-auth` Edge Function requires:

```env
VITALMIND_LAUNCH_VERIFY_URL=https://vitalmind.example.com/auth/launch/verify
MODULE_API_KEY=YOUR_MODULE_API_KEY (form vitamind verify URL)
VITALMIND_IDENTITY_PEPPER=YOUR_LONG_RANDOM_PEPPER
ALLOWED_ORIGINS=https://braintrain.example.com
```

Set them without committing an environment file:

```sh
supabase secrets set \
  VITALMIND_LAUNCH_VERIFY_URL=https://vitalmind.example.com/auth/launch/verify \
  MODULE_API_KEY=YOUR_MODULE_API_KEY \
  VITALMIND_IDENTITY_PEPPER=YOUR_LONG_RANDOM_PEPPER \
  ALLOWED_ORIGINS=https://braintrain.example.com
```

For local browser testing, list exact origins separated by commas:

```sh
supabase secrets set \
  ALLOWED_ORIGINS=http://localhost:3000,https://braintrain.example.com
```

Hosted Supabase Edge Functions provide `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` automatically. Do not manually copy the service-role
key into browser or public Next.js variables.

## Variable purposes

| Variable | Location | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Next.js/browser | Public client key protected by RLS |
| `SUPABASE_SECRET_KEY` | Next.js server only | Privileged database and Auth admin operations |
| `MODULE_API_KEY` | Next.js and Edge | Authenticates service-to-service VitalMind requests |
| `VITALMIND_LAUNCH_VERIFY_URL` | Edge only | Real HTTPS endpoint for exchanging a launch token |
| `VITALMIND_IDENTITY_PEPPER` | Edge only | HMAC-protects synthetic patient email identities |
| `ALLOWED_ORIGINS` | Edge only | Exact browser origins allowed by CORS |
| `AUTH_MODE` | Next.js | Selects dual or VitalMind-only login |
| `ENABLE_DEV_LOGIN` | Next.js | Enables legacy login only in development |
| `VITALMIND_RATE_LIMIT_PER_MINUTE` | Next.js | Per-instance internal endpoint request limit |

Use the same `MODULE_API_KEY` value in Next.js and the Edge Function. Keep
`VITALMIND_IDENTITY_PEPPER` stable: changing it generates a different synthetic
email for the same `patient_id`.

## Database setup

Apply checked-in migrations before deploying the application or Edge Function:

```sh
supabase db push
```

The patient profile migration must provide:

- `public.vitalmind_patients.previous_profile jsonb`
- no `source_updated_at` column
- `public.update_vitalmind_patient_profile(text, text, text)` executable only by
  `service_role`

The update function atomically stores the previous name, writes the current
name, uses database `now()` for `updated_at`, and returns `auth_user_id`. An
unknown `patient_id` returns no row so the API can respond with HTTP 404.

## Deploy the authentication function

The user does not have a Supabase JWT before login, so deploy this function
without gateway JWT verification. The function verifies the one-time VitalMind
launch token before performing privileged operations.

```sh
supabase functions deploy vitalmind-auth --no-verify-jwt
```

Production source should be stored at:

```text
supabase/functions/vitalmind-auth/index.ts
```

Do not add a test-token bypass to the production function. Use a separate
staging function or mock VitalMind verification endpoint.

## Verify configuration

Check only whether local variables are populated without printing secrets:

```sh
awk -F= '/^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY|MODULE_API_KEY)=/{print $1 "=" ($2 == "" ? "missing" : "set")}' .env.local
```

Test an existing patient update:

```sh
curl --silent \
  --write-out '\nHTTP status: %{http_code}\n' \
  --request POST \
  http://localhost:3000/internal/patient-updated \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: YOUR_MODULE_API_KEY' \
  --data '{
    "patient_id": "AN_EXISTING_PATIENT_ID",
    "current": {
      "name": "New name",
      "surname": "New surname"
    }
  }'
```

Expected response:

```text
{"ok":true}
HTTP status: 200
```

An unknown patient must return:

```text
{"error":"Patient is unavailable","code":"PATIENT_NOT_FOUND"}
HTTP status: 404
```

## Production checklist

- Use the real HTTPS VitalMind verification URL.
- Use the agreed `MODULE_API_KEY` on both sides.
- Use an exact production `ALLOWED_ORIGINS` list; never use `*`.
- Keep `.env.local` and secret files out of Git.
- Never log launch tokens, Supabase sessions, API keys, or secret keys.
- Remove all temporary test users and mock endpoints before launch.
