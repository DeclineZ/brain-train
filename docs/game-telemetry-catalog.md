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
| 09 | `game-09-tube-sort` | Tube Sort (แยกหลอดทดลอง) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 10 | `game-10-miner` | Miner (นักขุดเหมือง) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
| 11 | `game-11-pipe-patch` | Pipe Patch (ต่อท่อประปา) | ✅ เสร็จสิ้น | ติดตั้ง GameScene + TutorialScene |
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

---

### 09 · Tube Sort (`game-09-tube-sort`)
> **ทักษะที่วัด:** การวางแผนล่วงหน้าและการแก้ปัญหาเชิงตรรกะ (Strategic Planning & Logical Sorting), ความยืดหยุ่นทางความคิดและการรับมือสิ่งรบกวน (Cognitive Flexibility & Inhibitory Control: รับมือลูกบอลแช่แข็ง Freeze และข้อจำกัดจำนวนครั้งการย้าย Move Limits), และประสิทธิภาพของการเคลื่อนที่ (Move Efficiency & Redundancy Minimization)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `tube_selected` | `handleTubeTap()` / Tutorial `handleTubeTap()` | `tube_index: number`<br>`color?: number`<br>`ball_id?: number` | ผู้เล่นแตะเลือกหลอดต้นทางเพื่อเตรียมเทลูกบอล |
| `tube_deselected` | `handleTubeTap()` | `tube_index: number` | ผู้เล่นแตะซ้ำที่หลอดเดิมเพื่อยกเลิกการเลือก |
| `ball_poured` | `handleTubeTap()` / Tutorial `handleTubeTap()` | `from_tube: number`<br>`to_tube: number`<br>`color: number`<br>`move_number: number`<br>`is_redundant: boolean`<br>`remaining_moves_on_ball: number \| null` | เทลูกบอลสำเร็จจากหลอดหนึ่งไปยังอีกหลอดหนึ่ง พร้อมบันทึกสี, ลำดับตาเดิน, เป็นการเดินย้อนไปมาซ้ำซ้อนหรือไม่ (`is_redundant`), และโควตาการย้ายที่เหลือของบอลลูกนั้น |
| `pour_failed` | `handleTubeTap()` | `from_tube: number`<br>`to_tube: number`<br>`reason: 'empty' \| 'frozen' \| 'exhausted' \| 'full' \| 'illegal'` | การเทไม่สำเร็จ บันทึกสาเหตุ (หลอดว่าง, ลูกบอลติดแช่แข็ง, โควตาการย้ายหมด, หลอดปลายทางเต็ม, หรือสีไม่ตรงกัน) |
| `tube_completed` | `handleTubeCompletion()` / Tutorial `celebrateTube()` | `tube_index: number`<br>`color: number`<br>`tubes_completed: number`<br>`total_tubes: number` | หลอดทดลองจัดเรียงสีเดียวกันเต็มหลอดสำเร็จ (เกิดแสงประกายฉลอง) |
| `balls_frozen` | `triggerFreeze()` / Tutorial `showFreezeDemo()` | `frozen_count: number`<br>`duration_ms: number` | พ่อมดน้ำแข็งร่ายเวทแช่แข็งลูกบอลบนกระดานชั่วคราว |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `tube_<index>`: หลอดทดลองแต่ละหลอด เช่น `tube_0`, `tube_1`
- `btn_skip`: ปุ่มข้ามโหมดสอนเล่น

---

