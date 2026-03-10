# SPiR Health — Fasting Screen Prototype Scope

**For:** Antigravity (dev team)
**Purpose:** Interactive Svelte prototype of the redesigned Fasting experience
**Status:** Scoping — no code yet
**Date:** 2026-03-03
**Related:** `SCOPE_Navigation_Shell.md` (Fasting opens as a tool overlay via FAB or energy curve)

---

## Context

Fasting is one of SPiR's core wellness tools. In the current app it lives in `FastingPopup.cs` (~860 lines) and opens as a popup from the Focus Mode menu. The flow is functional but visually flat — a circular fill image that ticks up frame-by-frame, four scroll-wheel time pickers, and a weekly bar chart.

The animation brief already calls for **MUST 1.2: "Start Fasting — Heartbeat + Liquid Fill"** — a hero animation that makes starting a fast feel intentional and alive. The prototype is our chance to design what that actually looks like.

**How it's accessed in the new design:**
Fasting opens as a **full-screen tool overlay** (slides up over current screen, tab bar visible but greyed). Two entry points:
1. **FAB → "Start Fast"** — from any screen
2. **Tap fasting habit on energy curve → "Start Timer"** — contextual

---

## The Big Idea: The Fasting Ring

Like the breathing module has its breathing circle, fasting gets **the fasting ring** — a large, animated circular timer that dominates the screen and feels alive throughout your fast.

The current app's circular fill is just `fillImage.fillAmount` incrementing per frame. No animation, no life. The prototype should make this ring feel like the heartbeat of your fast:

- **Liquid-wave fill effect** — the fill edge undulates gently, like water rising in a glass
- **Color gradient** — shifts from warm amber (beginning) through gold to green (complete)
- **Subtle pulse** — a gentle heartbeat-like scale oscillation while fasting is active
- **Glow intensifies** — as progress increases, the ring glows brighter
- **Completion burst** — when the ring hits 100%, particle burst + confetti

---

## Simplified Setup Flow

The current app has a 4-wheel scroll picker for start time and another for end time. That's 8 scroll wheels to set up a fast. Most people fast on regular schedules.

### New Flow: 3 Taps to Start

**Step 1: "When did you stop eating?"**

Instead of "set a start time" with 4 scroll wheels, ask a simple question. Show two options:

| Option | What it does |
|---|---|
| **"Just now"** | Sets start time to current time. One tap. |
| **"Earlier today"** | Shows a simple clock face or hour slider. Tap the hour you stopped eating. Two taps max. |

**Step 2: "How long?"**

Preset cards (like breathing pattern cards) for common fasting windows:

| Card | Duration | Schedule | Description |
|---|---|---|---|
| **16:8** | 16 hours | Most popular | "The classic intermittent fast" |
| **18:6** | 18 hours | Moderate | "Extended fat-burning window" |
| **20:4** | 20 hours | Advanced | "Warrior fast" |
| **24hr** | 24 hours | One meal | "Full day reset" |
| **Custom** | User-set | Flexible | Opens a simple duration picker (hours slider) |

Each card shows:
- Duration prominently
- A mini-preview of what the ring will look like at 25%, 50%, 75% completion
- Estimated end time based on Step 1 answer
- One-line description

**Step 3: Start**

Hold-to-confirm button (same `LongPress` mechanic as the current app). The fasting ring initializes with the **Heartbeat + Liquid Fill** start animation.

**Total: 3 interactions** (when → how long → hold to start) vs the current 8+ scroll wheels.

### The Custom Option

For users who want precise control, "Custom" opens a simple duration slider (not 4 scroll wheels):
- Horizontal slider from 12h to 48h
- End time auto-calculates and displays
- Still just one interaction

---

## Screen States

### State 1: Not Fasting (Entry)

