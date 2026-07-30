-- One call per physical cell per page (lets the app upsert on
-- (wristband_page_id, call_number) instead of hand-rolling
-- select-then-insert-or-update races).
alter table public.wristband_calls
  add constraint wristband_calls_page_cell_uniq unique (wristband_page_id, call_number);
