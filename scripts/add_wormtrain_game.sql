-- Add Worm Train game to the games table
-- Run this in Supabase SQL Editor

INSERT INTO games (game_id, title, category, have_level, image, duration_min)
VALUES (
  'game-05-wormtrain',
  'พาหนอนน้อยกลับบ้าน',
  'reasoning',
  true,
  NULL,  -- Cover image placeholder (can be updated later)
  5
);

-- Note: game_id must match the key in games/registry.ts
-- Category options: 'reasoning', 'data_processing', 'calculation'
