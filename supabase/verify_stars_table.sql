-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'user_game_stars'
);

-- If false, run the migration code:
/*
create table if not exists user_game_stars (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  level_1_stars int default 0,
  level_2_stars int default 0,
  level_3_stars int default 0,
  level_4_stars int default 0,
  level_5_stars int default 0,
  level_6_stars int default 0,
  level_7_stars int default 0,
  level_8_stars int default 0,
  level_9_stars int default 0,
  level_10_stars int default 0,
  total_stars int generated always as (
    level_1_stars + level_2_stars + level_3_stars + level_4_stars + level_5_stars +
    level_6_stars + level_7_stars + level_8_stars + level_9_stars + level_10_stars
  ) stored,
  primary key (user_id, game_id)
);
alter table user_game_stars enable row level security;
create policy "Users can view their own stars" on user_game_stars for select using (auth.uid() = user_id);
create policy "Users can insert their own stars" on user_game_stars for insert with check (auth.uid() = user_id);
create policy "Users can update their own stars" on user_game_stars for update using (auth.uid() = user_id);
*/
