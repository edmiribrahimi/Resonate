# Domain Pitfalls

**Domain:** Private music events community platform (payments, referrals, roles, media, approvals)
**Project:** Resonate
**Researched:** 2026-02-24
**Overall Confidence:** MEDIUM (training data; WebSearch/WebFetch unavailable for live verification)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, security breaches, or financial inconsistency.

---

### Pitfall 1: SumUp Checkout Status Assumed from Redirect, Not Webhook

**What goes wrong:** After a SumUp checkout, the user is redirected back to your `return_url`. Developers treat this redirect as proof of payment. But the redirect only means the user completed the checkout *flow* -- the payment may still be processing, may have failed, or the user may have navigated directly to the return URL without paying. If you mark tickets as "purchased" on redirect, you give away tickets without confirmed payment.

**Why it happens:** SumUp's Online Checkout API returns a `checkout_url` where the user pays, then redirects to your `return_url` with the checkout `id`. The redirect happens regardless of payment outcome. The actual payment status is only reliably confirmed via: (a) polling the `GET /v0.1/checkouts/{id}` endpoint, or (b) webhook notification. Developers who skip this step ship a broken payment flow.

**Consequences:**
- Tickets allocated to users who never paid
- Revenue leakage with no audit trail
- Double-booking when capacity is limited
- Potential chargebacks if users dispute partial flows

**Prevention:**
1. Never trust the redirect alone. On your return URL handler, immediately call `GET /v0.1/checkouts/{id}` to verify `status === 'PAID'`
2. Implement SumUp webhooks as the authoritative source of payment truth. The webhook payload includes the checkout `id` and `status`
3. Use an intermediate `payment_pending` state in your tickets table. Only transition to `payment_confirmed` after webhook or API verification
4. Implement idempotency: the same checkout ID processed twice should not create duplicate tickets

**Detection:** Test by navigating directly to your return URL with a fake checkout ID. If you get a ticket, you have this bug.

**Phase relevance:** Ticket Payments phase. Must be designed correctly from the start -- retrofitting is painful.

**Confidence:** HIGH (well-documented pattern across all payment providers; SumUp API structure confirmed in training data)

---

### Pitfall 2: Supabase RLS Policies That Leak Data or Block Legitimate Access

