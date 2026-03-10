# SPiR Health — Home Screen Prototype Scope

**For:** Antigravity (dev team)
**Purpose:** Interactive Svelte prototype testing two directions for the Home Screen
**Status:** Scoping — no code yet
**Date:** 2026-03-03 (updated 2026-03-04)
**Related:** `SCOPE_Habits_Screen.md` (v2), `SCOPE_Profile_Stats.md`

---

## Context: Why Two Directions

The current app's Home Screen and Habits Screen both display the same concept — a metabolism/energy curve with 5 time windows. The Home Screen shows it as a passive graph; the Habits screen shows it as an interactive bar. In our Habits prototype (see `SCOPE_Habits_Screen.md`), we elevated the energy curve to be the primary interface. That raises a question: does the Home Screen need its own version of the curve, or should it serve a different purpose?

We're prototyping both directions so the team can test them on their phones and decide.

---

## Direction 1: "Your Day at a Glance" (Separate Home)

Home and Habits remain separate screens. The Home Screen becomes a **stripped-down status dashboard** — no metabolism graph (that belongs to the Habits energy curve now). Home answers: "How am I doing?" Habits answers: "What do I need to do?"

### Layout

#### Hero: Four Progress Rings
The center of the screen. Big, animated, glowing. Each ring fills throughout the day.

| Ring | Data | Fill Logic | Color |
|---|---|---|---|
| **Steps** | Device pedometer (HealthKit / Health Connect) | stepCount / nearest 100 target | Green accent |
| **Check-ins** | Completed habits / total habits | completedHabits / totalHabits | `#52ACFF` (brand blue) |
| **Fasting** | Hours fasted / 16 | fastingValue / 16 | Warm amber |
| **Sleep** | Sleep cycles / 5 | sleepCycles / 5 | Purple/indigo |

- Rings should feel like the breathing prototype's progress rings — SVG stroke-dashoffset with glow
- Tap a ring to navigate to its detail screen (Fasting, Sleep Graph, etc.)
- `UNITY: Image.DOFillAmount()` — straightforward

#### Below Rings: Energy Position Indicator
A thin, elegant representation of where you are in your day:
- Compact horizontal bar showing the 5 energy windows as colored segments
- A "now" dot/line showing current time position
- Tapping this navigates to the full Habits energy curve
- NOT the full metabolism graph — just a glanceable mini-timeline

#### Below That: Gold Standard Performance Radar (6-axis)

> **This is the "Gold Standard Performance Chart"** — the app's ongoing performance tracker. It is NOT the same chart as the onboarding self-assessment (that's an 8-axis chart that lives on Profile). These are two different data sources.

The 6-axis spider chart showing weekly performance trends. Each axis measures a different dimension of daily app engagement:

| Axis | What It Measures | Data Source |
|---|---|---|
| **Weekly Sleep** | Sleep performance across the week | Sleep logs (value / maxValue) |
| **Brain Fog** | Mental clarity / focus self-reports | Check-in survey responses |
| **Habits** | Habit completion rate | completedHabits / totalHabits |
| **Rested** | Subjective rest quality self-reports | Check-in survey responses |
| **Lock-ins** | Streak of daily loadout lock-ins | Consecutive lock-in count |
| **Loadouts** | Loadout completion rate | Completed loadouts / attempts |

- All values displayed as percentages: `(value / maxValue) × 100`
- Values animate in with `SlideValue()` over 0.5s
- Date navigation (previous/next day) — arrows update all metrics
- `UNITY: RadarChartFeed.cs` + API endpoint `/api/app/checkin/gold-standard-performance`
- Also includes a **Flow State Readiness** score (0–500) displayed separately below the radar

#### Below That: Flow State Readiness
Horizontal gauge from 0–500:
- Arrow/pointer slides to position
- Labels at 0 and 500
- `UNITY: DOAnchorPos over 1s, Linear ease`

