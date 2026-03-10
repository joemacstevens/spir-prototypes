# SPiR Health — Navigation Shell Prototype Scope

**For:** Antigravity (dev team)
**Purpose:** The architectural frame that all prototype screens live inside
**Status:** Scoping — no code yet
**Date:** 2026-03-03 (updated 2026-03-04)
**Related:** `SCOPE_Habits_Screen.md` (v2), `SCOPE_Home_Screen.md`

---

## What This Is

The navigation shell is NOT a screen — it's the skeleton. Every screen in the prototype sits inside this frame. It handles:
- Bottom tab bar
- Screen switching with transitions
- The FAB (Floating Action Button) for quick-access tools
- Popup/modal overlays
- Shared header elements
- Badge indicators
- XP display

**Build this first.** The Habits screen, Home screen, and every future screen plug into this shell.

---

## Tab Bar

### Layout

A bottom tab bar with a smooth sliding indicator. The number of tabs depends on which Home Screen direction is active:

**Direction 1 (Separate Home + Habits):**

| Position | Tab | Icon | Destination |
|---|---|---|---|
| 1 | Home | Dashboard icon | Home Screen (progress rings, radar chart) |
| 2 | Habits | Checkmark/curve icon | Energy Curve (daily habits + calendar events) |
| 3 | History | Calendar icon | Monthly history view (look back at past days) |
| 4 | Profile | Person icon | Stats, streaks, achievements |

**Direction 2 (Merged Home/Habits):**

| Position | Tab | Icon | Destination |
|---|---|---|---|
| 1 | Today | Curve/sun icon | Energy Curve with compact rings (daily habits + calendar events) |
| 2 | History | Calendar icon | Monthly history view (look back at past days) |
| 3 | Breathing | Lungs/wind icon | Breathing module |
| 4 | Profile | Person icon | Stats, streaks, radar chart, flow state |

> **Note on Calendar Events:** Daily calendar events (meetings, appointments) live **on the energy timeline** in the Habits/Today screen — inline at their time position, mixed with habits. See `SCOPE_Habits_Screen.md` (v2). The History tab is for looking BACK at completed days, NOT for viewing today's schedule.

Both configurations should be switchable via a settings toggle or route parameter so the team can test.

### Visual Design

```
Background: rgba(255, 255, 255, 0.04)
Border-top: 1px solid rgba(255, 255, 255, 0.08)
Backdrop-filter: blur(20px)
Height: 84px (includes safe area bottom padding)
Content height: 50px (icons + labels)
Safe area padding: var(--safe-area-bottom) — 34px on iPhone
```

- Tab icons: 24px, `rgba(255, 255, 255, 0.4)` inactive, `#FFFFFF` active
- Tab labels: 10px, same opacity rules as icons
- Selection indicator: a small pill/bar below the active icon that slides between tabs

### Selection Indicator Animation
```javascript
// UNITY: bar.transform.DOMove(points[index].position, 0.4f).SetEase(Ease.OutQuad)
gsap.to(indicator, {
  x: targetTabPosition,
  duration: 0.4,
  ease: 'power2.out'
});
```

### Badge Indicators

**Profile tab — streak badge:**
- Small red dot with count (e.g., "3") when unclaimed streaks exist
- Position: top-right of Profile icon
- `UNITY: DataConfig.unclaimedProfileStreaksCount > 0`

**Habits tab — incomplete loadout warning:**
- Exclamation mark icon when daily loadout not yet built
- Disappears once loadout is locked
- `UNITY: DataConfig.isLoadoutLock == false`

---

## FAB (Floating Action Button) — Quick Access Tools

The FAB replaces the current Focus Mode popup menu. It provides fast access to tools from ANY screen without leaving context.

### Position
- Bottom-right corner, above the tab bar
- 56px diameter circle
- Offset: 20px from right edge, 12px above tab bar

