# Braintrian Bot — setup และทดสอบ login

สำหรับ RunJump (`app_id=runjump`) ใช้ secret ของฟีเจอร์ **3 ตัว**: Bot API key, encryption key และ identity pepper โดยไม่นับ Supabase key เดิม ดูค่าที่ต้องตั้งและแหล่งที่มาใน [Env และ secrets](braintrian-bot-env.md)

## สถานะที่ทำไว้

บันทึกการ deploy วันที่ 16 ตุลาคม 2026 ใน Supabase โปรเจกต์ `xppyxhzhkalwuzbczdrt`:

- Migration `20261016071832_braintrian_auth` apply แล้ว
- Edge Function `braintrian-bot` deploy เป็น version 12 แล้ว ใช้ Supabase server key แทน internal key และตรวจ Bot header ก่อน fetch
- ทดสอบ endpoint จริงแล้ว: ไม่มี key/public key ได้ 401; server key ที่ตั้งในเครื่องผ่าน authentication และได้ 400 เมื่อส่ง body ว่าง
- ยังไม่ได้ยืนยันว่า secret ทุกตัวตั้งครบ หรือ login ผ่าน LINE จริงสำเร็จ

ไม่ต้องรัน migration เดิมซ้ำ สำหรับโปรเจกต์ใหม่ให้ตรวจ schema ของ `user_profiles` และ Auth signup trigger ก่อน apply

ไฟล์ที่ใช้:

- [SQL migration](../supabase/migrations/20261016071832_braintrian_auth.sql)
- [Edge Function](../supabase/functions/braintrian-bot/index.ts)

## วิธีทำงาน

```text
LINE: เริ่ม RunJump
  → Bot ส่ง /auth/line-bot?code=...
  → Next.js เก็บ claim ชั่วคราวและ cookie ผูก browser
  → 303 /auth/line-bot/continue?claim=...
  → หน้าเว็บ POST /auth/line-bot/claim อัตโนมัติ
  → Next.js POST /functions/v1/braintrian-bot ด้วย Supabase server key ใน apikey header
  → Edge POST https://brain-training-line-bot.vercel.app/api/launch/redeem
     ด้วย Bot API key และ Idempotency-Key เดิมของ claim
  → Bot คืน participant_id และ launch_id
  → Edge หา/สร้างบัญชี Supabase และสร้าง session
  → Next.js ตรวจ identity แล้วส่ง session cookie ให้ browser
  → /onboarding หรือ /
```

`braintrian_participants` เก็บ mapping ถาวร ส่วน `braintrian_auth_claims` เก็บสถานะ login ชั่วคราว `pending → redeemed → attached` เพื่อให้ retry ได้ ไม่ใช่ข้อมูล user journey

GET ไม่แลก code; POST เป็นคนเริ่มแลกจริง API key อยู่ฝั่ง server และผู้ใช้ไม่ต้องกด Login/Guest เพิ่ม ไม่มีการรวมบัญชีเดิมต่าง provider อัตโนมัติ

`BRAINTRIAN_INTERNAL_API_KEY` ไม่ใช้แล้ว ให้ deploy Edge และ Next.js ที่แก้ไขแล้วทั้งคู่ ก่อนลบ env เก่าหากยังมีอยู่

## ตั้งค่าและเปิดใช้

1. ตั้งค่าตาม [Env และ secrets](braintrian-bot-env.md) ทั้ง Next.js, Edge และ Bot โดยให้ encryption key และ Bot API key ที่ใช้ร่วมกันตรงกัน; ใช้ Supabase server key ของโปรเจกต์เดียวกันเพื่อเรียก Edge
2. สำหรับโปรเจกต์ใหม่ ให้ apply migration และ deploy Edge ก่อนเปิดใช้:

   ```sh
   supabase functions deploy braintrian-bot --project-ref <project-ref> --no-verify-jwt
   ```

   ปิด Verify JWT เฉพาะ `braintrian-bot`; handler ตรวจ Supabase secret/service-role key เอง
3. ตั้ง `BRAINTRIAN_OA_TESTING=true` แล้ว restart Next.js ในเครื่อง หรือ redeploy บน Vercel
4. ให้คนทำ Bot ตั้ง `RUNJUMP_ENTRY_URL` เป็น URL HTTPS ของเรา ตามด้วย `/auth/line-bot` แล้ว redeploy Bot
5. ทดสอบคำสั่งในแชตจริงก่อนเปิด Rich menu

## ทดสอบในเครื่อง

1. รันแอป:

   ```sh
   npm run dev -- --port 3002
   ```

2. เปิด HTTPS tunnel มาพอร์ต `3002` แล้วส่ง URL เช่น `https://<tunnel-domain>/auth/line-bot` ให้คนทำ Bot ตั้งเป็น `RUNJUMP_ENTRY_URL`
3. เพิ่มเพื่อน LINE OA `@636yjpzm` แล้วส่ง **`เริ่ม RunJump`** ในแชตส่วนตัว
4. กด Start จากลิงก์ใหม่ของ Bot ควรเข้า onboarding ถ้ายังไม่เสร็จ หรือ home ถ้าเสร็จแล้ว
5. ใน Supabase ตรวจว่ามี participant mapping และ claim เป็น `attached` พร้อม `encrypted_code = NULL`
6. ขอ fresh link ด้วย LINE คนเดิม ต้องกลับเข้าบัญชี Auth เดิม ลองผู้ใช้ B ต่อจาก A ใน browser เดียวกัน ต้องไม่เห็นข้อมูลของ A

