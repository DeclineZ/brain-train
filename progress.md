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
