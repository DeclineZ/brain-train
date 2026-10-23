# In-Game Telemetry & User Journey Catalog

เอกสารฉบับนี้เป็น **Single Source of Truth** สำหรับข้อมูลพฤติกรรมผู้เล่น (In-Game User Journey & Telemetry Tracking) ในมินิเกม Phaser ทุกเกมของโปรเจกต์ Brain Train ซึ่งข้อมูลทั้งหมดจะถูกส่งและจัดเก็บในตาราง `analytics_events` บน Supabase

---

## 📌 สรุปความคืบหน้ารายเกม (Implementation Progress)

| ลำดับ | รหัสเกม (`game_id`) | ชื่อเกม | สถานะ | หมายเหตุ |
|:---:|---|---|:---:|---|
| 01 | `game-01-cardmatch` | Card Match (จับคู่การ์ด) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 02 | `game-02-sensorlock` | Sensor Lock (จับทิศทางลูกศร) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 03 | `game-03-billiards-math` | Billiards Math (สนุ๊กเกอร์คณิตศาสตร์) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 04 | `game-04-floating-ball-math` | Floating Ball Math | ⏳ รอทำ | |
| 05 | `game-05-spot-shadow` | Spot Shadow | ⏳ รอทำ | |
| 06 | `game-06-traffic-control` | Traffic Control | ⏳ รอทำ | |
| 07 | `game-07-color-tap` | Color Tap | ⏳ รอทำ | |
| 08 | `game-08-mystery-sound` | Mystery Sound | ⏳ รอทำ | |
| 09 | `game-09-food-drop` | Food Drop | ⏳ รอทำ | |
| 10 | `game-10-miner` | Miner | ⏳ รอทำ | |
| 11 | `game-11-pipe-patch` | Pipe Patch | ⏳ รอทำ | |
| 12 | `game-12-run-for-your-life` | Run for Your Life | ⏳ รอทำ | |
| 13 | `game-13-color-match` | Color Match | ⏳ รอทำ | |
| 14 | `game-14-symbol-touch` | Symbol Touch | ⏳ รอทำ | |
| 15 | `game-15-visual-tracking` | Visual Tracking | ⏳ รอทำ | |
| 16 | `game-16-maze-escape` | Maze Escape | ⏳ รอทำ | |
| 17 | `game-17-memory-cards` | Memory Cards | ⏳ รอทำ | |
| 18 | `game-18-target-aim` | Target Aim | ⏳ รอทำ | |
| 19 | `game-19-pattern-repeat` | Pattern Repeat | ⏳ รอทำ | |
| 20 | `game-20-balance-beam` | Balance Beam | ⏳ รอทำ | |
| 21 | `game-21-parking-jam` | Parking Jam | ⏳ รอทำ | |

---

## 🗄️ โครงสร้างฐานข้อมูล: `analytics_events`

ทุก Event ที่ถูกส่งออกมา จะมี Context หลักดังนี้:

| ฟิลด์ | ชนิดข้อมูล | คำอธิบาย |
|---|---|---|
| `id` | `bigint` | Primary Key อัตโนมัติ |
| `event_id` | `uuid` | Client-generated UUID สำหรับ Deduplication |
| `user_id` | `uuid` | รหัสผู้ใช้จากระบบ Auth (null หากยังไม่ล็อกอิน) |
| `participant_id` | `uuid` | รหัสผู้ร่วมวิจัยจาก LINE OA (จัดการโดย Server) |
| `journey_id` | `uuid` | รหัสรอบการเข้าใช้งานของผู้ใช้ |
| `session_id` | `text` | Tab session ID |
| `attempt_id` | `uuid` | Session UUID ของการเล่นรอบนั้น (เชื่อมโยงกับ `game_sessions.raw_data->>'attempt_id'`) |
| `event` | `text` | ชื่อ Event เช่น `level_started`, `card_flipped`, `ball_shot` |
| `game_id` | `text` | รหัสเกม เช่น `game-01-cardmatch`, `game-03-billiards-math` |
| `level` | `int` | ด่านที่เล่น (เป็น `0` เมื่อเป็นโหมดสอนเล่น/Tutorial) |
| `seq` | `int` | ลำดับการเกิด Event ในรอบการเล่นนั้น ๆ เริ่มต้นที่ `0` |
| `t_ms` | `int` | มิลลิวินาทีที่ผ่านไปนับตั้งแต่จุดเริ่มต้นของด่าน (`level_started`) |
| `props` | `jsonb` | Payload ข้อมูลเฉพาะของแต่ละ Event |
| `occurred_at` | `timestamptz` | เวลาที่เกิด Event จากฝั่ง Client (ISO 8601) |
| `received_at` | `timestamptz` | เวลาที่ Server ได้รับข้อมูล |
| `device` | `jsonb` | ข้อมูลเครื่อง เช่น `{ os, browser, screen_w, screen_h, touch }` |

