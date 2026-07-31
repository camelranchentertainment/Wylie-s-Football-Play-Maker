-- Team logo storage
--
-- A public-read bucket for team logos, used on printed materials
-- (wristband, key card, call sheet, install sheets, playbook). Logos are
-- non-sensitive branding assets -- public read is intentional so an
-- <img src="..."> in a generated print-preview iframe (and eventually a
-- public share view) doesn't need an auth header to load. Writes are
-- restricted to members of the team the logo belongs to.
--
-- Path convention enforced by the policies below (not the database):
-- team-logos/<team_id>/logo.<ext> -- storage.foldername(name) splits the
-- object path into segments, so (storage.foldername(name))[1] is the
-- team_id folder a given object lives under.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-logos', 'team-logos', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "team_logos_public_read" on storage.objects;
create policy "team_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'team-logos');

drop policy if exists "team_logos_team_write" on storage.objects;
create policy "team_logos_team_write"
  on storage.objects for insert
  with check (
    bucket_id = 'team-logos'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "team_logos_team_update" on storage.objects;
create policy "team_logos_team_update"
  on storage.objects for update
  using (
    bucket_id = 'team-logos'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "team_logos_team_delete" on storage.objects;
create policy "team_logos_team_delete"
  on storage.objects for delete
  using (
    bucket_id = 'team-logos'
    and public.is_team_member(((storage.foldername(name))[1])::uuid)
  );
