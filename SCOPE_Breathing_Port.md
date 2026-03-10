# SPiR Health — Breathing Module Port Scope

**For:** Antigravity (dev team)
**Purpose:** Port the existing breathing prototype into the Svelte app
**Status:** Scoping — no code yet
**Date:** 2026-03-03
**Source:** `prototypes/breathing-module/index.html` (single-file prototype, ~3000 lines)
**Live:** https://prototypes-peach.vercel.app/breathing-module

---

## What This Is

The breathing module prototype is already built and deployed. It just needs to be **ported from a single HTML file into a Svelte component** that lives inside the navigation shell.

This is NOT a redesign — it's a migration. The design, animations, and interactions stay the same.

---

## How It Opens

Two access paths (from Navigation Shell scope):
1. **Tab** (Direction 2) — Breathing is a dedicated tab
2. **FAB → "Breathwork"** — Opens as a tool overlay (slides up)
3. **Energy curve → tap breathwork habit → "Start"** — Same overlay

When opened as an overlay, it slides up over the current screen (same pattern as Fasting). When it's a tab, it's a full screen inside the shell.

---

## What to Port

### Three Screens (Already Built)
1. **Selection Screen** — Card carousel with 4 breathing patterns, SVG wave visualizers, start button
2. **Animation Screen** — Breathing circle, phase rings, status text, countdown, volume control
3. **Summary Screen** — Session stats, XP celebration, streak display

### Key Components to Extract into Svelte
| Source (index.html) | Svelte Component | Notes |
|---|---|---|
| `#selection-screen` | `BreathingSelect.svelte` | Card carousel, SVG visualizers |
| `#animation-screen` | `BreathingSession.svelte` | Breathing circle, rings, phase engine |
| `#summary-screen` | `BreathingSummary.svelte` | Stats, XP count-up |
| `SoundEngine` class | `lib/sounds/breathing.js` | Web Audio API synth sounds |
| CSS variables (`:root`) | Shared design tokens | Already aligned with app-wide tokens |
| Breathing mode data | `data/breathingModes.json` | 4 patterns with timing arrays |

### 4 Breathing Patterns (Existing)
| Pattern | Inhale | Hold | Exhale | Hold | Cycles |
|---|---|---|---|---|---|
| 4-7-8 Relaxation | 4s | 7s | 8s | 0s | 4 |
| Box Breathing | 4s | 4s | 4s | 4s | 4 |
| Huberman Sigh | 4s | 0s | 8s | 0s | 4 |
| Resonant | 5.5s | 0s | 5.5s | 0s | 6 |

### DOTween Comments
Already present in the existing prototype. Every GSAP call has a Unity mapping comment. These carry over as-is.

---

## Integration Points with Shell

| Feature | How it connects |
|---|---|
| XP earned | Updates shared `user` store → header XP counter pulses |
| Session complete | Triggers shell confetti system |
| Back button | Dismisses overlay or returns to tab |
| Volume control | Self-contained within breathing component |
| Sound engine | Self-contained, mutes when component unmounts |

---

## What Changes

Minimal changes from the existing prototype:

1. **Remove device frame wrapper** — the shell provides the mobile frame
2. **Remove outer page styling** — background, ambient glows (the shell handles this)
3. **Connect XP to shared store** — instead of local XP tracking, update the app-wide XP store
4. **Connect celebration to shell confetti** — instead of local confetti, call the shell's confetti system
5. **Add close/back button** — when opened as overlay, show "×" to dismiss

---

## Deliverable

One Svelte module in `src/screens/BreathingScreen.svelte` (or split into sub-components) that drops into the navigation shell with zero design changes from the existing prototype.

---

## Reference

- **Live prototype:** https://prototypes-peach.vercel.app/breathing-module
- **Source file:** `prototypes/breathing-module/index.html`
- **Prototype CLAUDE.md:** `prototypes/breathing-module/CLAUDE.md` (GSAP-to-DOTween mapping tables)
- **Implementation plan:** `prototypes/breathing-module/IMPLEMENTATION_PLAN.md` (exact Unity values)
