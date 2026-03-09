# Phase 21: Layout Elegance - Research

**Researched:** 2026-03-09
**Domain:** UI animations, loading states, micro-interactions, accessibility (Motion v12 + Tailwind CSS v4)
**Confidence:** HIGH

## Summary

Phase 21 adds polish and tactile feedback to the entire Resonate app using Motion v12 (formerly Framer Motion) as the single animation library. The app currently has zero animations beyond CSS `transition-all` and `active:scale-*` Tailwind utilities (found in 35 files). There are no skeleton loading states (`loading.tsx` files don't exist), no toast notification system, and no scroll-triggered animations. Everything is built from scratch.

The core architectural pattern is a set of thin `"use client"` wrapper components (AnimatedSection, StaggeredList, SkeletonCard, Toast system, PressableCard, CountUp) that existing Server Components can import without becoming client components themselves. Motion's `LazyMotion` + `domAnimation` feature package reduces the animation bundle to ~4.6kb for initial render (vs 34kb for full `motion` import). The `MotionConfig` component with `reducedMotion="user"` provides automatic accessibility compliance -- transform/layout animations are disabled for users with prefers-reduced-motion, while opacity/color transitions persist.

**Primary recommendation:** Install `motion` (v12.35.x), wrap the app in `LazyMotion features={domAnimation}` + `MotionConfig reducedMotion="user"`, then build 6-8 reusable animation wrapper components that all pages consume. Build the toast system from scratch using Motion's AnimatePresence (no sonner/react-hot-toast -- fewer dependencies, consistent animation language). Replace existing `active:scale-*` CSS with Motion's `whileTap` only where enriched feedback is needed; keep CSS `active:scale-95` for simple elements like nav links.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | All pages have component enter animations (fade + translateY, 200-300ms, ease-out) | AnimatedSection wrapper using `motion.div` with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}` -- verified from Motion quick start docs |
| UI-02 | Async content shows skeleton loading states instead of blank/flash | Next.js `loading.tsx` files per route group + reusable SkeletonCard/SkeletonLine components using Tailwind `animate-pulse` |
| UI-03 | All buttons and cards have consistent press/tap feedback (whileTap scale) | Motion `whileTap={{ scale: 0.97 }}` on PressableCard wrapper; keep existing CSS `active:scale-95` on simple buttons |
| UI-04 | Page has smooth scroll behavior for anchor links | CSS `scroll-behavior: smooth` in globals.css on `html` element -- no library needed |
| UI-05 | User actions show toast notifications with slide-in animation and auto-dismiss | Custom Toast context + ToastContainer using AnimatePresence + motion.div with layout prop for smooth stack reflow |
| UI-06 | Primary action buttons have hover/tap micro-interactions | Motion `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.97 }}` on a PressableButton wrapper |
| UI-07 | Lists (events, drinks, members) use staggered item animations (50-80ms delay) | StaggeredList wrapper using variants with `delayChildren: stagger(0.06)` -- verified from Motion stagger docs |
| UI-08 | Content sections animate in on scroll (whileInView with threshold) | `whileInView={{ opacity: 1, y: 0 }}` with `viewport={{ once: true, amount: 0.2 }}` -- verified from Motion scroll docs |
| UI-09 | Analytics KPI cards have number counting-up micro-interactions | Custom CountUp component using `useMotionValue` + `useTransform` or requestAnimationFrame -- Phase 22-23 will use it |
| UI-10 | Dark mode accent elements have subtle ambient glow effects | CSS `box-shadow` with accent color at low opacity + Tailwind utility classes -- no Motion needed |
| UI-11 | Cards have hover elevation (desktop) and press feedback (mobile) | PressableCard with `whileHover={{ y: -2, boxShadow }}` (desktop) + `whileTap={{ scale: 0.98 }}` (mobile) |
| UI-12 | App respects prefers-reduced-motion and disables animations accordingly | `MotionConfig reducedMotion="user"` wrapping entire app -- verified from Motion accessibility docs |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `motion` | ^12.35.x | All UI animations (enter, gesture, scroll, exit) | Formerly Framer Motion. 30M+ npm downloads/month. React 19 compatible (fix in v12.1.0). Declarative API, hardware-accelerated via Web Animations API. Only animation library needed. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS v4 | existing | Skeleton `animate-pulse`, ambient glow `box-shadow`, smooth scroll CSS | Already in project. Use for static visual effects, not motion animations. |
| CSS `scroll-behavior` | native | Smooth anchor scrolling (UI-04) | Zero-cost native browser feature. No library needed. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom toast (Motion) | `sonner` (v2.0.7) | Sonner is excellent but adds another dependency. Building with Motion ensures consistent animation language across the app and reduces bundle size. |
| Custom toast (Motion) | `react-hot-toast` (v2.6.0) | Same reasoning as sonner. Both support React 19 but add 3-5kb each. |
| Motion `whileTap` | Keep CSS `active:scale-*` everywhere | CSS is lighter but cannot do spring physics, coordinated gestures, or variant propagation. Use CSS for simple elements, Motion for rich interactions. |
| `motion` (full, 34kb) | `m` + `LazyMotion` + `domAnimation` (~4.6kb initial) | Always use the lazy approach. No reason to ship 34kb for micro-interactions. |
| `useAnimate` imperative | Declarative `motion.div` props | `useAnimate` is for complex sequences/timelines. Declarative props are simpler for enter/gesture/scroll animations. |

**Installation:**
```bash
npm install motion
```

No other new packages needed. Toast and count-up are custom-built with Motion.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    motion/                    # NEW - All animation wrapper components
      AnimatedSection.tsx      # Page section enter animation wrapper
      StaggeredList.tsx        # List with staggered children enter
      PressableCard.tsx        # Card with hover elevation + tap feedback
      PressableButton.tsx      # Button with hover/tap micro-interactions
      CountUp.tsx              # Number counting-up animation for KPI cards
    toast/                     # NEW - Toast notification system
      ToastContext.tsx         # React context + useToast hook
      ToastContainer.tsx       # AnimatePresence toast stack renderer
      Toast.tsx                # Individual toast component with variants
    ui/
      Skeleton.tsx             # NEW - Skeleton line/card/circle primitives
  app/
    (public)/
      events/
        loading.tsx            # NEW - Skeleton for events page
      events/[slug]/
        loading.tsx            # NEW - Skeleton for event detail page
    (members)/
      dashboard/
        loading.tsx            # NEW - Skeleton for dashboard page
    (admin)/
      admin/
        members/
          loading.tsx          # NEW - Skeleton for members admin page
    layout.tsx                 # MODIFIED - Add LazyMotion + MotionConfig + ToastContainer
    globals.css                # MODIFIED - Add scroll-behavior: smooth, glow utilities
```