```
┌─────────────────────────────────┐
│  × Close                   XP   │
├─────────────────────────────────┤
│                                  │
│         Empty fasting ring       │
│         (subtle, dormant)        │
│         "Ready to fast?"         │
│                                  │
│  When did you stop eating?       │
│                                  │
│  ┌──────────┐  ┌──────────────┐ │
│  │ Just now  │  │ Earlier today│ │
│  └──────────┘  └──────────────┘ │
│                                  │
│  ─── This Week ───               │
│  ▮ ▮ ▮ ▮ ▮ ▮ ▮   (weekly bars)  │
│  S M T W T F S                   │
└─────────────────────────────────┘
```

- The ring is visible but dormant — thin stroke, low opacity, no fill
- Weekly chart shows fasting history at a glance
- Clean, minimal, inviting

### State 2: Choosing Duration

After tapping "Just now" or selecting a time:

```
┌─────────────────────────────────┐
│  ← Back                    XP   │
├─────────────────────────────────┤
│                                  │
│         Ring preview             │
│     (shows estimated end time)   │
│                                  │
│  Choose your fast:               │
│                                  │
│  ┌────────┐ ┌────────┐          │
│  │  16:8  │ │  18:6  │          │
│  │ 16 hrs │ │ 18 hrs │ ← cards  │
│  │ends 6am│ │ends 8am│          │
│  └────────┘ └────────┘          │
│  ┌────────┐ ┌────────┐          │
│  │  20:4  │ │  24hr  │          │
│  │ 20 hrs │ │ 24 hrs │          │
│  │ends10am│ │ends 2pm│          │
│  └────────┘ └────────┘          │
│                                  │
│  ┌────────────────────────────┐ │
│  │     Custom duration...     │ │
│  └────────────────────────────┘ │
│                                  │
│     ◉ Hold to Start Fast         │
└─────────────────────────────────┘
```

- Duration cards are glassmorphic (same card style as breathing module)
- Selected card highlights with accent glow
- Ring preview updates to show estimated end time
- Hold-to-confirm at the bottom

### State 3: Starting (Hero Animation)

The **Heartbeat + Liquid Fill** animation plays:

```
1. Ring pulses with a heartbeat rhythm (3 beats, accelerating)
   // UNITY: DOScale sequence with LoopType.Yoyo, accelerating interval

2. Liquid fill begins rising from bottom of the ring
   // UNITY-STRETCH: Shader-based liquid wave, or simpler DOFillAmount with particle overlay

3. Ring color transitions from empty (dim) to active (warm amber glow)
   // UNITY: Image.DOColor + outer glow sprite

4. Haptic sync: 3 pulses matching the heartbeat
   // UNITY: Vibration.cs calls synced to animation keyframes

5. Hold-to-confirm fill completes → ring is "alive"
```

Duration: ~2 seconds total. This animation only plays once, at the moment you commit.

### State 4: Actively Fasting

```
┌─────────────────────────────────┐
│  × Close                   XP   │
├─────────────────────────────────┤
│                                  │
│          ╭─────────╮             │
│         ╱    12:34   ╲           │  ← Large countdown HH:MM
│        │    ━━━━━━    │          │  ← "hours remaining"
│        │              │          │
│         ╲  ▂▃▅▇█▇▅▃▂ ╱          │  ← Liquid fill level (animated wave)
│          ╰─────────╯             │
│                                  │
│     Started: 2:00 PM today       │
│     Ending:  6:00 AM tomorrow    │
│                                  │
│  ┌───────────┐  ┌──────────────┐│
│  │ Stop Fast  │  │  Extend +4h  ││
│  └───────────┘  └──────────────┘│
│                                  │
│  ─── This Week ───               │
│  ▮ ▮ ▮ ▮ ▮ ▮ ▮                  │
│  S M T W T F S                   │
└─────────────────────────────────┘
```

**The ring while active:**
- Liquid-wave fill edge undulates gently (CSS or SVG animation looping)
- Fill level corresponds to progress (0% → 100%)
- Color gradient shifts: amber → gold → green as progress increases
- Subtle heartbeat-like scale pulse (very gentle, 0.98 → 1.02 scale, 3s cycle)
- Glow around the ring intensifies with progress
- Large countdown text in center: `HH:MM` primary, `SS` secondary/smaller

