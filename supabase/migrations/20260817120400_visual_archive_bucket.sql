-- The archive bucket — a third one, private, that only the server writes into
-- Phase 45, Plan 04: PROD-02, threats T-45-11 and T-45-06
--
-- Changes:
-- 1. storage.buckets — a new bucket `visual-archive`, PRIVATE, with the ceiling
--    the existing media path already carries and a type list read from the
--    stripper rather than invented
-- 2. storage.objects — ONE read arm, for `authenticated`, asking the VISUAL
--    section key and scoped to this bucket
-- 3. Two absences, each declared with its harmful repair named
--
-- ═════════════════════════════════════════════════════════════════════════════
-- ⚠ THE DECISION THIS FILE TAKES, WRITTEN HERE SO THE OWNER READS IT AT THE
--   AUTHORISATION CHECKPOINT OF PLAN 45-08 — BEFORE ANYTHING IS APPLIED
-- ═════════════════════════════════════════════════════════════════════════════
--
-- The dj photograph archive gets a THIRD BUCKET, `visual-archive`, and it is
-- PRIVATE. Not the existing public bucket, and not the quarantine bucket.
-- `45-RESEARCH.md` §F4 and Open Question 6 left the destination open on purpose —
-- *«the destination is a question the plan must answer, not assume»* — and it is
-- answered here, in the plan, rather than inside the upload code where nobody
-- would find it. It is taken under the standing delegation of `45-CONTEXT.md`
-- §Claude's Discretion, whose one constraint is exactly this: anything touching
-- venue secrecy or access returns to the owner BEFORE IT IS APPLIED.
--
-- ── NOT THE PUBLIC BUCKET ────────────────────────────────────────────────────
--
-- Because AN ARCHIVE PHOTOGRAPH IS NOT PUBLISHED. The whole reason the archive
-- exists is the order of the pipeline: the listing goes out two days before the
-- night, so that night's photograph cannot exist yet, and the archive has to have
-- been built BEFORE the listing that draws on it. A file that becomes readable by
-- URL the moment it is filed is a publication nobody decided — and this is the
-- domain where an accidental publication is read as an announcement. A photograph
-- of somebody who has agreed to play on a date that has not been communicated is
-- material in exactly the sense a space under negotiation is
-- (`brand-visual-system.md`, and `venue-acquisition.md` for the same rule on the
-- other object). `event-media` is `public = true`
-- (`20260225120000_phase7_media.sql:64-66`), so anything landing there is
-- readable by URL immediately, with no session at all.
--
-- ── NOT THE QUARANTINE BUCKET ────────────────────────────────────────────────
--
-- Because quarantine has A SHORT LIFE BY DESIGN. Its own header says it: *«it is
-- a TRANSIT AREA. Its objects live for the length of one strip. Whoever finds an
-- old object in there is looking at an interrupted upload, not at an archive»*
-- (`20260809004600_event_media_quarantine_bucket.sql:92-98`), and plan 35-20 owns
-- the sweep that removes them. An archive is the opposite kind of object: it is
-- kept precisely because it will be needed on a Monday months from now. Two
-- lifecycles in one bucket is ONE LIFECYCLE NOBODY CAN CHANGE SAFELY — the day
-- somebody tightens the quarantine sweep, they delete the archive, and they will
-- be right about the sweep.
--
-- ── AND WHAT THE THIRD BUCKET COSTS, said rather than glossed ────────────────
--
-- One more bucket is one more thing to secure and one more place to look. That
-- cost is accepted because the two alternatives fail in the two directions that
-- matter here — one publishes what was not published, the other deletes what was
-- meant to be kept — and neither failure is recoverable by a later commit.
--
-- ═════════════════════════════════════════════════════════════════════════════
--
-- ⚠ THE BYTES REACH THIS BUCKET ONLY THROUGH THE SERVER, AND THE UPLOAD PATH IS
-- NOT A NEW ONE. `45-RESEARCH.md` §F4: *«Do not build a second one.»* The path
-- this product already has, unchanged:
--
--   client → the PRIVATE quarantine bucket → a JSON call to
--   `POST /api/media/finalize` with the object key → the service role picks the
--   bytes up, STRIPS THE METADATA, and writes the result here.
--
-- The bytes do not travel through the request, and that is forced by two numbers
-- rather than chosen: a Vercel Function refuses a body over 4.5 MB and the
-- product accepts photographs up to 50 MB
-- (`src/app/api/media/finalize/route.ts:28-50`, read at the source 2026-08-09).
-- Whoever comes to "simplify" the archive upload into a route that accepts the
-- file must read those two numbers first.
--
-- WHY THE STRIP IS NOT OPTIONAL ON THIS PATH EITHER. A photograph off a telephone
-- carries GPS coordinates, and `media-and-storage.md` (*gate EXIF prima della
-- pubblicazione*) requires the strip BEFORE the file becomes reachable. The
-- archive raises the stakes rather than lowering them: an archive photograph is
-- kept for months and is drawn on for a listing, so an unstripped file here is a
-- reveal path that stays open. *«A file that has not been stripped is reachable by
-- nobody»* is the property this bucket inherits by being written to only after
-- the strip has returned.
--
-- ⚠ THE OBJECT KEY IS NOT A PLACE TO PUT MATERIAL, and this is prose rather than
-- enforcement, which is why it names who enforces it. A key travels in a signed
-- URL, in a request log and in an error message, and it outlives the row. It must
-- carry no artist name, no venue word and no date that has not been communicated.
-- The upload path of plans 45-13 and 45-15 is what has to build the key that way;
-- saying so here does not make it so.
--
-- ⚠ AND THE QUESTION THIS FILE RAISES WITHOUT ANSWERING, because it is not a
-- database question. The archive holds photographs of RECOGNISABLE PEOPLE.
-- `legal-compliance.md`, *gate immagini delle persone*, asks for a declared legal
-- basis, a visible notice and a revocation route that works — and works on what
-- has already been published. A private bucket serves the last of those (removal
-- is possible, by the server, at any time) and answers neither of the first two.
-- That is an open question for the register, not a defect of this file.
--
-- ⚠ THIS FILE IS A PUBLICATION. `supabase/migrations/` is tracked and
-- `github.com/edmiribrahimi/Resonate` is public. NO MATERIAL: no date, no venue
-- name, no street, no series name, no progressivo, and NO ARTIST NAME. The only
-- production vocabulary below is the name of a section, which is structure.
--
-- ⚠ AND IT IS NOT APPLIED BY THIS PLAN. Plan 45-08 applies it, with its own
-- authorisation and its own recorded read-back of `storage.buckets` and
-- `pg_policies`. Everything below is TEXT until then, and a green `npm run build`
-- says nothing about it: no build in this repository reads a `.sql` file, and
-- there is no test runner for the product.
--
-- IDEMPOTENCE, item by item. This queue is applied by hand, one row at a time,
-- and without these clauses a second run raises `42710`, rolls the transaction
-- back and leaves everything after it UNAPPLIED (`supabase-data.md`, *gate
-- idempotenza DDL*):
--   * `ON CONFLICT (id) DO NOTHING` on the bucket row — which also means that if
--     a bucket with this id somehow already exists, THIS FILE DOES NOT CORRECT
--     ITS SETTINGS. The read-back of plan 45-08 is where the three values below
--     are confirmed to be the ones actually in `storage.buckets`, and it is not a
--     formality: a pre-existing row would silently keep its own.
--   * `DROP POLICY IF EXISTS` before the one arm created.
--
-- NOTE ON FORM, and it is the same choice `20260809004600:67-72` made. The
-- acceptance criteria of this plan grep this file for the policy clauses that
-- must NOT exist in it. If the paragraph explaining their absence spelled them
-- out, it would be the file's only match and the check would cancel itself out.
-- They are therefore DESCRIBED — a write, a read for an anonymous caller — and
-- never written.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The bucket
--
-- `public` is `false`, and that single boolean is the whole mitigation of
-- T-45-11. `venue-secrecy.md`, *gate il path non e' una password*: an unlisted
-- URL is not a protected URL, and protection here does not come from the
-- difficulty of guessing a name. It comes from the bucket being private.
--
-- THE CEILING IS NOT A FRESH DECISION. `104857600` is the value both
-- `event-media` (`20260225120000_phase7_media.sql:64-66`) and the quarantine
-- bucket already carry, read from those lines rather than rewritten from memory.
-- A destination with a SMALLER ceiling than the transit area would refuse a file
-- the transit area accepted — and the refusal would arrive at the server AFTER
-- the strip, which is to say after the upload had already succeeded from the
-- uploader's point of view. That is the worst place to put a size error.
--
-- THE TYPE LIST IS READ FROM THE STRIPPER, NOT INVENTED. The three values are
-- `STRIPPABLE_MIME_TYPES` verbatim (`src/lib/media/strip-metadata.ts:105-109`),
-- and the list is narrower than the product's upload list ON PURPOSE: the video
-- types this product accepts elsewhere are deliberately absent from the stripper,
-- so a video cannot be stripped — and NOTHING THAT CANNOT BE STRIPPED MAY BE
-- KEPT IN THE ARCHIVE, because the archive is what a listing is pulled from
-- months later. The narrowing is the point, not an omission.
--
--   ⚠ AND WHAT IS NOT ASSERTED HERE: whether the storage API applies
--   `allowed_mime_types` to a write made with the SERVICE ROLE has not been
--   verified against the source, and this file does not claim it does. If it
--   does, it is one constraint the service role does not bypass; if it does not,
--   the list still states the contract in the place a reader looks for it. Either
--   way the enforcement that matters is the stripper itself, which returns bytes
--   of one of these three types or returns a refusal.
--
-- There is no `COMMENT` on the row below and there cannot be: a bucket is a ROW
-- in `storage.buckets`, not a schema object, and `COMMENT ON` has nothing to
-- attach to. What the bucket is for is therefore written here, where the next
-- reader of this file will find it.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'visual-archive',
    'visual-archive',
    false,
    104857600,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
  ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Who may read an object in it — one arm, one key
