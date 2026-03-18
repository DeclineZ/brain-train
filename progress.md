Original prompt: เกมแก ้ รถติด
น)
- ทัชสกรีนไม่ตรงกับตําแหน่งรถ (เริ่มไม่มั่นใจว่าเป ็ นที่โทรศัพท์มั้ย แต่ปกติไม่เคยมีปัญหาทัชสกรี
เกมลงเหมืองหาทอง
- มีบัคที่เชือกเลยอันที่จะหยิบ เหมือนเชือกจะเลยลงไปหยิบแร่ที่อยู่ข ้ างล่างแทน

## 2026-03-18 - Implementation start
- Scope: implement pointer/world-coordinate fix for Parking Jam and hook-tip collision fix for Miner.
- Include both GameScene and TutorialScene for both games.

## 2026-03-18 - Changes applied
- Parking Jam (`GameScene`, `TutorialScene`):
  - Added pointer->world helper via camera conversion.
  - Switched control hit-test, car hit-test, and tap-zone calculations to world coordinates.
- Miner (`GameScene`, `TutorialScene`):
  - Added hook-tip world position helper using hook container rotation and local tip offset.
  - Switched drop collision segment tracking from rope-end to hook-tip positions.
  - Updated grabbed object follow position to hook-tip world position (removed fixed +18 offset).
  - Tutorial scene now resolves multi-collision by earliest segment parameter `t` then distance.

## 2026-03-18 - Verification
- `npm run build` passed (Next.js compile + TypeScript).
- Attempted to run web-game Playwright client from skill, but local runtime lacks `playwright` package.
- Attempted Playwright MCP runtime navigation, but tool calls were canceled by host before page load.

## TODO / Next agent suggestions
- Run interactive regression on real device for:
  - `/play/game-21-parking-jam` (touch alignment and tap-zone direction)
  - `/play/game-10-miner` (hook captures first touched ore with stacked objects)
- If automated runtime tests are required, install `playwright` for the skill client or enable MCP browser tool calls.
