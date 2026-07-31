-- Team invite codes + coach roster management
--
-- Lets a team OWNER add other coaches to their team without either side
-- touching the database directly. A team already has an `invite_code`
-- column (added in an earlier migration) but nothing ever populated or
-- consumed it. This migration:
--   1. Backfills/auto-generates a unique 6-character code per team.
--   2. Adds join_team_by_code() so a signed-in coach can redeem a code
--      and be added to team_members as role='coach' -- SECURITY DEFINER
--      so it can validate the code and perform the insert without
--      needing a broader RLS policy that would let any authenticated
--      user join any team by guessing a team_id.
--   3. Adds regenerate_team_invite_code() so an owner can rotate a code
--      that's been shared too widely or leaked.
--   4. Adds get_team_roster() so an owner/coach can see teammate names
--      and emails -- profiles and auth.users are both locked to
--      self-only access by existing RLS, so there is no other safe way
--      for a coach to see who else is on their own team.

-- ── 1. created_at on team_members (audit trail / "joined" display) ──
alter table public.team_members
  add column if not exists created_at timestamptz not null default now();

-- ── 2. Guarantee invite codes are unique when present ────────────────
-- (Multiple NULLs are allowed under a UNIQUE constraint in Postgres, so
-- this doesn't block teams created before a code exists.)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'teams_invite_code_key'
  ) then
    alter table public.teams add constraint teams_invite_code_key unique (invite_code);
  end if;
end $$;

-- ── 3. Code generator (internal use only -- not exposed to clients) ──
create or replace function public.generate_team_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Excludes 0/O and 1/I so a coach reading the code off a whiteboard or
  -- a text message can't mistype it.
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  text;
  tries int := 0;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.teams where invite_code = code);
    tries := tries + 1;
    if tries > 20 then
      raise exception 'Could not generate a unique invite code -- try again';
    end if;
  end loop;
  return code;
end;
$$;
revoke all on function public.generate_team_invite_code() from public;

-- ── 4. Auto-assign a code to every new team ──────────────────────────
create or replace function public.set_team_invite_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invite_code is null then
    new.invite_code := public.generate_team_invite_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_teams_set_invite_code on public.teams;
create trigger trg_teams_set_invite_code
  before insert on public.teams
  for each row execute function public.set_team_invite_code();

-- Backfill any existing team created before this migration.
update public.teams set invite_code = public.generate_team_invite_code() where invite_code is null;

-- ── 5. Redeem a code to join a team ───────────────────────────────────
create or replace function public.join_team_by_code(p_code text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_team public.teams;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_team
  from public.teams
  where invite_code = upper(trim(p_code))
    and deleted_at is null;

  if v_team.id is null then
    raise exception 'That invite code doesn''t match any team -- double-check it with your head coach.';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (v_team.id, v_uid, 'coach')
  on conflict (team_id, user_id) do nothing;

  return v_team;
end;
$$;
revoke all on function public.join_team_by_code(text) from public;
grant execute on function public.join_team_by_code(text) to authenticated;

-- ── 6. Owner can rotate a leaked/overshared code ─────────────────────
create or replace function public.regenerate_team_invite_code(p_team_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_team_owner(p_team_id) then
    raise exception 'Only the team owner can regenerate the invite code' using errcode = '42501';
  end if;

  v_code := public.generate_team_invite_code();
  update public.teams set invite_code = v_code where id = p_team_id;
  return v_code;
end;
$$;
revoke all on function public.regenerate_team_invite_code(uuid) from public;
grant execute on function public.regenerate_team_invite_code(uuid) to authenticated;

-- ── 7. Roster listing (names/emails for a team's members) ────────────
-- profiles_select and auth.users are both locked to self-only access,
-- so without this a coach has no way to see who else is on their team
-- besides raw user_id uuids.
create or replace function public.get_team_roster(p_team_id uuid)
returns table (
  user_id      uuid,
  role         text,
  display_name text,
  email        text,
  joined_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_team_member(p_team_id) then
    raise exception 'Not a member of this team' using errcode = '42501';
  end if;

  return query
    select
      tm.user_id,
      tm.role,
      p.display_name,
      u.email::text,
      tm.created_at
    from public.team_members tm
    left join public.profiles p on p.id = tm.user_id
    left join auth.users u      on u.id = tm.user_id
    where tm.team_id = p_team_id
    order by case tm.role when 'owner' then 0 when 'assistant' then 1 else 2 end, tm.created_at;
end;
$$;
revoke all on function public.get_team_roster(uuid) from public;
grant execute on function public.get_team_roster(uuid) to authenticated;
