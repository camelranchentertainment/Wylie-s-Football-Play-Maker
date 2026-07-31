-- Wristbands per game
--
-- Mirrors the gameday_playbooks (Play Sheets) redesign: a team can now
-- have multiple wristbands, one per scheduled game, instead of exactly
-- one mutable wristband shared across every game all season. Before this,
-- sigEnsureWristband() did a .limit(1) lookup and always reused the same
-- row -- reassigning cells for this week's opponent silently overwrote
-- whatever was set up for last week's, with no way to look back.
--
-- No RLS changes needed: wristbands_insert/select/update/delete already
-- only check is_team_member(team_id), which says nothing about how many
-- rows a team may have -- that was purely a client-side assumption. The
-- one existing wristband is left with opponent_id = null (a "general"
-- wristband), so no data is lost or reassigned to a guessed game.
alter table public.wristbands
  add column if not exists opponent_id uuid references public.opponents(id) on delete set null;

create index if not exists wristbands_opponent_id_idx on public.wristbands(opponent_id);
