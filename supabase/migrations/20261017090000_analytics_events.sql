-- Journey and event analytics for RunJump (web journey + in-game telemetry).
-- Spec: docs/analytics.md, docs/gametrackinghandoff.md, PRD LINE OA §8.
-- All writes go through app/api/analytics (service role). Clients get no access.

create table public.analytics_journeys (
  journey_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  participant_id uuid null,
  entry_source text not null check (entry_source in ('line_oa', 'direct', 'other')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index analytics_journeys_user_idx on public.analytics_journeys (user_id, started_at desc);
create index analytics_journeys_participant_idx on public.analytics_journeys (participant_id, started_at)
  where participant_id is not null;

-- One row per OA launch. The primary key makes a retried claim reuse its journey.
create table public.analytics_journey_launches (
  launch_id uuid primary key,
  journey_id uuid not null references public.analytics_journeys (journey_id) on delete cascade,
  created_at timestamptz not null default now()
);

create index analytics_journey_launches_journey_idx on public.analytics_journey_launches (journey_id);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_id uuid not null unique,
  user_id uuid null references auth.users (id) on delete set null,
  participant_id uuid null,
  journey_id uuid null references public.analytics_journeys (journey_id) on delete set null,
  session_id text not null,
  attempt_id uuid null,
  event text not null,
  step_id text null,
  game_id text null,
  level int null,
  seq int null,
  t_ms int null,
  props jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  app_version text null,
  device jsonb null
);

create index analytics_events_event_idx on public.analytics_events (event, occurred_at);
create index analytics_events_user_idx on public.analytics_events (user_id, occurred_at);
create index analytics_events_attempt_idx on public.analytics_events (attempt_id, seq);
create index analytics_events_game_idx on public.analytics_events (game_id, level);
create index analytics_events_journey_idx on public.analytics_events (journey_id, occurred_at);

-- One normal start and one normal end per attempt (PRD AC-23, spec §8).
create unique index analytics_events_activity_boundary_uniq
  on public.analytics_events (attempt_id, event)
  where event in ('activity_started', 'activity_ended');

-- One journey_started per journey.
create unique index analytics_events_journey_started_uniq
  on public.analytics_events (journey_id)
  where event = 'journey_started';

alter table public.analytics_journeys enable row level security;
alter table public.analytics_journey_launches enable row level security;
alter table public.analytics_events enable row level security;

revoke all on public.analytics_journeys from anon, authenticated;
revoke all on public.analytics_journey_launches from anon, authenticated;
revoke all on public.analytics_events from anon, authenticated;

-- Canonical export (PRD §8.2). Only PRD event names; RunJump-specific events stay in the raw table.
create view public.analytics_runjump_export
with (security_invoker = true) as
select
  e.event_id::text as event_id,
  coalesce(e.participant_id, j.participant_id)::text as participant_id,
  'runjump'::text as app_id,
  l.launch_id::text as launch_id,
  e.journey_id::text as journey_id,
  e.event as event_name,
  to_char(e.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as occurred_at,
  coalesce(j.entry_source, 'direct') as entry_source,
  e.step_id,
  null::text as consent_status,
  case when e.event in ('activity_started', 'activity_ended')
         or (e.event = 'error_occurred' and e.attempt_id is not null)
       then 'game' end as activity_type,
  e.game_id as activity_id,
  e.attempt_id::text as activity_attempt_id,
  e.props ->> 'phase' as phase,
  e.level::text as level_id,
  e.props ->> 'outcome' as outcome,
  e.props ->> 'end_reason' as end_reason,
  e.props ->> 'error_code' as error_code,
  null::bigint as playback_position_ms,
  null::bigint as content_duration_ms,
  e.props ->> 'mode' as game_mode,
  e.user_id::text as runjump_user_id
from public.analytics_events e
left join public.analytics_journeys j on j.journey_id = e.journey_id
left join lateral (
  -- First launch of the journey; later launches are listed in analytics_journey_launches.
  select jl.launch_id
  from public.analytics_journey_launches jl
  where jl.journey_id = e.journey_id
  order by jl.created_at
  limit 1
) l on true
where e.event in (
  'journey_started', 'step_viewed', 'activity_started', 'activity_ended',
  'result_viewed', 'error_occurred'
);

revoke all on public.analytics_runjump_export from anon, authenticated;

-- Batch insert used by app/api/analytics. "on conflict do nothing" without a target
-- skips duplicates on every unique index (event_id retries, double activity boundaries,
-- a second journey_started) instead of failing the whole batch.
create function public.analytics_insert_events(p_rows jsonb)
returns integer
language sql
set search_path = public
as $$
  with inserted as (
    insert into public.analytics_events (
      event_id, user_id, participant_id, journey_id, session_id, attempt_id, event,
      step_id, game_id, level, seq, t_ms, props, occurred_at, app_version, device
    )
    select
      r.event_id, r.user_id, r.participant_id, r.journey_id, r.session_id, r.attempt_id, r.event,
      r.step_id, r.game_id, r.level, r.seq, r.t_ms, coalesce(r.props, '{}'::jsonb), r.occurred_at,
      r.app_version, r.device
    from jsonb_to_recordset(p_rows) as r (
      event_id uuid, user_id uuid, participant_id uuid, journey_id uuid, session_id text,
      attempt_id uuid, event text, step_id text, game_id text, level int, seq int, t_ms int,
      props jsonb, occurred_at timestamptz, app_version text, device jsonb
    )
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from inserted;
$$;

revoke all on function public.analytics_insert_events(jsonb) from public, anon, authenticated;
