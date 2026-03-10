# SPiR Health — Habits Screen Prototype Scope (v2)

**For:** Antigravity (dev team)
**Purpose:** Interactive Svelte prototype of the redesigned Habits/Daily screen
**Status:** Revision — corrects orientation from v1, adds lock-in bridge + section celebrations
**Date:** 2026-03-09 (revised from 2026-03-04)

---

> **⚠️ CRITICAL ORIENTATION NOTE**
>
> The energy timeline is **VERTICAL**. Time flows **top to bottom**.
> Morning at the top, evening at the bottom. The user **scrolls down through their day**.
>
> This is NOT a horizontal chart with a list underneath it.
> The energy curve, habits, and calendar events all live on ONE vertical scrollable timeline.
>
> If you find yourself building a horizontal graph with content below it, stop — that's wrong.

---

## What This Is

A web prototype (Svelte + GSAP) that reimagines the SPiR Health daily habits experience. This isn't a 1:1 recreation of the current Unity app — it's a design exploration that tests a new layout where the energy curve IS the interface, not a decoration above a list.

Deployed to Vercel so the team can interact with it on their phones.

---

## The Big Idea: Vertical Scrollable Energy Timeline

The current app has a horizontal energy bar alongside a habit list. In this prototype, **the energy curve IS the interface**. The entire screen is a vertical, scrollable day timeline. You scroll through your day like scrolling through a calendar, but shaped by your biology.

### How It Works

Think of it like a vertical day planner, but instead of uniform hour blocks, the timeline is shaped by the energy curve:

```
┌──────────────────────────┐
│  ☀️ Good morning          │  ← Fixed header (time, greeting)
├──────────────────────────┤
│                          │
│  ╭─── 6:30 AM ─────╮    │  ← DAY PREP (muted)
│  │                  │    │
│  │  💧 Hydrate      │    │    Habits sit inline
│  │  🧘 Stretch      │    │    at their time positions
│  │  🚿 Cold Shower  │    │
│  │                  │    │
│  ├─── 8:00 AM ─────┤    │  ← FIRST WIND (gold glow)
│  │  ██████████████  │    │    Energy wave pulses
│  │  ██ PEAK ██████  │    │    along the left edge
│  │                  │    │
│  │  📝 Journal      │    │    Habits at their
│  │  🧠 Meditate     │    │    time slots
│  │  🚶 Walk         │    │
│  │                  │    │
│  │  📅 Team Standup │    │  ← Calendar event block
│  │     10:00-10:30  │    │    (inline on timeline)
│  │                  │    │
│  ├── 12:00 PM ─────┤    │  ← ENERGY DIP (dimmed)
│  │  ▄▄▄▄▄▄▄▄▄▄▄▄  │    │    Curve dips visually
│  │                  │    │
│  │  🥗 Healthy Lunch│    │
│  │                  │    │
│  │  📅 Lunch Mtg    │    │  ← Another calendar event
│  │     1:00-2:00    │    │
│  │                  │    │
│  ├─── 2:00 PM ─────┤    │  ← SECOND WIND (magenta glow)
│  │  ██████████████  │    │    Energy rises again
│  │                  │    │
│  │  ☕ No Caffeine   │    │
│  │  💪 Deep Work    │    │
│  │                  │    │
│  │  📅 Focus Time   │    │  ← Calendar event
│  │     3:30-5:00    │    │
│  │                  │    │
│  ├─── 6:00 PM ─────┤    │  ← PRE-BED (blue glow)
│  │  ▄▄▄▄▄▄▄▄▄▄▄▄  │    │    Curve winds down
│  │                  │    │
│  │  📖 Read         │    │
│  │  🙏 Gratitude    │    │
│  │  😴 Sleep Prep   │    │
│  │                  │    │
│  ╰── 10:30 PM ─────╯    │  ← End of day
│                          │
├──────────────────────────┤
│  🏠  📋  📆  👤          │  ← Fixed tab bar
└──────────────────────────┘
```

### The Vertical Energy Curve

- **Orientation:** VERTICAL. Time axis runs top-to-bottom. Energy axis runs left-to-right.
- **The curve runs along the left edge** of the scrollable area as a subtle, continuous wave
- **High energy = curve bulges RIGHT** (wider/more prominent). Low energy = curve recedes LEFT (narrower/subdued)
- **5 energy windows** are visible as distinct colored regions along this vertical wave:
  - **Day Prep** (wake → 8:00): muted, gentle rise
  - **First Wind** (8:00 → 12:00): gold glow, curve peaks rightward
  - **Energy Dip** (12:00 → 2:00): dimmed, curve recedes
  - **Second Wind** (2:00 → 6:00): magenta glow, curve peaks again
  - **Pre-Bed** (6:00 → sleep): blue glow, curve descends
