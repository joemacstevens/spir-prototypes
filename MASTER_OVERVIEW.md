# SPiR Health — Full App Prototype: Master Overview

**For:** Antigravity (dev team)
**Project:** Svelte + GSAP interactive prototype of the redesigned SPiR Health app
**Date:** 2026-03-03 (updated 2026-03-04)
**Deployed to:** Vercel (same setup as breathing prototype)
**Target:** Mobile-first, 390×844 (iPhone 14)

---

## What We're Building

A fully navigable interactive prototype of the SPiR Health app that:
1. Feels like a real app on your phone (deploy to Vercel, open on mobile)
2. Tests multiple design directions so the team can pick winners
3. Every animation maps to Unity's DOTween so devs know exactly how to build it
4. Modernizes the entire UI with a premium dark-mode design language

This is a **design tool and living spec**, not a functional app. All data is mocked. No backend.

---

## Scope Documents

Read these in order. Each one references the others.

| # | Doc | What it covers |
|---|---|---|
| 1 | `SCOPE_Navigation_Shell.md` | **Build first.** Tab bar, FAB quick actions, screen transitions, toast system, confetti, header, popup/overlay patterns. The skeleton everything lives in. |
| 2 | `SCOPE_Habits_Screen.md` (v2) | **The centerpiece.** VERTICAL scrollable energy timeline — habits positioned inline at their time slots, scroll through your day top-to-bottom. 3 layout variants (A/B/C). **Revised 2026-03-04:** orientation corrected from ambiguous to explicitly vertical. |
| 3 | `SCOPE_Home_Screen.md` | **Two directions to test.** Direction 1: separate dashboard with hero progress rings. Direction 2: merged with Habits (no separate Home). |
| 4 | `SCOPE_Fasting_Screen.md` | **The timer ring.** Liquid-wave fill, heartbeat start animation, color gradient (amber→green), simplified 3-tap setup, weekly chart. Opens as overlay from FAB or energy curve. |
| 5 | `SCOPE_Profile_Stats.md` | **The achievement showcase.** Identity card with levels, streak hero cards with claim animation, stat grid, radar chart, flow state gauge. |
| 6 | `SCOPE_Breathing_Port.md` | **Port only.** Existing breathing prototype migrated into the Svelte app. No redesign — just integration. |

---

## Build Order

```
Phase 1: Foundation
├── Navigation Shell (tab bar, FAB, transitions, toast, confetti)
├── Breathing Port (quickest screen — already built)
└── History screen (monthly look-back with completion dots)

Phase 2: Core Screens
├── Habits Screen (3 layout variants)
├── Home Screen (2 directions)
└── Wire up tab navigation between all screens

Phase 3: Tools & Detail
├── Fasting Tool (overlay from FAB + energy curve)
├── Profile & Stats
└── Polish transitions, celebrate moments, FAB actions
```

---

## What to Test (Decision Matrix)

The prototype exists to answer these questions:

### Energy Curve Layout (Habits Screen)

> **Orientation: VERTICAL.** The energy timeline scrolls top-to-bottom (morning → evening). Habits sit inline on the timeline at their time positions. This is NOT a horizontal chart with a list below it. See `SCOPE_Habits_Screen.md` (v2) for full spec with ASCII diagrams.

| Variant | Description | Test for |
|---|---|---|
| **A: Minimal / Expand-on-Tap** | Compact icon rows per window, tap to expand full cards | Is hidden info a problem? |
| **B: Time-Aware Focus** | Current window expanded, past/future compressed | Does "now" focus work? |
| **C: Dual-Column** | Habits left column, calendar right column, shared vertical time axis | Too dense on small screens? |

### Home Screen Direction
| Direction | Description | Test for |
|---|---|---|
| **1: Separate Home** | Dashboard with hero rings + mini energy bar | Does a dashboard add value? |
| **2: Merged Home/Habits** | App opens directly to energy curve | Is the overview missed? |

