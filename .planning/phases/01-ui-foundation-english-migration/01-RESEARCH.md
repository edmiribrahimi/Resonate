# Phase 1: UI Foundation & English Migration - Research

**Researched:** 2026-02-24
**Domain:** UI text translation, route migration, font/branding, dark theme, password validation
**Confidence:** HIGH

## Summary

Phase 1 is a pure presentation layer overhaul with zero backend changes. The codebase has 14 files containing Italian text (UI strings, date locales, URL paths) that need systematic English replacement. The Italian text is hardcoded directly in components -- there is no i18n framework and none is needed (per explicit out-of-scope decision). The route migration involves 4 Italian paths that need English equivalents plus permanent redirects from the old paths.

The Orbitron font is available as a variable font on Google Fonts and integrates cleanly via `next/font/google` in the root layout. The existing dark theme CSS variables in `globals.css` already establish the dark aesthetic foundation (background: #0a0a0a, card: #141414) -- the site is already dark-themed. The main branding work is adding the logo image, applying Orbitron, adding the tagline, and redesigning the homepage with a next-event preview.

Password validation is a client-side enhancement to the registration form: the current form only requires 6 characters, and the new requirement is 8+ characters with uppercase, number, and special character. The "diventa membro" fix on event pages is a straightforward conditional rendering change where `isMember` is currently hardcoded to `false`.

**Primary recommendation:** Execute as a file-by-file sweep. Start with foundational changes (font, theme, logo assets), then systematically translate each page, then handle route migration, then fix event page member prompt and password validation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dark background across the entire site -- nightlife/club aesthetic, not just homepage
- White logo variant ("re:sonate") on dark background
- "motion music hub" tagline displayed below the logo
- Below logo + tagline: minimal next event preview showing event name + date only, tap for details
- Homepage serves as a landing page with the event preview prompting join/login
- Site-wide dark theme -- all pages, all components
- Consistent dark aesthetic throughout (not just homepage splash)
- This affects every page: events, dashboard, membership card, admin, registration, login
- Minimal display for event preview: event name + date, nothing more
- Tapping leads to event detail page
- If no upcoming events: show logo + tagline only (no empty state clutter)

### Claude's Discretion
- Mobile bottom navigation styling -- match the dark theme, Claude picks specific approach (dark bg with light icons, accent colors, etc.)
- Orbitron font application -- Claude decides whether Orbitron is used for all text or headings-only with a readable body font (consider readability for body text)
- English translation tone -- casual or formal, Claude picks what fits a music community
- Password validation UX -- real-time feedback, strength meter, or submit-time error. Claude picks.
- Italian URL redirect strategy -- old paths should redirect to new English paths. Implementation details at Claude's discretion.
- Color palette for dark theme -- dark grays, blacks, accent colors. Claude designs.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UIBR-01 | Entire site translated to English -- all visible text, labels, error messages, placeholders | Full Italian text inventory across 14 files documented; systematic replacement patterns identified |
| UIBR-02 | All URL routes migrated to English with redirects from old Italian paths | next.config.ts `redirects` approach verified; 4 route pairs mapped; middleware route protection update identified |
| UIBR-03 | Orbitron font applied as primary font site-wide | Orbitron confirmed as variable font on Google Fonts; `next/font/google` integration pattern verified for Next.js 16 |
| UIBR-04 | Homepage displays Resonate logo image instead of text heading | Logo files located at `/Users/etiesse/Documents/Resonate/Logo/`; white-on-transparent variant identified for dark bg; Next.js Image component pattern documented |
| UIBR-05 | Logged-in users no longer see "diventa membro per confermare la tua presenza" on event pages | Root cause: `isMember` hardcoded to `false` in event detail page; fix requires auth check integration |
| UIBR-08 | Stronger password requirements (min 8 chars, uppercase, number, special char) | Client-side validation pattern documented; current form only enforces minLength 6 |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | Framework, routing, font optimization | Already installed; provides `next/font/google` for Orbitron |
| tailwindcss | ^4 | Styling with CSS-first configuration | Already installed; `@theme inline` already configured with dark color tokens |
| react | 19.2.3 | UI rendering | Already installed |
| @supabase/ssr | ^0.8.0 | Auth session check for UIBR-05 fix | Already installed; needed to check if user is logged in on event pages |

### Supporting (No New Dependencies Needed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/font/google | built-in | Orbitron font self-hosting | Import in layout.tsx for UIBR-03 |
| next/image | built-in | Logo image optimization | Use for homepage logo display (UIBR-04) |
| next.config.ts redirects | built-in | Italian-to-English route redirects | Configure for UIBR-02 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next.config.ts redirects | Middleware-based redirects | Config redirects are simpler, stateless, and cacheable. Middleware only needed for dynamic logic. Use config redirects. |
| next/font/google | Manual @font-face in CSS | next/font self-hosts, eliminates layout shift, zero config. No reason to go manual. |
| Client-side password validation | Server-side only (Supabase) | Supabase password policy is configurable but does not provide real-time UX feedback. Use client-side validation for UX, Supabase remains the backstop. |

**Installation:**
```bash
# No new packages needed. Phase 1 is pure UI work on existing stack.
```

## Architecture Patterns

### Files That Need Modification

The core pattern is a systematic file-by-file sweep. Here is the complete inventory:

**Route structure changes (directory renames + new files):**
```
src/app/
├── (public)/
│   ├── eventi/           --> events/           # Rename directory
│   │   ├── page.tsx                            # Translate content
│   │   └── [slug]/page.tsx                     # Translate content + fix UIBR-05
│   ├── galleria/         --> gallery/          # Rename directory
│   │   └── page.tsx                            # Translate content
│   └── newsletter/page.tsx                     # Translate content (path stays)
├── (auth)/
│   ├── login/page.tsx                          # Translate content (path stays)
│   └── registrati/       --> register/         # Rename directory
│       └── page.tsx                            # Translate content + UIBR-08 password validation
├── (members)/
│   ├── dashboard/page.tsx                      # Translate content (path stays)
│   ├── membership-card/page.tsx                # Translate content (path stays)
│   └── presenze/         --> attendance/       # Rename directory
│       └── page.tsx                            # Translate content
├── (admin)/admin/scanner/page.tsx              # Translate content (path stays)
├── layout.tsx                                  # Add Orbitron font, change lang="it" to lang="en"
├── page.tsx                                    # Redesign: logo + tagline + event preview
└── globals.css                                 # Update font-family to use Orbitron CSS variable
```

**Non-page files needing changes:**
```
src/
├── components/
│   ├── layout/MobileNav.tsx                    # Translate labels, update hrefs
│   └── membership/MembershipCardView.tsx       # Translate "Membro dal", change date locale
├── lib/supabase/middleware.ts                  # Update protected route paths
next.config.ts                                  # Add redirects configuration
public/manifest.json                            # Update description (minor)
```

### Pattern 1: Font Integration via next/font/google + Tailwind v4

**What:** Import Orbitron as a variable font, expose it as a CSS custom property, and register it in Tailwind's `@theme` block for utility-class access.

**When to use:** Root layout -- applied once, affects entire site.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/fonts
// src/app/layout.tsx
import { Orbitron } from "next/font/google"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={orbitron.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
```

Then in `globals.css`, update the body font-family to reference the CSS variable:
```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-orbitron), system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

**Recommendation on Orbitron scope (Claude's Discretion item):** Use Orbitron for ALL text site-wide. Rationale: Orbitron is specifically a geometric, futuristic display font chosen for the electronic music aesthetic. At body text sizes (14-16px) it remains readable for the short-form content on this platform (event listings, labels, navigation, card info). This is not a long-form reading site. A mixed-font approach would dilute the brand identity. If readability issues emerge during implementation, a secondary body font (like Inter or a system font) can be introduced later, but start with full Orbitron.

### Pattern 2: Route Redirects via next.config.ts

**What:** Permanent (308) redirects from old Italian paths to new English paths, configured declaratively in `next.config.ts`.

**When to use:** After renaming route directories from Italian to English names.

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
// next.config.ts
const nextConfig: NextConfig = {
  // ... existing config
  async redirects() {
    return [
      {
        source: "/eventi/:path*",
        destination: "/events/:path*",
        permanent: true,
      },
      {
        source: "/registrati",
        destination: "/register",
        permanent: true,
      },
      {
        source: "/presenze",
        destination: "/attendance",
        permanent: true,
      },
      {
        source: "/galleria",
        destination: "/gallery",
        permanent: true,
      },
    ]
  },
}
```

Note: The `/eventi/:path*` wildcard handles both `/eventi` (list) and `/eventi/some-slug` (detail) redirects in a single rule.

### Pattern 3: Auth-Aware Event Detail Page (UIBR-05 Fix)

**What:** Check if the current user is authenticated when rendering the event detail page, and hide the "diventa membro" prompt for logged-in users.

**When to use:** Event detail page `[slug]/page.tsx`.

**Example:**
```typescript
// src/app/(public)/events/[slug]/page.tsx
import { createClient } from "@/lib/supabase/server"

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isMember = !!user  // true if logged in

  // ... rest of page using isMember for conditional rendering
}
```

This converts the page from a static page to a server component that checks auth. The key insight: we do NOT redirect unauthenticated users -- we just change what they see. The page remains in the `(public)` route group.

### Pattern 4: Client-Side Password Validation (UIBR-08)

**What:** Validate password requirements in real-time as user types, with clear feedback showing which rules are met.

**When to use:** Registration form page.

**Example:**
```typescript
// Password validation helper
function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }
}