---

## 🌐 Common Events (Event กลางที่ทุกเกมมี)

| Event | จุดที่ทำงานในโค้ด | Payload ใน `props` | คำอธิบาย |
|---|---|---|---|
| `level_started` | เริ่มต้นเล่นด่าน | `{ level, total_*, difficulty_multiplier, time_limit_ms, seed }` | ผู้เล่นพร้อมเล่นเกม เริ่มนับเวลา `t_ms = 0` |
| `level_ended` | จบการเล่นด่าน | `{ outcome: 'success' \| 'fail' \| 'timeout' \| 'completed', score, stars, actions, errors }` | สรุปผลลัพธ์รอบการเล่น |
| `input_raw` | แตะ/คลิกหน้าจอ Phaser | `{ x, y, target, t_ms }` | จับพิกัดหน้าจอทุกการแตะ เพื่อวิเคราะห์ Heatmap / Fitts's law |
| `input_ignored` | แตะในจังหวะที่เกมล็อก | `{ reason: 'locked' \| 'already_selected' \| 'spam_lockout' \| 'tutorial_retry' }` | ช่วยวัดการกดรัว/ความใจร้อน/ความสับสน |
| `time_warning` | แถบเวลานับถอยหลัง | `{ remaining_ms }` | ยิงเมื่อเวลาเหลือน้อย ($\le 25\%$) เพื่อวัดพฤติกรรมภายใต้แรงกดดัน |
| `time_up` | หมดเวลาการเล่น | `{}` | แจ้งเตือนจังหวะเวลาหมด |
| `level_paused` | หน้าต่าง Pause หรือ Modal | `{ reason: 'timeout_popup' \| 'phase_transition' }` | ตัวเกมถูกหยุดชั่วคราว |
| `level_resumed` | กดเล่นต่อ | `{ reason, penalty }` | ตัวเกมกลับมาทำงานต่อ |
| `tutorial_step_shown` | ขั้นตอนโหมดสอนเล่น | `{ step, name }` | แสดงขั้นตอนการสอน |
| `tutorial_step_done` | ผ่านขั้นตอนสอนเล่น | `{ step }` | ผู้เล่นทำตามที่ระบบแนะนำสำเร็จ |

---

## 🎮 รายละเอียด Event เจาะลึกรายเกม (Per-Game Catalog)

---

### 01 · Card Match (`game-01-cardmatch`)
> **ทักษะที่วัด:** ความจำขณะทำงาน (Working Memory), การจับคู่ภาพและตรรกะ, ความเร็วในการตอบสนอง

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `preview_started` | `startPreviewPhase()` | `{ preview_ms: number }` | เริ่มช่วงเวลาเปิดการ์ดให้จำตำแหน่ง (ms) |
| `card_flipped` | `handleCardClick()` | `card_index: number`<br>`row: number`<br>`col: number`<br>`pair_id: string`<br>`flip_in_turn: 1 \| 2`<br>`times_seen_before: number`<br>`rt_ms: number` | เปิดการ์ดใบที่ 1 หรือ 2 ในตานั้น พร้อมเวลา Reaction Time |
| `pair_checked` | `checkMatch()` | `card_a_index: number`<br>`card_b_index: number`<br>`correct: boolean`<br>`was_repeated_error: boolean`<br>`consecutive_errors: number`<br>`pairs_remaining: number`<br>`rt_ms: number` | ตรวจสอบผลคู่การ์ด บอกว่าจับคู่ถูกหรือไม่ เป็นการเปิดผิดซ้ำตำแหน่งเดิมหรือไม่ |
| `hint_shown` | `showLevelHint()` | `{ hint_key: string }` | กล่องตัวช่วยใบ้เปิดขึ้นมา |
| `hint_closed` | กดปิด Hint | `{ hint_key: string, shown_ms: number }` | ระยะเวลาที่ผู้เล่นอ่าน Hint ก่อนปิด |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `card_<index>`: การ์ดแต่ละใบ เช่น `card_0`, `card_1`
- `btn_hint`: ปุ่มตัวช่วย

---