- **The curve is NOT a chart you read — it's the SHAPE of the timeline itself.** The background, glow, and visual weight of each section change with the energy level.
- Times are personalized (derived from wake time + chronotype)

### Habits ON the Timeline

- Habits are **positioned inline at their time slot** — NOT in a separate list below a graph
- Each habit is a tappable card/row sitting directly on the vertical timeline at the time it belongs to
- Tap a habit to check it off → completion animation (scale + check + glow)
- As habits in a window are completed, that section's glow intensifies / fills
- **Habits have spatial meaning**: morning habits are at the TOP, evening habits are at the BOTTOM. You scroll down to see later habits.

### Calendar Events ON the Timeline

- Calendar events appear as **time blocks inline on the same vertical timeline**
- They sit between habits, at their actual time position
- Visually distinct from habits (wider block, different styling, shows duration)
- Shows the user's full day context — biology + habits + schedule — in one scrollable view
- Mock 3-4 sample events

### The "Now" Indicator

- A **horizontal line** that spans the width of the timeline at the current time position
- Pulsing dot or glow on the line
- **On load, the timeline auto-scrolls to center the "now" indicator** on screen
- Past habits above the line are slightly dimmed. Current/future habits below are full brightness.
- The user's natural scroll position is "right now" — scroll up to see what's done, scroll down to see what's coming

---

## Three Layout Variants to Prototype

Build all three so we can test which density level works best on mobile. **All three are VERTICAL scrollable timelines.** The variants differ in how much detail is shown and how the current moment is emphasized.

Switch between variants via URL parameter: `?layout=a`, `?layout=b`, `?layout=c`

### Variant A: Minimal / Expand-on-Tap

```
┌────────────────────────┐
│ ── 6:30 AM ──────────  │  DAY PREP
│  💧  🧘  🚿            │  ← Icons only, compact row
│                        │
│ ── 8:00 AM ──────────  │  FIRST WIND ✨
│  📝  🧠  🚶  ✅ ✅      │  ← Icons + completion dots
│  📅 Team Standup 10:00 │
│                        │
│ ═══ NOW ═══════════    │  ← Current time marker
│                        │
│ ── 12:00 PM ─────────  │  ENERGY DIP
│  🥗                    │  ← Compact
│  📅 Lunch Mtg 1:00     │
│ ...                    │
└────────────────────────┘

  Tap a window section → it EXPANDS to show:
  ┌────────────────────────┐
  │ ── 8:00 AM ──────────  │  FIRST WIND ✨
  │                        │
  │  ┌──────────────────┐  │
  │  │ 📝 Journal    ✓  │  │  ← Full habit cards
  │  └──────────────────┘  │    with names, checkboxes
  │  ┌──────────────────┐  │
  │  │ 🧠 Meditate      │  │
  │  └──────────────────┘  │
  │  ┌──────────────────┐  │
  │  │ 🚶 Walk       ✓  │  │
  │  └──────────────────┘  │
  │                        │
  │  📅 Team Standup       │
  │     10:00 – 10:30      │
  │                        │
  └────────────────────────┘
```

- **Default:** Compact — icon row per window, minimal vertical space
- **Tap a window header** → expands to show full habit cards with names and checkboxes
- **Tap again** → collapses back to icons
- Think: accordion sections on a vertical timeline
- Best for: Users who want a glanceable overview and drill into the current window
- Risk: Important info hidden behind a tap

### Variant B: Time-Aware Focus (Recommended)

```
┌────────────────────────┐
│ ── 6:30 AM ──────────  │  DAY PREP
│  💧✓  🧘✓  🚿✓  3/3   │  ← Compressed: done ✓
│                        │
│ ── 8:00 AM ──────────  │  FIRST WIND ✨
│ ┌──────────────────────┤  ← EXPANDED (current window)
│ │                      │
│ │  ┌──────────────────┐│
│ │  │ 📝 Journal    ✓  ││  Full detail: cards,
│ │  └──────────────────┘│  names, checkboxes,
│ │  ┌──────────────────┐│  calendar events
│ │  │ 🧠 Meditate      ││
│ │  └──────────────────┘│
│ │  ┌──────────────────┐│
│ │  │ 🚶 Walk          ││
│ │  └──────────────────┘│
│ │                      │
│ │  📅 Team Standup     │
│ │     10:00 – 10:30    │
│ │                      │
│ └──────────────────────┤
│ ═══ NOW ═══════════    │
│                        │
│ ── 12:00 PM ─────────  │  ENERGY DIP
│  🥗  📅Lunch           │  ← Compressed: preview
│                        │
│ ── 2:00 PM ──────────  │  SECOND WIND
│  ☕  💪  📅Focus        │  ← Compressed: preview
│                        │
│ ── 6:00 PM ──────────  │  PRE-BED
│  📖  🙏  😴            │  ← Compressed: preview
└────────────────────────┘
```