// In the component, show real-time validation indicators
const rules = validatePassword(password)
const isValid = Object.values(rules).every(Boolean)
```

**Recommendation on password UX (Claude's Discretion item):** Use real-time inline feedback below the password field showing checkmarks/crosses for each rule as the user types. This is friendlier than a submit-time error wall and simpler than a strength meter. Each rule shows its status: "8+ characters", "One uppercase letter", "One number", "One special character".

### Pattern 5: Homepage Redesign with Event Preview

**What:** Replace the text heading with the logo image, add tagline, and show a minimal next-event preview.

**When to use:** Homepage `page.tsx`.

**Example structure:**
```typescript
// src/app/page.tsx
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  // Fetch next upcoming event (if any)
  const { data: nextEvent } = await supabase
    .from("events")
    .select("slug, title, date")
    .gte("date", new Date().toISOString().split("T")[0])
    .eq("is_published", true)
    .order("date", { ascending: true })
    .limit(1)
    .single()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 pb-24 text-center">
      <Image
        src="/images/logo-white.png"
        alt="re:sonate"
        width={280}
        height={80}
        priority
      />
      <p className="mt-3 text-sm tracking-widest uppercase text-muted">
        motion music hub
      </p>

      {nextEvent && (
        <Link href={`/events/${nextEvent.slug}`} className="mt-10 ...">
          <p className="font-semibold">{nextEvent.title}</p>
          <p className="text-sm text-muted">
            {new Date(nextEvent.date).toLocaleDateString("en-US", { ... })}
          </p>
        </Link>
      )}

      {/* Join / Login buttons */}
      ...
    </div>
  )
}
```

**Important:** The homepage currently uses mock events data. Since the database may not have real events yet, the homepage should gracefully handle the case where no events exist (show logo + tagline only, per user decision).

### Anti-Patterns to Avoid

- **Partial translation:** Do NOT leave any Italian string unreplaced. Every `toLocaleDateString("it-IT", ...)` must become `"en-US"`. Every Italian label, placeholder, error, and heading must be translated.
- **i18n framework:** Do NOT add next-intl, react-i18next, or any i18n library. English-only is an explicit out-of-scope decision. Hardcode English strings directly.
- **Dark mode toggle:** Do NOT add a light/dark toggle. The site is dark-only by design. The existing CSS variables already define a dark palette. No `dark:` variant classes needed.
- **Route duplication:** Do NOT keep both Italian and English route directories. Rename the directories and use redirects for the old paths.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font self-hosting | Manual @font-face, CDN links | `next/font/google` Orbitron import | Automatic self-hosting, zero layout shift, build-time optimization |
| Route redirects | Custom middleware redirect logic | `next.config.ts` redirects array | Declarative, cacheable, handled at edge before page load |
| Image optimization | Raw `<img>` tags for logo | `next/image` component | Automatic format conversion, lazy loading, blur placeholder |
| Password regex | Custom character-by-character validation | Simple regex tests per rule | Regex is more reliable and concise for pattern matching |

**Key insight:** Phase 1 needs zero new npm packages. Every capability needed is built into Next.js 16 or already installed.

## Common Pitfalls

### Pitfall 1: Missing the `lang="it"` in HTML tag
**What goes wrong:** The root layout currently has `<html lang="it">`. If this isn't changed to `<html lang="en">`, screen readers and search engines will still identify the page as Italian.
**Why it happens:** Easy to miss because it's a single attribute in one file.
**How to avoid:** Include lang attribute change as the FIRST task in translation work.
**Warning signs:** Accessibility audits flag wrong language.

### Pitfall 2: Broken internal links after route rename
**What goes wrong:** After renaming `/eventi/` to `/events/`, any hardcoded `href="/eventi"` links in components will 404 (or redirect, adding latency).
**Why it happens:** Links are scattered across many files -- homepage, dashboard, event detail back button, MobileNav, etc.
**How to avoid:** After renaming routes, grep the entire `src/` directory for old Italian paths. Update ALL internal `href` values AND the middleware protected routes array.
**Warning signs:** Console 308 redirect chains on navigation.

### Pitfall 3: Middleware route protection not updated
**What goes wrong:** The middleware protects routes by pathname prefix: `["/dashboard", "/membership-card", "/presenze"]`. After renaming `/presenze` to `/attendance`, the middleware still references the old path, leaving `/attendance` unprotected.
**Why it happens:** Middleware is a separate file from the route directories.
**How to avoid:** Update `src/lib/supabase/middleware.ts` memberRoutes array as part of the route migration task.
**Warning signs:** Unauthenticated users can access `/attendance` directly.

### Pitfall 4: Date locale left as "it-IT"
**What goes wrong:** Dates continue displaying in Italian format (e.g., "sabato 15 marzo") instead of English (e.g., "Saturday, March 15").
**Why it happens:** `toLocaleDateString("it-IT", ...)` is used in 5 different locations across 4 files. Easy to miss one.
**How to avoid:** Grep for `"it-IT"` after translation work is done -- there should be zero matches.
**Warning signs:** Italian day/month names appearing on otherwise English pages.

### Pitfall 5: Next.js Image component requires explicit dimensions
**What goes wrong:** Using `<Image>` for the logo without knowing the actual image dimensions causes layout shift or distortion.
**Why it happens:** The logo files are external PNGs at the user's document path -- dimensions unknown until examined.
**How to avoid:** Before implementing, check the actual dimensions of `Logo Sfondo Trasparente Scritta Bianca.png`. Copy it to `public/images/` and note its width/height for the Image component.
**Warning signs:** Logo appears stretched, squished, or causes content jump on load.

### Pitfall 6: Orbitron readability at small sizes
**What goes wrong:** Orbitron is a geometric display font. At very small sizes (12px or less), it can be harder to read than a standard sans-serif.
**Why it happens:** Display fonts optimize for visual impact over small-text legibility.
**How to avoid:** Ensure minimum body text size is 14px. Test on mobile. The shortest text in the app is navigation labels and metadata -- verify these are still readable.
**Warning signs:** Users complaining about hard-to-read small text, especially on mobile nav labels.

### Pitfall 7: Event detail page becomes slow after adding auth check
**What goes wrong:** Adding `supabase.auth.getUser()` to the event detail page makes it a dynamic server component, losing static rendering benefits.
**Why it happens:** Any auth check forces server-side rendering per request.
**How to avoid:** This is acceptable for this use case -- the page was already server-rendered and the auth check is fast (checks cookies, not a DB query). Do NOT try to optimize this prematurely.
**Warning signs:** None expected for a small community platform.

## Code Examples

### Complete Italian-to-English Text Map

All Italian text found in the codebase with English replacements:

**src/app/layout.tsx:**
| Italian | English | Location |
|---------|---------|----------|
| `lang="it"` | `lang="en"` | html tag |

**src/app/page.tsx:**
| Italian | English |
|---------|---------|
| "Resonate" (h1 heading) | Replace with logo image |
| "Music events community" | "motion music hub" (tagline) |
| "Scopri gli eventi" | "Discover Events" |
| "Diventa membro" | "Join" or "Become a Member" |

**src/app/(auth)/login/page.tsx:**
| Italian | English |
|---------|---------|
| "Accedi" (h1) | "Sign In" |
| "Accedi alla tua area membri" | "Access your member area" |
| "Email o password non corretti" | "Incorrect email or password" |
| "Accesso..." | "Signing in..." |
| "Accedi" (button) | "Sign In" |
| "Non hai un account?" | "Don't have an account?" |
| "Registrati" (link) | "Sign Up" |
| `href="/registrati"` | `href="/register"` |

**src/app/(auth)/registrati/page.tsx (becomes register/):**
| Italian | English |
|---------|---------|
| "Controlla la tua email" | "Check your email" |
| "Ti abbiamo inviato un link di conferma..." | "We sent you a confirmation link. Click it to activate your account." |
| "Diventa membro" | "Become a Member" |
| "Unisciti alla community Resonate" | "Join the Resonate community" |
| "Nome completo" | "Full name" |
| "Password (min 6 caratteri)" | "Password" (with real-time validation below) |
| "Registrazione..." | "Signing up..." |
| "Registrati" (button) | "Sign Up" |
| "Hai gia un account?" | "Already have an account?" |
| "Accedi" | "Sign In" |

**src/app/(public)/eventi/page.tsx (becomes events/):**
| Italian | English |
|---------|---------|
| "Eventi" (h1) | "Events" |
| `toLocaleDateString("it-IT", ...)` (x2) | `toLocaleDateString("en-US", ...)` |

**src/app/(public)/eventi/[slug]/page.tsx:**
| Italian | English |
|---------|---------|
| `href="/eventi"` | `href="/events"` |
| `toLocaleDateString("it-IT", ...)` | `toLocaleDateString("en-US", ...)` |
| "Riceverai l'indirizzo 24h prima dell'evento" | "You'll receive the address 24h before the event" |
| "Diventa membro per ricevere l'indirizzo" | "Become a member to get the address" |
| "Ci saro" / "Ci saro" (button) | "I'm going" / "I'm going" |
| "Diventa membro per confermare la presenza" | REMOVE for logged-in users (UIBR-05) / "Sign up to confirm attendance" for non-logged-in |
| `href="/registrati"` (x2) | `href="/register"` |

**src/app/(public)/galleria/page.tsx (becomes gallery/):**
| Italian | English |
|---------|---------|
| "Galleria" | "Gallery" |
| "Momenti dai nostri eventi" | "Moments from our events" |
| "Le foto e i video dei prossimi eventi appariranno qui." | "Photos and videos from upcoming events will appear here." |

**src/app/(public)/newsletter/page.tsx:**
| Italian | English |
|---------|---------|
| "Iscritto!" | "Subscribed!" |
| "Riceverai le novita sui prossimi eventi." | "You'll receive updates about upcoming events." |
| "Ricevi aggiornamenti sui prossimi eventi..." | "Get updates about upcoming events right in your inbox." |
| "La tua email" | "Your email" |
| "Qualcosa e andato storto. Riprova." | "Something went wrong. Please try again." |
| "Iscrizione..." | "Subscribing..." |
| "Iscriviti" | "Subscribe" |

**src/app/(members)/dashboard/page.tsx:**
| Italian | English |
|---------|---------|
| "Membro" (fallback name) | "Member" |
| "Ciao," | "Hey," |
| "Visualizza la tua card" | "View your card" |
| "Le tue presenze" | "Your attendance" |
| "Storico eventi" | "Event history" |
| "Prossimi eventi confermati" | "Upcoming confirmed events" |
| "Nessun evento confermato" | "No confirmed events" |
| "Scopri gli eventi" | "Discover events" |
| `href="/presenze"` | `href="/attendance"` |
| `href="/eventi"` | `href="/events"` |

**src/app/(members)/membership-card/page.tsx:**
| Italian | English |
|---------|---------|
| "Membro" (fallback) | "Member" |
| "Come usare la card" | "How to use your card" |
| "Mostra il QR code all'ingresso dell'evento" | "Show the QR code at the event entrance" |
| "Lo staff scannerizzera il codice" | "Staff will scan the code" |
| "La tua presenza verra registrata automaticamente" | "Your attendance will be recorded automatically" |
| "Aggiungi a Apple/Google Wallet" | "Add to Apple/Google Wallet" |

**src/app/(members)/presenze/page.tsx (becomes attendance/):**
| Italian | English |
|---------|---------|
| "Le tue presenze" | "Your Attendance" |
| `{attendances.length === 1 ? "evento" : "eventi"} frequentati` | `{attendances.length === 1 ? "event" : "events"} attended` |
| "Nessuna presenza registrata ancora. Vieni al prossimo evento!" | "No attendance recorded yet. Come to the next event!" |
| `toLocaleDateString("it-IT", ...)` | `toLocaleDateString("en-US", ...)` |

**src/app/(admin)/admin/scanner/page.tsx:**
| Italian | English |
|---------|---------|
| "Scanner QR" | "QR Scanner" |
| "Presenza registrata" | "Attendance recorded" |
| "Membership non valida" | "Invalid membership" |
| "Errore di connessione" | "Connection error" |
| "Verifica in corso..." | "Verifying..." |
| "Scansiona un altro QR" | "Scan another QR" |

**src/components/layout/MobileNav.tsx:**
| Italian | English |
|---------|---------|
| "Eventi" | "Events" |
| "Galleria" | "Gallery" |
| "Area Membri" | "Members" |
| `href: "/eventi"` | `href: "/events"` |
| `href: "/galleria"` | `href: "/gallery"` |

**src/components/membership/MembershipCardView.tsx:**
| Italian | English |
|---------|---------|
| "Membro dal" | "Member since" |
| `toLocaleDateString("it-IT", ...)` | `toLocaleDateString("en-US", ...)` |

**src/lib/supabase/middleware.ts:**
| Italian | English |
|---------|---------|
| `"/presenze"` in memberRoutes | `"/attendance"` |

### Route Migration Map

| Old Italian Path | New English Path | Type |
|-----------------|-----------------|------|
| `/eventi` | `/events` | Directory rename |
| `/eventi/[slug]` | `/events/[slug]` | Included in parent rename |
| `/registrati` | `/register` | Directory rename |
| `/presenze` | `/attendance` | Directory rename |
| `/galleria` | `/gallery` | Directory rename |

Internal links to update (grep targets after rename):
- `"/eventi"` or `'/eventi'` -- found in: page.tsx, dashboard, event detail back button, MobileNav
- `"/registrati"` -- found in: login page, event detail page
- `"/presenze"` -- found in: dashboard, middleware
- `"/galleria"` -- found in: MobileNav

### Logo File Details

Source files at `/Users/etiesse/Documents/Resonate/Logo/`:
- **Use:** `Logo Sfondo Trasparente Scritta Bianca.png` (white text on transparent background -- for dark bg)
- **Copy to:** `public/images/logo-white.png` (or similar)
- **Implementation:** Use `next/image` `<Image>` component with explicit width/height
- **Also available:** `Logo Sfondo Trasparente Scritta Nera.png` (black text -- not needed for dark-only theme)

### Translation Tone Recommendation (Claude's Discretion)

Use a **casual but clear** tone. This is a music community, not a corporate platform. Specific examples:
- "Hey," instead of "Hello," (dashboard greeting)
- "Discover Events" instead of "Browse Events"
- "I'm going" instead of "Confirm Attendance"
- "Become a Member" / "Join" instead of "Register an Account"
- Error messages should be direct: "Incorrect email or password" not "Authentication failed"

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next/font` with JS config | `next/font/google` with `variable` prop + CSS var | Next.js 13+ (stable since 2023) | Font declared once in layout, available via CSS custom property everywhere |
| Tailwind v3 `darkMode: 'class'` in JS config | Tailwind v4 `@custom-variant` or media query (CSS-first) | Tailwind v4 (2024) | No JS config file needed; dark mode via CSS. For this project: irrelevant since always dark. |
| `next.config.js` (CommonJS) | `next.config.ts` (TypeScript) | Next.js 15+ | Config already uses `.ts` extension -- use TypeScript for redirects config |

