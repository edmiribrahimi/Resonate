# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- TypeScript 5.x - Frontend and backend code, strict mode enabled
- JavaScript (JSX/TSX) - React components
- SQL - PostgreSQL schema and Supabase database queries
- CSS - Tailwind CSS for styling

**Secondary:**
- HTML5 - QR code scanning via `html5-qrcode` library

## Runtime

**Environment:**
- Node.js 20.x (specified in devDependencies `@types/node: ^20`)

**Package Manager:**
- npm - with lock file present (`package-lock.json`)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- PostCSS 4.x - CSS transformation via `@tailwindcss/postcss`

**PWA:**
- `@ducanh2912/next-pwa` 10.2.9 - Progressive Web App support with Workbox

**UI & Features:**
- `html5-qrcode` 2.3.8 - QR code scanning functionality
- `qrcode` 1.5.4 - QR code generation

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.97.0 - Client SDK for Supabase database and authentication
- `@supabase/ssr` 0.8.0 - Server-side rendering utilities for Supabase (session management, cookie handling)
- `resend` 6.9.2 - Email service for newsletter subscriptions
- `pg` 8.18.0 - PostgreSQL client (dev dependency, likely for migrations/seeding)

## Configuration

**Environment:**
- `.env.local` - Local environment configuration (not committed)
- `.env.local.example` - Template for environment variables showing required configuration
- Environment variables required:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public, safe for client)
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server-side only)
  - `RESEND_API_KEY` - Resend API key for email service
  - `NEXT_PUBLIC_APP_URL` - Application URL for redirects

**Build:**
- `next.config.ts` - Next.js configuration with:
  - Turbopack enabled for faster builds
  - PWA support via `withPWA` wrapper
  - Image optimization with Supabase domain pattern `*.supabase.co`
- `tsconfig.json` - TypeScript configuration with path alias `@/*` → `./src/*`
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS plugin
- `eslint.config.mjs` - ESLint configuration using Next.js recommended rules (core-web-vitals and TypeScript)

## Database

**Type:** PostgreSQL (via Supabase)

**Client:**
- Supabase JavaScript SDK (`@supabase/supabase-js`)

**Connection:**
- Cloud-hosted PostgreSQL via Supabase
- URL from `NEXT_PUBLIC_SUPABASE_URL` environment variable
- Connection pooling handled by Supabase

**Storage:**
- Supabase Storage - Image hosting for event media
- Remote patterns configured in Next.js for `*.supabase.co` domain

## Platform Requirements

**Development:**
- Node.js 20.x
- npm package manager
- TypeScript 5.x
- Git (for version control)

**Production:**
- Node.js 20.x runtime
- Environment variables configured
- Supabase project with active database
- Resend account with API key for email functionality

**Deployment:**
- Built for deployment on Node.js-compatible platforms (Vercel recommended for Next.js)
- PWA support enables offline functionality and app-like experience
- Next.js can generate static and dynamic content

---

*Stack analysis: 2026-02-24*