- **Current energy window is EXPANDED** with full habit cards, names, checkboxes, and calendar events
- **Past windows are COMPRESSED** — show completion summary (icons + checkmarks + "3/3")
- **Future windows are COMPRESSED** — show habit icon preview + upcoming calendar events
- **As time progresses**, the expanded section shifts down the timeline automatically
- User can **manually tap any compressed section** to expand it (and collapse the current one)
- Best for: "What do I need to do RIGHT NOW?" focus
- Risk: Past/future sections might feel too compressed — user testing will tell us

### Variant C: Dual-Column Timeline

```
┌────────────────────────┐
│   HABITS    │ SCHEDULE  │
│─────────────┤──────────│
│ 6:30 AM     │          │
│ 💧 Hydrate  │          │
│ 🧘 Stretch  │          │
│ 🚿 Cold Shr │          │
│             │          │
│ 8:00 AM ✨   │          │
│ 📝 Journal  │          │
│ 🧠 Meditate │ 10:00    │
│ 🚶 Walk     │ Team     │
│             │ Standup  │
│ ═══ NOW ════│══════    │
│             │          │
│ 12:00 PM    │          │
│ 🥗 Lunch    │ 1:00     │
│             │ Lunch    │
│             │ Meeting  │
│ 2:00 PM     │          │
│ ☕ No Caffn  │ 3:30     │
│ 💪 Deep Work│ Focus    │
│             │ Time     │
│ 6:00 PM     │          │
│ 📖 Read     │          │
│ 🙏 Gratitude│          │
│ 😴 Sleep    │          │
└────────────────────────┘
```

- **Two columns sharing the same vertical time axis**
- **Left column:** Habits positioned at their time slots
- **Right column:** Calendar events positioned at their time slots
- **Both columns scroll together** — same timeline, two data sources
- **The energy curve runs along the left edge** behind the habits column, providing the visual energy shape
- Best for: Heavy calendar users who need both views side-by-side
- Risk: Screen density — might feel cramped on smaller phones. 390px is tight for two columns.

---

## The Energy Curve Rendering (Technical)

The energy curve is an SVG path that runs **vertically** along the left edge or behind the timeline content.

### SVG Orientation

```
SVG coordinate system:
  - X axis (left-right) = ENERGY LEVEL
    - Left (x=0) = low energy
    - Right (x=width) = high energy
  - Y axis (top-bottom) = TIME
    - Top (y=0) = wake time (6:30 AM)
    - Bottom (y=height) = bed time (10:30 PM)

The curve path moves DOWN the Y axis (through time),
bulging RIGHT during high-energy windows and
receding LEFT during low-energy windows.
```

### Visual Treatment

The curve is NOT a standalone chart. It's a **background element that shapes the feel of each section**:

- **Glow/color band** along the left edge that follows the curve's shape
- **Section backgrounds** tinted by the curve's energy level:
  - High energy zones → warmer, brighter background tint
  - Low energy zones → cooler, dimmer background tint
- **The curve itself can be subtle** — a soft gradient edge, not a hard line. The FEEL matters more than seeing a literal graph line.

### Per-Window Background Treatment

```css
/* Each energy window section gets its own background treatment */
.window-day-prep    { border-left: 3px solid rgba(255,255,255,0.15); }
.window-first-wind  { border-left: 3px solid #B58C1F; background: rgba(181,140,31,0.04); }
.window-energy-dip  { border-left: 3px solid rgba(255,255,255,0.1); }
.window-second-wind { border-left: 3px solid #DD3493; background: rgba(221,52,147,0.04); }
.window-pre-bed     { border-left: 3px solid #3399E6; background: rgba(51,153,230,0.04); }
```

This gives each section a distinct feel without needing a complex SVG overlay. The left border acts as the "curve" — thicker and brighter during peak energy, thinner and dimmer during dips.

**UNITY: straightforward** — In Unity, this maps to a `VerticalLayoutGroup` with per-section background Images and border sprites. No custom shaders needed.