#### What's Cut
- **Metabolism graph** — Lives on the Habits screen now
- **Chronotype toggle (Early Bird / Third Bird / Night Owl)** — Moves to Profile/Settings. You set this once, not daily
- **Optimized/Suboptimal toggle** — Same, moves to Settings
- **Message card carousel** — Replaced by a single daily insight card (optional). The 4-card auto-rotating carousel adds motion without clarity
- **5+ action buttons at bottom** — Navigation handled by tab bar. No redundant "View Routine" / "View Check-Ins" buttons

#### Simplification Summary
| Current App | Direction 1 |
|---|---|
| Metabolism graph + 5 zone labels | Cut (lives on Habits screen) |
| 2×3 metabolism toggle | Moved to Settings (set once) |
| 4-card auto-rotating carousel | Single daily insight or cut entirely |
| 5 action buttons | Cut (tab bar handles navigation) |
| Radar chart | Kept — weekly reflection belongs here |
| Flow state gauge | Kept |
| 4 progress rings | Kept — elevated to hero element |
| Date navigation | Kept |

---

## Direction 2: "The Curve IS Home" (Merged)

Home and Habits merge into one screen. When you open the app, you land on the energy curve with your habits. No separate dashboard. The overview IS the action screen.

### Layout

The Habits screen energy curve (from `SCOPE_Habits_Screen.md`) becomes the app's home screen. Everything from Direction 1 that's worth keeping gets integrated into or around the curve.

#### Progress Rings → Compact Badges on the Curve
Instead of 4 big rings on a separate screen, the four metrics become small ring badges anchored to the top of the screen or floating above the curve:
- Steps, Check-ins, Fasting, Sleep — each as a mini-ring (32-40px)
- Tap to expand into full detail
- They live alongside the curve, not on a separate screen

#### Weekly Radar + Flow State → Profile Screen
These are reflection metrics. They move to the Profile/Stats screen where users review their progress:
- Radar chart = "How was my week?"
- Flow state = "How ready am I?"
- Both make more sense after the fact, not before the user starts their day

#### What Opens When You Launch the App
1. Morning greeting + quick sleep input (if needed)
2. Energy curve with habits already populated (or loadout selection if first time)
3. Calendar events on the curve
4. Four mini-rings at top showing today's progress
5. This IS the app. No dashboard pit stop.

#### Tab Bar Changes
If Home and Habits merge, the tab bar loses a tab. Options:
- **4 tabs:** Home/Habits (merged), Routine (calendar view), Breathing, Profile
- **5 tabs:** Home/Habits (merged), Routine, Breathing, Focus Mode, Profile
- The merged screen replaces what were two separate tabs

#### Simplification Summary
| Current App | Direction 2 |
|---|---|
| Home Screen (dashboard) + Habits Screen (action) | Single merged screen |
| Navigate from Home → Habits to start doing things | Land directly on the action screen |
| 4 big progress rings | 4 compact ring badges on curve |
| Radar chart + Flow state on Home | Moved to Profile |
| Metabolism graph on Home + Energy bar on Habits | Single energy curve |

---

## What to Build

### For Direction 1
1. A standalone Home Screen with:
   - Four hero progress rings (animated fills, glowing)
   - Compact energy position indicator (mini-timeline)
   - Weekly radar chart with date navigation
   - Flow state readiness gauge
   - Single daily insight card (optional)
2. Tab bar navigation to switch to the Habits energy curve

### For Direction 2
1. The Habits energy curve screen (from `SCOPE_Habits_Screen.md`) with:
   - Four compact ring badges added to the top/header area
   - No separate Home screen — app opens directly to this
2. Radar chart and Flow state gauge added to the Profile screen (can be a stub/placeholder)
3. Modified tab bar (4 or 5 tabs, no separate Home and Habits)

### Shared Components
Both directions share:
- The same design system (colors, typography, glassmorphism from breathing prototype)
- The same tab bar component (with different configurations)
- The same progress ring component (just different sizes — hero vs compact)
- The same energy curve (full on Habits, mini on Direction 1 Home)

### Switching Between Directions
A simple toggle or route:
- `/home-separate` — Direction 1 (standalone Home + separate Habits)
- `/home-merged` — Direction 2 (merged Home/Habits)
- Both should use the same Habits screen from `SCOPE_Habits_Screen.md`

