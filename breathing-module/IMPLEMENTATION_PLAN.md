# Breathing Module — Web Prototype Implementation Plan

## Purpose
Build a web-based prototype of SPiR Health's breathing module that mirrors the real Unity app experience. This prototype serves as:
1. A **design tool** for iterating on the breathing UI/UX with the animator (Pau) and dev team
2. A **living spec** — devs can reference it to match behavior exactly in Unity
3. A **testbed** for new breathing patterns, visuals, and animations before committing to Unity code

## Design Constraint: Unity-Translatable
Every visual and animation decision must map back to something implementable in Unity. This means:
- **Use GSAP** (GreenSock Animation Platform) as the animation library — it's the closest web equivalent to DOTween, with matching easing functions, timelines, and kill/reset behavior
- **Structure animations as named, reusable functions** — each maps to a DOTween call the devs can replicate
- **Use CSS variables for all design tokens** (colors, sizes, durations) — devs extract these into Unity serialized fields
- **Document the Unity equivalent** in code comments for every animation

### Animation Mapping Reference
| Web (GSAP) | Unity (DOTween) | Notes |
|------------|----------------|-------|
| `gsap.to(el, { scale: 4, duration: 4 })` | `transform.DOScale(4, 4f)` | Circle inhale |
| `gsap.to(el, { backgroundColor: '#52ACFF', duration: 1 })` | `image.DOColor(color, 1f)` | Phase color |
| `gsap.to(ring, { '--progress': 1, duration: 4 })` | `image.DOFillAmount(1, 4f)` | Ring fill |
| `gsap.to(el, { opacity: 0, duration: 0.5 })` | `canvasGroup.DOFade(0f, 0.5f)` | Panel transitions |
| `gsap.timeline()` | `DOTween.Sequence()` | Chained animations |
| `gsap.killTweensOf(el)` | `transform.DOKill()` | Cancel running anims |
| `ease: "back.out(1.7)"` | `Ease.OutBack` | Easing functions |
| `ease: "sine.inOut"` | `Ease.InOutSine` | Easing functions |

---

## What We're Replicating

### Current App Behavior (from BreathworkPanel.cs — 461 lines)

**Two screens:**
1. **Selection Screen** — Horizontal scroll/swipe to pick one of 4 breathing modes, with dot indicators
2. **Animation Screen** — Central breathing circle + progress rings + status text + XP tracking

**Four breathing patterns (all hardcoded):**

| Index | Name | Phases | Timings (seconds) | Progress Rings Used |
|-------|------|--------|-------------------|-------------------|
| 0 | 4-7-8 Breathing | Inhale → Hold → Exhale | 4 → 7 → 8 → 0 | 3 rings (no 4th) |
| 1 | Box Breathing | Inhale → Hold → Exhale → Hold | 4 → 4 → 4 → 4 | 4 rings |
| 2 | Huberman Physio-Sigh | Inhale → Hold → Inhale → Exhale | 1 → 1 → 3 → 7 | 4 rings |
| 3 | Resonant Breathing | Inhale → Exhale | 5 → 0 → 5 → 0 | 2 rings (no 2nd/4th) |

**Animation per phase:**
- Blue circle scales: **1× → 4×** on INHALE, **4× → 1×** on EXHALE, holds scale during HOLD
- Blue circle color transitions over 1s:
  - INHALE: `#52ACFF` (light blue)
  - HOLD: `#EFF7FF` (off-white)
  - EXHALE: `#00FA3A` (bright green)
- Progress ring fills from 0% → 100% over the phase duration
- Status text updates: "INHALE" / "HOLD" / "EXHALE"
- Cycle counter increments: "x1", "x2", "x3"...

**XP system:**
- XP bar fills 20% per cycle (resets every 5 cycles)
- Pro users: +20 XP per 5-cycle set
- Free users: +5 XP per 5-cycle set
- Premium breathing modes (0, 1, 2) cost XP to start; Resonant (3) is free

