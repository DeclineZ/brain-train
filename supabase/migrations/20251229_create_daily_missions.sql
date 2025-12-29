-- Create daily_missions table
create table if not exists public.daily_missions (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null default current_date,
    slot_index smallint not null, -- 0, 1, 2
    label text not null,
    game_id text not null,
    completed boolean not null default false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    
    primary key (id),
    unique (user_id, date, slot_index)
);

-- Enable RLS
alter table public.daily_missions enable row level security;

-- Create policies
create policy "Users can view their own daily missions"
    on public.daily_missions for select
    using (auth.uid() = user_id);

create policy "Users can update their own daily missions"
    on public.daily_missions for update
    using (auth.uid() = user_id);

create policy "Users can insert their own daily missions"
    on public.daily_missions for insert
    with check (auth.uid() = user_id);
