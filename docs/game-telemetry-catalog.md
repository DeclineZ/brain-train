# In-Game Telemetry & User Journey Catalog

เอกสารฉบับนี้เป็น **Single Source of Truth** สำหรับข้อมูลพฤติกรรมผู้เล่น (In-Game User Journey & Telemetry Tracking) ในมินิเกม Phaser ทุกเกมของโปรเจกต์ Brain Train ซึ่งข้อมูลทั้งหมดจะถูกส่งและจัดเก็บในตาราง `analytics_events` บน Supabase

---

## 📌 สรุปความคืบหน้ารายเกม (Implementation Progress)

| ลำดับ | รหัสเกม (`game_id`) | ชื่อเกม | สถานะ | หมายเหตุ |
|:---:|---|---|:---:|---|
| 01 | `game-01-cardmatch` | Card Match (จับคู่การ์ด) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 02 | `game-02-sensorlock` | Sensor Lock (จับทิศทางลูกศร) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 03 | `game-03-billiards-math` | Billiards Math (สนุ๊กเกอร์คณิตศาสตร์) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 04 | `game-04-floating-ball-math` | Floating Ball Math (ลอยบอลคณิตศาสตร์) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 05 | `game-05-wormtrain` | Worm Train (รถไฟหนอน) | ✅ เสร็จสิ้น | ติดตั้ง GameScene (In-scene Tutorial) |
| 06 | `game-06-dreamdirect` | Dream Direct (ลูกศรตามจังหวะ) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 07 | `game-07-pinkcup` | Pink Cup (แก้วสีชมพู) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 08 | `game-08-mysterysound` | Mystery Sound (เสียงปริศนา) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 09 | `game-09-tube-sort` | Tube Sort (แยกหลอดทดลอง) | ⏳ รอทำ | |
| 10 | `game-10-miner` | Miner (นักขุดเหมือง) | ⏳ รอทำ | |
| 11 | `game-11-pipe-patch` | Pipe Patch (ต่อท่อประปา) | ⏳ รอทำ | |
| 12 | `game-12-gridhunter` | Grid Hunter (ล่าเป้าหมายตาราง) | ⏳ รอทำ | |
| 13 | `game-13-boxpattern` | Box Pattern (จำรูปแบบกล่อง) | ⏳ รอทำ | |
| 14 | `game-14-wordrecognize` | Word Recognize (จดจำคำศัพท์) | ⏳ รอทำ | |
| 15 | `game-15-taxidriver` | Taxi Driver (คนขับแท็กซี่) | ⏳ รอทำ | |
| 16 | `game-16-doorguardian` | Door Guardian (ผู้พิทักษ์ประตู) | ⏳ รอทำ | |
| 17 | `game-17-floatingmarket` | Floating Market (ตลาดน้ำ) | ⏳ รอทำ | |
| 18 | `game-18-runforyourlife` | Run for Your Life (วิ่งสู้ฟัด) | ⏳ รอทำ | |
| 19 | `game-19-cashier` | Cashier (แคชเชียร์คิดเงิน) | ⏳ รอทำ | |
| 20 | `game-20-boxcounting` | Box Counting (นับกล่อง 3 มิติ) | ⏳ รอทำ | |
| 21 | `game-21-parking-jam` | Parking Jam (เลื่อนรถออกจากลาน) | ⏳ รอทำ | |

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

---

