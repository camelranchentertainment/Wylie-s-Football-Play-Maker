-- Lock down search_path on set_updated_at (was mutable)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger-only functions: no one should call these directly via PostgREST RPC
revoke execute on function public.handle_new_team() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Helper functions used inside RLS policies: authenticated users need EXECUTE
-- for the policies to evaluate, but anon has no legitimate use for them
revoke execute on function public.is_team_member(uuid) from public, anon;
revoke execute on function public.is_team_owner(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;