### Visual (Collapsed)
```
Background: linear-gradient(135deg, #52ACFF, #3d8be0)
Border-radius: 50%
Box-shadow: 0 4px 20px rgba(82, 172, 255, 0.3)
Icon: "+" or lightning bolt, white, 24px
```

### Tap → Expand

When tapped, the FAB expands into a small menu of quick actions. Options fan out upward from the FAB position.

**Quick Action Items:**

| Action | Icon | What it does |
|---|---|---|
| **Start Fast** | Timer/clock icon | Opens Fasting timer overlay |
| **Log Water** | Droplet icon | Instantly logs +500ml, plays bubble animation, shows "+500ml" toast |
| **Breathwork** | Lungs/wind icon | Opens Breathing module |
| **Focus Timer** | Stopwatch icon | Starts a focus session timer |

### Expand Animation
```javascript
// Each action button fans out upward from FAB position with stagger
// UNITY: DOAnchorPos for each button + DOScale from 0 → 1
actions.forEach((action, i) => {
  gsap.fromTo(action,
    { scale: 0, y: 0, opacity: 0 },
    {
      scale: 1,
      y: -(70 * (i + 1)),  // Stack upward, 70px apart
      opacity: 1,
      duration: 0.3,
      delay: i * 0.05,      // 50ms stagger
      ease: 'back.out(1.4)'
    }
  );
});

// FAB icon rotates to "×" (close)
// UNITY: DOLocalRotate(45°, 0.3f)
gsap.to(fabIcon, { rotation: 45, duration: 0.3, ease: 'power2.out' });
```

### Collapse
- Tap FAB again or tap outside → reverse animation
- No auto-collapse timer (unlike current app's 3-second timeout)
- Collapsed state shows the "+" icon again

### Scrim/Overlay
- When FAB is expanded, a subtle dark scrim (`rgba(0, 0, 0, 0.3)`) covers the screen behind the menu
- Tapping the scrim dismisses the menu
- The scrim fades in/out over 0.2s

### Water Logging (Instant Action)
Water logging is special — it doesn't open a screen. It's a one-tap action:
1. Tap FAB → tap "Log Water"
2. FAB collapses
3. Bubble animation plays from the FAB position
4. Toast appears: "+500ml 💧" (2 seconds)
5. XP awarded: "+5 XP" toast
6. No screen navigation — user stays where they are

```javascript
// UNITY: GameManager.SpawnEffect(bubbleWater, 1, -0.5f)
// Bubble particles rise from FAB button position
gsap.to(bubbles, { y: -200, opacity: 0, duration: 1.5, stagger: 0.1 });
```

### FAB on the Habits Screen
When viewing the energy curve (Habits screen), the FAB shares space with the energy curve's contextual actions. Both paths work:
- **FAB → Start Fast** = opens fasting timer
- **Tap fasting habit on energy curve → "Start Timer"** = opens same fasting timer

The energy curve contextual actions are documented in `SCOPE_Habits_Screen.md`. The FAB is the universal path; the curve is the contextual path. Same destination, two entry points.

---

## Contextual Actions on the Energy Curve

When a habit on the energy curve has an associated tool (Fasting, Breathwork, Focus), tapping it should offer both:
1. **Check off** — mark the habit complete
2. **Launch tool** — start the associated timer/session

### Implementation
When user taps a tool-linked habit on the curve:
- A small contextual menu appears near the habit (not a full bottom sheet)
- Two options: "✓ Complete" and "▶ Start [Tool Name]"
- Tapping "Start" launches the same overlay that the FAB would
- Tapping "Complete" checks it off normally

### Which habits are tool-linked?
| Habit | Tool | Action |
|---|---|---|
| Any fasting-related habit | Fasting Timer | Opens fasting timer overlay |
| Breathwork / Meditate | Breathing Module | Opens breathing selection |
| Focus Block / Deep Work | Focus Timer | Starts focus session |
| Hydrate | Water Logger | Instant +500ml log (no menu needed, just tap) |

---

## History Tab — Monthly Look-Back

The History tab is NOT for viewing today's schedule (that's on the energy timeline). It's for **looking back** at how past days went.

