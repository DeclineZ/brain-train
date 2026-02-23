Original prompt: make crose over have design to more look like corse turn over another pipe give

fix the source and target pip to point to correct direction u can add > to source and target level.ts config to @gamescence display correctly direction target and source

can you try play the game-11 and try to improve

Notes (2026-02-22):
- Found Pipe Patch in `games/game-11-pipe-patch/`.
- Fixed source endpoint direction semantics: source `mask` now represents the *input* side; outgoing direction is `OPPOSITE_DIR[mask]` (matches GameScene rendering + connectivity).
- Added optional endpoint direction tokens in grids: `S>`, `T<`, `R^`, `gv`, etc (also supports `>S` form).
- Updated level 11 endpoints to `S>` and `T<` to make direction explicit.
- Updated `crossover` piece rendering to look like an over/under bridge (horizontal over vertical) in both `GameScene` and `TutorialScene`.
- Tried to playtest via dev server, but `/play/*` redirects to `/login` (auth-gated), and Playwright is not installed in this environment.

Notes (2026-02-23):
- Rewrote `games/game-11-pipe-patch/TutorialScene.ts` to inherit from `PipePatchGameScene` so tutorial uses the exact same gameplay loop/mechanics as the main game.
- Added a Thai step-by-step tutorial overlay with sleek UI panel, directional arrow, and focus highlights for board/tray/source/target/flow areas.
- Added responsive tutorial re-layout on resize and controls (`ถัดไป`, `เล่นเอง`) without changing base game logic.
- Validation: `npx tsc --noEmit --pretty false` passed.
- Set explicit Phaser scene key in tutorial constructor (`PipePatchTutorialScene`) to avoid key ambiguity.

Notes (2026-02-23, tutorial pass):
- Implemented strict guided tutorial flow in `game-11-pipe-patch/TutorialScene.ts` using a fixed tutorial level (id=8) and step actions (`info`/`place`).
- Added placement gating with cleanup of out-of-step placements and tray piece restriction for the required piece type.
- Reworked tutorial panel layout to be bottom-anchored at all times via `getBottomPanelRect(viewport, trayRect)`.
- Added responsive typography/button tiers and tray collision guard while preserving bottom anchor.
- Arrow now originates from bottom panel and points upward to the active highlight target.
- Validation: `npx tsc --noEmit --pretty false` passed.
- Fixed tutorial step-1 obstruction by adding `PanelLayout.mode` (`full|mini`) and switching all `place` steps to mini bottom bar.
- Added compact layout behavior (hide description, compact title/progress/warning, smaller buttons) and kept bottom anchoring.
- Updated `getBottomPanelRect(viewport, trayRect, step)` with mini-size defaults and collision shrink down to 72px.
- Added concise per-step mini hint text for placement actions.
- Removed all tutorial buttons; tutorial now advances by screen tap on `info` steps only.
- Added tap debounce (`lastAdvanceAtMs`, 180ms) to avoid accidental double-advance.
- Kept `place` steps action-gated (tap does not skip), still auto-advance on correct placement.
- Added animated step guides for place steps:
  - tray piece pulse (`Sine.easeInOut`),
  - target ring pulse (`Sine.easeInOut`),
  - ghost drag line + moving dot (`Quad.easeInOut`).
- Added guide lifecycle management (`renderStepGuides` / `clearStepGuides`) and cleanup on close.
- Validation: `npx tsc --noEmit --pretty false` passed.
- Removed tutorial final success step (`done`); tutorial now ends immediately after `place-3` completes.
- Disabled dim overlay for all `place` steps by skipping `tutorialDimmer` fill when `step.action === 'place'`.
- Applied bright + elder-readable panel preset (medium-large): lighter panel colors, stronger text contrast, larger baseline fonts in both full/mini modes.
- Increased panel sizes and minimum collision-guard heights to preserve legibility under constrained viewports.
- Updated warning text minimum size floor to maintain readability (`mini>=14`, `full>=16`).
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-23, game-11 popup + star hint):
- Added `game-11-pipe-patch` scoring branch in `hooks/useGameSession.ts` using `calculatePipePatchStats` so result stats are computed instead of all-null fallback.
- Added dynamic Thai `starHint` generation in `games/game-11-pipe-patch/GameScene.ts` and included it in solved-level `onGameOver` payload when stars < 3.
- Hint priority: (1) placement/rejection mistakes, (2) slow solve time, (3) high undo/reset, (4) generic optimization hint.
- Did NOT add start-intro popup flow (`SHOW_INTRO`) per latest requirement.
- Validation: `npx tsc --noEmit --pretty false` passed.