### 02 · Sensor Lock (`game-02-sensorlock`)
> **ทักษะที่วัด:** การควบคุมการยับยั้งชั่งใจ (Inhibitory Control / Stroop-like), ความยืดหยุ่นทางความคิด (Cognitive Flexibility)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `stimulus_shown` | `showNextCard()` | `trial: number`<br>`phase: number`<br>`card_color: string`<br>`card_direction: string`<br>`is_mismatch: boolean`<br>`has_not_badge: boolean`<br>`buttons_swapped: boolean`<br>`response_window_ms: number` | การ์ดลูกศรปรากฏบนหน้าจอ พร้อมกฎเงื่อนไขประจำรอบ |
| `response_given` | `handleInput()` | `trial: number`<br>`said_match: boolean`<br>`correct: boolean`<br>`rt_ms: number`<br>`streak: number`<br>`button_side: 'left' \| 'right'`<br>`trials_since_swap: number` | ผู้เล่นกดปุ่มตอบ ตอบถูก/ผิด Reaction Time และระยะนับตั้งแต่สลับปุ่มล่าสุด |
| `response_timeout` | `handleTimeout()` | `{ trial: number, streak_lost: number }` | ผู้เล่นตอบไม่ทันเวลาในการ์ดใบนั้น |
| `buttons_swapped` | `swapButtons()` | `{ trial: number }` | ตำแหน่งปุ่ม 'ตรง' กับ 'ไม่ตรง' เกิดการสลับข้างกัน |
| `phase_changed` | `checkPhaseProgression()` | `{ from_phase: number, to_phase: number, score: number }` | เปลี่ยนเฟสของระดับความยาก |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `btn_match`: ปุ่มตรง
- `btn_no_match`: ปุ่มไม่ตรง

---

### 03 · Billiards Math (`game-03-billiards-math`)
> **ทักษะที่วัด:** การวางแผนล่วงหน้า (Strategic Planning), การคำนวณเลขคณิต (Mental Math), มิติสัมพันธ์และการเล็ง (Spatial Aiming), การตอบสนองต่อแรงกดดันของเวลาและจำนวนครั้งยิง

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `equation_shown` | `generateNewEquation()` | `equation_index: number`<br>`target: number`<br>`operators: string[]`<br>`slot_count: number`<br>`ball_values: number[]` | แสดงสมการเป้าหมายและรายการลูกบอลทั้งหมดบนโต๊ะ |
| `aim_started` | แตะลูกขาวใน `setupAimingControls()` | `{ ball_value: number }` | ผู้เล่นเริ่มแตะลูกขาวเพื่อเล็ง (เริ่มนับเวลาการเล็ง) |
| `ball_shot` | ปล่อยมือยิงใน `shootBall()` | `ball_value: number`<br>`angle_deg: number`<br>`power: number`<br>`aim_ms: number`<br>`shots_left: number` | จังหวะยิงลูกขาว เก็มองศา ทิศทาง ความแรง และเวลาที่ใช้เล็ง |
| `ball_slotted` | `fillSlot()` | `{ slot_index: number, ball_value: number }` | ลูกบอลหมายเลขตกลงในช่องว่างของสมการ |
| `ball_ejected` | `ejectBallFromSlot()` | `{ slot_index: number, ball_value: number }` | นำลูกบอลออกจากช่องสมการ |
| `revert_pressed` | กดปุ่ม ↩ ใน `createRevertButton()` | `{ slots_filled: number }` | กดปุ่มถอยกลับ (Undo) เพื่อคืนบอลล่าสุด |
| `answer_checked` | `checkAnswer()` | `equation_index: number`<br>`values: number[]`<br>`result: number \| null`<br>`target: number`<br>`correct: boolean`<br>`rt_ms: number` | ผลการตรวจสมการเมื่อวางครบช่อง พร้อม `rt_ms` นับตั้งแต่เริ่มแสดงโจทย์ |
| `mine_hit` | `handleMineExplosion()` | `{}` | ลูกบอลกระทบโดนลูกระเบิดบนโต๊ะ |
| `obstacle_hit` | `checkObstacleCollision()` | `{ obstacle_type: string }` | ลูกบอลชนสิ่งกีดขวาง (เช่น `wall_h`, `wall_v`, `box`) |
| `out_of_shots` | `handleOutOfShots()` | `{ equation_index: number }` | ยิงจนหมดโควตา shots ที่กำหนดในสมการนั้น |
| `equation_timed_out` | `handleEquationTimeExpired()` | `{ equation_index: number, slots_filled: number }` | เวลาของสมการหมดลง |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `cue_ball`: ลูกขาว
- `ball_<value>`: ลูกบอลหมายเลข เช่น `ball_1`, `ball_2`, `ball_99` (กับดัก)
- `slot_<index>`: ช่องว่างสำหรับใส่สมการ เช่น `slot_0`, `slot_1`
- `btn_revert`: ปุ่มย้อนกลับ (Undo)
