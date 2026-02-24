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
Notes (2026-02-24, endpoint wall style + badge refactor):
- Refactored play-page level badge rendering into `components/game/PlayLevelBadge.tsx` and replaced large conditional JSX in `app/play/[gameId]/page.tsx` with a single component call.
- Updated Pipe Patch endpoint flow behavior in `games/game-11-pipe-patch/GameScene.ts` so source/target use unified connection logic (`resolveEndpointFlowMask`) and no longer depend on separate in/out semantics for board-side connection.
- Reworked endpoint visuals to sit on wall side (offset outside tile) using `resolveEndpointRenderPosition`, enlarged endpoint head, and reduced endpoint cell fill tint so endpoints don't consume tile space visually.
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, endpoint overlay on tile + tray pagination and rebalance):
- Allowed placing pipes on endpoint cells by removing endpoint rejection from `validateDrop` in `games/game-11-pipe-patch/GameScene.ts`.
- Updated flow mask resolution so endpoint, fixed, and placed masks in the same tile are combined (`finalMask = endpointMask | fixedMask | placedMask`) in `getColorMaskAt`.
- Tightened interior endpoint semantics by removing permissive full-mask fallback; interior endpoint direction now follows level-config arrow direction directly.
- Split endpoint render anchoring into two modes:
  - edge endpoints: pushed further into wall/outside board frame,
  - interior endpoints: anchored on the corresponding grid line between tiles.
- Added tray pagination UI (prev/next + page indicator) and responsive tray layout logic in `drawTray/getTrayLayout` to keep tray usable on narrower screens and many piece types.
- Rebalanced tray piece counts only for problematic levels with interior endpoints:
  - L19: `H 9->10`, `XO 1->2`
  - L26: `H 12->14`, `XO 2->3`
  - L27: `H 9->10`, `XO 3->4`
  - L28: `H 7->9`, `XO 4->5`
Notes (2026-02-24, full color transfer + case-insensitive generic endpoint tokens):
- Updated `games/game-11-pipe-patch/levels.ts` parser to accept generic source/target tokens case-insensitively:
  - `S/s` => single-color source
  - `T/t` => single-color target
  while keeping colored semantics unchanged (`R,G,B,Y,P` sources and `r,g,b,y,p` targets).
- Refactored connected-color propagation in `games/game-11-pipe-patch/GameScene.ts`:
  - `computeConnectedPieceColors` now traverses connectivity and accumulates colors for **all pipe cells** (placed + fixed),
  - single connected color -> apply that color,
  - multiple connected colors -> fallback to neutral (undefined color assignment).
- Extended visual recolor pass so fixed pipes are recolored too:
  - `refreshFixedPipeVisuals(colorByCell?)` now uses connected color mapping for non-crossover fixed pipes,
  - crossover fixed pipes also compute axis colors via existing `resolveCrossoverAxisColors`.
- Kept endpoint mouth hide/repaint flow unchanged (`updateAllPieceColors` still ends with `refreshEndpointVisuals`).
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, unsolve hotfix for endpoint overlay on edge cells):
- Root-cause mitigation: when overlaying a piece on an endpoint cell at the board edge, the merged mask could expose outward directions and create unavoidable leaks.
- Added edge clipping in `getColorMaskAt`:
  - when cell contains endpoint mask and is on board edge, merged mask is clipped by in-board directions only.
  - new helper: `getInBoardMaskForEdgeCell(x, y)`.
- This preserves endpoint overlay behavior while preventing leak penalties from wall-facing directions on edge endpoints.
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, endpoint source/target highlight moved to actual connectable tiles):
- Reworked board highlighting so source/target highlights are now applied to the tile(s) that actually connect to endpoint flow directions (adjacent in-board tile), instead of endpoint host cells.
- Added `getEndpointConnectionHighlightMap()` to compute connectable tiles from endpoint masks and skip non-placeable cells (blocked/fixed/gate/locked).
- Added `applyEndpointConnectionHighlights(...)` to style these tiles with stronger border highlight and subtle fill boost.
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, edge behavior restored + interior endpoint wall line):
- Restored original edge endpoint highlight behavior on endpoint host cells (border-highlight on edge endpoint tiles).
- Limited connection-tile highlighting to interior endpoints only.
- Added interior endpoint wall-segment visuals on tile boundaries via `drawInteriorEndpointWall(...)`:
  - rendered only for endpoints not on board edge,
  - drawn on the exact grid line where interior endpoints connect.
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, stone-style interior endpoint wall + target color reaction):
- Updated interior endpoint boundary wall visual to a stone-like palette (`stoneBase/stoneDark/stoneLight`) with subtle texture highlights.
- Updated target endpoint visual color behavior:
  - disconnected target -> muted stone-tinted color (blend of target color with gray),
  - connected target -> adopts the actually connected source color via connectivity detection.
- Added helper `getConnectedEndpointColor(...)` to infer single connected source color per endpoint direction mask.
- Added helper `blendColors(...)` for muted disconnected target tone.
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, endpoint length shortened globally):
- Reduced endpoint pipe geometry in `drawEndpointPipe(...)` to make all endpoints visibly shorter:
  - arm half-length `0.45 -> 0.31` of cell,
  - thickness scale reduced (`0.28 -> 0.22`),
  - cap and mouth radius scales reduced accordingly.
- Applied uniformly to both source/target and both edge/interior endpoint visuals.
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, pipe body enlarged + interior endpoint intrude reduced):
- Increased overall pipe body thickness in `createPipeVisual(...)` (`size*0.3 -> size*0.34`) so pipes read larger across board/tray.
- Increased board pipe footprint:
  - placed/undo spawn size `cell*0.94 -> cell*0.98`,
  - fixed pipe render size `cell*0.9 -> cell*0.96`,
  - placed repaint size adjusted to match (`cell*0.98 * 0.88`).
- Shortened endpoint portion inside tile (especially interior endpoints):
  - endpoint arm half-length `cell*0.31 -> cell*0.27`,
  - interior endpoint center shifted closer to boundary line (`lineOffset 0.46 -> 0.495`).
- Validation: `npx tsc --noEmit --pretty false` passed.
Notes (2026-02-24, endpoint pair-color sync + larger realistic endpoint head):
- Updated `games/game-11-pipe-patch/GameScene.ts` endpoint color behavior so source and target in each endpoint group always use the same fixed group color.
- Removed disconnected-target gray tint behavior in endpoint rendering path (targets no longer reactively desaturate).
- Removed now-unused endpoint color blending helpers (`getConnectedEndpointColor`, `blendColors`) from `GameScene.ts`.
- Increased endpoint geometry globally for medium-size boost (~15%):
  - endpoint arm half-length `cell*0.27 -> cell*0.31`,
  - endpoint thickness `cell*0.22 -> cell*0.25`.
- Applied render anchor compensation for larger endpoints:
  - edge wall offset `0.76 -> 0.8`,
  - interior boundary offset `0.495 -> 0.505`.
- Enhanced endpoint realism in `drawEndpointPipe(...)`:
  - added ambient underside shadow,
  - strengthened mouth cavity contrast,
  - added center collar/flange + deeper socket core shading.
- Preserved existing mouth-hide behavior when pipe is connected (`hideMouthMask` flow unchanged).
- Validation: `npx tsc --noEmit --pretty false` passed.
