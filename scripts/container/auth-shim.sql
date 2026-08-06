-- auth-shim.sql — the objects Supabase provides and a bare PostgreSQL does not.
--
-- WHY THIS FILE EXISTS. `scripts/rls-baseline-container.mjs` rebuilds this
-- project's database inside a throwaway PostgreSQL 17.6 container so that the
-- CAP-03 baseline can be measured against the seven personas production does
-- not have. The repository's own SQL — the base schema and the 33 migrations —
-- assumes a Supabase database: it references `auth.users`, calls `auth.uid()`,
-- and creates policies on `storage.objects`. None of that exists in
-- `postgres:17.6`.
--
-- **This is the only hand-written schema in the container** (phase decision
-- D-21). Everything else comes from files this repository already owns. Where a
-- definition could be read from production it was read from production and
-- pasted here verbatim, so the two targets evaluate the same function body
-- rather than two similar ones.
--
-- WHAT IS FAITHFUL AND WHAT IS MINIMAL, stated plainly because the difference
-- decides what the container can be trusted to prove:
--
--   * `auth.uid()`, `auth.jwt()`, `auth.role()` and `storage.foldername()` are
--     VERBATIM copies of the production definitions, read on 2026-08-06 with
--     `pg_get_functiondef` through the Management API. All four are `sql` or
--     `plpgsql`, `STABLE` or `IMMUTABLE`, and **none of them is
--     `SECURITY DEFINER`** — which matters, because a `SECURITY DEFINER`
--     `auth.uid()` would change how every one of the 67 policies is evaluated.
--     Copying them carries no secret: they are Supabase's stock bodies, already
--     reachable by anyone holding the project's anon key (threat T-32-04-05,
--     disposition *accept*).
--   * `auth.users` and the two `storage` tables are MINIMAL — the columns the
--     repository's SQL actually touches, and nothing else. They exist so the
--     foreign keys resolve and the storage policies compile. **No artefact this
--     phase captures reads them**: B1 filters `schemaname = 'public'`, and the
--     20 measured tables are all in `public`.
--
-- THE GRANTS ARE NOT DECORATION. RLS only ever NARROWS what a `GRANT` already
-- allows. A bare PostgreSQL grants nothing to a fresh role, so without the
-- default privileges below every persona would read zero rows and refuse every
-- write — and the whole baseline would agree with production for a reason that
-- has nothing to do with a policy. That is threat T-32-04-03, and it is the
-- failure mode that looks most like success.

-- ── the three Supabase roles ──────────────────────────────────────────────
-- `nologin`: nothing connects as these. They are reached with `set local role`
-- from the container superuser, which is how the persona probes impersonate.
-- `noinherit` matches Supabase, where `authenticated` does not inherit
-- `postgres`.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

-- ── schema auth ───────────────────────────────────────────────────────────
create schema auth;

-- Minimal. `id` is the target of every `references auth.users` in the
-- repository; `email` and `raw_user_meta_data` are read by
-- `public.handle_new_user()` and `public.handle_user_email_change()`, the two
-- triggers the repository installs ON this table.
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now()
);

-- VERBATIM from production, read 2026-08-06 with `pg_get_functiondef`.
-- language sql · STABLE · NOT security definer.
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;

-- VERBATIM from production, read 2026-08-06. language sql · STABLE · NOT security definer.
CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$;

-- VERBATIM from production, read 2026-08-06. language sql · STABLE · NOT security definer.
CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$;

-- ── schema storage ────────────────────────────────────────────────────────
-- Four migrations insert a bucket and create policies on `storage.objects`.
-- Without these the migration chain stops at file 3 of 33.
create schema storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

-- VERBATIM from production, read 2026-08-06. language plpgsql · IMMUTABLE ·
-- NOT security definer. Called by the media policies in
-- `20260225120000_phase7_media.sql:91`.
CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$;

-- ── the grants RLS then narrows ───────────────────────────────────────────
-- Measured on production 2026-08-06 (`32-03-SUMMARY.md` finding F6): `anon` and
-- `authenticated` hold SELECT, INSERT, UPDATE and DELETE on all 20 public
-- tables, so a `42501` there is unambiguously a policy refusal and never a
-- missing grant. The container must reproduce that or its refusals would mean
-- something different from production's.
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;

-- Default privileges, not a one-off `grant on all tables`: every table in this
-- container is created AFTER this file runs, by the same role that runs it, so
-- a grant issued now over an empty schema would cover nothing.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema storage
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema storage to anon, authenticated, service_role;