### 10 · Miner (`game-10-miner`)
> **ทักษะที่วัด:** การวางแผนล่วงหน้า (Strategic Planning / `stat_planning`), การรับรู้ทางสายตาและการคัดเลือกเป้าหมายคุ้มค่า (Visual Discrimination & Target Efficiency / `stat_visual`), สมาธิและการยับยั้งชั่งใจต่อสิ่งกีดขวาง/ระเบิด (Focus & Hazard Avoidance / `stat_focus`), และความเร็วในการตัดสินใจปล่อยตะขอ (Decision Speed / `stat_speed`)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `hook_dropped` | `releaseHook()` / Tutorial `releaseHook()` | `angle_deg: number`<br>`decision_time_ms?: number`<br>`free_hooks_remaining: number`<br>`fee_applied: boolean`<br>`hook_cost: number`<br>`total_value: number`<br>`attempt_number?: number` | ผู้เล่นแตะปล่อยตะขอเหวี่ยงลงสู่ใต้ดิน บันทึกมุมองศา, เวลาในการเล็งตัดสินใจ (`decision_time_ms`), จำนวนสิทธิ์ฟรีที่เหลือ, สถานะการหักค่าปล่อยตะขอ, และคะแนนรวม |
| `hook_missed` | `resolveGrab()` / Tutorial `finishPull()` | `locked_angle_deg: number`<br>`max_distance: number`<br>`fee_deducted: number`<br>`total_value: number` | ตะขอเหวี่ยงยืดจนสุดระยะความยาวเชือกโดยไม่โดนแร่ใด ๆ (คว้าน้ำเหลว) |
| `object_cracked` | `handleGrabResult()` / Tutorial `checkDropGrabSegment()` | `object_type: string`<br>`durability_remaining: number`<br>`is_broken: boolean`<br>`hits_required: number` | ตะขอกระทบแร่ก้อนใหญ่ที่มีเศษหินปกคลุม (Crackable Ore) ซึ่งต้องกะเทาะให้แตกก่อน |
| `object_grabbed` | `handleGrabResult()` / Tutorial `checkDropGrabSegment()` | `object_type: string`<br>`value: number`<br>`weight: number`<br>`is_hazard: boolean`<br>`is_decoy: boolean`<br>`is_crackable: boolean`<br>`distance: number` | ตะขอจับยึดวัตถุสำเร็จและเริ่มดึงรอกกลับ โดยความเร็วในการดึงขึ้นอยู่กับน้ำหนัก (`weight`) |
| `hazard_triggered` | `handleGrabResult()` / Tutorial `checkDropGrabSegment()` | `hazard_type: string`<br>`penalty_type: string`<br>`penalty_value?: number` | วัตถุอันตรายส่งผลกระทบ เช่น ระเบิดทำให้ดึงรอกช้าลง 20 วินาที (`slow_pull`), ไอเท็มต้องสาปหักเวลา 5 วินาที (`time_penalty`), หินตัดแต้ม (`score_penalty`), หรือเพชรปลอมเสียจังหวะ (`decoy_time_waste`) |
| `item_collected` | `finishPull()` / Tutorial `finishPull()` | `object_type: string`<br>`net_value: number`<br>`total_value: number`<br>`is_objective: boolean`<br>`is_decoy: boolean`<br>`is_hazard: boolean`<br>`objective_progress?: string` | วัตถุถูกดึงขึ้นมาถึงผิวดินสำเร็จ บันทึกคะแนนสุทธิหลังหักค่าธรรมเนียม, สถานะตรงตามเป้าหมายของด่านหรือไม่, และความคืบหน้าเป้าหมาย |
| `objective_completed` | `registerObjectiveProgress()` / Tutorial `finishPull()` | `target_type: string`<br>`required_count: number`<br>`total_collected?: number` | ผู้เล่นเก็บแร่เป้าหมายพิเศษประจำด่านครบตามจำนวนที่กำหนด |
| `dynamic_event_triggered` | `triggerDynamicEvent()` | `event_type: 'shift_layer' \| 'move_vein' \| 'roll_pattern' \| 'cursed_spawn'`<br>`time_sec: number`<br>`index: number` | เกิดเหตุการณ์พลวัตใต้ดิน เช่น แผ่นดินไหวชั้นดินเลื่อน (`shift_layer`), สายแร่ทองเคลื่อนที่ (`move_vein`), เพชรกลิ้ง (`roll_pattern`), หรือไอเท็มต้องสาปโผล่ (`cursed_spawn`) |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `hook_pivot`: จุดหมุนของตะขอ
- `hook_head`: หัวตะขอหนีบแร่
- `miner_obj_<type>_<id>`: แร่/สิ่งกีดขวางแต่ละชิ้นใต้ดิน เช่น `miner_obj_gold_large_1`, `miner_obj_gem_2`, `miner_obj_rock_3`
- `goal_bar`: แถบเป้าหมายคะแนน
- `info_panel`: แผงข้อมูลคะแนนและเป้าหมายแร่
- `timer_bar`: แถบวงกลมเวลานับถอยหลัง
- `btn_skip`: ปุ่มข้ามโหมดสอนเล่น

---

### 11 · Pipe Patch (`game-11-pipe-patch`)
> **ทักษะที่วัด:** การวางแผนเชิงพื้นที่และการแก้ปัญหาเชิงตรรกะ (Spatial Planning & Logical Problem Solving / `stat_planning`), มิติสัมพันธ์และการหมุนจัดวางทิศทาง (Spatial Relations & Flow Mask Alignment / `stat_visual`), สมาธิและการยับยั้งชั่งใจ (Focus & Inhibitory Control / `stat_focus`: หลีกเลี่ยงสิ่งกีดขวางและประตูกันย้อน One-way Gate), และประสิทธิภาพในการต่อท่อโดยลดการลองผิดลองถูก (Action Efficiency & Mind-Change Reduction: Undo / Reset Minimization)