### Switchable via URL params:
```
?direction=1&layout=a    → Separate Home + Collapsed/Expanded
?direction=2&layout=b    → Merged Home + Time-Aware Focus
?direction=1&layout=c    → Separate Home + Split Layout
...etc
```

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Svelte** | Reads like the code it produces. Unity devs see HTML+logic, not framework abstractions. |
| Animations | **GSAP 3.x** | 1:1 mapping to DOTween. Every call gets a mapping comment. |
| Styling | **CSS variables** | Design tokens devs can extract directly. |
| Curves/Charts | **SVG** | Maps to Unity's LineRenderer / UI Image. |
| Deployment | **Vercel** | Same setup as breathing prototype. Root config override for subfolder. |
| Data | **Mocked JSON** | No backend. Loadouts, habits, calendar events, user stats — all hardcoded. |

---

## Design System

Carried over from the breathing prototype. Documented in each scope but summarized here:

### Colors
```
Background:      #0a0a1a
Card:            rgba(255, 255, 255, 0.06)
Card border:     rgba(255, 255, 255, 0.1)
Text primary:    #FFFFFF
Text secondary:  rgba(255, 255, 255, 0.6)
Text muted:      rgba(255, 255, 255, 0.35)
Accent (CTA):    #52ACFF

Energy windows:
  Morning:       #B58C1F (gold)
  Midday:        #DD3493 (magenta)
  Unwind:        #3399E6 (blue)

Metric rings:
  Steps:         #00FA3A (green)
  Check-ins:     #52ACFF (blue)
  Fasting:       #FFB347 (amber)
  Sleep:         #A78BFA (purple)

Fasting gradient:
  Start:         #FFB347 (amber)
  Mid:           #FFD700 (gold)
  Complete:      #00FA3A (green)

Streaks:
  Sleep:         #A78BFA (purple)
  Hydration:     #52ACFF (blue)
  Loadout:       #FFB347 (amber)
```

### Typography
```
Font: Inter (400, 500, 600, 700)
Headings: 700 weight, negative letter-spacing (-0.3px)
Body: 400-500 weight
Labels: 10-12px, uppercase, positive letter-spacing (0.5-1px)
Timer displays: tabular-nums
```

### Cards
```css
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 24px;
backdrop-filter: blur(20px);
```

### Standard Animations
| Pattern | Duration | Easing | GSAP | DOTween |
|---|---|---|---|---|
| Card entrance | 0.5s | bouncy | `back.out(1.2)` | `Ease.OutBack` |
| Screen fade | 0.3-0.5s | smooth | `power2.inOut` | `Ease.InOutQuad` |
| Fill progress | 0.5s | snappy | `power2.out` | `Ease.OutQuad` |
| Popup scale | 0.4s | bouncy | `back.out(1.4)` | `Ease.OutBack` |
| Toast slide | 0.4s | bouncy | `back.out(1.2)` | `Ease.OutBack` |
| Bottom sheet | 0.4s | snappy | `power2.out` | `Ease.OutQuad` |
| Breathing circle | breath duration | smooth | `sine.inOut` | `Ease.InOutSine` |
| Heartbeat pulse | 1.5s loop | gentle | `sine.inOut` | `Ease.InOutSine` |
| Count-up numbers | 1s | decelerate | `power2.out` | `Ease.OutQuad` |
| Stagger delay | 0.05-0.08s | — | `delay` | `.SetDelay()` |

---

## Unity Translation Rules

### Feasibility Tags
Every visual effect gets one of these tags in a code comment:

- **`UNITY: straightforward`** — Maps directly to DOTween, standard Unity UI, or existing codebase components
- **`UNITY-STRETCH`** — Possible but needs custom shader, extra asset work, or performance consideration. Always provide a simpler fallback.
- **`UNITY-SKIP`** — Web-only flourish. Won't be in the Unity build. Purely for prototype aesthetics.

### Code Comment Pattern
```javascript
// UNITY: transform.DOScale(1.1f, 0.3f).SetEase(Ease.OutBack)
gsap.to(element, { scale: 1.1, duration: 0.3, ease: 'back.out(1.2)' });

// UNITY-STRETCH: Requires BlurBehind shader. Fallback: solid rgba(15, 15, 30, 0.95)
element.style.backdropFilter = 'blur(20px)';
```

### Component Naming
Svelte components mirror Unity panel names:
| Svelte | Unity |
|---|---|
| `HabitsScreen.svelte` | `HabbitPanel.cs` |
| `HomeScreen.svelte` | `HomeScreenPanel.cs` |
| `ProfileScreen.svelte` | `ProfilePanel.cs` |
| `BreathingScreen.svelte` | `BreathworkPanel.cs` |
| `FastingTool.svelte` | `FastingPopup.cs` |
| `TabBar.svelte` | `FooterMenu.cs` |
| `FAB.svelte` | Focus Mode buttons in `FooterMenu.cs` |
| `Popup.svelte` | `PopupAndDownAnimator.cs` |
| `Toast.svelte` | `GenericText` toast in `GameManager.cs` |