### What It Shows

```
┌──────────────────────────┐
│  ← March 2026 →          │  ← Month navigation
├──────────────────────────┤
│  S   M   T   W   T   F  S│
│                     1   2 │
│  3  [4]  5   6   7   8  9│  ← [4] = today, highlighted
│  ●   ●   ●   ◐   ○      │  ← Completion dots under dates
│ 10  11  12  13  14  15 16│     ● = all done, ◐ = partial, ○ = skipped
│ ...                       │
├──────────────────────────┤
│  This month:              │
│  ██████████░░░  18/22 ✓  │  ← Days with all habits done
│  🔥 Current streak: 4    │
│  ⭐ Best streak: 12      │
│  📊 Avg completion: 84%  │
├──────────────────────────┤
│  Tap a past date to see   │
│  what that day looked like│
│  (its energy timeline)    │
└──────────────────────────┘
```

### Key Features

1. **Month grid** — each date has a completion indicator (filled dot = all habits done, half = partial, empty = missed)
2. **Monthly stats** — completion rate, streak info, best day
3. **Tap a past date** → shows a read-only view of that day's energy timeline (what was completed, what was missed)
4. **Simple and minimal** — this is not a daily planner. No event creation. No habit editing. Just reflection.

### Why This Exists

The daily calendar events live on the energy timeline (Habits screen). But users still want to see: "How have I been doing this month? How long is my streak? Which days did I miss?" The History tab answers those at-a-glance questions.

### Unity Mapping

- `CalenderBtnManager.cs` already handles calendar checkbox rendering in the current app
- Completion dots → `Image.DOFillAmount()` or simple sprite swap
- Monthly stats → `TMP_Text` with count-up animation
- `UNITY: straightforward` — all standard UI elements

---

## Screen Transitions

The current app uses instant show/hide (SetActive). The prototype should feel smoother.

### Tab-to-Tab Transitions
```javascript
// Outgoing screen fades out while incoming fades in (crossfade)
// UNITY: CanvasGroup.DOFade() on both panels

// Outgoing
gsap.to(currentScreen, { opacity: 0, duration: 0.25, ease: 'power2.in' });

// Incoming (slight delay so it doesn't fight)
gsap.fromTo(nextScreen,
  { opacity: 0 },
  { opacity: 1, duration: 0.3, delay: 0.1, ease: 'power2.out' }
);
```
Total transition: ~0.35s. Fast enough to feel snappy, smooth enough to feel polished.

### Popup/Modal Overlays
Standard pattern for all popups (Fasting timer, XP notification, etc.):

**Entrance:**
```javascript
// UNITY: transform.DOScale(Vector3.one, 0.4f).SetEase(Ease.OutBack)
gsap.fromTo(popup,
  { scale: 0.8, opacity: 0 },
  { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.4)' }
);

// Scrim behind popup
gsap.to(scrim, { opacity: 1, duration: 0.25 });
```

**Exit:**
```javascript
// UNITY: transform.DOScale(Vector3.zero, 0.3f).SetEase(Ease.InBack)
gsap.to(popup, { scale: 0.8, opacity: 0, duration: 0.3, ease: 'power2.in' });
gsap.to(scrim, { opacity: 0, duration: 0.2 });
```

### Bottom Sheet (Habit Picker, etc.)
```javascript
// UNITY: RectTransform.DOAnchorPosY(0, 0.4f).SetEase(Ease.OutQuad)
gsap.fromTo(sheet,
  { y: '100%' },
  { y: 0, duration: 0.4, ease: 'power2.out' }
);
```
- Draggable to dismiss (swipe down)
- Scrim behind

### Full-Screen Tool Overlay (Fasting Timer, Breathwork)
These tools open as full-screen overlays ON TOP of the tab bar — not as tab navigation. This way the user stays in context and can dismiss to return exactly where they were.