---

## Habit Addition Flow

### Fast Path: Loadout Cards

- Swipeable cards (same pattern as breathing module selection screen)
- Each card represents a pre-built loadout ("Rise & Shine", "Peak Focus", "Easy Day")
- Card shows a **mini-preview of the vertical timeline** with habit icons positioned on it
- Tap to select → **cascade animation**: habits appear top-to-bottom along the timeline, each one fading in and sliding into its time position with a staggered delay
- This is the hero animation moment — spend time making this feel magical

### Custom Path: Hybrid (Template + Edit)

- Start by picking a loadout (cascade animation populates the timeline)
- Then customize from there:
  - **Tap "+" in an energy window zone** → bottom sheet slides up showing habits appropriate for that energy level
  - **Tap an existing habit on the timeline** → swap it for a different one
  - **Long-press a habit** → remove it (habit fades out with undo toast)
- Bottom sheet should filter habits by energy window context (morning-appropriate habits when tapping the morning zone)

### Empty State

- Clean timeline with window labels and time markers but no habits, soft prompt: "Pick a loadout to start your day"
- Loadout cards visible or one tap away

---

## Simplifications vs. Current App

| Current App | Prototype |
|---|---|
| 4-step difficulty selection (Easy/Medium/Performance/Difficult) | Swipeable loadout cards — one tap |
| 3 separate habit selection wizards (Morning → Midday → Unwind) | Single vertical timeline with tap-to-add in any zone |
| 2 separate lock-in gestures (loadout lock + daily lock) | One lock-in when selecting loadout; last habit auto-triggers celebration |
| Yesterday's loadout shown prominently | Hidden — swipe to access if needed |
| Sleep input blocks entire screen | Woven into morning flow: "Good morning — when did you wake up?" |
| 5 energy windows AND 3 progress circles (competing mental models) | Energy curve shapes the timeline itself; 3 compact summary badges in the header or top |
| Horizontal energy bar + separate habit list below | ONE vertical scrollable timeline — habits live on the curve |

---

## Core Screens / States

### 1. Morning Entry

- "Good morning" + quick sleep input (time slider or simple tap)
- Transitions into loadout selection

### 2. Loadout Selection

- Swipeable loadout cards over the empty timeline skeleton
- Each card previews its habit layout on a mini vertical timeline
- Select → cascade animation populates the timeline top-to-bottom
- Hold-to-confirm starts the day (one lock-in, not two)

### 3. Active Day (main screen)

- **Vertical scrollable timeline** with habits and calendar events at their time positions
- **Energy wave** shaping the left edge / background of each section
- **"Now" indicator** horizontal line at current time — timeline auto-scrolls here on load
- Tap habits to check them off
- Section completion animations (zone glow intensifies as habits are completed)
- Three layout variants (A, B, C) — all vertical, differ in density/focus

### 4. Habit Add/Edit (bottom sheet)

- Slides up when tapping "+" on a zone
- Filtered by energy window
- Tap to add → habit animates into its position on the timeline

### 5. Section Complete (Morning / Midday / Unwind Done)

When **all habits in an energy window are checked off**, that section celebrates:

```
┌────────────────────────────┐
│ ── 8:00 AM ──────────────  │  FIRST WIND
│                            │
│  ┌──────────────────────┐  │
│  │ 📝 Journal       ✓   │  │  All habits checked
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 🧠 Meditate      ✓   │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ 🚶 Walk           ✓   │  │
│  └──────────────────────┘  │
│                            │
│  ╔════════════════════════╗│
│  ║  ✨ Morning Complete    ║│  ← Section-complete banner
│  ║     3/3 · +30 XP       ║│    Slides in, pulses, fades
│  ╚════════════════════════╝│
│                            │
└────────────────────────────┘
```

**What happens:**
1. Last habit in the section is checked → short pause (200ms)
2. Section-complete banner slides up from the bottom of that window section
3. Banner shows: section name + habit count + XP earned for the section
4. The window's left-edge border/glow intensifies to full brightness (was building as habits were checked)
5. Subtle confetti within just that section (not full-screen — save that for lock-in)
6. Banner holds for 2s then fades to a compact "3/3 ✓" badge on the section header
7. Light haptic pulse

```javascript
// Section complete banner entrance
// UNITY: DOAnchorPosY from below + DOScale(1, 0.4f).SetEase(Ease.OutBack)
gsap.from(banner, { y: 30, scale: 0.9, opacity: 0, duration: 0.4, ease: 'back.out(1.4)' });

// Border glow intensifies
// UNITY: Image.DOColor(fullColor, 0.5f).SetEase(Ease.OutQuad)
gsap.to(sectionBorder, { borderColor: fullWindowColor, duration: 0.5, ease: 'power2.out' });
```

