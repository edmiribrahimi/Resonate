# Testing Patterns

**Analysis Date:** 2026-02-24

## Test Framework

**Status:** Not Configured

**Current State:**
- No test framework is installed or configured
- `package.json` contains no test dependencies (Jest, Vitest, etc.)
- No test configuration files present (jest.config.js, vitest.config.ts)
- No test scripts in `package.json` (no "test" command)

**Available Commands:**
```bash
npm run dev              # Development server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
```

## Test File Organization

**Current Structure:**
- No test files exist in `src/` directory
- No `__tests__` directories
- No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files in source code
- Test framework decision deferred

## Recommended Setup Path

**For Future Implementation:**

**Option 1: Vitest (Recommended for Next.js)**
- Lightweight, ESM-native
- Fast unit/integration tests
- Install: `npm install -D vitest @vitest/ui`
- Config file: `vitest.config.ts`

**Option 2: Jest**
- Industry standard
- Built-in code coverage
- Install: `npm install -D jest @types/jest ts-node`
- Config file: `jest.config.ts`

## Code Coverage

**Requirements:** Not enforced

**View Coverage (when configured):**
```bash
npm run test -- --coverage    # If using test runner
```

## Test Types Currently Missing

**Unit Tests:**
- **Scope:** Individual functions in isolation
- **Target coverage:**
  - `src/utils/qr.ts` - generateMembershipQR, generateMembershipCode
  - `src/lib/supabase/client.ts` - createClient
  - `src/lib/supabase/server.ts` - createClient
  - `src/lib/supabase/middleware.ts` - updateSession

**Integration Tests:**
- **Scope:** API routes with Supabase interaction
- **Target routes:**
  - `src/app/api/auth/callback/route.ts` - OAuth callback flow
  - `src/app/api/newsletter/route.ts` - Newsletter subscription
  - `src/app/api/membership/verify/route.ts` - Membership code verification

**E2E Tests:**
- **Framework:** Not selected (consider Playwright or Cypress)
- **Target flows:**
  - Complete authentication flow (login, registration, session)
  - Membership card generation and QR code display
  - Event listing and detail viewing
  - Admin scanner functionality

## Candidates for Testing

**Utility Functions (Priority: High)**

`src/utils/qr.ts`:
```typescript
// Should test:
// 1. generateMembershipQR generates valid QR data URL
// 2. generateMembershipCode produces valid format (RSN-XXXXXXXX)
// 3. Both handle error conditions gracefully

export async function generateMembershipQR(membershipCode: string): Promise<string>
export function generateMembershipCode(): string
```

**API Routes (Priority: High)**

`src/app/api/newsletter/route.ts`:
```typescript
// Should test:
// 1. POST with valid email creates contact
// 2. POST without email returns 400
// 3. Missing RESEND_API_KEY returns 500
// 4. API errors handled gracefully

export async function POST(request: Request)
```

`src/app/api/membership/verify/route.ts`:
```typescript
// Should test:
// 1. GET with valid code returns valid:true
// 2. GET without code returns 400
// 3. GET with invalid code returns valid:false
// 4. Supabase query integration

export async function GET(request: Request)
```

`src/app/api/auth/callback/route.ts`:
```typescript
// Should test:
// 1. GET with valid OAuth code exchanges for session
// 2. GET redirects to next URL on success
// 3. GET redirects to /login?error=auth on failure

export async function GET(request: Request)
```

**Middleware (Priority: Medium)**

`src/lib/supabase/middleware.ts`:
```typescript
// Should test:
// 1. Protects /dashboard, /membership-card, /presenze routes
// 2. Allows access with valid session
// 3. Redirects to /login with redirect param for protected routes
// 4. Allows access to /admin with valid user
// 5. Session refresh on each request

export async function updateSession(request: NextRequest)
```

## What Should NOT Be Tested Initially

- React component UI rendering (too volatile without visual regression testing)
- Style/Tailwind class application
- Hard-coded mock data
- Third-party SDK integration (mock via stubs)

## Testing Patterns to Establish

**Async Testing:**
```typescript
// Example for future implementation:
// Test utility functions that return Promises
test('generateMembershipQR returns valid data URL', async () => {
  const result = await generateMembershipQR('RSN-TEST1234')
  expect(result).toMatch(/^data:image\/png;base64/)
})

// Test API routes
test('POST /api/newsletter with valid email', async () => {
  const response = await fetch('/api/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email: 'test@example.com' })
  })
  expect(response.status).toBe(200)
})
```

**Error Testing:**
```typescript
// Example patterns for error scenarios:
test('generateMembershipCode returns RSN- prefix', () => {
  const code = generateMembershipCode()
  expect(code).toMatch(/^RSN-[A-Z0-9]{8}$/)
})

test('POST /api/newsletter without email returns 400', async () => {
  const response = await fetch('/api/newsletter', {
    method: 'POST',
    body: JSON.stringify({})
  })
  expect(response.status).toBe(400)
  const json = await response.json()
  expect(json.error).toBe('Email required')
})
```

**Mocking Strategy (when tests added):**
- Mock `@supabase/ssr` for database queries
- Mock `resend` package for email functionality
- Mock Next.js `redirect()` and navigation functions
- Keep HTTP-level tests (API routes) closer to integration

## Code Currently Lacking Tests

**High Risk - No Tests:**
1. Authentication flow (`src/app/(auth)/login/page.tsx`, `src/app/(auth)/registrati/page.tsx`)
   - Error handling paths not validated
   - Form submission edge cases uncovered

2. Protected routes (`src/lib/supabase/middleware.ts`)
   - Route protection logic untested
   - Session refresh behavior unvalidated

3. Database operations (`src/app/api/membership/verify/route.ts`)
   - Query failures not tested
   - Missing data handling uncovered

4. QR code generation (`src/utils/qr.ts`)
   - Edge cases for membership codes
   - QR generation failures

## Coverage Gaps Summary

| Component | Test Type | Status | Impact |
|-----------|-----------|--------|--------|
| QR utilities | Unit | Missing | Membership card generation untested |
| Auth routes | Integration | Missing | OAuth flow behavior unknown |
| Newsletter API | Integration | Missing | Email subscription failures blind |
| Membership verify | Integration | Missing | Code validation logic uncovered |
| Route protection | Integration | Missing | Access control not validated |
| Supabase client | Unit | Missing | Session management untested |

---

*Testing analysis: 2026-02-24*

**Note:** This codebase is in early scaffolding phase (initial commit). Testing infrastructure should be added as part of development workflow before significant feature work. Recommended priority: (1) Utility function tests, (2) API route tests, (3) E2E authentication flow.