```javascript
// Slide up from bottom, covering the screen content but keeping tab bar visible
// UNITY: RectTransform.DOAnchorPosY(0, 0.5f).SetEase(Ease.OutQuad)
gsap.fromTo(toolScreen,
  { y: '100%' },
  { y: 0, duration: 0.5, ease: 'power2.out' }
);
```

- "×" close button in top-left to dismiss
- Swipe down to dismiss
- Tab bar stays visible underneath (greyed out / non-interactive while tool is open)

---

## Shared Header

A minimal status area at the top of every screen.

### Visual
```
Height: var(--safe-area-top) + 44px
Background: transparent (content scrolls behind it)
```

### Contents (varies by screen)
| Screen | Left | Center | Right |
|---|---|---|---|
| Home (D1) | Date ("Wed, Mar 3") | — | XP counter |
| Habits/Today | Date | — | XP counter |
| History | "History" title | Month/Year | — |
| Profile | "Profile" title | — | Settings gear |
| Breathing | "←" back | "Breathwork" | — |
| Fasting (overlay) | "×" close | "Fasting" | — |

### XP Counter
- Persistent display of total XP in the header area
- Format: "2,450 XP" with a small star/bolt icon
- Pulses briefly when XP is earned
- `UNITY: TMP_Text totalXPText in FooterMenu`

```javascript
// XP earn pulse
// UNITY: DOScale(1.2f, 0.15f).SetLoops(2, LoopType.Yoyo)
gsap.to(xpCounter, { scale: 1.15, duration: 0.15, yoyo: true, repeat: 1 });
```

---

## Toast / Notification System

Floating notifications for transient feedback (XP earned, water logged, etc.).

### Visual
```
Position: top of screen, below safe area
Background: rgba(255, 255, 255, 0.1)
Border: 1px solid rgba(255, 255, 255, 0.15)
Border-radius: 12px
Backdrop-filter: blur(10px)
Padding: 12px 20px
```

### Content
- Icon (left) + message text (right)
- Examples: "🎯 +5 XP — Hydration added", "💧 +500ml logged", "🔥 3-Day Streak!"

### Animation
```javascript
// Slide down from top, pause, slide back up
// UNITY: DOAnchorPosY sequence

// Enter
gsap.fromTo(toast,
  { y: -80, opacity: 0 },
  { y: 20, opacity: 1, duration: 0.4, ease: 'back.out(1.2)' }
);

// Hold for 2.5 seconds, then exit
gsap.to(toast, {
  y: -80, opacity: 0, duration: 0.3, ease: 'power2.in', delay: 2.5
});
```

### Stacking
Multiple toasts stack downward with 8px gap. Oldest dismissed first.

---

## Celebration System

Confetti and effects that play over the entire shell (not inside a specific screen).

### Confetti Particles
The prototype should have a confetti component that can be triggered from anywhere:
```javascript
// UNITY: GameManager.SpawnEffect(confettiBlue, 1, 2)
function spawnConfetti(type = 'default') {
  // Canvas-based particle burst from top of screen
  // Particles: small colored rectangles
  // Colors based on type:
  //   'default': blue + white
  //   'achievement': rainbow
  //   'streak': gold + amber
  // Duration: 2 seconds, gravity pulls particles down
  // 30-50 particles per burst
}
```

### Confetti Triggers
| Event | Confetti Type |
|---|---|
| Habit checked off | None (just checkmark animation) |
| All habits in a zone completed | Subtle sparkle on that zone |
| Daily lock-in (all habits done) | Full rainbow confetti burst |
| Streak milestone | Gold confetti burst |
| XP milestone | Blue confetti burst |

---

## Putting It All Together — App Structure