---

## Progress Ring Component Spec

Used in both directions (hero size in D1, compact in D2). Build once, use twice.

### Visual
- SVG circle with stroke-dashoffset fill animation
- Background track ring (10% opacity white)
- Active fill ring with color glow (box-shadow matching ring color)
- Center text: value/total (e.g., "3,452" for steps, "2/5" for check-ins)
- Label below: metric name

### Sizes
| Context | Ring Diameter | Stroke Width | Font Size |
|---|---|---|---|
| Hero (Direction 1) | 90-100px | 6px | 18px value, 10px label |
| Compact (Direction 2) | 36-40px | 3px | 11px value, hidden label |

### Colors
| Metric | Ring Color | Glow |
|---|---|---|
| Steps | `#00FA3A` (green) | `0 0 20px rgba(0, 250, 58, 0.3)` |
| Check-ins | `#52ACFF` (blue) | `0 0 20px rgba(82, 172, 255, 0.3)` |
| Fasting | `#FFB347` (amber) | `0 0 20px rgba(255, 179, 71, 0.3)` |
| Sleep | `#A78BFA` (purple) | `0 0 20px rgba(167, 139, 250, 0.3)` |

### Animation
- Fill: `stroke-dashoffset` animates from full circumference to target over 0.5s
- Easing: `power2.out`
- On data change: animate from current fill to new fill
- `UNITY: Image.DOFillAmount(target, 0.5f).SetEase(Ease.OutQuad)`

---

## Gold Standard Radar Chart Component Spec (6-axis)

> **Important:** This is the Gold Standard Performance Chart — an ongoing performance tracker fed by daily app usage and check-in surveys. It is NOT the onboarding self-assessment chart. The 8-axis self-assessment chart (which connects to the onboarding questionnaire) lives on the Profile screen — see `SCOPE_Profile_Stats.md`.

Used in Direction 1 (Home) or Profile screen (Direction 2).

### Axes (6 total)
| # | Axis | Scale | Description |
|---|---|---|---|
| 1 | Weekly Sleep | 0-100% | Sleep performance (value/maxValue from API) |
| 2 | Lock-ins | 0-100% | Daily loadout lock-in streak rate |
| 3 | Loadouts | 0-100% | Loadout completion rate |
| 4 | Habits | 0-100% | Habit check-off completion rate |
| 5 | Brain Fog | 0-100% | Mental clarity (from check-in survey — higher = less fog) |
| 6 | Rested | 0-100% | Subjective rest quality (from check-in survey) |

### Visual
- 6-axis hexagonal spider chart
- Semi-transparent fill area with subtle gradient
- 4 concentric hexagonal grid rings (at 25%, 50%, 75%, 100%)
- Axis lines at 20% opacity white
- Each axis labeled with metric name + percentage value
- Chart title or label: "Weekly Performance" or "Gold Standard"

### Animation
- Values slide from 0 to target over 0.5s on entry
- When date changes, values animate from old to new
- `UNITY: RadarChartFeed.SlideValue() already exists`

### Design
- Background: `rgba(255, 255, 255, 0.03)` with subtle border
- Fill: gradient from `--color-accent` at 15% opacity
- Stroke: `--color-accent` at 60% opacity
- Labels: `--color-text-secondary`

---

## Flow State Gauge Spec

Horizontal readiness meter (0–500).

### Visual
- Track: subtle horizontal bar (full width, 4px height, 10% opacity white)
- Fill: gradient bar from left to pointer position
- Pointer: small circle or arrow with glow
- Labels: "0" at left, "500" at right
- Current value displayed near pointer

### Animation
- Pointer slides to position over 1s, linear easing
- Fill gradient follows pointer
- `UNITY: RectTransform.DOAnchorPos(target, 1f).SetEase(Ease.Linear)`

---

## Energy Position Mini-Indicator Spec (Direction 1 only)

A compact version of the energy curve for the Home dashboard.

### Visual
- Horizontal bar, ~300px wide, ~8px tall
- 5 colored segments representing energy windows:
  - Day Prep: muted tone
  - First Wind: `--color-morning` tint
  - Energy Dip: dimmer
  - Second Wind: `--color-midday` tint
  - Unwind: `--color-unwind` tint