**What goes wrong:** RLS policies are either too permissive (any authenticated user can read/modify other users' data) or too restrictive (server-side operations fail silently because RLS blocks the service role). Both are common. The most dangerous variant: forgetting to enable RLS on a new table entirely, which makes it fully public to anyone with the anon key.

**Why it happens:** Supabase exposes the `anon` key in client-side code (it is public by design). Without RLS, any authenticated user can query any row in any table. Developers create tables, forget to run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, and ship wide-open data. Conversely, developers who enable RLS sometimes write policies that break server-side API routes because they forget that Server Components and API routes using the `anon` key also go through RLS.

**Consequences:**
- Any member can read other members' profiles, emails, payment records
- Any member can modify other members' RSVPs or approval status
- Server-side operations (admin approval, ticket creation) fail silently when RLS blocks them
- Potential GDPR violations from exposed personal data

**Prevention:**
1. **Rule: Every new table gets RLS enabled immediately.** Add it to the migration template. No exceptions.
2. Use `auth.uid()` in every policy: `USING (auth.uid() = user_id)` for row ownership
3. For role-based access: store `role` in the `profiles` table and reference it in policies:
   ```sql
   CREATE POLICY "admins_can_manage_approvals" ON profiles
     FOR UPDATE USING (
       EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'master')
     );
   ```
4. For server-side admin operations that need to bypass RLS, use the Supabase `service_role` key in API routes only (never expose it client-side). Create a separate `createServiceClient()` utility.
5. Test every policy: log in as each role (member, organizer, master) and try to access data you should not be able to see.

**Detection:** Use Supabase Dashboard > Table Editor > try querying as anon. Or write integration tests that authenticate as one user and attempt to read another user's rows.

**Phase relevance:** Roles & Permissions phase. Must be the first phase implemented because every subsequent feature (tickets, media, approvals) depends on correct RLS.

**Confidence:** HIGH (Supabase RLS is extensively documented and this is the most common Supabase security mistake)

---

### Pitfall 3: SumUp Webhook Endpoint Not Idempotent, Causing Double-Ticketing

**What goes wrong:** SumUp (like all payment providers) may send the same webhook multiple times -- on network timeouts, retries, or infrastructure issues. If your webhook handler creates a ticket row on every call, users end up with duplicate tickets and your sales numbers are wrong.

**Why it happens:** Webhook delivery is at-least-once, not exactly-once. Developers write a simple `INSERT INTO tickets` in the webhook handler without checking if the checkout has already been processed.

**Consequences:**
- Duplicate ticket records for the same purchase
- Incorrect revenue reporting
- Capacity tracking breaks (event shows sold out prematurely or oversells)
- Confusing UX when user sees multiple tickets

**Prevention:**
1. Store the SumUp `checkout_id` in your tickets/payments table with a `UNIQUE` constraint
2. Use `INSERT ... ON CONFLICT (checkout_id) DO NOTHING` or check existence before insert
3. Process webhooks in a transaction: read current state, only transition if state allows it (e.g., only transition `pending` to `paid`, never `paid` to `paid`)
4. Return `200 OK` to SumUp even if you skip a duplicate -- otherwise SumUp keeps retrying

**Detection:** Send the same webhook payload twice to your endpoint. If you get two ticket rows, you have this bug.

**Phase relevance:** Ticket Payments phase.

**Confidence:** HIGH (universal payment webhook pattern)

---

### Pitfall 4: Referral System Exploitable via Self-Referral and Sybil Attacks

**What goes wrong:** A user creates a second account using a different email, refers themselves, and bypasses the approval flow. Or a malicious user shares their referral link publicly (on social media, forums), allowing mass signups that circumvent the community's curation purpose. The entire value proposition of Resonate -- a *trusted, curated* community -- collapses.

**Why it happens:** The referral link is a simple URL with a code. There is no verification that the referrer actually knows the referee. If auto-approval is the only consequence of having a referral, it becomes trivial to game.

**Consequences:**
- Community quality degrades as untrusted strangers join freely
- The approval flow becomes meaningless
- Trust erosion among genuine members
- Potential spam or bad actors at events

**Prevention:**
1. **Rate-limit referrals:** Cap each member at N successful referrals per month (e.g., 5). This limits blast-sharing damage.
2. **Track referral source:** Log the referral link usage. If one link gets 50 signups in a day, flag it for admin review.
3. **Consider delayed auto-approval:** Instead of instant approval, give referred members a 24-hour window where an admin can still reject. This preserves the fast-track benefit while keeping a safety net.
4. **Referrer accountability:** If a referred member causes problems, the referrer should be notifiable/flaggable. Display "Invited by [name]" in admin views.
5. **Do NOT allow self-referral:** Check that the referring user's email differs from the new signup email. Also check for same IP address or device fingerprint if feasible.
6. **Referral link should not be guessable:** Use a cryptographic random token (e.g., `nanoid(21)`), not the user's ID or sequential numbers.

**Detection:** Monitor referral analytics from day one. A sudden spike in referral signups from a single code is the warning sign.

**Phase relevance:** Referral System phase. Design the abuse prevention *before* shipping the feature, not after abuse occurs.

**Confidence:** HIGH (referral abuse is one of the most studied patterns in growth engineering)

---

### Pitfall 5: Media Upload Without Size/Type Validation Crashes Supabase Storage or Burns Budget

**What goes wrong:** Members upload 4K videos (500MB-2GB+) or non-media files disguised as images. Supabase Storage on the free/Pro plan has a default upload limit of 50MB per file (configurable up to 5GB on paid plans, but the default catches people). Large video uploads fail silently or timeout on mobile connections, leaving orphaned partial uploads. Even when they succeed, serving unoptimized video to all gallery visitors burns bandwidth rapidly.

**Why it happens:** Developers add a file input, call `supabase.storage.from('media').upload(path, file)` and ship it. No client-side validation, no server-side constraints, no compression pipeline.

**Consequences:**
- Upload failures on mobile (timeout, memory issues on Safari)
- Supabase bandwidth quota exhausted quickly (especially video)
- Storage costs balloon unexpectedly
- Gallery page loads slowly, poor UX
- Potential XSS if non-media files (SVG with scripts, HTML) are uploaded and served

**Prevention:**
1. **Client-side validation first:** Check file type (accept only `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime`) and file size (e.g., 10MB for photos, 100MB for videos) before uploading.
2. **Server-side validation too:** Use Supabase Storage policies to restrict allowed MIME types and max file size per bucket.
3. **Compress before upload:** Use browser-side image compression (e.g., `browser-image-compression` library) to resize photos to max 2000px wide before upload. For video, consider a max duration (e.g., 60 seconds) enforced client-side.
4. **Use resumable uploads for video:** Supabase Storage supports TUS protocol for resumable uploads. Use this for any file over 6MB to handle mobile network interruptions gracefully.
5. **Generate thumbnails:** Do not serve original files in gallery listings. Generate thumbnails (Supabase image transformation or a separate function) and serve those. Load originals only on tap/click.
6. **Sanitize file names:** Strip special characters, use UUIDs for storage paths to prevent path traversal.
7. **Set bucket to private:** Serve media through signed URLs or Supabase's authenticated endpoint, not a public bucket, since event media should only be visible to members.

**Detection:** Upload a 200MB video on a slow connection. If it hangs with no progress indicator or fails silently, you have this problem. Also check your Supabase dashboard bandwidth metrics after a week of use.

**Phase relevance:** Event Media phase. The upload pipeline design is the hardest part -- get it right first before building the gallery UI.

**Confidence:** HIGH (Supabase Storage limits and TUS support are well-documented; media upload pitfalls are universal)

---

### Pitfall 6: Route Migration (Italian to English) Breaks SEO, Bookmarks, and Deep Links

**What goes wrong:** Renaming `/eventi` to `/events`, `/registrati` to `/register`, `/galleria` to `/gallery`, etc. breaks every existing bookmark, shared link, PWA home screen shortcut, and cached service worker route. Members who bookmarked `/eventi/summer-party` get 404s. The PWA start_url in the manifest may point to an old route.

**Why it happens:** Developers rename the file system routes (which in Next.js App Router means renaming folders) and forget to add redirects for old URLs. They also forget to update the PWA manifest, service worker cache, and any hardcoded links in emails already sent.

**Consequences:**
- 404 errors for existing users
- PWA fails to launch if `start_url` changed
- Service worker serves cached old routes, causing stale/broken UI
- Shared links on social media or chat groups stop working
- Google (if indexed) shows broken pages

**Prevention:**
1. **Create a redirect map in `next.config.ts`:** Every old route must permanently redirect (308) to the new route:
   ```typescript
   async redirects() {
     return [
       { source: '/eventi', destination: '/events', permanent: true },
       { source: '/eventi/:slug', destination: '/events/:slug', permanent: true },
       { source: '/registrati', destination: '/register', permanent: true },
       { source: '/galleria', destination: '/gallery', permanent: true },
       { source: '/presenze', destination: '/attendance', permanent: true },
       // ... all routes
     ];
   }
   ```
2. **Update the PWA manifest:** Change `start_url`, `scope`, and any route references in `manifest.json`.
3. **Bust the service worker cache:** Increment the service worker version or cache name so the old cached routes are purged on the next visit.
4. **Update middleware route matchers:** The current `middleware.ts` has hardcoded route arrays (`memberRoutes`, `adminRoutes`). These must be updated to English equivalents.
5. **Search the entire codebase for old route strings:** Grep for `/eventi`, `/registrati`, `/galleria`, `/presenze`, `/membership-card` and update every reference.
6. **Do the migration in one atomic commit.** Do not leave the app in a half-Italian, half-English state.

**Detection:** After migration, visit every old URL. If any returns 404 instead of redirecting, you missed one.

**Phase relevance:** Bug Fixes & Polish phase (should be done first, before building new features on the new routes).

**Confidence:** HIGH (Next.js redirect configuration is well-documented; PWA route migration is a known pain point)

---

## Moderate Pitfalls

Mistakes that cause significant bugs or technical debt but are recoverable without full rewrites.

---

### Pitfall 7: Approval Flow Race Condition -- Pending Member Buys Ticket During Approval Window

**What goes wrong:** A member is in `pending` status. An admin starts reviewing them. Meanwhile, through a timing exploit or UI bug, the pending member manages to access the ticket purchase flow and buys a ticket before being approved. Now you have a payment from someone who might get rejected.

**Why it happens:** The "browse-only" restriction for pending members is enforced only in the UI (hiding buttons), not at the database/API level. A pending member who knows the API endpoint or modifies the DOM can still submit requests.

**Prevention:**
1. **Enforce at the RLS level, not the UI level.** RLS policies on `tickets`, `rsvps`, and `event_media` must include `AND profiles.status = 'approved'` checks.
2. **Also enforce in API route handlers:** Before processing a ticket purchase, verify `profile.status === 'approved'`. Defense in depth.
3. **For the SumUp checkout creation:** Do not generate a checkout URL for pending members. Check status before calling the SumUp API.
4. **If a pending member somehow pays:** Have a refund path ready. Document the edge case and auto-refund via SumUp's `POST /v0.1/refunds` endpoint.

**Detection:** Log in as a pending member and try to directly hit the ticket purchase API endpoint. If it succeeds, the enforcement is UI-only.

**Phase relevance:** Approval Flow phase, but the RLS enforcement should be baked into Roles & Permissions phase.

**Confidence:** HIGH (authorization bypass via UI-only enforcement is a textbook security pitfall)

---

### Pitfall 8: SumUp API Rate Limits and Sandbox/Production Key Confusion

**What goes wrong:** During development, you test with production API keys and accidentally charge real money. Or you test with sandbox keys, everything works, then switch to production and discover the API behaves differently (different endpoints, different webhook URLs, different checkout flow). Additionally, SumUp has API rate limits that are not as generous as Stripe's, and hitting them during a popular event's ticket sale causes failures.

**Why it happens:** SumUp's developer experience is less mature than Stripe's. Documentation can be sparse. The sandbox and production environments sometimes differ in subtle ways. Rate limits are not prominently documented.

**Prevention:**
1. **Environment variable separation:** Use `SUMUP_API_KEY_SANDBOX` and `SUMUP_API_KEY_PRODUCTION` with clear naming. Never put production keys in `.env.local`.
2. **Use environment-based configuration:** `const SUMUP_BASE_URL = process.env.NODE_ENV === 'production' ? 'https://api.sumup.com' : 'https://api.sumup.com'` -- note: SumUp sandbox may use the same base URL with different merchant codes. Verify the sandbox setup carefully.
3. **Implement retry with exponential backoff:** For rate limit errors (HTTP 429), retry after the `Retry-After` header value.
4. **Queue ticket purchases:** For high-demand events, queue checkout creation requests rather than hitting SumUp API for every concurrent user. Process sequentially.
5. **Test the full flow in production with a small amount** (1 EUR) before the first real event.

**Detection:** Monitor SumUp API response codes. If you see 429s during testing, you are already rate-limited.

**Phase relevance:** Ticket Payments phase.

**Confidence:** MEDIUM (SumUp API specifics may have changed; rate limit details from training data may be outdated. Verify against current SumUp developer docs.)

---

### Pitfall 9: Role Hierarchy Not Modeled Correctly -- Organizer Cannot Do Member Things

**What goes wrong:** Roles are implemented as mutually exclusive values (`member`, `organizer`, `master`). Then an organizer cannot RSVP to events or upload media because the RLS policy says `WHERE role = 'member'`. Every feature needs separate policies for each role, leading to policy explosion and bugs.

**Why it happens:** Developers model roles as a single enum column. They write RLS policies that check `role = 'member'` for member actions, `role = 'organizer'` for organizer actions, etc. They forget that organizers are also members with all member privileges.

**Prevention:**
1. **Model roles as a hierarchy, not enum.** Define a permission system where `master` > `organizer` > `member` > `pending`.
2. **In RLS policies, use inclusive checks:**
   ```sql
   -- Instead of: role = 'member'
   -- Use: role IN ('member', 'organizer', 'master')
   -- Or better, use a function:
   CREATE FUNCTION is_approved_member(uid uuid) RETURNS boolean AS $$
     SELECT EXISTS (
       SELECT 1 FROM profiles
       WHERE id = uid AND role IN ('member', 'organizer', 'master')
     );
   $$ LANGUAGE sql SECURITY DEFINER STABLE;
   ```
3. **Create helper functions** like `is_at_least_organizer(uid)` and `is_at_least_member(uid)` to use in RLS policies. This avoids repeating role lists everywhere and makes hierarchy changes trivial.
4. **Test with each role** doing each action. An organizer should be able to do everything a member can, plus create events.

**Detection:** Log in as an organizer and try to RSVP to an event. If blocked, the role hierarchy is wrong.

**Phase relevance:** Roles & Permissions phase.

**Confidence:** HIGH (classic RBAC design pattern)

---

### Pitfall 10: Ticket Tier Capacity Not Enforced at Database Level, Causing Overselling

**What goes wrong:** An event has 100 Early Bird tickets at 15 EUR and 200 Regular tickets at 25 EUR. Under concurrent load (popular event drops), two users both see "1 remaining" for Early Bird and both purchase simultaneously. Both succeed. You have sold 101 Early Bird tickets.

**Why it happens:** The application checks availability with a `SELECT COUNT(*)`, finds capacity remaining, then inserts the ticket. Between the SELECT and INSERT, another request does the same thing. This is a classic TOCTOU (time-of-check, time-of-use) race condition.

**Prevention:**
1. **Use database-level enforcement.** Create a function that atomically checks and reserves:
   ```sql
   CREATE FUNCTION reserve_ticket(p_event_id uuid, p_tier text, p_user_id uuid)
   RETURNS boolean AS $$
   DECLARE
     current_count int;
     tier_capacity int;
   BEGIN
     SELECT capacity INTO tier_capacity FROM ticket_tiers
       WHERE event_id = p_event_id AND name = p_tier FOR UPDATE;

     SELECT COUNT(*) INTO current_count FROM tickets
       WHERE event_id = p_event_id AND tier = p_tier AND status != 'cancelled';

     IF current_count >= tier_capacity THEN
       RETURN false;
     END IF;

     INSERT INTO tickets (event_id, tier, user_id, status)
       VALUES (p_event_id, p_tier, p_user_id, 'reserved');
     RETURN true;
   END;
   $$ LANGUAGE plpgsql;
   ```
   The `FOR UPDATE` lock on the tier row serializes concurrent attempts.
2. **Use a `reserved` status** that expires after N minutes if payment is not completed. This prevents ticket hoarding.
3. **Include a CHECK constraint or trigger** to enforce capacity at the database level as a backstop.

**Detection:** Run a load test with 10 concurrent purchase attempts on an event with 5 remaining tickets. If more than 5 succeed, you have overselling.

**Phase relevance:** Event Management + Ticket Payments phases.

**Confidence:** HIGH (universal e-commerce concurrency pattern)

---

### Pitfall 11: Pending Member Receives Referral Link, Creates Referral Paradox

**What goes wrong:** A member in `pending` status has a referral link (because the link is generated for all profiles). They share it. A new user signs up using the pending member's referral and gets auto-approved. Now an unapproved member has successfully invited someone who is approved. The chain of trust is broken.

**Why it happens:** Referral links are generated at profile creation, not at approval. There is no check that the referrer is in good standing.

**Prevention:**
1. **Only generate/activate referral links for approved members.** Pending members should not have a shareable referral link.
2. **Validate referrer status at signup:** When processing a referral signup, check that the referrer's `status = 'approved'`. If not, treat the signup as non-referred (goes to approval queue).
3. **UI enforcement:** Do not show the referral link or share button to pending members.

**Detection:** Check if a newly created profile with `pending` status has a referral code in the database.

**Phase relevance:** Referral System phase. Design together with Approval Flow.

**Confidence:** HIGH (logical edge case specific to this project's approval + referral combination)

---

### Pitfall 12: Supabase Auth Email Templates Not Customized, Breaking Trust

**What goes wrong:** Supabase sends confirmation and password reset emails using its default template, which says "Confirm your email" from a Supabase domain with generic branding. Users receiving these emails (especially a curated community) think it is spam or phishing and do not click. Signup completion rates drop.

**Why it happens:** Supabase Auth email templates are configured in the Supabase Dashboard (Authentication > Email Templates), not in code. Developers forget or do not realize this is a manual configuration step.

**Prevention:**
1. **Customize all Supabase email templates** in the dashboard before launch: confirmation, magic link, password reset, email change.
2. **Set up a custom SMTP sender** (e.g., via Resend, since it is already integrated) so emails come from `noreply@resonate.app` rather than a Supabase domain.
3. **Supabase custom SMTP:** In Dashboard > Settings > Auth > SMTP Settings, configure Resend SMTP credentials.
4. **Include Resonate branding** (logo, Orbitron font in email header) in templates.
5. **Test by actually signing up** with a real email and checking the inbox (including spam folder).

**Detection:** Sign up with a new email. If the confirmation email says "Supabase" anywhere or comes from a non-Resonate domain, this has not been configured.

**Phase relevance:** Bug Fixes & Polish phase.

**Confidence:** HIGH (Supabase email template customization is well-documented)

---

## Minor Pitfalls

Issues that cause friction or minor bugs but are easily fixed.

---

### Pitfall 13: Event Slug Collision When Organizers Create Similarly Named Events

**What goes wrong:** Two events named "Summer Party 2026" both generate the slug `summer-party-2026`. The second creation either fails (unique constraint) with a confusing error or silently overwrites the first.

**Prevention:**
1. Generate slugs with a unique suffix: `summer-party-2026-a1b2c3` (append a short random string).
2. Or use the database to handle collision: try the slug, on conflict append `-2`, `-3`, etc.
3. Add a `UNIQUE` constraint on `events.slug` so the database catches it even if application logic fails.

**Phase relevance:** Event Management phase.

**Confidence:** HIGH (universal slug generation pattern)

---

### Pitfall 14: Service Worker Caches Stale Pages After Deployment

**What goes wrong:** The PWA service worker (via `next-pwa`) aggressively caches pages. After deploying a new version with route changes or new features, users on the cached PWA see the old version until the service worker updates. This is especially painful during the Italian-to-English route migration -- users see Italian pages for hours or days.

**Prevention:**
1. Configure `next-pwa` with a `runtimeCaching` strategy that uses `NetworkFirst` for pages and `CacheFirst` only for static assets.
2. Implement a service worker update notification: detect when a new SW is available and prompt the user to reload.
3. During the route migration specifically, consider temporarily disabling aggressive caching or bumping the SW version explicitly.
4. Test the update flow: deploy a change, open the PWA, verify the update is picked up within a reasonable time.

**Phase relevance:** Bug Fixes & Polish phase (especially the route migration).

**Confidence:** MEDIUM (next-pwa caching behavior may vary by version; verify with current `@ducanh2912/next-pwa` docs)

---

### Pitfall 15: SumUp Refund Edge Cases Not Handled

**What goes wrong:** A member buys a ticket, then the event is cancelled or the member requests a refund. The developer implements refund via SumUp API but does not handle: partial refunds (SumUp supports them), refund window expiry (SumUp may have a refund time limit), or the state management of a refunded ticket (member should lose access but the ticket row still exists).

**Prevention:**
1. **Model ticket status explicitly:** `reserved` -> `paid` -> `refunded` (or `cancelled`). Never delete ticket rows; use status transitions.
2. **Implement refund as a server-side action** (API route or Supabase function), never client-side. Verify the refund succeeded via SumUp API response before updating ticket status.
3. **Handle event cancellation separately:** If an event is cancelled, batch-refund all tickets. This is an admin action, not a user action.
4. **Store the SumUp `transaction_id`** (returned after successful payment), which is needed for the refund API call. The `checkout_id` alone is not sufficient for refunds.
5. **Verify SumUp's refund time window** in their current documentation -- there may be a deadline (e.g., 180 days).

**Phase relevance:** Ticket Payments phase (refund path should be designed alongside purchase path).

**Confidence:** MEDIUM (SumUp refund API specifics should be verified against current docs)

---

### Pitfall 16: Event Media Not Linked to Attendance, Allowing Upload Spam

**What goes wrong:** Any member can upload photos/videos to any event, even events they did not attend. This opens the door to spam, irrelevant content, or malicious uploads on high-profile events.

**Prevention:**
1. **Gate media upload on attendance:** Only members with an `attendance` record (checked in via QR scan) for that event can upload media.
2. **RLS policy:**
   ```sql
   CREATE POLICY "attendees_can_upload_media" ON event_media
     FOR INSERT WITH CHECK (
       EXISTS (
         SELECT 1 FROM attendances
         WHERE attendances.event_id = event_media.event_id
         AND attendances.user_id = auth.uid()
       )
     );
   ```
3. **Admin/organizer override:** Allow organizers to upload media for their own events regardless of attendance (they may be backstage and not scanned).

**Phase relevance:** Event Media phase.

**Confidence:** HIGH (logical enforcement specific to this project)

---

### Pitfall 17: Middleware Route Protection Does Not Check Roles, Only Auth Status

**What goes wrong:** The current middleware checks if a user is logged in but does not check their role or approval status. A pending member or a regular member can access `/admin/*` routes by simply being authenticated. The protection is auth-only, not role-aware.

**Why it happens:** The current middleware (visible in the codebase) only checks `!user` for protected routes. It does not query the user's profile for `role` or `status`.

**Prevention:**
1. **Add role checking to middleware.** After getting the user, query their profile for role:
   ```typescript
   const { data: profile } = await supabase
     .from('profiles')
     .select('role, status')
     .eq('id', user.id)
     .single();
   ```
2. **Block pending members from member-only routes** (except browse-only public routes).
3. **Block non-admin/non-organizer users from admin routes.**
4. **Cache the profile in middleware carefully** -- do not add excessive DB queries on every request. Consider using Supabase Auth metadata (user app_metadata) to store the role, which is available without an extra query.

**Phase relevance:** Roles & Permissions phase. This is a prerequisite for all other features.

**Confidence:** HIGH (directly observed in the current codebase)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Bug Fixes & Polish (Route Migration) | Old routes return 404; PWA breaks; service worker serves stale content | Redirect map in `next.config.ts`; update manifest; bust SW cache (Pitfalls 6, 14) |
| Roles & Permissions | RLS not enabled on new tables; role hierarchy modeled as enum; middleware only checks auth not role | Enable RLS on every table; use hierarchy functions; add role checks to middleware (Pitfalls 2, 9, 17) |
| Referral System | Self-referral; mass sharing; pending members referring others | Rate limits; referrer validation; only approved members get referral links (Pitfalls 4, 11) |
| Approval Flow | Pending member bypasses UI-only restrictions; race condition with payment | Enforce at RLS + API level, not just UI; have refund path ready (Pitfall 7) |
| Ticket Payments | Trusting redirect not webhook; non-idempotent webhook handler; overselling; no refund path | Webhook-based verification; idempotent handlers; database-level capacity locks; model ticket lifecycle (Pitfalls 1, 3, 8, 10, 15) |
| Event Management | Slug collision; capacity not enforced atomically | Unique slugs with random suffix; database-level capacity reservation (Pitfalls 10, 13) |
| Event Media | Unvalidated uploads; no attendance check; bandwidth explosion | Client + server validation; attendance-gated uploads; thumbnails; resumable uploads (Pitfalls 5, 16) |

---

## Recommended Phase Ordering Based on Pitfalls

The pitfall analysis reveals a clear dependency chain that should inform phase ordering:

1. **Bug Fixes & Polish (Route Migration)** -- Do first. Every subsequent feature will be built on English routes. Doing it later means migrating more code and more redirects. (Pitfalls 6, 14)

2. **Roles & Permissions** -- Do second. Every other feature depends on correct role enforcement. If RLS and role checks are not in place, payments, referrals, approvals, and media will all be insecure. (Pitfalls 2, 9, 17)

3. **Approval Flow** -- Do third. The referral system depends on the approval state machine being correct. (Pitfall 7, 11)

4. **Referral System** -- Do fourth, after approval flow exists. Referrals interact directly with approval status. (Pitfalls 4, 11)

5. **Event Management** -- Do fifth. Ticket tiers and event creation are prerequisites for payment integration. (Pitfalls 10, 13)

6. **Ticket Payments** -- Do sixth. Requires events with tiers, roles for access control, and approval status for gating. Most complex phase with most critical pitfalls. (Pitfalls 1, 3, 8, 10, 15)

7. **Event Media** -- Do last. Lowest dependency on other features. Storage pipeline is independent. (Pitfalls 5, 16)

---

## Sources

- Training data analysis of SumUp Online Checkout API (v0.1), Supabase RLS documentation, Supabase Storage documentation, Next.js App Router redirect configuration, and PWA service worker caching patterns
- Direct codebase analysis of `/Users/etiesse/Resonate/src/` (middleware, types, Supabase client setup)
- **Note:** WebSearch and WebFetch were unavailable during this research session. SumUp API specifics (rate limits, sandbox behavior, refund time windows) should be verified against current developer.sumup.com documentation. Supabase Storage limits should be verified against current supabase.com/docs. All confidence levels reflect this limitation.
