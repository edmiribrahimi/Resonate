-- Venue profiles table
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  bio text,
  address text,
  google_maps_url text,
  photo_url text,
  instagram_url text,
  website_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraints
alter table public.venues add constraint venues_name_unique unique (name);
alter table public.venues add constraint venues_slug_unique unique (slug);

-- RLS
alter table public.venues enable row level security;

-- Anyone can read venues
create policy "venues_select_public"
  on public.venues for select
  using (true);

-- Organizers and master can insert
create policy "venues_insert_organizer"
  on public.venues for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Organizers and master can update
create policy "venues_update_organizer"
  on public.venues for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Only master can delete
create policy "venues_delete_master"
  on public.venues for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
  );

-- Storage bucket for venue photos
insert into storage.buckets (id, name, public, file_size_limit)
values ('venue-photos', 'venue-photos', true, 5242880)
on conflict (id) do nothing;

-- Storage policies: anyone can view
create policy "venue_photos_select_public"
  on storage.objects for select
  using (bucket_id = 'venue-photos');

-- Organizers can upload
create policy "venue_photos_insert_organizer"
  on storage.objects for insert
  with check (
    bucket_id = 'venue-photos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Organizers can update their uploads
create policy "venue_photos_update_organizer"
  on storage.objects for update
  using (
    bucket_id = 'venue-photos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('organizer', 'master')
        and status = 'approved'
    )
  );

-- Master can delete
create policy "venue_photos_delete_master"
  on storage.objects for delete
  using (
    bucket_id = 'venue-photos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'master'
    )
  );

-- Add venue_id to event_parties
alter table public.event_parties
  add column venue_id uuid references public.venues(id) on delete set null;
