-- Resonate Database Schema
-- Run this in Supabase SQL Editor for fresh database setup
-- For existing databases, use the migration file in supabase/migrations/

-- ============================================================
-- Helper Functions (must be created before policies that use them)
-- ============================================================

-- Returns the current user's role from the profiles table
create or replace function public.get_user_role()
returns text as $$
begin
  return (
    select role from public.profiles
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

-- Returns the current user's status from the profiles table
create or replace function public.get_user_status()
returns text as $$
begin
  return (
    select status from public.profiles
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer stable;

-- Returns true if the current user is the master admin
create or replace function public.is_master()
returns boolean as $$
begin
  return (select public.get_user_role()) = 'master';
end;
$$ language plpgsql security definer stable;

-- Returns true if the current user is master or organizer
create or replace function public.is_admin_or_organizer()
returns boolean as $$
declare
  user_role text;
begin
  user_role := (select public.get_user_role());
  return user_role = 'master' or user_role = 'organizer';
end;
$$ language plpgsql security definer stable;

-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  membership_code text unique not null,
  role text not null default 'member' check (role in ('master', 'organizer', 'member')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  referred_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

-- Master and organizers can read all profiles
create policy profiles_select_admin on public.profiles
  for select using ((select public.is_admin_or_organizer()));

-- Users can update their own profile (but cannot change role or status)
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  );

-- Master can update any profile (for role/status changes)
create policy profiles_update_master on public.profiles
  for update using ((select public.is_master()));

-- Auto-create profile on signup with referral logic
-- NOTE: DDL column default is 'approved' but this trigger body explicitly sets
-- status. If this trigger fails to set status, the column default kicks in as
-- a safe fallback.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref_code text;
  referrer_id uuid;
  new_status text;
begin
  -- Generate membership code (RSN- prefix + 8 random chars)
  new_code := 'RSN-';
  for i in 1..8 loop
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;

  -- Read referral code from signup metadata
  ref_code := new.raw_user_meta_data->>'referral_code';

  -- Resolve referrer: must be an approved member with matching membership_code
  if ref_code is not null and ref_code <> '' then
    select id into referrer_id
    from public.profiles
    where membership_code = ref_code and status = 'approved';
  end if;

  -- Set status based on referral validity
  if referrer_id is not null then
    new_status := 'approved';
  else
    new_status := 'pending';
  end if;

  insert into public.profiles (id, email, full_name, membership_code, role, status, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code,
    'member',
    new_status,
    referrer_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Events
-- ============================================================

create table public.events (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  description text,
  date date not null,
  time time not null,
  location text,
  location_secret boolean default false,
  lineup text[] default '{}',
  cover_image text,
  is_published boolean default false,
  early_access_until timestamptz,
  capacity integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;

-- Published events visible to all, early access events visible to authenticated users
create policy events_select_published on public.events
  for select using (
    is_published = true
    and (
      early_access_until is null
      or early_access_until <= now()
      or auth.uid() is not null
    )
  );

-- Organizers and master can manage all events
create policy events_all_admin on public.events
  for all using ((select public.is_admin_or_organizer()));

-- ============================================================
-- RSVPs
-- ============================================================

create table public.rsvps (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table public.rsvps enable row level security;

-- Users can view their own RSVPs
create policy rsvps_select_own on public.rsvps
  for select using (auth.uid() = user_id);

-- Approved members can create RSVPs
create policy rsvps_insert_approved on public.rsvps
  for insert with check (
    auth.uid() = user_id
    and (select public.get_user_status()) = 'approved'
  );

-- Users can delete their own RSVPs
create policy rsvps_delete_own on public.rsvps
  for delete using (auth.uid() = user_id);

-- Admin/organizer can view all RSVPs
create policy rsvps_select_admin on public.rsvps
  for select using ((select public.is_admin_or_organizer()));

-- ============================================================
-- Attendances
-- ============================================================

create table public.attendances (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  checked_in_at timestamptz default now(),
  checked_in_by uuid references auth.users,
  unique(event_id, user_id)
);

alter table public.attendances enable row level security;

-- Users can view own attendances
create policy attendances_select_own on public.attendances
  for select using (auth.uid() = user_id);

-- Admin/organizer can manage all attendances
create policy attendances_all_admin on public.attendances
  for all using ((select public.is_admin_or_organizer()));

-- ============================================================
-- Event Media
-- ============================================================

create table public.event_media (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  url text not null,
  type text check (type in ('photo', 'video')) not null,
  caption text,
  "order" integer default 0,
  created_at timestamptz default now()
);

alter table public.event_media enable row level security;

-- All authenticated users can view media
create policy event_media_select_all on public.event_media
  for select using (true);

-- Admin/organizer can manage media
create policy event_media_all_admin on public.event_media
  for all using ((select public.is_admin_or_organizer()));

-- ============================================================
-- Newsletter Subscribers
-- ============================================================

create table public.newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  subscribed_at timestamptz default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;

-- Admin/organizer can view subscribers
create policy newsletter_select_admin on public.newsletter_subscribers
  for select using ((select public.is_admin_or_organizer()));