**Why this matters:** The current app has no celebration between individual habit completion and the end-of-day lock-in. Users finish Morning habits and get... nothing. That's a 6+ hour gap where the app doesn't reward them. Section-complete moments create **three dopamine hits per day** (Morning done, Midday done, Unwind done) instead of waiting for one lock-in at the end.

---

### 6. Lock-In Bridge (Critical — Fixes the Biggest Retention Gap)

> **Context:** In the current Unity app, 57% of users who build a loadout never lock in their day. The habit completion and lock-in feel like separate, disconnected actions. Users finish their habits and don't realize there's one more step — or don't feel motivated to take it.

After the **last Unwind habit is checked off** (all sections complete), the Lock-In Bridge appears:

```
┌────────────────────────────┐
│                            │
│  ── 6:00 PM ────────────   │  PRE-BED
│  📖 Read             ✓     │
│  🙏 Gratitude        ✓     │
│  😴 Sleep Prep       ✓     │
│                            │
│  ✨ Unwind Complete         │
│     3/3 · +30 XP           │
│                            │
│ ╔══════════════════════════╗│
│ ║                          ║│
│ ║   🔒 You crushed it.     ║│  ← Lock-In Bridge card
│ ║                          ║│
│ ║   15/15 habits done      ║│    Appears after all
│ ║   🔥 Day 15 streak       ║│    sections are complete
│ ║   +250 XP waiting        ║│
│ ║                          ║│
│ ║  ┌────────────────────┐  ║│
│ ║  │  HOLD TO LOCK IN   │  ║│  ← Hold-to-confirm button
│ ║  │  ▓▓▓▓▓▓▓▓▓░░░░░░░  │  ║│    Same mechanic as save
│ ║  └────────────────────┘  ║│
│ ║                          ║│
│ ╚══════════════════════════╝│
│                            │
└────────────────────────────┘
```

**Lock-In Bridge behavior:**

1. **Trigger:** All habits across all energy windows are complete (Morning + Midday + Unwind all show "✓")
2. **Entrance:** The Lock-In card slides up from the bottom of the timeline and scrolls into view automatically. Timeline scrolls so the card is centered on screen.
3. **Content:**
   - Summary: total habits completed / total
   - Current streak count with flame icon
   - XP reward preview ("+250 XP waiting")
   - Hold-to-confirm button (same interaction as save button — progress bar fills during hold)
