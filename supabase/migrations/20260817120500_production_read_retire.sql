-- ============================================================================
-- 20260817120500 — `production.read` is retired, by key and by pair
-- ============================================================================
--
-- ⚠⚠ THE PRECONDITION, AND IT IS THE WHOLE REASON THIS IS A SEPARATE FILE ⚠⚠
--
-- **THIS MIGRATION MAY ONLY BE APPLIED AFTER THE DEPLOY THAT CARRIES
-- `src/lib/capabilities/keys.ts`, `src/lib/routes/capability-routes.ts`,
-- `src/lib/routes/staff-tabs.ts` AND THE NEW PAGES IS LIVE.**
--
-- Applied before it, the bundle in production still asks `production.read`.
-- `private.has_capability` would answer FALSE — with no exception, no error and
-- no log line, because the resolver is an `EXISTS` over
-- `private.role_capabilities` (`20260807000000_capability_model.sql:209-216`) and
-- a key that is not there simply joins to nothing. `/admin/calendar` would become
-- a redirect to `/dashboard` for the master, and this repository has NO ERROR
-- TRACKING: a surface down for the length of a deploy is a surface nobody would
-- learn was down except by opening it.
--
-- WHAT THIS FILE IS FOR. `20260817120000_production_section_keys.sql` minted the
-- four section keys and moved the six calendar arms onto one of them WITHOUT
-- touching the old key, so that at no instant of the sequence was an entitled
-- master refused anything. This is the other half: once the deploy has landed,
-- nothing asks `production.read` any more, and a granted key nobody asks is a
-- permission with no question attached.
--
-- AND IT IS THE FILE AN AUDITOR READS to answer *did the reach change*. The
-- answer is read off two `INSERT` blocks in the additive migration and three
-- statements here, none of which touches a role list: master and organizer held
-- the calendar before the split and hold it after (D-45-04 constraint 3).
--
-- ORDER: THE GRANTS FIRST, THEN THE CATALOGUE ROW — AND THE REASON IS NOT THE
-- ONE A GUESS WOULD GIVE. The natural guess is that the reverse order would be
-- refused by the foreign key. It would not. `private.role_capabilities.capability`
-- references `private.capabilities(key)` ON DELETE CASCADE
-- (`20260807000000_capability_model.sql:120-125`, read rather than assumed), so
-- removing the catalogue row first would take both grants with it, silently, in
-- one statement. That is worse than an error in this particular file: three
-- statements produce three visible effects, and a single statement with two
-- invisible ones answers the auditor question by hiding half of it. Written in
-- this order the cascade never fires, because there is nothing left for it to
-- reach.
--
-- ⚠ NEVER A PREFIX SELECTOR. `WHERE key LIKE 'production%'` is the harmful
-- repair, named here so it is recognised if it is ever proposed: after this phase
-- that pattern matches the four section keys as well, so a removal written that
-- way would take the whole production surface away from both roles — and the
-- surface would then answer false with no error and nothing in a log, which is
-- precisely the failure mode this file was sequenced to avoid. `ai-engineering.md`,
-- *gate una rimozione si fa per chiave*: the identifiers are known, so the
-- removal names them.
--
-- IDEMPOTENT: a removal of an absent row is a no-op, so running this file twice
-- changes nothing the second time.
--
-- NO MATERIAL: this file carries no venue, no street, no date, no score and no
-- line-up. It names one capability key, two roles and two tables in `private`.
--
-- ⚠ AND IT IS NOT APPLIED BY THIS PLAN. Plan 45-09 applies it, under its own
-- gate and after the deploy above. `verify:capabilities` returns green only once
-- this file has run: between the additive migration and this one the database
-- holds one key more than `keys.ts` declares, and that red is the gate working.
-- ============================================================================

BEGIN;

DELETE FROM private.role_capabilities WHERE (role, capability) = ('master', 'production.read');

DELETE FROM private.role_capabilities WHERE (role, capability) = ('organizer', 'production.read');

DELETE FROM private.capabilities WHERE key = 'production.read';

COMMIT;