#### รายการ Event เฉพาะเกม:
| Event | จุดที่ยิงในโค้ด | Props Payload | คำอธิบาย |
|---|---|---|---|
| `session_start` | `init()` / `create()` | `{ levelCount: number }` | เริ่มต้นเซสชันเกม Pipe Patch |
| `level_start` | `startLevel()` | `{ levelId: number }` | เริ่มต้นเล่นด่านใหม่ |
| `tray_piece_selected` | `spawnPieceVisual()` (dragstart) | `pieceId: string`<br>`pieceType: PipePieceType` | ผู้เล่นแตะหยิบท่อน้ำชิ้นแรกจากถาด (Tray) เพื่อเริ่มลาก |
| `drag_start` | `spawnPieceVisual()` (dragstart) | `pieceId: string`<br>`from: 'board' \| 'tray'` | เริ่มต้นลากชิ้นท่อ โดยระบุว่าลากมาจากถาดหรือย้ายตำแหน่งจากบนกระดาน |
| `drag_end` | `spawnPieceVisual()` (dragend) | `pieceId: string`<br>`dropTarget: 'board' \| 'tray' \| 'none'` | ปล่อยชิ้นท่อลงตำแหน่งเป้าหมาย |
| `piece_placed` | `handleDrop()` | `pieceId: string`<br>`pieceType: PipePieceType`<br>`x: number`<br>`y: number`<br>`beneficial: boolean` | วางท่อลงบนช่องว่างในกระดานสำเร็จ พร้อมประเมินว่าการวางนี้มีประโยชน์ต่อการเชื่อมต่อ (`beneficial`) หรือไม่ |
| `piece_swapped` | `handleDrop()` | `placedPieceId: string`<br>`replacedPieceId: string`<br>`x: number`<br>`y: number`<br>`beneficial: boolean` | วางท่อทับช่องที่มีท่อเดิมอยู่ เกิดการสลับชิ้นท่อกลับคืนถาด |
| `piece_rejected` | `handleDrop()` | `pieceId: string`<br>`reason: 'blocked' \| 'occupied' \| 'out_of_bounds' \| 'inactive_endpoint'` | การวางท่อถูกปฏิเสธ (เช่น วางทับสิ่งกีดขวาง, วางทับท่อที่ไม่ตรงทิศทางของ endpoint, หรืออยู่นอกกระดาน) |
| `piece_removed` | `handleDrop()` | `pieceId: string`<br>`fromCellKey: string` | ลากชิ้นส่วนจากบนกระดานกลับไปทิ้งที่ถาดหรือพื้นที่ว่างเพื่อนำออก |
| `obstacle_interaction_attempt` | `handleDrop()` | `obstacleType: 'blocked' \| 'locked' \| 'gate' \| 'endpoint'`<br>`x: number`<br>`y: number` | ผู้เล่นพยายามวางทับสิ่งกีดขวาง ช่องที่ล็อก หรือประตูกันย้อน |
| `board_state_eval` | `runBoardEval()` | `isSolved: boolean`<br>`isConnected: boolean`<br>`openEndsCount: number`<br>`leakCount: number`<br>`endpointSatisfiedCount: number`<br>`endpointUnsatisfiedCount: number` | ประเมินสภาพกระดานหลังการวางทุกครั้ง วัดจำนวนปลายเปิด รอยรั่ว และจุดเชื่อมต่อที่สำเร็จ |
| `color_path_check` | `runBoardEval()` | `colorId: ColorId`<br>`complete: boolean`<br>`connectedLength: number` | ตรวจสอบเส้นทางท่อของแต่ละกลุ่มสี ว่าเชื่อมต่อจากจุดเริ่มถึงจุดสิ้นสุดสมบูรณ์หรือไม่ |
| `one_way_gate_path_fail` | `runBoardEval()` | `x: number`<br>`y: number`<br>`reason: 'wrong_entry_direction' \| 'flow_reversal'` | ท่อน้ำเชื่อมผ่านประตูกันย้อน (One-way Gate) ผิดทิศทาง |
| `undo_pressed` | `undoAction()` | `{ levelId: number }` | ผู้เล่นกดปุ่มย้อนกลับการกระทำ (Undo) |
| `reset_level_pressed` | `resetLevel()` | `{ levelId: number }` | ผู้เล่นกดปุ่มรีเซ็ตกระดานเริ่มใหม่ทั้งหมด |
| `tray_page_changed` | `createTrayPagerControls()` | `page: number`<br>`total_pages: number` | ผู้เล่นกดเปลี่ยนหน้าถาดชิ้นส่วน (Pagination) |
| `level_complete` | `runBoardEval()` | `levelId: number`<br>`solveTimeMs: number`<br>`totalDragAttempts: number`<br>`undoCount: number`<br>`resetCount: number` | ผู้เล่นเชื่อมท่อครบทุกสีอย่างถูกต้อง ด่านเสร็จสมบูรณ์ |
| `session_end` | `completeSession()` | `levelsAttempted: number`<br>`levelsSolved: number` | จบเซสชันการเล่นเกมทั้งหมด |

#### วัตถุที่ตั้ง `.setName(...)` สำหรับ `input_raw`:
- `timer_dial`: กราฟิกหน้าปัดจับเวลา
- `cell_<x>_<y>`: ช่องบนตารางกระดานแต่ละช่อง เช่น `cell_0_0`, `cell_1_2`
- `<pieceId>`: ชิ้นส่วนท่อน้ำที่ลากได้ เช่น `tray-straight_h`, `placed_straight_h_1`
- `tray_pager_label`: ข้อความแสดงหน้าถาดชิ้นส่วน
- `btn_tray_prev`: ปุ่มเลื่อนหน้าถาดไปทางซ้าย
- `btn_tray_next`: ปุ่มเลื่อนหน้าถาดไปทางขวา
- `btn_skip`: ปุ่มข้ามโหมดสอนเล่น