`claimId` ฝั่งเราสร้างหลังเปิดลิงก์ ขอ **Start link ที่มี code จริง** จากคนทำ Bot ไม่ต้องขอ claim ID และสุ่ม UUID เองใช้ไม่ได้

## เมื่อ login ไม่ผ่าน

ดู **Supabase → Edge Functions → braintrian-bot → Logs** ข้อความหน้าเว็บอาจแสดงเพียง error แบบปลอดภัย

| อาการ / log | ตรวจอะไร |
| --- | --- |
| เข้า entry แล้ว unavailable | `BRAINTRIAN_OA_TESTING`, env ฝั่ง Next.js, server secret และ migration |
| `configuration` | Edge env ขาด/รูปแบบไม่ถูก หรือ built-in secret-key map ไม่ถูกต้อง; POST ที่ไม่มี apikey ต้องได้ 401 ไม่ใช่ 503 |
| `unauthorized` | ไม่ได้ส่ง Supabase server key ใน apikey, key อยู่คนละโปรเจกต์/ถูก revoke, ใช้ public key/user token หรือเรียกจาก browser ที่มี Origin |
| `claim_storage` | ตาราง/สิทธิ์ฐานข้อมูล หรือ encryption key ไม่ตรง |
| `bot_configuration` | Bot API key, endpoint หรือ response contract ไม่ตรง |
| Log `invalid_request_headers` | ค่า `OA_BOT_API_KEY` มีอักขระที่ HTTP header รับไม่ได้ เช่น newline หรือข้อความ placeholder ภาษาไทย ให้ใส่ key จริงจากเจ้าของ Bot ไม่ใช่ข้อความอธิบาย |
| `ALREADY_REDEEMED` | Bot เคยแลก code ด้วย idempotency key คนละตัวแล้ว ให้ retry claim เดิมใน browser เดิม หรือขอลิงก์ใหม่ |
| `EXPIRED_CODE` | ขอ Start link ใหม่จาก OA |
| Bot ตอบกำลังเตรียมแอป | ให้เจ้าของ Bot ตรวจ entry URL, RunJump key และ deployment |

Code ที่ยังไม่เคยแลกมีอายุเริ่มต้น 15 นาที; claim ฝั่งเรามีอายุ 24 ชั่วโมงสำหรับ recovery ไม่ได้ยืดอายุ code เดิม Retry ใช้ code และ idempotency key เดิม; เปลี่ยน key หลังใช้ code แล้วจะได้ `409 ALREADY_REDEEMED` จาก Bot

## ดูแลหลังเปิดใช้

- ตั้ง cleanup แล้วเมื่อ 16 ตุลาคม 2026 ผ่าน MCP migration `20261016115447_schedule_braintrian_expired_claims_cleanup`:
  - ติดตั้ง `pg_cron` version `1.6.4`
  - Job `braintrian-expired-claims-cleanup` (job ID `1`) สถานะ active
  - รันทุกวัน **03:00 น. เวลาไทย** ใช้ cron `0 20 * * *` เพราะ scheduler เป็น GMT/UTC
  - ลบเฉพาะ claim ที่หมดอายุ ไม่ลบ participant mapping, Auth user หรือ claim ที่ยังใช้งานได้
  - ทดสอบ SQL cleanup แล้วลบ 0 แถว เพราะยังไม่มี claim หมดอายุ; ยังไม่ใช่หลักฐานว่ารอบอัตโนมัติแรกทำงานแล้ว

  คำสั่งของ job:

  ```sql
  delete from public.braintrian_auth_claims where expires_at <= now();
  ```

  ตรวจ schedule และประวัติได้ที่ Supabase Cron หรือ SQL:

  ```sql
  select jobid, jobname, schedule, active
  from cron.job
  where jobname = 'braintrian-expired-claims-cleanup';

  select status, return_message, start_time, end_time
  from cron.job_run_details
  where jobid = (
    select jobid from cron.job
    where jobname = 'braintrian-expired-claims-cleanup'
  )
  order by start_time desc
  limit 10;
  ```

  ถ้าต้องยกเลิกเฉพาะ cleanup ใช้ `select cron.unschedule('braintrian-expired-claims-cleanup');` ไม่ต้องถอน extension ดู [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart)

- เก็บ mapping และบัญชีไว้ ไม่ลบตาม claim
- ไม่ log code, full Start URL, secret, encrypted code หรือ session token; ตั้ง hosting logs ให้ redact query ของ `/auth/line-bot`
- รัน `npm run test:braintrian` สำหรับ offline tests; ต้องทดสอบ LINE จริงเพิ่มเสมอ
- ทดสอบลิงก์หมดอายุ, refresh/retry และเน็ตหลุดระหว่าง login โดยไม่สร้างบัญชีซ้ำ
- หากต้องปิดฟีเจอร์ ตั้ง `BRAINTRIAN_OA_TESTING=false` แล้ว redeploy และประสานปิด menu action ฝั่ง Bot

เอกสารนี้ครอบคลุม authentication เท่านั้น ไม่ได้ยืนยันว่า requirements ของ user journey/events/export ทำเสร็จแล้ว