### 04 · Floating Ball Math (`game-04-floating-ball-math`)
> **ทักษะที่วัด:** การคำนวณเลขคณิตแบบเรียลไทม์ (Mental Math), การตัดสินใจภายใต้เวลาจำกัด (Decision Making under Time Pressure), การยับยั้งชั่งใจและการปรับตัวต่อสิ่งรบกวน (Inhibitory Control & Cognitive Adaptability)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `lane_changed` | `moveBoatToLane()` | `from_lane: 0 \| 1 \| 2`<br>`to_lane: 0 \| 1 \| 2`<br>`method: 'drag' \| 'keyboard' \| 'arrow'` | ผู้เล่นขยับเรือเปลี่ยนเลน พร้อมระบุวิธีควบคุม |
| `ball_collected` | `collectBall()` | `ball_kind: 'operation' \| 'number'`<br>`value: number`<br>`operation: '+' \| '-' \| '*' \| '/'`<br>`total_before: number`<br>`total_after: number`<br>`target: number` | เรือชนเก็บลูกบอลคณิตศาสตร์ บันทึกคะแนนก่อน/หลังและเป้าหมาย |
| `bomb_hit` | `collectBall()` | `{ total_before: number }` | เรือชนลูกระเบิด |
| `equation_completed` | `handleSuccess()` | `equation_index: number`<br>`rt_ms: number \| null` | คำนวณได้ตรงเป้าหมายสมการสำเร็จ พร้อมเวลา `rt_ms` นับตั้งแต่เริ่มสมการนั้น |
| `equation_overshot` | `handleOvershoot()` | `total: number`<br>`target: number` | ผลลัพธ์สมการเกินเป้าหมายหรือติดลบ |
| `thief_appeared` | `spawnThiefEvent()` | `thief_index: number`<br>`ball_value: number`<br>`decision_window_ms: number`<br>`best_decision: 'block' \| 'adapt'` | มือโจรโผล่มาจะขโมย/สลับเลนลูกบอล (ตั้ง Stimulus marker เพื่อวัด Reaction Time) |
| `thief_decision` | `handleBlockDecision()` / `executeAdapt()` | `thief_index: number`<br>`decision: 'block' \| 'adapt' \| 'none'`<br>`correct: boolean`<br>`rt_ms: number \| null`<br>`was_late: boolean`<br>`panic_streak: number` | ผลการตัดสินใจของผู้เล่นต่อเหตุการณ์โจร (กดบล็อก, ยอมปรับตัวตาม, หรือหมดเวลา timeout) |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `ball_<operator>_<value>`: ลูกบอลคณิตศาสตร์ เช่น `ball_+_5`, `ball_-_3`
- `ball_bomb`: ลูกระเบิด
- `btn_block`: ปุ่ม "หยุดโจร" (Block Button)
- `btn_next`: ปุ่มถัดไป (ในโหมดสอนเล่น)
- `btn_back`: ปุ่มย้อนกลับ (ในโหมดสอนเล่น)

---

### 05 · Worm Train (`game-05-wormtrain`)
> **ทักษะที่วัด:** การวางแผนล่วงหน้า (Strategic Planning), การคิดเชิงมิติสัมพันธ์และสับราง (Spatial & Route Switching), ความแม่นยำในการจับคู่สี/ขนาด และการรับมือสิ่งรบกวน (Traps & Earthquakes)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `junction_switched` | `switchJunction()` | `junction_id: string`<br>`source: 'user' \| 'earthquake'`<br>`new_index: number`<br>`nearest_worm_distance: number \| null`<br>`worms_on_board: number` | สับรางทางแยก บันทึกที่มา (ผู้เล่นกด หรือ แผ่นดินไหวสลับเอง), ระยะห่างหนอนตัวที่ใกล้ที่สุด, และจำนวนหนอนบนกระดาน |
| `worm_spawned` | `spawnWorm()` | `worm_id: string`<br>`color: string`<br>`size: 'S' \| 'M' \| 'L'` | หนอนตัวใหม่เริ่มปล่อยตัวออกจากจุดเกิด |
| `worm_arrived` | `handleNodeArrival()` | `worm_id: string`<br>`worm_color: string`<br>`hole_color: string`<br>`correct: boolean`<br>`travel_ms: number \| null` | หนอนเดินทางถึงหลุมปลายทาง บันทึกว่าถูกหลุมหรือไม่ พร้อมเวลาเดินทาง (`travel_ms`) |
| `trap_hit` | `handleNodeArrival()` | `worm_id: string`<br>`trap_id: string`<br>`trap_type: string` | หนอนเดินผ่านหรือชนกับดัก (เช่น ใยแมงมุม `SPIDER`) |
| `mistake_registered` | `registerMistake()` | `{ type: string }` | เกิดข้อผิดพลาดในเกม เช่น `WRONG_HOLE`, `WRONG_SIZE`, `DEAD_END`, `SIZE_MISMATCH_JAM` |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `junction_<id>`: จุดทางแยกสับรางบนแผนที่ เช่น `junction_j1`, `junction_j2`

---

