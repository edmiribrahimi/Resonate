# Coding Conventions

**Analysis Date:** 2026-02-24

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `MobileNav.tsx`, `MembershipCardView.tsx`)
- Utility files: camelCase (e.g., `qr.ts`)
- API routes: `route.ts` (Next.js convention)
- Pages: `page.tsx` (Next.js convention)
- Middleware: `middleware.ts`

**Functions:**
- React components: PascalCase (e.g., `function MobileNav()`)
- Utility/Helper functions: camelCase (e.g., `generateMembershipQR`, `createClient`, `updateSession`)
- Async functions: camelCase, named explicitly for clarity (e.g., `generateMembershipQR`, `exchangeCodeForSession`)

**Variables:**
- Constants: camelCase (e.g., `navItems`, `mockEvents`, `icons`)
- State variables: camelCase (e.g., `fullName`, `membershipCode`, `email`)
- Component props: camelCase in interface definitions

**Types:**
- Interfaces: PascalCase (e.g., `Profile`, `Event`, `RSVP`, `MembershipCardViewProps`)
- Type aliases: PascalCase

## Code Style

**Formatting:**
- 2-space indentation (enforced by TypeScript/Next.js defaults)
- No semicolons enforced by configuration
- JSX attributes: single-line when possible, multi-line for readability
- Template literals: used for dynamic content interpolation

**Linting:**
- ESLint with Next.js config
- ESLint config: `eslint.config.mjs`
- Flat config format (ESLint 9+)
- Rules applied: Next.js core-web-vitals and TypeScript rules
- Example violation handling: `// eslint-disable-next-line` used sparingly for justified exceptions (e.g., `MembershipCardView.tsx` line 43 for img element)

## Import Organization

**Order:**
1. React/Next.js built-in imports (e.g., `import { useState } from "react"`, `import Link from "next/link"`)
2. Next.js specific utilities (e.g., `import { redirect } from "next/navigation"`, `import { NextResponse } from "next/server"`)
3. Third-party packages (e.g., `import { createBrowserClient } from "@supabase/ssr"`, `import { Resend } from "resend"`)
4. Relative imports using path alias `@/` (e.g., `import { createClient } from "@/lib/supabase/server"`)
5. Relative style imports (e.g., `import "./globals.css"`)

**Path Aliases:**
- `@/*` maps to `./src/*` - used consistently throughout codebase
- Examples: `@/components`, `@/lib`, `@/utils`, `@/types`

## Error Handling

**Patterns:**
- Try/catch blocks for async operations requiring error recovery
  - Example: `src/app/api/newsletter/route.ts` wraps Resend API call in try/catch
  - Example: `src/app/(public)/newsletter/page.tsx` wraps fetch in try/catch
- Nullable error check from SDK methods (e.g., `const { error } = await supabase.auth.signInWithPassword()`)
  - Used in: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/registrati/page.tsx`
- Conditional redirects using `redirect()` from Next.js for protected routes
  - Example: `src/app/(members)/dashboard/page.tsx` - `if (!user) redirect("/login")`
  - Example: `src/lib/supabase/middleware.ts` - route protection logic
- State-based error display in UI (setError state for user feedback)
- API error responses using NextResponse.json with HTTP status codes
  - 400 for missing parameters
  - 500 for configuration/processing errors

## Logging

**Framework:** console (implicit, no external logging library)

**Patterns:**
- Minimal logging in current codebase
- Error states managed through state variables (setError) rather than console logging
- Comment-based documentation for error scenarios (e.g., `src/app/api/membership/verify/route.ts` line 21)

## Comments

**When to Comment:**
- TODO comments for incomplete features or pending implementation
  - Examples: `src/app/(public)/eventi/page.tsx` - "TODO: fetch from Supabase"
  - Examples: `src/app/api/membership/verify/route.ts` - "TODO: query profiles table", "TODO: determine current event automatically"
- Explanatory comments for non-obvious logic
  - Example: `src/lib/supabase/server.ts` line 20-22 - explains Server Component error handling
- Comments explaining fallback behavior
  - Example: `src/app/(admin)/admin/scanner/page.tsx` line 29 - "scan error - ignore, keeps scanning"

**JSDoc/TSDoc:**
- Minimal JSDoc usage observed
- Function signatures are self-documenting with TypeScript types
- Interfaces include field names that are descriptive

## Function Design

**Size:** Functions kept concise and focused
- Component functions: typically 30-100 lines for pages, 20-60 lines for components
- Utility functions: 5-25 lines

**Parameters:**
- Components: accept typed props interface
  - Example: `MembershipCardViewProps` interface with `fullName`, `membershipCode`, `memberSince`
- Utility functions: explicitly typed parameters
  - Example: `generateMembershipQR(membershipCode: string): Promise<string>`
- API handlers: accept Request object directly from Next.js

**Return Values:**
- React components: return JSX/ReactNode
- Async functions: return Promises with explicit types
  - Example: `Promise<string>` for QR generation
- Utility functions: return typed values matching interface definitions

## Module Design

**Exports:**
- Named exports for utility functions (e.g., `export async function generateMembershipQR()`, `export function generateMembershipCode()`)
- Default exports for React components and page files
  - Example: `export default function MobileNav()`
  - Example: `export default async function DashboardPage()`
- Named exports for metadata and configuration (e.g., `export const metadata`, `export const config`)

**Barrel Files:**
- Not extensively used
- Direct imports from specific files preferred (e.g., `from "@/components/layout/MobileNav"` rather than from index)

## Client/Server Distinction

**Server Components:**
- Default in Next.js app directory (used for pages, API routes)
- Example: `src/app/(members)/dashboard/page.tsx` - fetches user via `await createClient()`
- Example: `src/app/(members)/membership-card/page.tsx` - server-side data fetching

**Client Components:**
- Explicitly marked with `"use client"` directive
- Example: `src/app/(auth)/login/page.tsx` - form interaction and state management
- Example: `src/components/layout/MobileNav.tsx` - pathname tracking with `usePathname()`
- Example: `src/components/membership/MembershipCardView.tsx` - QR code state management

---

*Convention analysis: 2026-02-24*