---

## File Structure

```
prototypes/spir-app/
├── src/
│   ├── App.svelte
│   ├── lib/
│   │   ├── Shell.svelte              ← Tab bar + FAB + header + toast + confetti
│   │   ├── TabBar.svelte
│   │   ├── FAB.svelte
│   │   ├── Header.svelte
│   │   ├── Toast.svelte
│   │   ├── Confetti.svelte
│   │   ├── Popup.svelte
│   │   ├── BottomSheet.svelte
│   │   ├── ProgressRing.svelte       ← Hero + compact sizes
│   │   ├── EnergyCurve.svelte        ← Shared energy curve component
│   │   ├── RadarChart.svelte
│   │   ├── FlowGauge.svelte
│   │   └── stores/
│   │       ├── navigation.js
│   │       ├── user.js
│   │       ├── habits.js
│   │       ├── fasting.js
│   │       └── metrics.js
│   ├── screens/
│   │   ├── HomeScreen.svelte
│   │   ├── HabitsScreen.svelte
│   │   ├── HistoryScreen.svelte      ← Monthly look-back (completion dots, streaks, stats)
│   │   ├── ProfileScreen.svelte
│   │   └── BreathingScreen.svelte
│   ├── tools/
│   │   ├── FastingTool.svelte
│   │   ├── FocusTimer.svelte         ← Stub
│   │   └── WaterLogger.js
│   └── data/
│       ├── loadouts.json
│       ├── habits.json
│       ├── calendar.json
│       ├── breathingModes.json
│       └── user.json
├── static/
│   └── (fonts, icons if needed)
├── package.json
├── svelte.config.js
└── CLAUDE.md                         ← Project context for AI-assisted development
```

---

## Key Simplifications from Current App

| Area | Current App | Prototype |
|---|---|---|
| Getting started | 7-8 taps before first habit check | 3 taps (loadout card → hold → go) |
| Daily mental model | 5 energy windows AND 3 progress circles | Vertical scrollable energy timeline unifies both — scroll through your day |
| Fasting setup | 8 scroll wheels | 3 taps (when → how long → hold) |
| Home vs Habits | Two separate screens showing same energy concept | Testing: separate vs merged |
| Profile | Data dump with raw XP number | Achievement showcase with levels |
| Quick tools | 3-second auto-collapsing popup | FAB (persistent) + energy curve (contextual) |
| Lock-in | Two separate hold-to-confirm gestures | One lock-in; last habit auto-celebrates |
| Yesterday's loadout | Shown prominently before today's setup | Hidden, swipe to access |
| Chronotype selection | On Home Screen, daily | In Settings, set once |
| Streaks | Small list items | Hero cards with claim animation |

---

## What's NOT in the Prototype

- Backend / API integration
- Authentication / login
- Subscription management / payments
- HealthKit / Health Connect
- Push notifications
- Device haptics (document sync points for Unity)
- Actual calendar sync (mock events only)
- Tutorial / onboarding flow
- Music player
- Drag-to-reorder habits (document the interaction, don't build the DnD)

---

## Deployment

Same approach as the breathing prototype:

```bash
cd prototypes/spir-app
npm run build
vercel --prod
```

Vercel Root Config set to `prototypes/spir-app` so it deploys the subfolder without restructuring the repo.

**Target URL:** `https://prototypes-peach.vercel.app/` (or new Vercel project)

---

## Success Criteria (Overall)

- [ ] Open the prototype on your phone and it feels like a real app
- [ ] The team can test all layout variants and directions by changing URL params
- [ ] Every screen answers: "Could a Unity dev build this?" → Yes
- [ ] The energy curve feels like the defining feature of the app
- [ ] Fasting and Breathing feel like premium, self-contained tools
- [ ] Profile makes you proud of your progress, not overwhelmed by data
- [ ] The design language is cohesive — every screen feels like it belongs to the same app
- [ ] Nobody looks at it and says "we'll never get that done in Unity"
