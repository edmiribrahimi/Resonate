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
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;

-- Published events visible to anyone (including anon)
create policy events_select_published on public.events
  for select using (is_published = true);

-- Organizers and master can view all events (including unpublished, for management)
create policy events_select_admin on public.events
  for select using ((select public.is_admin_or_organizer()));

-- Organizers and master can create events
create policy events_insert_admin on public.events
  for insert with check ((select public.is_admin_or_organizer()));

-- Organizers can update their own events; master can update any
create policy events_update_own on public.events
  for update using (
    auth.uid() = created_by
    or (select public.is_master())
  );

-- Organizers can delete their own events; master can delete any
create policy events_delete_own on public.events
  for delete using (
    auth.uid() = created_by
    or (select public.is_master())
  );

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

-- ============================================================
-- Storage: Event Images Bucket
-- ============================================================

-- NOTE: Bucket creation may need to be done via Supabase Dashboard
-- if storage.buckets is not accessible via SQL.
-- Create bucket: name = "event-images", public = true
insert into storage.buckets (id, name, public)
  values ('event-images', 'event-images', true)
  on conflict do nothing;

-- Organizers can upload event images
create policy "Organizers can upload event images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-images'
    and (select public.is_admin_or_organizer())
  );

-- Anyone can view event images (public bucket)
create policy "Anyone can view event images"
  on storage.objects for select
  using (bucket_id = 'event-images');

-- Organizers can update event images
create policy "Organizers can update event images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'event-images'
    and (select public.is_admin_or_organizer())
  );

-- Organizers can delete event images
create policy "Organizers can delete event images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'event-images'
    and (select public.is_admin_or_organizer())
  );

-- ============================================================
-- Ticketing & Payments
-- ============================================================

-- Ticket tiers: defined per event by organizers
create table public.ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tickets: one per member per event
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  tier_id uuid not null references public.ticket_tiers on delete restrict,
  user_id uuid not null references auth.users on delete cascade,
  sumup_checkout_id text unique,
  sumup_transaction_code text,
  amount_paid numeric(10,2) not null,
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

-- Pending purchases: tracks checkout initiation before SumUp confirmation
create table public.pending_purchases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  tier_id uuid not null references public.ticket_tiers on delete restrict,
  user_id uuid not null references auth.users on delete cascade,
  sumup_checkout_id text unique not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'expired')),
  ticket_id uuid references public.tickets,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index idx_tickets_event_id on public.tickets (event_id);
create index idx_tickets_user_id on public.tickets (user_id);
create index idx_tickets_tier_id on public.tickets (tier_id);
create index idx_ticket_tiers_event_id on public.ticket_tiers (event_id);
create index idx_pending_purchases_checkout on public.pending_purchases (sumup_checkout_id);

-- RLS
alter table public.ticket_tiers enable row level security;
alter table public.tickets enable row level security;
alter table public.pending_purchases enable row level security;

-- Ticket tiers: anyone authenticated can read (for purchase UI)
create policy ticket_tiers_select on public.ticket_tiers
  for select to authenticated using (true);

create policy ticket_tiers_insert on public.ticket_tiers
  for insert to authenticated
  with check ((select public.is_admin_or_organizer()));

create policy ticket_tiers_update on public.ticket_tiers
  for update to authenticated
  using ((select public.is_admin_or_organizer()));

create policy ticket_tiers_delete on public.ticket_tiers
  for delete to authenticated
  using ((select public.is_admin_or_organizer()));

-- Tickets: members can read their own
create policy tickets_select_own on public.tickets
  for select to authenticated
  using (auth.uid() = user_id);

-- Tickets: organizers/master can read all (for sales dashboard)
create policy tickets_select_admin on public.tickets
  for select to authenticated
  using ((select public.is_admin_or_organizer()));

-- Pending purchases: users can see their own
create policy pending_select_own on public.pending_purchases
  for select to authenticated
  using (auth.uid() = user_id);

-- Atomic ticket reservation function (prevents overselling via FOR UPDATE lock)
create or replace function public.reserve_ticket(
  p_tier_id uuid,
  p_user_id uuid,
  p_event_id uuid,
  p_sumup_checkout_id text,
  p_sumup_transaction_code text,
  p_amount_paid numeric
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_ticket_id uuid;
  v_sold_count integer;
  v_quantity integer;
  v_existing_ticket uuid;
begin
  -- Check if user already has a ticket for this event
  select id into v_existing_ticket
  from public.tickets
  where event_id = p_event_id and user_id = p_user_id;

  if v_existing_ticket is not null then
    raise exception 'User already has a ticket for this event';
  end if;

  -- Lock the tier row to prevent concurrent modifications
  select quantity into v_quantity
  from public.ticket_tiers
  where id = p_tier_id
  for update;

  if not found then
    raise exception 'Ticket tier not found';
  end if;

  -- Count existing tickets for this tier
  select count(*) into v_sold_count
  from public.tickets
  where tier_id = p_tier_id;

  -- Check availability
  if v_sold_count >= v_quantity then
    raise exception 'Tier sold out';
  end if;

  -- Insert ticket
  insert into public.tickets (
    event_id, tier_id, user_id,
    sumup_checkout_id, sumup_transaction_code, amount_paid
  )
  values (
    p_event_id, p_tier_id, p_user_id,
    p_sumup_checkout_id, p_sumup_transaction_code, p_amount_paid
  )
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;
