-- ============================================================================
-- Migration 4: wristband page coloring (solid page color, or per-row color
-- map when a page isn't a single solid color) + game scores on opponents.
-- ============================================================================

alter table public.wristband_pages
  add column if not exists color_family text
    check (color_family in ('green','blue','red','gold')),
  add column if not exists row_colors jsonb not null default '{}'::jsonb;

comment on column public.wristband_pages.color_family is
  'Whole-page solid color (green/blue/red/gold). Null when this page uses per-row coloring instead.';
comment on column public.wristband_pages.row_colors is
  'Per-row color override map, e.g. {"A":"green","B":"blue","C":"red","D":"gold"}. Only consulted when color_family is null.';

alter table public.opponents
  add column if not exists our_score int check (our_score >= 0),
  add column if not exists opponent_score int check (opponent_score >= 0);

comment on column public.opponents.our_score is 'Final score for our team. Null = game not yet played/recorded.';
comment on column public.opponents.opponent_score is 'Final score for the opponent. Null = game not yet played/recorded.';