**The ring animations mapped:**
```javascript
// Liquid wave on fill edge (continuous loop)
// UNITY-STRETCH: Custom shader with animated UV offset. Fallback: DOFillAmount with particle overlay

// Heartbeat pulse (continuous loop while fasting)
// UNITY: transform.DOScale(1.02f, 1.5f).SetLoops(-1, LoopType.Yoyo).SetEase(Ease.InOutSine)
gsap.to(ring, {
  scale: 1.02,
  duration: 1.5,
  yoyo: true,
  repeat: -1,
  ease: 'sine.inOut'
});

// Color gradient shift (progresses with timer)
// UNITY: Image.DOColor(targetColor, 0.5f) triggered at progress milestones
// 0-33%: amber #FFB347
// 34-66%: gold #FFD700
// 67-99%: green-gold #B8E986
// 100%: bright green #00FA3A
```

**Extend Fasting:**
- Tap "Extend" → shows quick options: +2h, +4h, +6h
- Selecting one animates the ring — a brief "expansion" animation where the ring grows slightly and the fill target recalculates
- End time text updates

**Stop Fasting:**
- Tap "Stop" → confirmation: "End fast early? You've completed X hours."
- If confirmed, ring drains (reverse fill animation, 0.5s), fasting data saved for the partial fast

### State 5: Fasting Complete

```
┌─────────────────────────────────┐
│  × Close                   XP   │
├─────────────────────────────────┤
│                                  │
│     🎉 Confetti burst            │
│                                  │
│          ╭─────────╮             │
│         ╱   ✓ Done   ╲          │
│        │    16 Hours   │         │
│        │   Completed   │         │
│         ╲  █████████  ╱          │  ← Full ring, glowing green
│          ╰─────────╯             │
│                                  │
│       +100 XP earned 🎯          │
│                                  │
│  ┌────────────────────────────┐ │
│  │      Start Another Fast    │ │
│  └────────────────────────────┘ │
│                                  │
│  ─── This Week ───               │
│  ▮ ▮ ▮ ▮ ▮ ▮ ▮  (updated)       │
│  S M T W T F S                   │
└─────────────────────────────────┘
```

**Completion animation sequence:**
```javascript
// 1. Ring fill hits 100% — ring flashes bright
// UNITY: Image.DOColor(brightGreen, 0.2f) + DOScale(1.1f, 0.2f)
gsap.to(ring, { scale: 1.1, duration: 0.2, ease: 'power2.out' });

// 2. Confetti burst (from shell's confetti system)
// UNITY: GameManager.SpawnEffect(confettiBlue)
spawnConfetti('achievement');

// 3. Checkmark fades in at center
// UNITY: CanvasGroup.DOFade(1f, 0.3f) + DOScale from 0.5 → 1
gsap.fromTo(checkmark,
  { scale: 0.5, opacity: 0 },
  { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }
);

// 4. Duration text counts up from 0 → 16 (or actual hours)
// UNITY: DOTween.To(() => 0, x => text.text = x + " Hours", 16, 1f)
// Same count-up pattern as XP celebration in breathing module
gsap.to(counter, {
  value: completedHours,
  duration: 1,
  ease: 'power2.out',
  onUpdate: () => { text.textContent = Math.floor(counter.value) + ' Hours'; }
});

// 5. XP toast slides down
// Uses shell toast system: "+100 XP — Fasting Complete"

// 6. Weekly chart bar for today animates up to new height
gsap.to(todayBar, { height: newHeight, duration: 0.5, ease: 'power2.out' });
```

### State 6: Waiting (Scheduled Future Fast)

If the user set a start time in the future:

```
┌─────────────────────────────────┐
│  × Close                   XP   │
├─────────────────────────────────┤
│                                  │
│          ╭─────────╮             │
│         ╱  Starting  ╲          │
│        │   at 8:00 PM  │        │
│        │   in 2h 34m   │        │  ← Countdown to start
│         ╲             ╱          │
│          ╰─────────╯             │
│                                  │
│     16 hour fast                 │
│     Ending: Tomorrow 12:00 PM    │
│                                  │
│  ┌────────────────────────────┐ │
│  │        Cancel Fast         │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘
```

