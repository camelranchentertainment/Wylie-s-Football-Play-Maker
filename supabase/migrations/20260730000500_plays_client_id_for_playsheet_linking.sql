-- Team Library plays are identified client-side by a JS-generated numeric
-- id (Date.now() + Math.random(), stored as text here to dodge float
-- precision issues in a bigint column). Play Sheets need a real plays.id
-- (uuid) to satisfy gameday_playbook_plays' FK, so this lets the client
-- lazily materialize/reuse exactly one real row per team-library play the
-- first time it's added to a play sheet, instead of duplicating rows.
alter table public.plays
  add column if not exists client_id text;

create unique index if not exists plays_team_client_uniq
  on public.plays (team_id, client_id)
  where client_id is not null and team_id is not null;
