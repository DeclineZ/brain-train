-- Dashboard API v1 for RunJump (Dashboard API Spec v1, 13 Nov 2026; PRD v0.5 section 8).
-- Additive only: two nullable columns per table, two indexes, a compatible function
-- replacement and a new view. analytics_runjump_export is left unchanged.
--
-- Prod migration history does not match this folder: apply this file in the
-- Supabase SQL editor, never with `supabase db push`.

-- 1. The launch an app_opened event belongs to (journey_id is null on app_opened).
alter table public.analytics_events add column if not exists launch_id uuid null;

-- 2. Content set the event was recorded with (lib/analytics/version.ts). Old rows stay
--    null and the view reports the first content version for them.
alter table public.analytics_events add column if not exists content_version text null;

-- 3. One app_opened per launch (PRD 8.4). Retried claims hit "on conflict do nothing".
create unique index if not exists analytics_events_app_opened_uniq
  on public.analytics_events (launch_id)
  where event = 'app_opened';

-- 4. Keyset pagination for GET /api/dashboard/v1/events: order by (occurred_at, id).
create index if not exists analytics_events_occurred_id_idx
  on public.analytics_events (occurred_at, id);

-- 5. Origin launch of a journey. analytics_journey_launches keeps launch_id as its
--    primary key (one journey per launch), so a journey that has to be recreated for a
--    LINE participant (lost cookie, other browser) records the inherited launch here.
alter table public.analytics_journeys add column if not exists launch_id uuid null;

-- 6. Same signature as before; also accepts launch_id and content_version.
--    Callers that omit them insert nulls, as before.
create or replace function public.analytics_insert_events(p_rows jsonb)
returns integer
language sql
set search_path = public
as $$
  with inserted as (
    insert into public.analytics_events (
      event_id, user_id, participant_id, journey_id, session_id, attempt_id, event,
      step_id, game_id, level, seq, t_ms, props, occurred_at, app_version, device,
      launch_id, content_version
    )
    select
      r.event_id, r.user_id, r.participant_id, r.journey_id, r.session_id, r.attempt_id, r.event,
      r.step_id, r.game_id, r.level, r.seq, r.t_ms, coalesce(r.props, '{}'::jsonb), r.occurred_at,
      r.app_version, r.device, r.launch_id, r.content_version
    from jsonb_to_recordset(p_rows) as r (
      event_id uuid, user_id uuid, participant_id uuid, journey_id uuid, session_id text,
      attempt_id uuid, event text, step_id text, game_id text, level int, seq int, t_ms int,
      props jsonb, occurred_at timestamptz, app_version text, device jsonb,
      launch_id uuid, content_version text
    )
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from inserted;
$$;

revoke all on function public.analytics_insert_events(jsonb) from public, anon, authenticated;

-- 7. Dashboard API rows: exactly the 23 keys of the openapi Event schema.
--    occurred_at stays timestamptz so the (occurred_at, id) index serves the API's
--    range and keyset filters; the route formats it as UTC ISO 8601 with milliseconds.
create or replace view public.analytics_dashboard_events_v1
with (security_invoker = true) as
select
  'runjump'::text as app_id,
  e.event_id::text as event_id,
  e.id as event_seq,
  e.occurred_at,
  e.event as event_name,
  case
    when coalesce(e.launch_id, j.launch_id, fl.launch_id) is not null then 'line_oa'
    else coalesce(j.entry_source, 'direct')
  end as entry_source,
  coalesce(e.participant_id, j.participant_id)::text as participant_id,
  coalesce(e.launch_id, j.launch_id, fl.launch_id)::text as launch_id,
  e.journey_id::text as journey_id,
  nullif(e.step_id, '') as step_id,
  null::text as consent_status,
  case
    when e.event in ('activity_started', 'activity_ended')
      or (e.event = 'error_occurred' and e.attempt_id is not null)
    then 'game'
  end as activity_type,
  nullif(e.game_id, '') as activity_id,
  e.attempt_id::text as activity_attempt_id,
  case when e.props ->> 'phase' in ('instruction', 'practice', 'actual') then e.props ->> 'phase' end as phase,
  e.level::text as level_id,
  case when e.event = 'activity_ended' then e.props ->> 'outcome' end as outcome,
  case when e.event = 'activity_ended' then e.props ->> 'end_reason' end as end_reason,
  nullif(e.props ->> 'error_code', '') as error_code,
  -- In-game timer of the same attempt (level_ended.duration_ms, from levelStarted to
  -- levelEnded, pauses included, or the game's active time when it overrides it).
  le.duration_ms,
  case
    when e.event = 'activity_ended' and jsonb_typeof(e.props -> 'score') = 'number'
    then (e.props ->> 'score')::numeric
  end as progress,
  coalesce(nullif(e.app_version, ''), '0.1.1') as app_version,
  coalesce(nullif(e.content_version, ''), 'games-2026.11') as content_version
from public.analytics_events e
left join public.analytics_journeys j on j.journey_id = e.journey_id
left join lateral (
  -- First launch attached to the journey (same rule as analytics_runjump_export).
  select jl.launch_id
  from public.analytics_journey_launches jl
  where jl.journey_id = e.journey_id
  order by jl.created_at
  limit 1
) fl on true
left join lateral (
  select round((l.props ->> 'duration_ms')::numeric)::bigint as duration_ms
  from public.analytics_events l
  where e.event = 'activity_ended'
    and l.attempt_id = e.attempt_id
    and l.event = 'level_ended'
    and jsonb_typeof(l.props -> 'duration_ms') = 'number'
    and (l.props ->> 'duration_ms')::numeric >= 0
  order by l.id desc
  limit 1
) le on true
where e.event in (
    'app_opened', 'journey_started', 'step_viewed', 'activity_started', 'activity_ended',
    'result_viewed', 'error_occurred'
  )
  and (e.journey_id is not null or e.event = 'app_opened');

revoke all on public.analytics_dashboard_events_v1 from anon, authenticated;
