-- ============================================================================
-- Migration 2: plays catalog model, playbooks, game-day playbooks,
--              wristbands, and the hand-signal system
-- ============================================================================

-- ---------------------------------------------------------------------------
-- plays — becomes a shared catalog: global (system) plays + team plays
-- ---------------------------------------------------------------------------
alter table public.plays
  add column if not exists team_id uuid references public.teams(id) on delete cascade,
  add column if not exists description text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_global boolean not null default false,
  add column if not exists ai_generated boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists idx_plays_team_id on public.plays(team_id);
create index if not exists idx_plays_is_global on public.plays(is_global) where is_global = true;
create index if not exists idx_plays_type on public.plays(type);

drop trigger if exists trg_plays_updated_at on public.plays;
create trigger trg_plays_updated_at before update on public.plays
  for each row execute function public.set_updated_at();

-- Replace the old personal-only "plays_owner" policy with the catalog model:
--   • global plays  → readable by any signed-in coach, not user-writable
--   • team plays    → full CRUD for members of that team
--   • legacy personal plays (team_id null, user_id = self) → still owner-only
drop policy if exists "plays_owner" on public.plays;
drop policy if exists plays_select on public.plays;
create policy plays_select on public.plays for select
  using (
    is_global = true
    or (team_id is not null and public.is_team_member(team_id))
    or (team_id is null and user_id = auth.uid())
  );

drop policy if exists plays_insert on public.plays;
create policy plays_insert on public.plays for insert
  with check (
    is_global = false
    and (
      (team_id is not null and public.is_team_member(team_id))
      or (team_id is null and user_id = auth.uid())
    )
  );

drop policy if exists plays_update on public.plays;
create policy plays_update on public.plays for update
  using (
    is_global = false
    and (
      (team_id is not null and public.is_team_member(team_id))
      or (team_id is null and user_id = auth.uid())
    )
  )
  with check (
    is_global = false
    and (
      (team_id is not null and public.is_team_member(team_id))
      or (team_id is null and user_id = auth.uid())
    )
  );

