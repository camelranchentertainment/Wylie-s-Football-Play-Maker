-- ============================================================================
-- Migration 1: profiles, teams/team_members RLS, seasons, opponents
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at helper trigger (reused by every table below)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per coach, auto-created on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- teams — add branding/audit columns, lock down owner_id
-- ---------------------------------------------------------------------------
alter table public.teams
  add column if not exists mascot text,
  add column if not exists age_group text,
  add column if not exists primary_color text not null default '#0B2545',
  add column if not exists secondary_color text not null default '#F4B400',
  add column if not exists logo_url text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helper functions (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  ) or exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.owner_id = auth.uid()
  );
$$;

create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- teams / team_members RLS (previously DISABLED — closes an open data leak)
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select using (public.is_team_member(id));
drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert with check (owner_id = auth.uid());
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update using (public.is_team_owner(id)) with check (public.is_team_owner(id));
drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete using (public.is_team_owner(id));

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select using (public.is_team_member(team_id));
drop policy if exists team_members_insert on public.team_members;
create policy team_members_insert on public.team_members for insert
  with check (user_id = auth.uid() or public.is_team_owner(team_id));
drop policy if exists team_members_update on public.team_members;
create policy team_members_update on public.team_members for update
  using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));
drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members for delete
  using (public.is_team_owner(team_id) or user_id = auth.uid());

-- Owner is automatically a team_member row too, so is_team_member() checks stay simple
create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (team_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();

-- team_members.role should only ever be one of these
alter table public.team_members drop constraint if exists team_members_role_check;
alter table public.team_members add constraint team_members_role_check
  check (role in ('owner','coach','assistant'));

-- ---------------------------------------------------------------------------
-- seasons — "set up their season"
-- ---------------------------------------------------------------------------
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  year int not null check (year between 2000 and 2100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_seasons_team_id on public.seasons(team_id);

alter table public.seasons enable row level security;
drop trigger if exists trg_seasons_updated_at on public.seasons;
create trigger trg_seasons_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();

drop policy if exists seasons_select on public.seasons;
create policy seasons_select on public.seasons for select using (public.is_team_member(team_id));
drop policy if exists seasons_insert on public.seasons;
create policy seasons_insert on public.seasons for insert with check (public.is_team_member(team_id));
drop policy if exists seasons_update on public.seasons;
create policy seasons_update on public.seasons for update using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
drop policy if exists seasons_delete on public.seasons;
create policy seasons_delete on public.seasons for delete using (public.is_team_member(team_id));

-- ---------------------------------------------------------------------------
-- opponents — "who they are playing"
-- ---------------------------------------------------------------------------
create table if not exists public.opponents (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  game_date date,
  location text check (location in ('home','away','neutral')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_opponents_season_id on public.opponents(season_id);
create index if not exists idx_opponents_team_id on public.opponents(team_id);

alter table public.opponents enable row level security;
drop trigger if exists trg_opponents_updated_at on public.opponents;
create trigger trg_opponents_updated_at before update on public.opponents
  for each row execute function public.set_updated_at();

drop policy if exists opponents_select on public.opponents;
create policy opponents_select on public.opponents for select using (public.is_team_member(team_id));
drop policy if exists opponents_insert on public.opponents;
create policy opponents_insert on public.opponents for insert with check (public.is_team_member(team_id));
drop policy if exists opponents_update on public.opponents;
create policy opponents_update on public.opponents for update using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
drop policy if exists opponents_delete on public.opponents;
create policy opponents_delete on public.opponents for delete using (public.is_team_member(team_id));