### 06 · Dream Direct (`game-06-dreamdirect`)
> **ทักษะที่วัด:** การยับยั้งชั่งใจและการสลับกฎความคิด (Inhibition & Cognitive Flexibility / Rule-Switching: Ghost↔Anchor), การติดตามทางสายตา (Visual Tracking: Spinner, Fade), ความจำใช้งาน (Working Memory: Shadow/Fade, Double), และความแม่นยำทางจังหวะเวลา (Processing Speed & Timing Precision)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `arrow_spawned` | `spawnArrow()` | `arrow_type: ArrowType`<br>`display_direction: Direction`<br>`target_direction: Direction`<br>`lane: 0 \| 1`<br>`spawn_beat: number`<br>`target_beat: number`<br>`duration?: number`<br>`is_chord: boolean` | ลูกศรเริ่มเกิดและลอยลงมาตามเลน บันทึกประเภทลูกศร, ทิศทางที่แสดง, ทิศทางที่ต้องกดจริง, จังหวะตกกระทบ และการเกิดแบบคอร์ดพร้อมกัน 2 ตัว |
| `arrow_hit` | `processArrowHit()` | `arrow_type: ArrowType`<br>`display_direction: Direction`<br>`target_direction: Direction`<br>`input_direction: Direction`<br>`timing_offset_ms: number`<br>`grade: string`<br>`score_awarded: number`<br>`combo: number`<br>`lane: 0 \| 1`<br>`is_hold: boolean`<br>`hits_remaining?: number`<br>`correct: true` | ผู้เล่นกดปุ่มทิศทางได้ถูกต้องตรงตามลูกศร บันทึกค่าความคลาดเคลื่อนทางเวลา (`timing_offset_ms`), เกรดจังหวะ ('ยอดเยี่ยม!', 'ดีมาก!', 'ดี!', 'อีกครั้ง!'), คอมโบ และคะแนนที่ได้ |
| `arrow_missed` | `handleMiss()` / `handleInput()` | `arrow_type: ArrowType`<br>`display_direction: Direction`<br>`target_direction: Direction`<br>`input_direction?: Direction`<br>`lane: 0 \| 1`<br>`reason: 'timeout' \| 'released_early' \| 'wrong_direction'`<br>`correct: false` | ผู้เล่นทำผิดพลาด บันทึกสาเหตุ (กดผิดทิศทาง, ปล่อยปุ่มค้างเร็วเกินไป, หรือปล่อยลูกศรเลยเส้นจนหมดเวลา) |
| `hold_completed` | `completeHold()` | `arrow_type: ArrowType`<br>`target_direction: Direction`<br>`duration?: number`<br>`score_awarded: number`<br>`lane: 0 \| 1`<br>`correct: true` | ผู้เล่นกดปุ่มค้าง (Hold Arrow) ครบตามเวลาที่กำหนดจนสำเร็จ |
| `ingame_tutorial_shown` | `startInGameTutorial()` | `arrow_type: ArrowType`<br>`title: string` | ป๊อปอัปสอนลูกศรชนิดใหม่ปรากฏขึ้นกลางเกม (เช่น Level 6 สอน Ghost, Level 11 สอน Fade, Level 16 สอน Wiggler เป็นต้น) พร้อมสั่ง `level_paused` |
| `ingame_tutorial_completed` | `endInGameTutorial()` | `arrow_type: ArrowType` | ผู้เล่นฝึกปฏิบัติตามคำสอนของลูกศรชนิดใหม่สำเร็จ ปิดป๊อปอัปและสั่ง `level_resumed` |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `btn_up`: ปุ่มกดลูกศรขึ้น
- `btn_down`: ปุ่มกดลูกศรลง
- `btn_left`: ปุ่มกดลูกศรซ้าย
- `btn_right`: ปุ่มกดลูกศรขวา
- `tutorial_overlay`: พื้นหลังโมดอลคำแนะนำในเกม

---

