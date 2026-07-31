-- "Notify me when the store launches" waitlist on the landing page
-- (index.html). Write-only from the client: anyone can insert their own
-- email, no one can read the list back through the API.
create table if not exists public.store_notify_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists idx_store_notify_signups_email on public.store_notify_signups (lower(email));

alter table public.store_notify_signups enable row level security;

drop policy if exists store_notify_signups_insert on public.store_notify_signups;
create policy store_notify_signups_insert on public.store_notify_signups
  for insert
  with check (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );
