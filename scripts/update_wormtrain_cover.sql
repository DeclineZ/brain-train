-- Update Worm Train game cover image
-- Run this in Supabase SQL Editor

UPDATE games
SET image = '/covers/wormtrain_cover.webp'
WHERE game_id = 'game-05-wormtrain';