```
┌─────────────────────────────┐
│       Shared Header         │  ← Date, XP counter
│  (transparent, floats over) │
├─────────────────────────────┤
│                             │
│                             │
│     Active Screen           │  ← Home, Habits, History, Profile
│     (swappable content)     │     or Breathing module
│                             │
│                             │
│                             │
│                         ○   │  ← FAB (floating, bottom-right)
├─────────────────────────────┤
│  Tab Bar (fixed bottom)     │  ← 4 tabs + sliding indicator
│ ▣ Home  ☑ Habits  📅 History 👤│
└─────────────────────────────┘

Tool overlays (Fasting, Breathing) slide up OVER the screen content
Popups (XP, celebrations) scale in OVER everything
Toasts slide down FROM the top
Confetti bursts ABOVE everything
```

### Z-Index Layer Order (bottom to top)
1. Active screen content
2. Tab bar (always visible)
3. FAB button (always visible, above tab bar)
4. Tool overlay (slides up, covers screen + FAB, tab bar greyed)
5. Bottom sheet (habit picker, etc.)
6. Scrim (behind popups/sheets)
7. Popup modals (scale in)
8. Toast notifications
9. Confetti particles (absolute top layer)

---

## Route Structure

```
/app                        → Shell with default tab active
/app/home                   → Home tab (Direction 1 only)
/app/habits                 → Habits/Today tab
/app/history                → History tab (monthly look-back)
/app/profile                → Profile tab
/app/breathing              → Breathing module (tab in D2, overlay in D1)

Settings toggle:
?direction=1                → Separate Home + Habits (5-tab)
?direction=2                → Merged Home/Habits (4-tab)
?layout=a|b|c               → Energy curve layout variant (from Habits scope)
```

All routes share the same shell (tab bar, FAB, header, toast system, confetti system).

---

## Svelte Component Architecture

```
src/
├── App.svelte                    ← Root: shell + router
├── lib/
│   ├── Shell.svelte              ← Tab bar + FAB + header + toast + confetti
│   ├── TabBar.svelte             ← Bottom navigation
│   ├── FAB.svelte                ← Floating Action Button + expand menu
│   ├── Header.svelte             ← Top bar (date, XP, back buttons)
│   ├── Toast.svelte              ← Notification toasts
│   ├── Confetti.svelte           ← Particle celebration system
│   ├── Popup.svelte              ← Reusable popup/modal wrapper
│   ├── BottomSheet.svelte        ← Reusable bottom sheet wrapper
│   ├── ProgressRing.svelte       ← Shared ring component (hero + compact)
│   └── stores/
│       ├── navigation.js         ← Active tab, route state
│       ├── user.js               ← Mock user data (wake time, chronotype, XP)
│       ├── habits.js             ← Mock habits, loadouts, completion state
│       └── metrics.js            ← Mock steps, fasting, sleep, radar data
├── screens/
│   ├── HomeScreen.svelte         ← Direction 1 home dashboard
│   ├── HabitsScreen.svelte       ← Energy curve + habits
│   ├── HistoryScreen.svelte      ← Monthly look-back (completed days, streaks over time)
│   ├── ProfileScreen.svelte      ← Stats + streaks (stub)
│   └── BreathingScreen.svelte    ← Port of existing breathing prototype
├── tools/
│   ├── FastingTool.svelte        ← Timer overlay
│   ├── FocusTimer.svelte         ← Focus session overlay
│   └── WaterLogger.js            ← Instant action (no screen, just animation + toast)
└── data/
    ├── loadouts.json             ← Mock loadout templates
    ├── habits.json               ← Mock habit definitions
    └── calendar.json             ← Mock calendar events
```

### Component Naming Convention
Svelte components are named to mirror Unity panel names where possible:
- `HabitsScreen.svelte` → `HabbitPanel.cs`
- `HomeScreen.svelte` → `HomeScreenPanel.cs`
- `HistoryScreen.svelte` → `CalenderBtnManager.cs`
- `ProfileScreen.svelte` → `ProfilePanel.cs`
- `FastingTool.svelte` → `FastingPopup.cs`
- `BreathingScreen.svelte` → `BreathworkPanel.cs`
- `Popup.svelte` → `PopupAndDownAnimator.cs`