- "Now" indicator: bright dot/line on the bar at current time position
- Time labels below: wake time on left, bed time on right

### Interaction
- Tap anywhere on the bar → navigate to full Habits energy curve screen
- The bar is essentially a button that previews the curve

### Animation
- "Now" dot gently pulses (opacity oscillation, 2s cycle)
- `UNITY: DOFade loop with LoopType.Yoyo`

---

## Unity Translation Notes

### New Components Needed
| Prototype Component | Unity Approach | Difficulty |
|---|---|---|
| Progress ring (SVG) | Radial fill Image + DOFillAmount | `UNITY: straightforward` |
| Ring glow effect | Outer glow sprite overlay or shader | `UNITY-STRETCH` |
| Radar chart | RadarChartFeed already exists | `UNITY: straightforward` |
| Flow state gauge | RectTransform + DOAnchorPos | `UNITY: straightforward` |
| Mini energy bar | Horizontal layout of filled Images | `UNITY: straightforward` |
| Pulsing dot | DOFade with LoopType.Yoyo | `UNITY: straightforward` |
| Compact ring badges | Same as progress ring, smaller | `UNITY: straightforward` |

### What's NOT Changing
- Tab bar navigation → FooterMenu.cs still works
- XP system → GameManager.cs untouched
- Data sources → Same API calls, same DataConfig fields
- Metabolism curve data → Same 6 curve variants, just displayed differently

---

## Mock Data Needed

### Daily Metrics (for progress rings)
```
Steps: 3,452 / 5,000
Check-ins: 2 / 5
Fasting: 8 / 16 hours
Sleep Cycles: 4 / 5
```

### Gold Standard Radar Data (6-axis — Weekly Performance)
```
Weekly Sleep: 78%     (sleep logs this week)
Lock-ins: 85%         (daily loadout lock-in streak)
Loadouts: 90%         (loadout completion rate)
Habits: 72%           (habit completion rate)
Brain Fog: 65%        (mental clarity from check-in survey)
Rested: 80%           (rest quality from check-in survey)
```

### Flow State Readiness
```
Value: 320 / 500
```

### User Profile
```
Wake time: 6:30 AM
Bedtime: 10:30 PM
Chronotype: Third Bird
Metabolism: Optimized
```

---

## What's Out of Scope

- Actual HealthKit / Health Connect integration (mock step data)
- Real API calls for radar chart data
- Message card carousel (cut or stubbed)
- Chronotype/metabolism selection UI (moves to Settings — not prototyped here)
- Motivational quotes system
- Platform-specific haptics

---

## Deliverables

1. **Direction 1 screen** — Standalone dashboard with hero rings, mini-timeline, radar, flow gauge
2. **Direction 2 integration** — Compact ring badges added to the Habits energy curve screen
3. Both directions accessible via route toggle
4. Shared components: progress ring (hero + compact), radar chart, flow gauge
5. DOTween mapping comments on every animation
6. Deployed to Vercel alongside the Habits prototype

---

## Success Criteria

- [ ] The team can open both directions on their phone and immediately feel which one is right
- [ ] Direction 1 feels like a useful overview, not a data dump
- [ ] Direction 2 feels focused, not overwhelming with too much crammed in
- [ ] Progress rings feel alive (animated, glowing, satisfying to watch fill)
- [ ] The transition between Home → Habits (Direction 1) or the unified experience (Direction 2) is smooth
- [ ] The chronotype/metabolism complexity is hidden from the daily experience
- [ ] A Unity dev reads the code and knows exactly what to build

---

## Reference

- **Habits Screen scope:** `prototypes/SCOPE_Habits_Screen.md`
- **Breathing prototype (design system):** `prototypes/breathing-module/index.html`
- **Current Unity script:** `Assets/Scripts/HomeScreenPanel.cs` (~1,800 lines)
- **Radar chart component:** `Assets/Scripts/RadarChartFeed.cs`
- **Flow state component:** `Assets/Scripts/FlowStateRediness.cs`