**Deprecated/outdated:**
- Manual `<link>` tags for Google Fonts -- replaced by `next/font/google` built-in
- Tailwind `darkMode` config in `tailwind.config.js` -- v4 uses CSS-first `@custom-variant`
- `next.config.js` CommonJS exports -- project already uses `next.config.ts`

## Open Questions

1. **Logo image dimensions**
   - What we know: PNG file exists at `/Users/etiesse/Documents/Resonate/Logo/Logo Sfondo Trasparente Scritta Bianca.png`
   - What's unclear: Exact pixel dimensions of the logo (needed for `next/image` width/height props)
   - Recommendation: Check dimensions during implementation task. Use `sips -g pixelWidth -g pixelHeight` on macOS. Size the Image component accordingly, likely ~280-320px wide.

2. **Supabase events table populated?**
   - What we know: The events page currently uses mock data. The homepage redesign shows a "next event preview" that queries Supabase.
   - What's unclear: Whether the `events` table has any real data, or if the homepage query will return nothing.
   - Recommendation: Code defensively -- if no events exist, show logo + tagline only (per user decision). The event preview is a bonus, not a requirement. The mock data on the events list page is a Phase 5 concern, not Phase 1.

3. **Supabase password policy**
   - What we know: UIBR-08 requires client-side validation (8 chars, uppercase, number, special char). Supabase Auth also has a configurable minimum password length.
   - What's unclear: What Supabase's current password policy is set to (could allow weaker passwords server-side).
   - Recommendation: Implement client-side validation for UX. The Supabase policy can be tightened in the Supabase Dashboard (Auth > Providers > Email) separately. Don't try to configure it via code in Phase 1.