### 07 · Pink Cup (`game-07-pinkcup`)
> **ทักษะที่วัด:** การวางแผนล่วงหน้า (Spatial Planning / Sliding Puzzle), ความจำขณะทำงาน (Working Memory: จำตำแหน่งตัวเลขใต้แผ่นกระเบื้อง), ความเร็วในการตอบสนอง และการรับรู้ทางมิติสัมพันธ์ (Spatial Cognition & Probe Retrieval)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `cup_moved` | `executeMove()` / Tutorial `handleCupClick()` | `is_pink: boolean`<br>`from: { x: number, y: number }`<br>`to: { x: number, y: number }`<br>`distance_to_target: number`<br>`is_good_move: boolean`<br>`backtracked: boolean`<br>`move_number: number`<br>`correct: boolean` | ผู้เล่นเลื่อนแก้ว (ชมพูหรือน้ำเงิน) ไปยังช่องว่าง บันทึกพิกัดก่อน/หลัง ระยะห่างถึงเป้าหมาย การเดินถอยกลับ (backtrack) และเป็นก้าวที่ดีขึ้นหรือไม่ |
| `numbers_revealed` | `revealNumbers()` / Tutorial `showTutorialNumbers()` | `reveal_duration_ms: number`<br>`numbered_count: number` | เปิดเผยตัวเลขที่ซ่อนอยู่ใต้แผ่นกระเบื้อง (เริ่มช่วง Memory Phase) |
| `numbers_hidden` | `hideNumbers()` / Tutorial `hideTutorialNumbers()` | `duration_ms: number` | สิ้นสุดช่วงเวลาเปิดเผยตัวเลข ซ่อนตัวเลขกลับคืนเพื่อเข้าสู่ช่วงเลื่อนแก้ว |
| `target_reached` | `handleWin()` | `moves_taken: number`<br>`time_taken_ms: number` | ถ้วยสีชมพูเดินทางมาถึงช่องเป้าหมายสำเร็จ |
| `probe_shown` | `showProbeQuestion()` / Tutorial `startMemoryProbe()` | `probe_index: number`<br>`total_probes: number`<br>`target_cell: { x: number, y: number }`<br>`target_number: number` | แสดงคำถามทดสอบความจำ (Memory Probe เช่น "เลขที่ X อยู่ที่ช่องไหน?") พร้อมเริ่มวัดปฏิกิริยาตอบสนอง (Stimulus marker) |
| `probe_answered` | `handleTileClick()` / Tutorial `handleProbeAnswer()` | `probe_index: number`<br>`selected_cell: { x: number, y: number }`<br>`selected_number: number \| null`<br>`expected_cell: { x: number, y: number }`<br>`expected_number: number`<br>`correct: boolean`<br>`rt_ms: number` | ผู้เล่นแตะเลือกช่องเพื่อตอบคำถามความจำ บันทึกความถูกต้องและเวลา Reaction Time (`rt_ms`) |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `tile_<x>_<y>`: แผ่นกระเบื้องแต่ละช่อง เช่น `tile_0_0`, `tile_1_2`
- `cup_pink`: แก้วสีชมพูเป้าหมาย
- `cup_<index>`: แก้วสีน้ำเงินแต่ละใบ เช่น `cup_1`, `cup_2`

---

### 08 · Mystery Sound (`game-08-mysterysound`)
> **ทักษะที่วัด:** ภาษาและการนึกคำ (Auditory Discrimination & Verbal Recall / `stat_emotion`), การแยกแยะเสียงผสม (Auditory Focus: Distinguishing Mixed/Hybrid Sounds / `stat_focus`), และความเร็วในการตอบสนอง (Processing Speed / `stat_speed`)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `sound_played` | `playSoundWithAnimation()` | `question_index: number`<br>`sounds: string[]`<br>`is_replay: boolean`<br>`replays_remaining?: number` | เล่นเสียงสัตว์/สิ่งแวดล้อมประจำข้อ (พร้อมตั้ง Stimulus marker เพื่อเริ่มจับ Reaction Time) |
| `choices_shown` | `showChoices()` | `question_index: number`<br>`options: string[]`<br>`required_selections: number` | ตัวเลือกภาพ/คำตอบปรากฏขึ้นบนหน้าจอ พร้อมระบุจำนวนตัวเลือกที่ต้องเลือก |
| `sound_replayed` | `replaySound()` / Tutorial `handleSpeakerClick()` | `question_index: number`<br>`replays_remaining?: number`<br>`total_replays_used?: number`<br>`tutorial_phase?: number` | ผู้เล่นแตะไอคอนลำโพงเพื่อฟังเสียงซ้ำ บันทึกโควตา replay ที่เหลือและจำนวนครั้งที่ใช้ทั้งหมด |
| `option_toggled` | `handleOptionClick()` (Multi-select) | `question_index: number`<br>`option_id: string`<br>`selected: boolean`<br>`current_selections: string[]` | แตะเลือกหรือยกเลิกการเลือกภาพคำตอบในโหมดตอบหลายตัว (Multi-select) |
| `answer_submitted` | `checkSingleSelectAnswer()` / `checkMultiSelectAnswer()` / Tutorial `handleOptionClick()` | `question_index: number`<br>`sounds: string[]`<br>`selected_answers: string[]`<br>`correct_answers: string[]`<br>`correct: boolean`<br>`is_multi_select: boolean`<br>`rt_ms: number`<br>`replays_used: number` | ตรวจคำตอบที่เลือก บันทึกความถูกต้อง เวลา Reaction Time (`rt_ms`) และจำนวนครั้งที่ฟังซ้ำ |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `speaker_icon`: ไอคอนลำโพงสำหรับฟังเสียงซ้ำ
- `opt_<id>`: ตัวเลือกแต่ละภาพ เช่น `opt_dog`, `opt_cat`, `opt_pig`
- `btn_confirm`: ปุ่มยืนยันคำตอบในโหมดตอบหลายตัว (Multi-select)