drop policy if exists plays_delete on public.plays;
create policy plays_delete on public.plays for delete
  using (
    is_global = false
    and (
      (team_id is not null and public.is_team_member(team_id))
      or (team_id is null and user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- playbook_plays — the plays a team has pulled into their working playbook
-- (deleting a row here removes it from the playbook without touching the
-- underlying play — satisfies "plays should be able to be deleted from
-- your playbook")
-- ---------------------------------------------------------------------------
create table if not exists public.playbook_plays (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  play_id uuid not null references public.plays(id) on delete cascade,
  play_type text check (play_type in ('run','pass','screen','trick','redzone','goalline','special','defense')),
  down_distance text,
  notes text,
  sort_order int not null default 0,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (team_id, play_id)
);
create index if not exists idx_playbook_plays_team_id on public.playbook_plays(team_id);

alter table public.playbook_plays enable row level security;
drop policy if exists playbook_plays_select on public.playbook_plays;
create policy playbook_plays_select on public.playbook_plays for select using (public.is_team_member(team_id));
drop policy if exists playbook_plays_insert on public.playbook_plays;
create policy playbook_plays_insert on public.playbook_plays for insert with check (public.is_team_member(team_id));
drop policy if exists playbook_plays_update on public.playbook_plays;
create policy playbook_plays_update on public.playbook_plays for update using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
drop policy if exists playbook_plays_delete on public.playbook_plays;
create policy playbook_plays_delete on public.playbook_plays for delete using (public.is_team_member(team_id));

-- ---------------------------------------------------------------------------
-- gameday_playbooks — a printable, opponent-specific subset of the playbook
-- ---------------------------------------------------------------------------
create table if not exists public.gameday_playbooks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  opponent_id uuid references public.opponents(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_gameday_playbooks_team_id on public.gameday_playbooks(team_id);

alter table public.gameday_playbooks enable row level security;
drop trigger if exists trg_gameday_playbooks_updated_at on public.gameday_playbooks;
create trigger trg_gameday_playbooks_updated_at before update on public.gameday_playbooks
  for each row execute function public.set_updated_at();

drop policy if exists gameday_playbooks_select on public.gameday_playbooks;
create policy gameday_playbooks_select on public.gameday_playbooks for select using (public.is_team_member(team_id));
drop policy if exists gameday_playbooks_insert on public.gameday_playbooks;
create policy gameday_playbooks_insert on public.gameday_playbooks for insert with check (public.is_team_member(team_id));
drop policy if exists gameday_playbooks_update on public.gameday_playbooks;
create policy gameday_playbooks_update on public.gameday_playbooks for update using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
drop policy if exists gameday_playbooks_delete on public.gameday_playbooks;
create policy gameday_playbooks_delete on public.gameday_playbooks for delete using (public.is_team_member(team_id));

create table if not exists public.gameday_playbook_plays (
  gameday_playbook_id uuid not null references public.gameday_playbooks(id) on delete cascade,
  play_id uuid not null references public.plays(id) on delete cascade,
  section text,
  sort_order int not null default 0,
  primary key (gameday_playbook_id, play_id)
);

alter table public.gameday_playbook_plays enable row level security;
drop policy if exists gameday_playbook_plays_all on public.gameday_playbook_plays;
create policy gameday_playbook_plays_all on public.gameday_playbook_plays for all
  using (
    exists (
      select 1 from public.gameday_playbooks gp
      where gp.id = gameday_playbook_id and public.is_team_member(gp.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.gameday_playbooks gp
      where gp.id = gameday_playbook_id and public.is_team_member(gp.team_id)
    )
  );

-- ---------------------------------------------------------------------------
-- signal_assignments — the hand-signal system (built before wristbands so
-- wristband_calls can reference it)
-- ---------------------------------------------------------------------------
create table if not exists public.signal_assignments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  play_id uuid references public.plays(id) on delete set null,
  call_number text,
  signal_type text not null check (signal_type in ('two_part','body_zone','picture_board','dummy')),
  signal_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_signal_assignments_team_id on public.signal_assignments(team_id);

alter table public.signal_assignments enable row level security;
drop trigger if exists trg_signal_assignments_updated_at on public.signal_assignments;
create trigger trg_signal_assignments_updated_at before update on public.signal_assignments
  for each row execute function public.set_updated_at();

drop policy if exists signal_assignments_select on public.signal_assignments;
create policy signal_assignments_select on public.signal_assignments for select using (public.is_team_member(team_id));
drop policy if exists signal_assignments_insert on public.signal_assignments;
create policy signal_assignments_insert on public.signal_assignments for insert with check (public.is_team_member(team_id));
drop policy if exists signal_assignments_update on public.signal_assignments;
create policy signal_assignments_update on public.signal_assignments for update using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
drop policy if exists signal_assignments_delete on public.signal_assignments;
create policy signal_assignments_delete on public.signal_assignments for delete using (public.is_team_member(team_id));

-- ---------------------------------------------------------------------------
-- wristbands — printable QB wristband, built from labeled pages of calls
-- ---------------------------------------------------------------------------
create table if not exists public.wristbands (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null default 'Wristband',
  columns int not null default 4 check (columns between 2 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wristbands_team_id on public.wristbands(team_id);

alter table public.wristbands enable row level security;
drop trigger if exists trg_wristbands_updated_at on public.wristbands;
create trigger trg_wristbands_updated_at before update on public.wristbands
  for each row execute function public.set_updated_at();

drop policy if exists wristbands_select on public.wristbands;
create policy wristbands_select on public.wristbands for select using (public.is_team_member(team_id));
drop policy if exists wristbands_insert on public.wristbands;
create policy wristbands_insert on public.wristbands for insert with check (public.is_team_member(team_id));
drop policy if exists wristbands_update on public.wristbands;
create policy wristbands_update on public.wristbands for update using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
drop policy if exists wristbands_delete on public.wristbands;
create policy wristbands_delete on public.wristbands for delete using (public.is_team_member(team_id));

-- wristband_pages — each page = "used for play type or down" (per your spec)
create table if not exists public.wristband_pages (
  id uuid primary key default gen_random_uuid(),
  wristband_id uuid not null references public.wristbands(id) on delete cascade,
  page_number int not null,
  label text not null,
  down int check (down between 1 and 4),
  distance_category text check (distance_category in ('short','medium','long')),
  field_zone text check (field_zone in ('own','midfield','redzone','goalline')),
  sort_order int not null default 0,
  unique (wristband_id, page_number)
);

alter table public.wristband_pages enable row level security;
drop policy if exists wristband_pages_all on public.wristband_pages;
create policy wristband_pages_all on public.wristband_pages for all
  using (exists (select 1 from public.wristbands w where w.id = wristband_id and public.is_team_member(w.team_id)))
  with check (exists (select 1 from public.wristbands w where w.id = wristband_id and public.is_team_member(w.team_id)));

-- wristband_calls — the individual numbered calls printed on a page
create table if not exists public.wristband_calls (
  id uuid primary key default gen_random_uuid(),
  wristband_page_id uuid not null references public.wristband_pages(id) on delete cascade,
  play_id uuid references public.plays(id) on delete set null,
  call_number text not null,
  signal_id uuid references public.signal_assignments(id) on delete set null,
  sort_order int not null default 0
);
create index if not exists idx_wristband_calls_page_id on public.wristband_calls(wristband_page_id);

alter table public.wristband_calls enable row level security;
drop policy if exists wristband_calls_all on public.wristband_calls;
create policy wristband_calls_all on public.wristband_calls for all
  using (
    exists (
      select 1 from public.wristband_pages wp
      join public.wristbands w on w.id = wp.wristband_id
      where wp.id = wristband_page_id and public.is_team_member(w.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.wristband_pages wp
      join public.wristbands w on w.id = wp.wristband_id
      where wp.id = wristband_page_id and public.is_team_member(w.team_id)
    )
  );