## Sources

### Primary (HIGH confidence)
- [Next.js 16.1.6 Font Optimization docs](https://nextjs.org/docs/app/getting-started/fonts) - Orbitron integration pattern via `next/font/google`
- [Next.js 16.1.6 Redirects docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects) - Route redirect configuration syntax
- [Tailwind CSS v4 Dark Mode docs](https://tailwindcss.com/docs/dark-mode) - Dark theme patterns (confirms CSS custom property approach)
- [Google Fonts Orbitron specimen](https://fonts.google.com/specimen/Orbitron) - Confirms variable font with weight axis 400-900

### Secondary (MEDIUM confidence)
- [Build with Matija: Google Fonts in Next.js 15 + Tailwind v4](https://www.buildwithmatija.com/blog/how-to-use-custom-google-fonts-in-next-js-15-and-tailwind-v4) - Integration pattern for font CSS variables with `@theme`
- Direct codebase analysis of all 14 source files containing Italian text

### Tertiary (LOW confidence)
- None. All findings verified against official docs or direct code inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all capabilities verified in official Next.js 16 docs
- Architecture: HIGH - Direct code inspection of all files needing changes; complete Italian text inventory
- Pitfalls: HIGH - Based on concrete code analysis (e.g., middleware route array, hardcoded links, date locales)
- Font integration: HIGH - Orbitron confirmed as variable font; `next/font/google` pattern verified in official docs
- Route redirects: HIGH - `next.config.ts` redirects syntax verified in official docs

**Research date:** 2026-02-24
**Valid until:** Indefinitely for Phase 1 scope (all findings based on stable APIs and direct code inspection)
