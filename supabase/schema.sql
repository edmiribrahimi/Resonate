-- Resonate Database Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  membership_code text unique not null,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  new_code := 'RSN-';
  for i in 1..8 loop
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;

  insert into public.profiles (id, email, full_name, membership_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new_code
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Events
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
create policy "Published events are viewable by all"
  on public.events for select
  using (
    is_published = true
    and (
      early_access_until is null
      or early_access_until <= now()
      or auth.uid() is not null
    )
  );

create policy "Admins can manage events"
  on public.events for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- RSVPs
create table public.rsvps (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table public.rsvps enable row level security;

create policy "Users can view own RSVPs"
  on public.rsvps for select
  using (auth.uid() = user_id);

create policy "Users can create own RSVPs"
  on public.rsvps for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own RSVPs"
  on public.rsvps for delete
  using (auth.uid() = user_id);

create policy "Admins can view all RSVPs"
  on public.rsvps for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Attendances
create table public.attendances (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  checked_in_at timestamptz default now(),
  checked_in_by uuid references auth.users,
  unique(event_id, user_id)
);

alter table public.attendances enable row level security;

create policy "Users can view own attendances"
  on public.attendances for select
  using (auth.uid() = user_id);

create policy "Admins can manage attendances"
  on public.attendances for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Event Media
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

create policy "Event media viewable by all"
  on public.event_media for select
  using (true);

create policy "Admins can manage media"
  on public.event_media for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Newsletter Subscribers
create table public.newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  subscribed_at timestamptz default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;

create policy "Admins can view subscribers"
  on public.newsletter_subscribers for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
