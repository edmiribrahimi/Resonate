---
phase: 21-layout-elegance
plan: 01
subsystem: ui-components
tags: [motion, animation, toast, skeleton, providers]
dependency_graph:
  requires: []
  provides: [MotionProvider, AnimatedSection, StaggeredList, PressableCard, PressableButton, CountUp, ToastProvider, useToast, SkeletonLine, SkeletonCard, SkeletonAvatar]
  affects: [src/app/layout.tsx, src/app/globals.css]
tech_stack:
  added: [motion@12.35.2]
  patterns: [LazyMotion+domAnimation, motion/react-m lightweight import, AnimatePresence toast stack, requestAnimationFrame counting, Tailwind @utility]
key_files:
  created:
    - src/components/motion/MotionProvider.tsx
    - src/components/motion/AnimatedSection.tsx
    - src/components/motion/StaggeredList.tsx
    - src/components/motion/PressableCard.tsx
    - src/components/motion/PressableButton.tsx
    - src/components/motion/CountUp.tsx
    - src/components/toast/ToastContext.tsx
    - src/components/toast/Toast.tsx
    - src/components/toast/ToastContainer.tsx
    - src/components/ui/Skeleton.tsx
  modified:
    - package.json
    - package-lock.json
    - src/app/layout.tsx
    - src/app/globals.css
decisions:
  - "CountUp imports useReducedMotion from motion/react (hook not available in motion/react-m) -- acceptable since it tree-shakes to ~1kb"
  - "ToastContainer passes toasts as props from ToastContext (avoids double useContext call)"
  - "Toast icons are inline SVG (no external icon library dependency)"
metrics:
  duration: 248s
  completed: "2026-03-09T18:14:32Z"
  tasks: 3
  files_created: 10
  files_modified: 4
---

# Phase 21 Plan 01: Component Library Foundation Summary

Motion v12 with LazyMotion (domAnimation, ~4.6kb) providing 6 animation wrappers, toast notification system with AnimatePresence, and skeleton loading primitives -- all wired into root layout via MotionProvider + ToastProvider.

## Task Results

### Task 1: Install Motion and create foundational providers + CSS utilities
**Commit:** e0c0efb
- Installed motion@12.35.2 (adds 4 packages)
- Created MotionProvider with LazyMotion strict mode + MotionConfig reducedMotion="user"
- Wired MotionProvider into layout.tsx wrapping children (layout stays Server Component)
- Added `scroll-behavior: smooth` to html rule in globals.css (UI-04)
- Added `@utility glow-accent` and `@utility glow-accent-strong` using accent color rgba values (UI-10)

### Task 2: Create animation wrapper components and skeleton primitives
**Commit:** 2f58f9e
- **AnimatedSection**: fade+translateY enter animation, optional scrollTriggered mode with whileInView (UI-01, UI-08)
- **StaggeredList/StaggeredItem**: parent-child variant stagger with 60ms delayChildren (UI-07)
- **PressableCard**: whileHover y:-2 with accent boxShadow, whileTap scale:0.98 (UI-11)
- **PressableButton**: whileHover scale:1.02, whileTap scale:0.97, disabled prop disables both (UI-06, UI-03)
- **CountUp**: requestAnimationFrame with ease-out cubic easing, useReducedMotion for immediate display (UI-09)
- **SkeletonLine/SkeletonCard/SkeletonAvatar**: Tailwind animate-pulse, no client directive needed (UI-02)

### Task 3: Create toast notification system and wire into layout
**Commit:** 7a23750
- **ToastContext**: createContext with toast() and dismiss(), crypto.randomUUID for ids, 4s auto-dismiss via setTimeout
- **Toast**: success/error/info variants with color-coded borders, inline SVG icons, dismiss button
- **ToastContainer**: AnimatePresence with slide-up animation, fixed z-[70] above MobileNav (z-50) and modals (z-[60])
- Wired ToastProvider into layout.tsx inside MotionProvider (AnimatePresence needs LazyMotion context)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. `npm run build` passes with zero errors -- PASS
2. Only MotionProvider.tsx and CountUp.tsx import from "motion/react" (CountUp needs useReducedMotion hook) -- PASS
3. AnimatedSection, StaggeredList, PressableCard, PressableButton use motion/react-m -- PASS
4. ToastContainer has z-[70] -- PASS
5. globals.css has scroll-behavior: smooth -- PASS
6. globals.css has glow-accent and glow-accent-strong utilities -- PASS

## Requirements Addressed

- **UI-04**: Smooth scroll via CSS scroll-behavior
- **UI-05**: Reduced motion support via MotionConfig reducedMotion="user"
- **UI-09**: CountUp component for KPI number animations
- **UI-10**: glow-accent CSS utilities for ambient dark mode glow
- **UI-12**: Toast notification system at z-[70]

## Self-Check: PASSED

- 10/10 created files found on disk
- 3/3 commit hashes verified in git log