--
-- The arm asks the visual section key, wrapped, and is scoped to this bucket's
-- id. It is what lets the visual section's own surface mint a signed URL with the
-- COOKIE-BOUND client instead of routing every thumbnail through the service
-- role: a caller without `production.visual.manage` cannot mint one, because the
-- arm refuses them the object.
--
-- The `(SELECT ...)` wrapper is load-bearing and it is not `STABLE` that produces
-- it — it makes Postgres evaluate the call once per statement as an InitPlan
-- instead of once per row (`20260807000000_capability_model.sql:177-184`,
-- measured with EXPLAIN on this database).
--
-- `TO authenticated` for the same reason the ten table arms of
-- `20260817120300_production_sections_access.sql` carry it: for an anonymous
-- caller the predicate can only ever answer false, so the clause is free, and it
-- narrows the set of roles the next reader has to reason about to one.

DROP POLICY IF EXISTS visual_archive_select_visual ON storage.objects;

CREATE POLICY visual_archive_select_visual
  ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'visual-archive'
    AND (SELECT private.has_capability('production.visual.manage'))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. THE FIRST ABSENCE — NO CLIENT MAY WRITE INTO THIS BUCKET
--
-- There is no arm here granting `authenticated` a write of any kind — neither
-- depositing an object, nor replacing one, nor removing one — and the ABSENCE IS
-- WHAT MAKES THE SERVER-ONLY PATH TRUE. Without it the property would rest on the
-- code's habit of going through `/api/media/finalize`, and a habit is not a
-- boundary: the day somebody uploads straight from a component, nothing refuses
-- them.
--
-- The server does not need an arm written for it either. The service role does
-- not go through row level security at all (`src/lib/supabase/service.ts`), so
-- the finalize route writes the stripped bytes here without any policy granting
-- it anything. Writing a permissive arm "for the server" would be granting to
-- everyone in order to serve someone who never asked — the exact reasoning
-- `20260809004600:160-165` already recorded for the quarantine bucket.
--
-- REMOVAL STAYS POSSIBLE, and it matters that it does. `media-and-storage.md`
-- (*gate moderazione = rimozione*) and `legal-compliance.md` (*gate immagini
-- delle persone*) both require that taking a photograph away be genuinely
-- possible, because that is what makes a withdrawal of consent workable for the
-- person in the frame. It is possible: the service role can remove any object
-- here at any time, from a Server Action guarded by the visual section key. What
-- is absent is a CLIENT'S ability to do it with a cookie-bound session, which is
-- a write and would have to be granted deliberately, in its own file, with its
-- own reasoning.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 4. THE SECOND ABSENCE — NOTHING HERE OPENS THIS BUCKET TO AN ANONYMOUS CALLER
--
-- (The heading avoids the verb a reader would expect, and deliberately: the
-- acceptance criterion of this task greps the file for a function permission
-- keyword to check that no permission is handed out without the revocation that
-- must precede it. A prose match would redden a check on a correct file, and a
-- criterion that fires on correct work is one that gets ignored the third time.)
--
-- Deliberate, and named so the harmful repair is recognised if it is ever
-- proposed. The repair looks like this and it will be proposed by somebody acting
-- in good faith: *"the thumbnails on the visual section do not load — add a
-- public read arm on the bucket."*
--
-- That repair makes the entire archive readable by URL, with no session, to
-- anybody who has an object key or can derive one — which returns the bucket to
-- being the public bucket this file just argued against, only with a longer name.
-- And an archive photograph is not published: the object would be reachable
-- before anybody decided to publish it.
--
-- WHAT TO DO INSTEAD, so the repair has somewhere to go. A thumbnail on a gated
-- surface loads through a SIGNED URL with an expiry, minted server-side — the
-- same door as everything else on that page, opened for one object for a bounded
-- time. If a thumbnail is not loading, the question is which client minted the
-- URL and whether that session holds `production.visual.manage`; it is never
-- whether the bucket should be public.
--
-- The direction of the error is the same as everywhere else on this path: if a
-- read cannot be authorised, nothing is read. Fail closed — `venue-secrecy.md`,
-- *gate default chiuso*, which here is the rule and not the exception.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NO FUNCTION IS DECLARED BY THIS FILE
--
-- Stated because the omission has a consequence worth naming. Postgres grants
-- EXECUTE to PUBLIC by default on every new function, so a function added here
-- later must be followed by a revocation of that default and only then by a grant
-- to the service role — two statements, in that order.
-- `20260815120200` is this repository's receipt for having learned it once
-- already. This file adds none, so there is nothing to revoke and nothing to
-- grant, and T-45-06 has no surface here.

COMMIT;
