-- Artist profiles table
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  bio text,
  photo_url text,
  instagram_url text,
  soundcloud_url text,
  spotify_url text,
  website_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraints
alter table public.artists add constraint artists_name_unique unique (name);
alter table public.artists add constraint artists_slug_unique unique (slug);

-- RLS
alter table public.artists enable row level security;

-- Anyone can read artists
create policy "artists_select_public"
  on public.artists for select
  using (true);

-- Organizers and master can insert
create policy "artists_insert_organizer"
  on public.artists for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Organizers and master can update
create policy "artists_update_organizer"
  on public.artists for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Only master can delete
create policy "artists_delete_master"
  on public.artists for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
  );

-- Storage bucket for artist photos
insert into storage.buckets (id, name, public, file_size_limit)
values ('artist-photos', 'artist-photos', true, 5242880)
on conflict (id) do nothing;

-- Storage policies: anyone can view
create policy "artist_photos_select_public"
  on storage.objects for select
  using (bucket_id = 'artist-photos');

-- Organizers can upload
create policy "artist_photos_insert_organizer"
  on storage.objects for insert
  with check (
    bucket_id = 'artist-photos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Organizers can update their uploads
create policy "artist_photos_update_organizer"
  on storage.objects for update
  using (
    bucket_id = 'artist-photos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Master can delete
create policy "artist_photos_delete_master"
  on storage.objects for delete
  using (
    bucket_id = 'artist-photos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
  );