---

## Unity Translation Notes

| Prototype Component | Unity Approach | Difficulty |
|---|---|---|
| Tab bar + sliding indicator | FooterMenu.cs + DOMove | `UNITY: straightforward` |
| FAB expand/collapse | DOAnchorPos + DOScale for each button | `UNITY: straightforward` |
| FAB rotation (+ → ×) | DOLocalRotate(45°) | `UNITY: straightforward` |
| Screen crossfade | CanvasGroup.DOFade on both panels | `UNITY: straightforward` |
| Popup scale-in/out | PopupAndDownAnimator.cs already exists | `UNITY: straightforward` |
| Bottom sheet slide | DOAnchorPosY | `UNITY: straightforward` |
| Toast slide-down | DOAnchorPosY + DOFade | `UNITY: straightforward` |
| Confetti particles | SpawnEffect() + existing particle prefabs | `UNITY: straightforward` |
| Tab bar blur | `UNITY-STRETCH` — blur shader or opaque fallback |
| Scrim overlay | CanvasGroup.DOFade on dark panel | `UNITY: straightforward` |
| Tool overlay slide-up | DOAnchorPosY (same as bottom sheet but full screen) | `UNITY: straightforward` |

Everything in the nav shell is `UNITY: straightforward` except the backdrop blur on the tab bar, which can fall back to a solid dark background.

---

## What's Out of Scope

- Actual routing library (hash-based or simple conditional rendering is fine)
- Deep-link support
- State persistence across sessions
- Auth guards / login gating
- Push notifications
- Haptic feedback (web limitation — document sync points for Unity)
- Actual Svelte transitions (use GSAP for all animations for DOTween mapping consistency)

---

## Deliverables

1. **Shell component** wrapping all screens with tab bar, FAB, header, toast, and confetti systems
2. **Two tab bar configurations** (Direction 1: 4 tabs separate, Direction 2: 4 tabs merged)
3. **FAB with 4 quick actions** — Start Fast, Log Water, Breathwork, Focus Timer
4. **Water logging as instant action** — bubble animation + toast, no screen navigation
5. **Screen transition system** — crossfade for tabs, slide-up for tools, scale for popups
6. **Toast notification system** — reusable, stackable
7. **Confetti system** — triggerable from any screen
8. **History screen** with month grid, completion dots, monthly stats, tap-to-view-past-day
9. **Stub screen** for Profile (placeholder content, real nav)
9. DOTween mapping comments on every animation

---

## Success Criteria

- [ ] Switching between any two tabs feels smooth and instant (< 0.4s total)
- [ ] The FAB is accessible from every screen and never obscures critical content
- [ ] Tapping "Log Water" from the FAB feels like a one-tap action (no screen change)
- [ ] Tool overlays (Fasting, Breathing) slide over the current screen and dismiss cleanly
- [ ] The tab bar, FAB, and header feel like a cohesive shell — not three separate bolted-on pieces
- [ ] Both Direction 1 and Direction 2 tab configurations work without breaking any screen
- [ ] A Unity dev can look at the component structure and map every component to an existing Unity script
- [ ] Toasts and confetti work from any screen without screen-specific wiring

---

## Reference

- **Habits Screen scope:** `prototypes/SCOPE_Habits_Screen.md`
- **Home Screen scope:** `prototypes/SCOPE_Home_Screen.md`
- **Breathing prototype (existing):** `prototypes/breathing-module/index.html`
- **Current Unity nav:** `Assets/Scripts/FooterMenu.cs`, `Assets/Scripts/SingletonBehaviourUI.cs`
- **Current popup pattern:** `Assets/Scripts/PopupAndDownAnimator.cs`
- **Current effects:** `Assets/Scripts/GameManager.cs` → `SpawnEffect()`