### Pattern 1: LazyMotion + MotionConfig at Root
**What:** Wrap the entire app in `LazyMotion` (for small bundle) and `MotionConfig` (for reduced motion) at the root layout level.
**When to use:** Always -- this is the foundation for all animations.
**Example:**
```typescript
// src/app/layout.tsx -- the root layout must become a client boundary
// Option A: Inline "use client" in layout (simple but makes entire layout client)
// Option B: Create a MotionProvider client component wrapper (recommended)

// src/components/motion/MotionProvider.tsx
"use client";

import { LazyMotion, domAnimation, MotionConfig } from "motion/react";

export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

// Then in layout.tsx (stays Server Component):
// <MotionProvider>{children}</MotionProvider>
```
**Source:** [motion.dev/docs/react-lazy-motion](https://motion.dev/docs/react-lazy-motion), [motion.dev/docs/react-accessibility](https://motion.dev/docs/react-accessibility)

### Pattern 2: AnimatedSection Wrapper (UI-01, UI-08)
**What:** Thin client wrapper that adds fade+translateY enter animation to any section. Works with both `animate` (on mount) and `whileInView` (on scroll).
**When to use:** Wrap page content sections, hero blocks, card groups.
**Example:**
```typescript
// src/components/motion/AnimatedSection.tsx
"use client";

import * as m from "motion/react-m";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  scrollTriggered?: boolean; // true = whileInView, false = on mount
}

export default function AnimatedSection({
  children,
  className,
  delay = 0,
  scrollTriggered = false,
}: AnimatedSectionProps) {
  const initial = { opacity: 0, y: 20 };
  const target = { opacity: 1, y: 0 };
  const transition = { duration: 0.25, ease: "easeOut", delay };

  return scrollTriggered ? (
    <m.div
      initial={initial}
      whileInView={target}
      viewport={{ once: true, amount: 0.2 }}
      transition={transition}
      className={className}
    >
      {children}
    </m.div>
  ) : (
    <m.div
      initial={initial}
      animate={target}
      transition={transition}
      className={className}
    >
      {children}
    </m.div>
  );
}
```
**Source:** [motion.dev/docs/react-scroll-animations](https://motion.dev/docs/react-scroll-animations)

### Pattern 3: StaggeredList Wrapper (UI-07)
**What:** Parent-child variant pattern where parent orchestrates staggered children animations.
**When to use:** Event lists, drink menus, member lists, any array rendering.
**Example:**
```typescript
// src/components/motion/StaggeredList.tsx
"use client";

import * as m from "motion/react-m";
import { stagger } from "motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      delayChildren: stagger(0.06), // 60ms between items
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

interface StaggeredListProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggeredList({ children, className }: StaggeredListProps) {
  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </m.div>
  );
}

export function StaggeredItem({ children, className }: StaggeredListProps) {
  return (
    <m.div variants={itemVariants} className={className}>
      {children}
    </m.div>
  );
}
```
**Source:** [motion.dev/docs/react-animation#orchestration](https://motion.dev/docs/react-animation#orchestration), [motion.dev/docs/stagger](https://motion.dev/docs/stagger)

### Pattern 4: Toast System (UI-05)
**What:** Context-based toast provider with AnimatePresence for smooth enter/exit and `layout` prop for stack reflow.
**When to use:** After any user action (save, delete, purchase, redeem, error).
**Example:**
```typescript
// Toast hook usage:
const { toast } = useToast();
toast({ message: "Token redeemed!", type: "success" });

// ToastContainer renders at bottom of layout:
<AnimatePresence mode="popLayout">
  {toasts.map((t) => (
    <m.div
      key={t.id}
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Toast content */}
    </m.div>
  ))}
</AnimatePresence>
```
**Source:** [motion.dev/docs/react-animate-presence](https://motion.dev/docs/react-animate-presence), [buildui.com/recipes/animated-toast](https://buildui.com/recipes/animated-toast)

### Pattern 5: PressableCard / PressableButton (UI-03, UI-06, UI-11)
**What:** Replaces CSS `active:scale-*` with Motion's `whileHover` and `whileTap` for richer tactile feedback including spring physics and hover elevation.
**When to use:** Event cards, ticket cards, drink cards, primary action buttons.
**Example:**
```typescript
// src/components/motion/PressableCard.tsx
"use client";

import * as m from "motion/react-m";

interface PressableCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function PressableCard({ children, className, onClick }: PressableCardProps) {
  return (
    <m.div
      whileHover={{
        y: -2,
        boxShadow: "0 8px 25px rgba(229, 72, 77, 0.08)",
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </m.div>
  );
}
```
**Source:** [motion.dev/docs/react-gestures](https://motion.dev/docs/react-gestures)

### Pattern 6: CountUp Micro-interaction (UI-09)
**What:** Number counting up from 0 to target value over a short duration. For KPI/analytics cards.
**When to use:** Phase 22-23 analytics dashboard KPI cards. Build the component in Phase 21 so it's ready.
**Example:**
```typescript
// src/components/motion/CountUp.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

interface CountUpProps {
  value: number;
  duration?: number; // ms
  format?: (n: number) => string;
}

export default function CountUp({ value, duration = 800, format }: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const rafRef = useRef<number>();

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration, prefersReducedMotion]);

  return <>{format ? format(display) : display}</>;
}
```

### Anti-Patterns to Avoid
- **AnimatePresence for page-level route transitions:** BROKEN in Next.js App Router as of 2026. The App Router does not unmount page components in a way AnimatePresence can detect. Use component-level enter animations only. This is explicitly listed in Out of Scope in REQUIREMENTS.md.
- **Making Server Components into Client Components for animation:** Never add "use client" to a Server Component just to animate it. Instead, wrap the Server Component's output in a thin AnimatedSection client wrapper.
- **Full `motion` import instead of `m` + `LazyMotion`:** Importing `motion` directly ships 34kb. Always use `import * as m from "motion/react-m"` within a `LazyMotion` provider.
- **Animating MobileNav dimensions:** The MobileNav is z-50, fixed-position, has safe-area padding. Never animate its height/position -- this causes iOS layout jank and safe-area shifts.
- **Excessive animation durations:** Keep enter animations at 200-300ms, gestures at 100-200ms. Anything over 400ms feels sluggish, especially on mobile.
- **Overriding Tailwind with Motion for static effects:** Ambient glow (UI-10) and smooth scroll (UI-04) are CSS-only. Don't use Motion for what CSS does natively.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reduced motion detection | Custom `matchMedia('prefers-reduced-motion')` listener | `MotionConfig reducedMotion="user"` | Automatically disables transform/layout animations while keeping opacity. Tested, maintained, covers edge cases. |
| Staggered list animation timing | Manual `setTimeout` chains or CSS `animation-delay` on each item | Motion `stagger()` function with variants | Handles dynamic list lengths, direction options ("first", "center", "last"), and easing. Manual timing breaks on list changes. |
| Scroll-triggered animation | Custom `IntersectionObserver` + state management | Motion `whileInView` prop | Uses pooled IntersectionObserver internally, handles cleanup, integrates with the animation system. |
| Exit animations | CSS `@keyframes` with `display: none` timeout | Motion `AnimatePresence` + `exit` prop | CSS cannot animate elements being removed from the DOM. AnimatePresence delays unmounting until exit animation completes. |
| Gesture detection (tap vs drag) | Custom `onTouchStart/onTouchEnd` with distance thresholds | Motion `whileTap`, `whileHover` | Motion handles tap-vs-drag disambiguation (3px threshold), keyboard accessibility (Enter triggers tap), and cross-device differences. |

**Key insight:** Motion's declarative API handles the fiddly parts of animation (cleanup, interruption, accessibility, gesture disambiguation) that custom implementations invariably miss. The tap gesture alone includes keyboard focus support and drag cancellation that would take 50+ lines to replicate.

## Common Pitfalls

### Pitfall 1: Hydration Mismatch with `initial`
**What goes wrong:** `motion` components render with `initial` values on the server, then animate to `animate` values on the client. If the server-rendered HTML differs from the first client render, React throws a hydration error.
**Why it happens:** `initial={{ opacity: 0 }}` means the server renders `opacity: 0`, but if the component also has conditional logic that changes between server/client, mismatch occurs.
**How to avoid:** Always use consistent `initial` + `animate` pairs. If you don't want a server-rendered flash, set `initial={false}` to skip the initial animation and render with `animate` values directly.
**Warning signs:** Console hydration warnings mentioning style attributes.

### Pitfall 2: Bundle Size Regression from `motion` Import
**What goes wrong:** Importing from `"motion/react"` (the `motion` component) adds ~34kb gzipped. Importing from `"motion/react-m"` (the `m` component) adds ~4.6kb.
**Why it happens:** The `motion` component pre-bundles all features. The `m` component defers features to `LazyMotion`.
**How to avoid:** Use `import * as m from "motion/react-m"` everywhere. Import `LazyMotion`, `domAnimation`, `AnimatePresence`, `MotionConfig`, `stagger`, `useReducedMotion` from `"motion/react"`. Set `strict` on `LazyMotion` during development to catch accidental `motion` imports.
**Warning signs:** Bundle size increase >5kb from animation layer.

### Pitfall 3: Animating Server Components
**What goes wrong:** Adding `motion.div` to a Server Component forces it to become a Client Component, losing streaming, data fetching, and tree-shaking benefits.
**Why it happens:** Motion components require `"use client"` because they use React hooks internally.
**How to avoid:** Create thin wrapper components (`AnimatedSection`, `StaggeredList`) as `"use client"` and compose them around Server Component output. The Server Component fetches data, the client wrapper adds animation.
**Warning signs:** Server Component pages gaining `"use client"` directive.

### Pitfall 4: Toast Z-Index Conflicts with MobileNav and Modals
**What goes wrong:** Toasts render behind the MobileNav (z-50) or behind modals (z-[60]).
**Why it happens:** Toast container needs to be above everything else.
**How to avoid:** Toast container at `z-[70]` (above modals at z-[60]). Position toast container with `bottom` accounting for MobileNav height + safe area: `bottom: calc(5rem + env(safe-area-inset-bottom) + 1rem)`.
**Warning signs:** Toasts not visible when MobileNav or modal is open.

### Pitfall 5: Over-animation Causing Performance Issues on Low-end Mobile
**What goes wrong:** Too many simultaneous animations (staggered list + scroll-triggered + hover effects) cause frame drops on older phones.
**Why it happens:** Even with WAAPI hardware acceleration, compositing too many layers simultaneously taxes the GPU.
**How to avoid:** Keep animations simple (opacity + translateY only, no blur/filter animations). Use `viewport={{ once: true }}` for scroll animations so they don't re-trigger. Limit staggered lists to visible items only. Test on throttled CPU (Chrome DevTools 4x slowdown).
**Warning signs:** Lighthouse performance score drops, visible jank during list scroll.

### Pitfall 6: `domAnimation` Missing Layout Animations
**What goes wrong:** Using `layout` prop or `whileDrag` with `domAnimation` feature package -- nothing happens.
**Why it happens:** The `domAnimation` package includes: animations, variants, exit animations, tap/hover/focus gestures. It does NOT include: drag gestures, layout animations. Those require `domMax` (+25kb).
**How to avoid:** Phase 21 requirements don't need `layout` animations (except toast stack reflow -- but `AnimatePresence mode="popLayout"` handles this without the `layout` feature). Stick with `domAnimation`. If toast stack reflow doesn't work with `domAnimation`, use CSS `gap` instead of Motion `layout`.
**Warning signs:** `layout` prop on motion components having no effect.

## Code Examples

Verified patterns from official sources:

### Smooth Scroll CSS (UI-04)
```css
/* src/app/globals.css -- add to html rule */
html {
  scroll-behavior: smooth;
}
```

### Ambient Glow CSS (UI-10)
```css
/* Tailwind utility class approach in globals.css */
@utility glow-accent {
  box-shadow:
    0 0 15px rgba(229, 72, 77, 0.15),
    0 0 30px rgba(229, 72, 77, 0.05);
}

@utility glow-accent-strong {
  box-shadow:
    0 0 20px rgba(229, 72, 77, 0.25),
    0 0 40px rgba(229, 72, 77, 0.1);
}
```
Usage: `<div className="glow-accent">` on accent-bordered cards.

### Skeleton Loading Primitives (UI-02)
```typescript
// src/components/ui/Skeleton.tsx
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-card-border/50 ${className ?? "h-4 w-full"}`} />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border border-card-border bg-card p-5 ${className ?? ""}`}>
      <SkeletonLine className="h-3 w-1/3 mb-3" />
      <SkeletonLine className="h-5 w-2/3 mb-2" />
      <SkeletonLine className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8", md: "h-12 w-12", lg: "h-16 w-16" };
  return <div className={`animate-pulse rounded-full bg-card-border/50 ${sizes[size]}`} />;
}
```

### Next.js loading.tsx Skeleton Page (UI-02)
```typescript
// src/app/(public)/events/loading.tsx
import { SkeletonCard } from "@/components/ui/Skeleton";

export default function EventsLoading() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="px-6 pt-12 pb-6">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-card-border/50" />
      </header>
      <div className="px-6 flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
```

### Using m vs motion Component
```typescript
// CORRECT: Small bundle via m + LazyMotion
import * as m from "motion/react-m";

// In component (must be inside a LazyMotion provider):
<m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

// CORRECT: Importing non-component exports from "motion/react"
import { LazyMotion, domAnimation, AnimatePresence, MotionConfig, stagger, useReducedMotion } from "motion/react";

// WRONG: This imports ~34kb
import { motion } from "motion/react";
```
**Source:** [motion.dev/docs/react-reduce-bundle-size](https://motion.dev/docs/react-reduce-bundle-size)

### Toast with z-index Above MobileNav
```typescript
// ToastContainer.tsx -- positioned above MobileNav (z-50) and modals (z-[60])
<div className="fixed left-0 right-0 z-[70] flex flex-col items-center gap-2 px-4"
     style={{ bottom: "calc(5rem + env(safe-area-inset-bottom) + 1rem)" }}>
  <AnimatePresence mode="popLayout">
    {toasts.map(toast => (
      <m.div key={toast.id} layout /* ... animation props */ />
    ))}
  </AnimatePresence>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package | `motion` package | Late 2024 | Same API, new name. Import from `"motion/react"` not `"framer-motion"` |
| Full motion bundle (34kb) | `m` + `LazyMotion` + `domAnimation` (4.6kb) | Always available, but widely adopted 2025+ | 7x smaller initial animation bundle |
| `useReducedMotion` hook (manual) | `MotionConfig reducedMotion="user"` (automatic) | Motion v12 | Blanket reduced-motion support without per-component logic |
| CSS `@keyframes` for enter animations | Motion `initial` + `animate` props | Motion v1+ but React 19 fix in v12.1.0 | Declarative, interruptible, spring-physics capable |
| Manual `IntersectionObserver` | Motion `whileInView` prop | Motion v6+ | Pooled observer, automatic cleanup, integrated with animation system |
| `staggerChildren` transition prop | `stagger()` function in `delayChildren` | Motion v12+ | More control: direction, easing, startDelay. Works with variant propagation. |

**Deprecated/outdated:**
- `framer-motion` package name: Still works but `motion` is the maintained package. Use `motion` for new installs.
- `AnimatePresence` for page-level route transitions in Next.js App Router: BROKEN. App Router doesn't unmount pages in a way AnimatePresence can intercept.
- `@axe-core/react`: Does NOT support React 18+. Deprecated by Deque. Not relevant to this phase but noted for context.

## Open Questions

1. **`layout` prop with `domAnimation` feature package for toast stack reflow**
   - What we know: `domAnimation` does NOT include layout animations. `domMax` does (+25kb).
   - What's unclear: Does `AnimatePresence mode="popLayout"` work without the layout feature? Or does toast stack reflow require `domMax`?
   - Recommendation: Try `domAnimation` first. If toast reflow doesn't work, use CSS `gap` + `flex-direction: column-reverse` for natural stack reflow without Motion layout. Do NOT upgrade to `domMax` for this single use case.

2. **`m` component auto-completion in IDE**
   - What we know: `import * as m from "motion/react-m"` gives `m.div`, `m.button` etc.
   - What's unclear: Whether TypeScript auto-complete works as well as with `motion.div`.
   - Recommendation: Test during implementation. If IDE support is poor, consider `import { m } from "motion/react"` as alternative import syntax (if available in v12.35).

3. **Interaction between existing CSS `active:scale-95` and Motion `whileTap`**
   - What we know: Both apply transforms. If both are active simultaneously, they could conflict.
   - What's unclear: Whether Motion's inline style overrides Tailwind's CSS or they compound.
   - Recommendation: When adding Motion `whileTap` to a component, remove the CSS `active:scale-*` class. They should not coexist on the same element.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test framework installed) |
| Config file | none -- see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Pages have enter animations | manual-only | Visual inspection in browser | N/A |
| UI-02 | Async content shows skeletons | manual-only | Navigate to pages, observe loading states | N/A |
| UI-03 | Buttons/cards have tap feedback | manual-only | Tap/click elements, observe scale response | N/A |
| UI-04 | Smooth scroll for anchor links | manual-only | Click anchor links, observe smooth scroll | N/A |
| UI-05 | Toast notifications slide in/auto-dismiss | manual-only | Trigger actions, observe toasts | N/A |
| UI-06 | Primary buttons have hover/tap effects | manual-only | Hover/tap primary buttons | N/A |
| UI-07 | Lists have staggered animations | manual-only | Navigate to list pages, observe stagger | N/A |
| UI-08 | Content animates on scroll | manual-only | Scroll through pages, observe whileInView | N/A |
| UI-09 | KPI cards count up | manual-only | Component built, tested when analytics pages exist | N/A |
| UI-10 | Dark mode ambient glow | manual-only | Visual inspection of accent elements | N/A |
| UI-11 | Cards have hover elevation + press feedback | manual-only | Hover (desktop) and tap (mobile) cards | N/A |
| UI-12 | Respects prefers-reduced-motion | manual-only | Enable reduced motion in OS settings, verify no transforms | N/A |

**Justification for manual-only:** All UI-* requirements are visual/animation behaviors. They cannot be meaningfully tested with unit tests. Verification requires visual inspection in a browser with different device settings (desktop hover, mobile tap, reduced motion toggle). The project has no test framework installed.

### Sampling Rate
- **Per task commit:** Visual inspection of affected pages in dev server
- **Per wave merge:** Full visual walkthrough of all animated pages
- **Phase gate:** All 12 UI requirements visually verified, reduced motion toggled

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements (all requirements are manual-only verification).

## Sources

### Primary (HIGH confidence)
- [motion.dev/docs/react-quick-start](https://motion.dev/docs/react-quick-start) -- Import paths, installation, basic API
- [motion.dev/docs/react-reduce-bundle-size](https://motion.dev/docs/react-reduce-bundle-size) -- LazyMotion, m component, 4.6kb bundle, domAnimation vs domMax
- [motion.dev/docs/react-lazy-motion](https://motion.dev/docs/react-lazy-motion) -- LazyMotion props, strict mode, sync vs async loading
- [motion.dev/docs/react-animate-presence](https://motion.dev/docs/react-animate-presence) -- Exit animations, mode="popLayout", key changes
- [motion.dev/docs/react-gestures](https://motion.dev/docs/react-gestures) -- whileTap, whileHover, whileFocus, keyboard accessibility
- [motion.dev/docs/react-scroll-animations](https://motion.dev/docs/react-scroll-animations) -- whileInView, viewport options, once: true
- [motion.dev/docs/react-animation](https://motion.dev/docs/react-animation) -- Variants, orchestration, stagger with delayChildren
- [motion.dev/docs/stagger](https://motion.dev/docs/stagger) -- stagger() function, from/ease/startDelay options, React variant usage
- [motion.dev/docs/react-accessibility](https://motion.dev/docs/react-accessibility) -- MotionConfig reducedMotion="user", useReducedMotion hook
- [motion.dev/docs/react-motion-config](https://motion.dev/docs/react-motion-config) -- reducedMotion, transition defaults, nonce
- [motion.dev/docs/react-use-reduced-motion](https://motion.dev/docs/react-use-reduced-motion) -- useReducedMotion hook for manual control
- npm: `motion@12.35.2` (latest as of 2026-03-09) -- React 19 compatible, supports `motion/react` and `motion/react-m` import paths

### Secondary (MEDIUM confidence)
- [buildui.com/recipes/animated-toast](https://buildui.com/recipes/animated-toast) -- Toast pattern with AnimatePresence + layout
- Previous project research (STACK.md, SUMMARY.md) -- Motion bundle size, React 19 fix in v12.1.0, Tailwind v4 compatibility

### Tertiary (LOW confidence)
- None -- all findings verified against official Motion docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Motion v12.35.2 verified on npm, all API patterns verified from official docs via firecrawl scraping
- Architecture: HIGH -- Patterns follow official docs, adapted to Next.js App Router Server Component model. Client wrapper pattern is well-established.
- Pitfalls: HIGH -- Bundle size, hydration, z-index, server component, domAnimation limitations all verified from official docs and codebase analysis
- Code examples: HIGH -- All examples adapted from verified official documentation patterns

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (Motion v12 is stable; API unlikely to change significantly in 30 days)
