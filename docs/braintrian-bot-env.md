# Braintrian Bot — ตั้งค่า env และ secret

ฟีเจอร์นี้ใช้ **secret ของฟีเจอร์ 3 ตัว**: รับจากคนทำ Bot 1 ตัว และสร้างเอง 2 ตัว ไม่รวม Supabase key เดิมที่แอปใช้อยู่แล้ว

## Secret ของฟีเจอร์ 3 ตัว

| Secret | เอามาจากไหน | ตั้งที่ไหน | ใช้ทำอะไร |
| --- | --- | --- | --- |
| `OA_BOT_API_KEY` | ขอ RunJump key จากคนทำ Bot ผ่านช่องทางปลอดภัย | Supabase Edge Secrets | ให้ Edge เรียก Bot; ต้องตรงกับ `RUNJUMP_API_KEY` ฝั่ง Bot |
| `BRAINTRIAN_CLAIM_ENCRYPTION_KEY` | สร้างเอง เป็น hex ตัวเล็ก 64 ตัว | Next.js และ Supabase Edge Secrets ใช้ค่าเดียวกัน | เข้ารหัส code ที่เก็บชั่วคราวเพื่อ retry |
| `BRAINTRIAN_IDENTITY_PEPPER` | สร้างเอง อย่างน้อย 32 ตัวอักษร | Supabase Edge Secrets เท่านั้น | สร้างอีเมลจำลองของ participant สำหรับ Supabase Auth |

Bot API ต้องการเฉพาะตัวแรก อีก 2 ตัวเป็นวิธีจัดการ claim และบัญชีใน implementation ของเรา ส่วน Next.js เรียก Edge ด้วย Supabase server key เดิม ไม่ต้องมี internal key แยก

สร้าง secret ที่เราดูแลด้วยคำสั่งนี้ **2 ครั้ง** ให้ได้คนละค่า:

```sh
openssl rand -hex 32
```

ใช้ค่าหนึ่งเป็น encryption key และอีกค่าเป็น pepper อย่าใช้ค่าเดียวกันทั้งสองตัว หากมีค่าที่ใช้งานอยู่แล้วให้ใช้ค่าเดิม ไม่ต้องสร้างใหม่เพื่อทดสอบ

## 1. Next.js / RunJump

ตั้งใน `.env.local` สำหรับเครื่องเรา หรือ **RunJump Vercel → Settings → Environment Variables** สำหรับเว็บที่ deploy

```dotenv
# ค่า Supabase เดิม: ดูจากโปรเจกต์ Supabase เดียวกับ Edge
NEXT_PUBLIC_SUPABASE_URL=https://xppyxhzhkalwuzbczdrt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
SUPABASE_SECRET_KEY=<Supabase server secret key>

# ฟีเจอร์ OA login
BRAINTRIAN_OA_TESTING=true
BRAINTRIAN_CLAIM_ENCRYPTION_KEY=<encryption key>
```

`BRAINTRIAN_OA_TESTING` ตั้งเฉพาะ Next.js: `true` เปิด OA login, `false` หรือไม่ตั้งจะปิด ไม่ต้องใส่ใน Edge หรือ LINE Bot และไม่ใช่โหมดจำลอง—เมื่อเปิดจะใช้ Bot/Supabase จริง

Supabase URL ดูจาก Connect/API settings; publishable key และ server secret ดูจาก **Settings → API Keys** ห้ามใส่ server secret ในตัวแปร `NEXT_PUBLIC_*` ตัว entry/claim ต้องใช้ server secret; โค้ดรองรับ `SUPABASE_SERVICE_ROLE_KEY` เป็น fallback ด้วย Next.js ส่ง server key นี้ใน header `apikey` ไปยัง Edge; ไม่ส่งไป browser และไม่ส่งเป็น Bearer token

เปลี่ยน `.env.local` แล้ว restart dev server; เปลี่ยน Vercel env แล้ว redeploy โดยเลือก environment ให้ตรงกับเว็บที่ทดสอบ หากต้องการเก็บหน้า login ปกติไว้ให้ใช้ `AUTH_MODE=dual` แต่ไม่ใช่ค่าบังคับของ OA login

## 2. Supabase Edge Function

ตั้งใน **Supabase โปรเจกต์เดียวกัน → Edge Functions → Secrets**

```dotenv
OA_BOT_BASE_URL=https://brain-training-line-bot.vercel.app
OA_BOT_API_KEY=<RunJump key ที่ได้จากคนทำ Bot>
BRAINTRIAN_CLAIM_ENCRYPTION_KEY=<encryption key เดียวกับ Next.js>
BRAINTRIAN_IDENTITY_PEPPER=<pepper แยกอีกค่าหนึ่ง>
```

`OA_BOT_BASE_URL` คือ origin เท่านั้น ไม่ต้องเติม `/api/launch/redeem` ส่วน hosted Supabase มี `SUPABASE_SECRET_KEYS` (JSON map ของ secret keys), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ให้ Edge อยู่แล้ว ไม่ต้องตั้งค่าเหล่านี้ซ้ำ หากใช้ secret key แบบใหม่ใน Next.js ต้องเป็น key ของโปรเจกต์เดียวกันที่อยู่ใน map นี้

Function ชื่อ `braintrian-bot` และปิด **Verify JWT เฉพาะ function นี้** เพราะ handler ตรวจ `apikey` กับ Supabase secret keys ที่ platform inject ให้ หรือ legacy service-role key และปฏิเสธ public key/user token ไม่ได้เปิดให้ browser เรียกโดยตรง

## 3. ฝั่งคนทำ LINE Bot

ให้คนทำ Bot ตั้งใน **Vercel โปรเจกต์ Bot** แล้ว redeploy:

```dotenv
RUNJUMP_ENTRY_URL=https://<RunJump-domain-or-tunnel>/auth/line-bot
RUNJUMP_API_KEY=<ค่าเดียวกับ OA_BOT_API_KEY ของ Edge>
```

ส่ง URL ของเราให้คนทำ Bot โดยไม่ใส่ `?code=...` ตัว Bot จะเติมเอง ถ้าทดสอบในเครื่อง ให้ใช้ HTTPS tunnel ที่ชี้มาพอร์ต dev server เช่น `3002`; มือถือเข้า localhost ของเครื่องเราไม่ได้

LINE webhook ฝั่ง Bot ต้องเป็น `https://brain-training-line-bot.vercel.app/api/line/webhook` และเปิด Use webhook ส่วน LINE token/channel secret เป็นของคนทำ Bot ไม่ต้องส่งมาใส่ RunJump

## จำแค่นี้

```text
Next.js Supabase server key → Edge ตรวจจาก built-in keys
Next.js encryption key = Edge encryption key
Edge Bot API key       = Bot RUNJUMP_API_KEY
Pepper                 = แยกอีกค่า อยู่ที่ Edge เท่านั้น
```

`BRAINTRIAN_INTERNAL_API_KEY` เลิกใช้แล้ว สามารถลบค่าตัวนี้จาก Next.js และ Edge Secrets ได้หลัง deploy ทั้งสองฝั่ง

เก็บ pepper ให้คงที่ และอย่าเปลี่ยน encryption key ระหว่างที่ claim เดิมยังต้อง retry ห้ามใส่ secret จริงลง docs, source code หรือแชต

ขั้นตอน deploy/test: [Braintrian Bot setup](braintrian-bot-setup.md)

อ้างอิง: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Edge secrets](https://supabase.com/docs/guides/functions/secrets), [Vercel env](https://vercel.com/docs/environment-variables)