4. **Hold-to-confirm:** 2-second hold. Progress bar fills left-to-right. Haptic feedback increases in frequency as bar fills (matches Pau's save button haptic spec).
5. **On lock-in:**
   - Card flashes white briefly
   - Full-screen confetti burst (not section-level — the BIG celebration)
   - XP orbs fly from the card to the XP counter in the header
   - Streak counter increments with pop animation
   - Toast: "Day 15 locked in! +250 XP"
   - Card transforms into a "Day Complete" summary

```javascript
// Lock-in card entrance (auto-scroll + slide in)
// UNITY: ScrollRect.DOVerticalNormalizedPos(0, 0.5f) + DOAnchorPosY
gsap.to(scrollContainer, { scrollTo: lockInCard, duration: 0.5, ease: 'power2.out' });
gsap.from(lockInCard, { y: 60, opacity: 0, duration: 0.5, ease: 'back.out(1.2)', delay: 0.3 });

// Hold progress fill
// UNITY: Image.DOFillAmount(1f, 2f).SetEase(Ease.Linear)
gsap.to(progressBar, { width: '100%', duration: 2, ease: 'none' });

// Lock-in celebration
// UNITY: SpawnEffect("Confetti") + DOScale(1.2f, 0.15f).SetLoops(2, LoopType.Yoyo)
spawnConfetti('full');
gsap.to(xpCounter, { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1 });
```

**Partial completion fallback:**

If the user hasn't completed all habits but it's past their bedtime:
- A softer version appears: "Lock in what you've done today?"
- Shows actual count: "12/15 habits · Still a great day"
- Same hold-to-confirm mechanic
- No streak bonus if below threshold (configurable — maybe 80%?)
- This prevents users from feeling like incomplete days are wasted

```
┌────────────────────────────┐
│ ╔══════════════════════════╗│
│ ║                          ║│
│ ║   Ready to wrap up?      ║│  ← Softer version
│ ║                          ║│
│ ║   12/15 habits done      ║│    Appears after bedtime
│ ║   Still a solid day.     ║│    or via manual trigger
│ ║   +150 XP                ║│
│ ║                          ║│
│ ║  ┌────────────────────┐  ║│
│ ║  │  HOLD TO LOCK IN   │  ║│
│ ║  └────────────────────┘  ║│
│ ║                          ║│
│ ╚══════════════════════════╝│
└────────────────────────────┘
```

**Why this is the single most important addition:** This bridges the gap between "I did my habits" and "I locked in my day." Right now that bridge doesn't exist in the current app — the lock-in is a separate action that users have to know about and remember. The Lock-In Bridge makes it impossible to miss: you finish your habits and the next step is right there, celebrating what you did and asking for one more tap.

### 7. Day Complete (Post Lock-In)

- Lock-in confirmed → card transforms into day summary
- Full-screen confetti + XP animation
- Streak counter updates
- Summary shows: habits completed, XP earned, streak count, section breakdown
- "See you tomorrow" or option to review the day

---

## Scroll Behavior

This is a scrollable timeline, so scroll behavior matters:

### Initial Load

- Timeline renders the full day (wake → sleep)
- **Auto-scrolls to center the "now" indicator** on screen
- Smooth scroll animation on load (0.5s, `power2.out`)

### Scroll Feel

- Native momentum scrolling (`-webkit-overflow-scrolling: touch`)
- Overscroll at top shows "earlier" (before wake time) — gentle bounce, nothing there
- Overscroll at bottom shows "after bedtime" — gentle bounce, nothing there
- Scroll position determines which energy window label is "active" in the header

### Scroll-Linked Effects

- **Header subtitle updates** as you scroll: shows the name of the energy window currently in view ("First Wind", "Energy Dip", etc.)
- **Left-edge glow color shifts** as you scroll through different energy windows
- **Past sections dim slightly** as you scroll past them (opacity 0.6 → 1.0 for current/future)

**UNITY: straightforward** — `ScrollRect` with content sizing. Scroll-linked effects via `onValueChanged` callback.

---

## Design System

Carry over from the breathing module prototype. Key tokens:

### Colors

```
--color-bg: #0a0a1a                        (near-black background)
--color-card-bg: rgba(255, 255, 255, 0.06) (glassmorphic card fill)
--color-card-border: rgba(255, 255, 255, 0.1)
--color-text-primary: #FFFFFF
--color-text-secondary: rgba(255, 255, 255, 0.6)
--color-text-muted: rgba(255, 255, 255, 0.35)
--color-accent: #52ACFF                    (primary CTA blue)
```

### Energy Window Colors (from existing app)

```
--color-day-prep: rgba(255, 255, 255, 0.15)   (muted, neutral)
--color-morning: #B58C1F                        (gold/amber — First Wind)
--color-dip: rgba(255, 255, 255, 0.1)          (dimmed — Energy Dip)
--color-midday: #DD3493                         (pink/magenta — Second Wind)
--color-unwind: #3399E6                         (blue — Pre-Bed)
```

### Typography

- Font: `Inter` (falls back to system fonts)
- Headings: 700 weight, negative letter-spacing
- Body: 400-500 weight
- Labels: 10-12px, positive letter-spacing, often uppercase
- Time labels on timeline: 11px, `tabular-nums`, muted color

### Habit Card Styling

```css
/* Individual habit item on the timeline */
.habit-card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.habit-card.completed {
    background: rgba(82, 172, 255, 0.08);
    border-color: rgba(82, 172, 255, 0.2);
}
```

### Calendar Event Styling

```css
/* Calendar event block on the timeline */
.calendar-event {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-left: 3px solid var(--color-accent);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13px;
}
```

### Animation Timing

| Animation | Duration | Easing | DOTween |
|---|---|---|---|
| Card entrance | 0.5s | back.out(1.2) | Ease.OutBack |
| Screen fade | 0.5s | power2.inOut | Ease.InOutQuad |
| Habit check | 0.3s | power2.out | Ease.OutQuad |
| Zone glow fill | 0.5s | power2.inOut | Ease.InOutQuad |
| Cascade (stagger) | 0.06s per item | back.out(1.2) | Ease.OutBack |
| Bottom sheet slide | 0.4s | power2.out | Ease.OutQuad |
| XP pulse | 0.2s yoyo ×2 | power2.out | Ease.OutQuad |
| Auto-scroll to now | 0.5s | power2.out | Ease.OutQuad |
| Window expand/collapse | 0.35s | power2.inOut | Ease.InOutQuad |
| Section-complete banner | 0.4s | back.out(1.4) | Ease.OutBack |
| Section-complete fade-out | 0.3s (after 2s hold) | power2.in | Ease.InQuad |
| Lock-in card entrance | 0.5s | back.out(1.2) | Ease.OutBack |
| Hold-to-lock-in fill | 2.0s | linear | Ease.Linear |
| Lock-in confetti burst | 1.5s | — | SpawnEffect |
| XP orb fly to counter | 0.6s | power2.in | Ease.InQuad |
| Streak counter pop | 0.3s yoyo | back.out(1.4) | Ease.OutBack |

---

## Unity Translation Guide

**Every visual effect must be tagged with its Unity feasibility.**

### Tags

- `UNITY: straightforward` — Maps directly to DOTween/standard Unity UI
- `UNITY-STRETCH` — Possible but needs custom shader or extra work. Always provide a simpler fallback.
- `UNITY-SKIP` — Web-only flourish, provide simpler fallback for Unity

### Key Mappings

| Prototype (Svelte + GSAP) | Unity Equivalent |
|---|---|
| Vertical scrollable div | `ScrollRect` with `VerticalLayoutGroup` |
| Svelte component (.svelte) | Panel Prefab |
| GSAP `gsap.to()` | DOTween `transform.DOScale()`, `image.DOColor()`, etc. |
| GSAP timeline | DOTween Sequence |
| Svelte store | GameManager state / DataConfig |
| CSS variable | Serialized field or ScriptableObject |
| Left-edge energy glow | `Image` with gradient sprite + `DOColor` per section |
| Section background tints | Per-section `Image` with alpha-tinted fill |
| SVG stroke-dashoffset | `Image.DOFillAmount()` |
| `backdrop-filter: blur()` | `UNITY-STRETCH` — needs blur shader. Fallback: solid dark card |
| `box-shadow` glow | `UNITY-STRETCH` — outer glow shader or sprite overlay |
| Bottom sheet slide | `DOAnchorPosY` (PopupAndDownAnimator pattern) |
| Hold-to-confirm | LongPress.cs (already in codebase) |
| Cascade stagger | `DOTween.Sequence` with `.SetDelay()` |
| Scroll-to-now | `ScrollRect.DOVerticalNormalizedPos()` |
| Scroll-linked effects | `ScrollRect.onValueChanged` callback |

### GSAP → DOTween Easing

| GSAP | DOTween |
|---|---|
| `power2.inOut` | `Ease.InOutQuad` |
| `power2.out` | `Ease.OutQuad` |
| `back.out(1.2)` | `Ease.OutBack` |
| `sine.inOut` | `Ease.InOutSine` |
| `none` | `Ease.Linear` |

### Code Comment Pattern

Every GSAP animation call should include a DOTween mapping comment:

```javascript
// UNITY: transform.DOScale(1.1f, 0.3f).SetEase(Ease.OutBack)
gsap.to(element, { scale: 1.1, duration: 0.3, ease: 'back.out(1.2)' });
```

For stretch goals:

```javascript
// UNITY-STRETCH: Requires BlurBehind shader. Fallback: solid dark card.
element.style.backdropFilter = 'blur(20px)';
```

---

## Tech Stack

- **Framework:** Svelte (SvelteKit optional — not required if routing is simple)
- **Animations:** GSAP 3.x (maps to DOTween)
- **Curve rendering:** CSS borders/gradients + SVG for any curve details (maps to Unity Image/sprites)
- **Deployment:** Vercel (same setup as breathing prototype)
- **Target viewport:** 390×844 (iPhone 14), responsive
- **No backend:** All data mocked. Loadout templates, habits, and calendar events are hardcoded JSON.

---

## Mock Data Needed

### Loadout Templates (3-4)

```
Rise & Shine: morning-heavy, light evening
Peak Focus: distributed throughout the day
Easy Day: minimal habits, recovery-focused
Night Owl: light morning, heavy afternoon/evening
```

### Habits (15-20 covering all windows)

```
Day Prep (6:30-8:00): Hydrate, Stretch, Cold Shower
First Wind (8:00-12:00): Journal, Meditate, Walk, Focus Block
Energy Dip (12:00-2:00): Healthy Lunch, Power Walk
Second Wind (2:00-6:00): No Caffeine, Stretch Break, Deep Work
Pre-Bed (6:00-10:30): No Screens, Read, Gratitude, Sleep Prep, Breathwork
```

### Calendar Events (3-4 sample)

```
10:00 AM - Team Standup (30 min)     → positioned at 10:00 on vertical timeline
1:00 PM  - Lunch Meeting (60 min)    → positioned at 1:00 on vertical timeline
3:30 PM  - Focus Time (90 min)       → positioned at 3:30 on vertical timeline
```

### User Profile (for personalization)

```
Wake time: 6:30 AM
Bedtime: 10:30 PM
Chronotype: Early Bird / Third Bird
Subscription: Pro
```

---

## What's Out of Scope

- Backend integration / real data
- Login / authentication
- Subscription management
- HealthKit / Health Connect integration
- Actual device calendar sync (mock only)
- Notification system
- Tutorial / onboarding flow (beyond the morning entry)
- Sound design (unless time permits)
- Drag-to-reorder habits (document the interaction point, don't build DnD)

---

## Deliverables

1. **Svelte component** in `src/screens/HabitsScreen.svelte` (inside the existing spir-app project)
2. **Three layout variants** (A, B, C) switchable via `?layout=a|b|c` URL parameter
3. **Full interactive flow**: morning entry → loadout selection → active day → habit checking → section celebrations → lock-in bridge → day complete
4. **Vertical scrollable timeline** — NOT a horizontal chart with a list below
5. **Section-complete celebrations** — banner + glow + compact badge when all habits in a window are done
6. **Lock-in bridge** — auto-appearing card after all sections complete, with hold-to-confirm, confetti, XP animation, and partial-completion fallback
7. **DOTween mapping comments** on every animation
8. **Auto-scroll to "now"** on load

---

## What Changed from v1

| v1 (original scope) | v2 / v3 (this document) |
|---|---|
| Ambiguous orientation ("spanning the screen", "left = morning, right = evening") | **Explicit vertical orientation** — time flows top to bottom, scroll down through your day |
| Habits described as "on the curve" but easily misread as "below the curve in a list" | **Habits are inline on the vertical timeline** at their time positions — ASCII diagrams make this unambiguous |
| Energy curve as an SVG chart element | **Energy curve as the visual backbone** — background tints, left-edge glow, section styling. It shapes the timeline, not decorates it. |
| No scroll behavior spec | **Full scroll spec** — auto-scroll to now, scroll-linked effects, momentum scrolling |
| iOS weather hourly forecast comparison (horizontal) | Removed. The mental model is a **vertical day planner shaped by your biology** |
| Three layout variants described in horizontal terms | **All three variants redesigned for vertical** with detailed ASCII mockups |
| No celebration between individual habits and end-of-day | **Section-complete moments** — banner + glow when Morning/Midday/Unwind are each finished (v3) |
| Lock-in was a separate, disconnected action (57% drop-off) | **Lock-in Bridge** — auto-appearing card after all habits complete, with hold-to-confirm and full celebration (v3) |
| No fallback for incomplete days | **Partial-completion lock-in** — softer CTA for days where not all habits are done (v3) |

---

## Success Criteria

The prototype is successful if:

- [ ] A Unity developer can look at any animation and know exactly how to implement it in DOTween
- [ ] Joe, Jay, and the team can test all three layout options on their phones and pick a winner
- [ ] The energy curve feels like the **shape of the timeline itself**, not a chart sitting above a list
- [ ] **Scrolling through your day feels natural** — like scrolling through a calendar, but one that breathes with your energy
- [ ] Adding habits to the timeline feels intuitive (both preset and manual)
- [ ] Calendar events coexist with habits without feeling cluttered
- [ ] The daily flow is noticeably simpler than the current app (fewer taps to first value)
- [ ] Nobody looks at it and says "we'll never build that in Unity"
- [ ] Opening the screen and seeing your day scroll to "now" gives you immediate context
- [ ] **Completing all Morning habits feels like a WIN** — not just "done checking boxes"
- [ ] **The path from last habit → lock-in is impossible to miss** — no user should finish their habits and not know what to do next
- [ ] **The lock-in celebration is the most satisfying moment in the app** — confetti, XP flying, streak incrementing

---

## Reference

- **Breathing module prototype:** `prototypes/breathing-module/index.html` (design system source)
- **Live breathing prototype:** https://prototypes-peach.vercel.app/breathing-module
- **Current Unity scripts:** `Assets/Scripts/HabbitPanel.cs`, `CheckInsPanel.cs`, `GameManager.cs`
- **Animation deliverables brief:** `Animation_Deliverables_For_Animator.md`
- **Master Overview:** `prototypes/MASTER_OVERVIEW.md`
- **CLAUDE.md:** Project context and tech stack
