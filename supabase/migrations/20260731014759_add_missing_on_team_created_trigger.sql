-- Reconciliation file: this migration was applied directly to the project
-- (2026-07-31 01:47 UTC) but the .sql file was never committed. Captured
-- here from the live trigger definition so git history matches the actual
-- database instead of silently drifting out of sync.
--
-- Idempotent: safe to re-run against a fresh database.
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