**Screen transitions:**
- Selection → Animation: `CanvasGroup.DOFade` 0.5s crossfade
- Animation → Selection: Same fade, resets all animation state

---

## Tech Stack

```
HTML + CSS + vanilla JS + GSAP
```

- **GSAP** (via CDN) — Animation engine (DOTween equivalent)
- **No framework** — Keep it simple, portable, zero build step
- **Single HTML file** — Easy to share via URL, open locally, or deploy
- **Mobile-first** — Design for 390×844 viewport (iPhone 14 size), since SPiR is a mobile app
- **Touch events** — Swipe to select breathing mode (mirrors the Unity scrollbar)

---

## File Structure

```
prototypes/breathing-module/
├── IMPLEMENTATION_PLAN.md    ← This file
├── index.html                ← Single-file prototype (HTML + CSS + JS)
├── CLAUDE.md                 ← Context file for AI tools working on this prototype
└── assets/                   ← Any images, icons, sounds
    └── (added as needed)
```

---

## Implementation Steps

### Step 1: Mobile Shell + Layout
Create the mobile viewport container (390×844) centered on desktop, with:
- Dark background matching SPiR app theme
- Safe area padding (top/bottom)
- Back button header
- Content area that switches between Selection and Animation views

**Unity equivalent:** This maps to the BreathworkPanel prefab with `breathSelection` and `breathAnimation` GameObjects toggled via SetActive + CanvasGroup fade.

### Step 2: Selection Screen
- Horizontal swipeable carousel with 4 breathing mode cards
- Each card shows: mode name, timing pattern, brief description
- Dot indicator below (4 dots, active dot highlighted)
- "Start" button at bottom

**Unity equivalent:** `breathSelectionScrollbar` (Scrollbar component) + `breathModeDots` (4 GameObjects toggled) + scrollbar value thresholds at 0.25/0.5/0.75.

**Swipe behavior:** Map touch drag to scrollbar value ranges:
- 0–0.25: 4-7-8
- 0.25–0.5: Box
- 0.5–0.75: Huberman
- 0.75–1.0: Resonant

### Step 3: Breathing Animation Screen — Circle
The central visual element:
- Circle starts at base size (1×), white
- On INHALE: scales to 4× over phase duration, transitions to `#52ACFF`
- On HOLD: maintains scale, transitions to `#EFF7FF`
- On EXHALE: scales back to 1×, transitions to `#00FA3A`

```js
// Example GSAP — mirrors Unity's UpdateStatus coroutine
function animatePhase(phase, duration, color, scaleTarget) {
  // Unity: blueCircle.transform.DOScale(scaleTarget, duration)
  gsap.to(circle, { scale: scaleTarget, duration: duration });

  // Unity: blueCircle.GetComponent<Image>().DOColor(color, 1f)
  gsap.to(circle, { backgroundColor: color, duration: 1 });

  // Unity: Status_Text.text = phase
  statusText.textContent = phase;
}
```

### Step 4: Progress Rings
- 4 SVG circles (using stroke-dashoffset for fill animation)
- Each ring fills from 0% → 100% over its phase duration
- Rings reset to 0% at the start of each cycle
- Hide unused rings per pattern (e.g., 4-7-8 only shows 3)

```js
// Unity: progressImages[index].DOFillAmount(1, duration)
gsap.to(ring, {
  strokeDashoffset: 0,  // 0 = fully filled
  duration: duration
});
```

### Step 5: Cycle Counter + XP Bar
- Counter text: "x1", "x2", "x3"... increments after each full cycle
- XP bar: horizontal fill, increments 20% per cycle, resets at 5
- XP text: "+5xp" or "+20xp"

### Step 6: Play/Pause/End Controls
- Play button starts the breathing loop
- Tapping again pauses and resets (matches Unity behavior — `resetAnim()` kills all tweens)
- Back button ends session, fades back to selection screen

### Step 7: Breathing Engine (Core Loop)
The heart of the prototype. Manages the async breathing cycle:

```js
// Mirrors RunBreathingCycle coroutine from Unity
async function runBreathingCycle(inhale, hold1, exhale, hold2) {
  resetProgress();
  await animatePhase('INHALE', inhale, '#52ACFF', 4);
  await animatePhase('HOLD', hold1, '#EFF7FF', null);  // null = maintain scale
  await animatePhase('EXHALE', exhale, '#00FA3A', 1);
  await animatePhase('HOLD', hold2, '#EFF7FF', null);
  incrementCycle();
}

// Huberman has a special pattern (double inhale)
async function runHubermanCycle() {
  resetProgress();
  await animatePhase('INHALE', 1, '#52ACFF', 4);
  await animatePhase('HOLD', 1, '#EFF7FF', null);
  await animatePhase('INHALE', 3, '#52ACFF', 4);
  await animatePhase('EXHALE', 7, '#00FA3A', 1);
  incrementCycle();
}
```

### Step 8: Screen Transitions
- Selection → Animation: Crossfade (opacity 0→1 / 1→0, 0.5s)
- Animation → Selection: Reverse + reset all state

```js
// Unity: breathSelection.GetComponent<CanvasGroup>().DOFade(0f, 0.5f)
gsap.to(selectionScreen, { opacity: 0, duration: 0.5 });
gsap.to(animationScreen, { opacity: 1, duration: 0.5 });
```

### Step 9: Haptic Placeholder
Add `navigator.vibrate()` calls at phase transitions as a placeholder:
- INHALE start: short pulse (50ms)
- EXHALE start: short pulse (50ms)
- Cycle complete: double pulse (50ms, 50ms gap, 50ms)

This maps to Unity's `Vibration.cs` calls. Won't work on iOS Safari but works on Android Chrome.

### Step 10: Sound Integration
Add audio support for breathing cues:
- Placeholder audio hooks (play/pause/stop functions)
- Volume control
- Sync points documented for each phase transition

---

## Design Tokens (CSS Variables)

Extract these so the devs can map them directly to Unity serialized fields:

```css
:root {
  /* Colors — from BreathworkPanel.cs */
  --color-inhale: #52ACFF;       /* Light blue */
  --color-hold: #EFF7FF;         /* Off-white */
  --color-exhale: #00FA3A;       /* Bright green */
  --color-circle-default: #FFFFFF;

  /* Sizing */
  --circle-base-scale: 1;
  --circle-max-scale: 4;

  /* Timing */
  --transition-fade: 0.5s;       /* Panel crossfade */
  --color-transition: 1s;        /* Circle color change */

  /* XP */
  --xp-per-set-free: 5;
  --xp-per-set-pro: 20;
  --cycles-per-set: 5;
}
```

---

## What This Prototype Does NOT Include
- Backend API calls (XP deduction, feature costs)
- Subscription gating (BuySubscriptionPopup)
- Music panel integration
- Actual XP persistence
- HealthKit/device integrations

These are app-logic concerns, not visual/animation concerns. The prototype focuses purely on the breathing experience.

---

## Enhancement Opportunities (Why We're Prototyping)

These are the improvements to explore once the base prototype matches the current app:

1. **Richer circle visuals** — Gradient fills, glow effects, ripple rings instead of flat color
2. **Particle effects** — Ambient floating particles that respond to breathing phase
3. **Smoother transitions** — Ease curves on the circle scale (currently linear in Unity)
4. **Guided audio cues** — Subtle tones synced to inhale/exhale
5. **Breathing pattern visualization** — Show the full pattern timing as a visual diagram
6. **Customizable timings** — Let users adjust inhale/hold/exhale durations
7. **Session summary** — Show stats after ending (total cycles, time, XP earned)
8. **New patterns** — Wim Hof, alternate nostril, etc.
9. **Visual themes** — Jay mentioned studying "Open" (cool diagrams) and "Five Point Five" (premium feel) breathing apps

---

## Reference Apps (from Jay)
- **Open** — Known for cool diagrams/visualizations in their breathing UI
- **Five Point Five** — Known for premium feel

Research these for visual inspiration before finalizing the enhanced design.