- Ring is visible but empty, with a gentle "breathing" animation (slow scale pulse)
- Countdown to start time shows in center
- When start time arrives → auto-triggers the Heartbeat + Liquid Fill animation and transitions to Active state

---

## Weekly Chart

A compact bar chart showing this week's fasting history.

### Visual
- 7 bars, one per day (Sun–Sat)
- Bar height represents hours fasted (0 = no bar, 24 = full height)
- Today's bar highlighted with accent color
- Day labels below each bar
- Current day bar animates on data change

### Colors
- Past days (completed): `rgba(255, 255, 255, 0.3)` with slight color tint based on hours
- Today: `--color-accent` (#52ACFF) or fasting amber (#FFB347)
- Future days: `rgba(255, 255, 255, 0.08)` (ghost bars)

### Design
```
Background: rgba(255, 255, 255, 0.04)
Border-radius: 16px
Padding: 16px
Height: ~120px total (bars + labels)
```

### Animation
```javascript
// Bars grow from bottom on screen entry
// UNITY: DOSizeDelta or DOAnchorPosY for each bar with stagger
bars.forEach((bar, i) => {
  gsap.fromTo(bar,
    { scaleY: 0 },
    { scaleY: 1, duration: 0.4, delay: i * 0.05, ease: 'power2.out', transformOrigin: 'bottom' }
  );
});
```

---

## Simplifications vs. Current App

| Current App | Prototype |
|---|---|
| 4-wheel scroll picker for start time (Date/Hour/Minute/AM-PM) | "Just now" one-tap OR "Earlier today" simple clock tap |
| 4-wheel scroll picker for manual end time | Duration preset cards (16:8, 18:6, 20:4, 24hr) OR simple hours slider |
| Manual end time costs XP (monetization gate) | All durations free in prototype (note XP gate for Unity implementation) |
| Static `fillImage.fillAmount` increment per frame | Liquid-wave fill with color gradient, heartbeat pulse, glow |
| No start animation | Heartbeat + Liquid Fill hero animation |
| Circular fill is just a UI Image | Living ring with wave, pulse, color shift, glow |
| `VerticalLayoutGroup` padding hacks to show/hide pickers | Clean screen state transitions (fade/slide) |
| "Waiting for 2:00 PM" static text | Countdown-to-start with breathing ring animation |

---

## Design System (Fasting-Specific Colors)

Extends the shared design system from the breathing prototype:

```
--color-fasting-start: #FFB347      (warm amber — beginning of fast)
--color-fasting-mid: #FFD700        (gold — middle of fast)
--color-fasting-late: #B8E986       (green-gold — approaching completion)
--color-fasting-complete: #00FA3A   (bright green — done)
--color-fasting-ring-bg: rgba(255, 179, 71, 0.1)   (subtle amber tint for empty ring)
--color-fasting-glow: rgba(255, 179, 71, 0.3)      (ring glow)
```

The fasting ring's color identity (amber → green) distinguishes it from the breathing circle (blue → green) while sharing the same design language.

---

## Connection to Energy Curve

When fasting is active, the fasting habit on the energy curve (Habits screen) should reflect this:

- Fasting habit icon shows a mini ring with current progress
- Tapping it shows: "✓ Complete" and "▶ View Timer" (opens fasting overlay)
- When fast completes, the habit auto-checks on the curve

This means the `HabitsScreen.svelte` needs to read fasting state from the shared store and reflect it. The fasting overlay and the energy curve habit are two views of the same data.

---

## Unity Translation Notes

| Prototype Component | Unity Approach | Difficulty |
|---|---|---|
| Liquid-wave fill edge | Custom shader with animated UV | `UNITY-STRETCH` — fallback: standard DOFillAmount with particle overlay |
| Color gradient shift | Image.DOColor at progress milestones | `UNITY: straightforward` |
| Heartbeat pulse (continuous) | DOScale with LoopType.Yoyo | `UNITY: straightforward` |
| Heartbeat start animation | DOTween Sequence (3 pulses) | `UNITY: straightforward` |
| Ring glow intensifying | Outer glow sprite with DOFade | `UNITY-STRETCH` — or adjust emission on material |
| Completion confetti | SpawnEffect(confettiBlue) | `UNITY: straightforward` |
| Hours count-up text | DOTween.To counter | `UNITY: straightforward` |
| Duration preset cards | Instantiated prefabs with DOScale entrance | `UNITY: straightforward` |
| Hold-to-confirm | LongPress.cs already exists | `UNITY: straightforward` |
| Weekly bar chart | BarChartFeedFasting already exists | `UNITY: straightforward` |
| Simple time input | Native time picker or simplified scroll | `UNITY: straightforward` |
| Extend +Xh animation | DOScale bump + recalculate | `UNITY: straightforward` |

The liquid wave is the only `UNITY-STRETCH` visual. Everything else maps directly. The fallback (DOFillAmount + a particle system at the fill edge) would still look great.

---

## Mock Data

### Active Fast (for demo)
```
Started: 2:00 PM today
Duration: 16 hours
Ending: 6:00 AM tomorrow
Elapsed: 4 hours
Remaining: 12 hours
Progress: 25%
```

### Weekly History
```
Sun: 0 hours
Mon: 16 hours
Tue: 18 hours
Wed: 0 hours
Thu: 16 hours (today, in progress)
Fri: 0 hours
Sat: 0 hours
```

### Preset Templates
```
16:8  → "The Classic" — 16 hours fasting, 8 hour eating window
18:6  → "Extended" — 18 hours fasting, 6 hour eating window
20:4  → "Warrior" — 20 hours fasting, 4 hour eating window
24hr  → "Full Reset" — 24 hour fast, one meal a day
```

---

## What's Out of Scope

- Backend persistence (timer uses in-memory state, not PlayerPrefs)
- XP cost for custom durations (document for Unity, don't implement in prototype)
- Subscription tier discounts
- HealthKit/Health Connect integration
- Push notifications for fast completion
- Actual device haptics (document sync points)

---

## Deliverables

1. **Fasting tool overlay** — opens from FAB or energy curve, slides up over current screen
2. **Simplified setup flow** — "when did you stop eating" → duration cards → hold to start
3. **Fasting ring** — liquid wave fill, color gradient, heartbeat pulse, glow
4. **Heartbeat + Liquid Fill start animation** — the hero moment
5. **Completion celebration** — confetti + count-up + XP toast
6. **Weekly bar chart** — animated, shows this week's fasting history
7. **All 6 screen states** — not fasting, choosing duration, starting animation, active, waiting, complete
8. **DOTween mapping comments** on every animation
9. **Fasting state reflected on energy curve** (habit icon shows mini progress)

---

## Success Criteria

- [ ] Starting a fast feels intentional and exciting (the heartbeat animation makes you FEEL the commitment)
- [ ] The fasting ring feels alive while active — not a static progress bar
- [ ] Setup takes 3 taps max, not 8 scroll wheels
- [ ] The completion moment feels like an achievement (confetti + count-up + XP)
- [ ] The color journey (amber → gold → green) subconsciously communicates progress without looking at numbers
- [ ] A Unity dev can look at the liquid wave and know the fallback: DOFillAmount + particle overlay
- [ ] Fasting state is visible on the energy curve — the tool isn't isolated from the daily flow

---

## Reference

- **Navigation Shell scope:** `prototypes/SCOPE_Navigation_Shell.md` (FAB access, overlay pattern)
- **Habits Screen scope:** `prototypes/SCOPE_Habits_Screen.md` (energy curve integration)
- **Animation brief:** `Animation_Deliverables_For_Animator.md` → MUST 1.2 (Heartbeat + Liquid Fill)
- **Current Unity script:** `Assets/Scripts/FastingPopup.cs` (~860 lines)
- **Current timer:** `Assets/Scripts/FocusModePanel.cs` (similar timer pattern)
- **Breathing prototype (design reference):** `prototypes/breathing-module/index.html`
