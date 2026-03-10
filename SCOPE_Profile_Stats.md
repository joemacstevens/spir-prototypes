# SPiR Health — Profile & Stats Screen Prototype Scope

**For:** Antigravity (dev team)
**Purpose:** Interactive Svelte prototype of the redesigned Profile/Stats/Achievements screen
**Status:** Scoping — no code yet
**Date:** 2026-03-03 (updated 2026-03-09)
**Related:** `SCOPE_Navigation_Shell.md`, `SCOPE_Home_Screen.md` (Direction 2 moves Gold Standard radar + flow state here)

---

## Context

The current Profile screen in `ProfilePanel.cs` (~488 lines) is a dense data dump: 6 lifetime stats, 6 tallies with progress bars, 3 streak categories, an 8-axis spider graph, a subscribe button, and settings access. The data is there but the presentation doesn't celebrate it.

This is the **"look how far you've come"** screen. It should feel like an achievement showcase — the place that makes you proud of your consistency. If the Habits screen is where you grind, the Profile is where you admire the results.

---

## The Big Idea: Three-Section Scrollable Profile

The current screen dumps everything at once. The prototype breaks it into three clear sections that scroll vertically, each with a distinct purpose:

### Section 1: Identity Card (Top, Always Visible)
Who you are in the SPiR universe.

### Section 2: Streaks & Achievements (Middle)
Your active accomplishments — the gamification layer.

### Section 3: Analytics (Bottom)
Deep stats, graphs, trends — the data layer.

The 8-axis self-assessment radar (connected to onboarding) ALWAYS lives in Section 3. If Home Screen Direction 2 is active (merged Home/Habits), the 6-axis Gold Standard radar and flow state gauge also move here from the Home Screen.

---

## XP Economy Evolution (Design Proposal — Important Context)

> **Background:** A separate analysis identified that the current XP system has a structural problem. XP is currently doing too many jobs: identity/levels, monetization (500 XP = $5), and eventually real-world redemption (ecommerce, retreats). Power users earn 8,000-9,000 XP/week while average users earn 1,000-1,200, creating inflation pressure that devalues purchased XP.
>
> **The proposed solution** is a three-layer currency stack:
> 1. **XP (Progress XP)** — Non-spendable, non-purchasable. Drives levels, titles, leaderboards, identity. Infinite accumulation. This is what shows on the Profile card.
> 2. **Protocol Credits** — Spendable utility currency. Weekly-capped, tier-gated, used for advanced protocol activations, boosters, partner rewards. Earned slowly via gameplay, purchasable in limited quantities (Pro/Max only).
> 3. **Access Tokens** — Scarcity currency for luxury/retreat access. Not grindable, not buyable. Earned through milestones, spend thresholds, invitations.
>
> **For the prototype:** We show the UI surface for XP (identity) and Protocol Credits (utility). Access Tokens are a future feature — don't build UI for them yet. The goal is to test whether a dual-currency display feels clear or confusing on the Profile screen.

---

## Section 1: Identity Card

A hero card at the top of the Profile screen. Glassmorphic, prominent, personal.

### Visual
```
┌─────────────────────────────────┐
│                                  │
│         ┌──────────┐             │
│         │  Avatar   │            │
│         │  / Level  │            │
│         └──────────┘             │
│                                  │
│         JOSEPH STEVENS           │
│         Level 12 · Pro           │
│                                  │
│     ┌──────────────────────┐    │
│     │ 2,450 XP ▓▓▓▓▓▓░░░░ │    │  ← XP bar to next level
│     │        480 to Level 13│    │     (Progress XP — identity only)
│     └──────────────────────┘    │
│                                  │
│     🔥 14-day streak             │  ← Current longest active streak
│                                  │
│     ┌──────────────────────┐    │
│     │ ⚡ 18 Protocol Credits │    │  ← Spendable currency balance
│     │     12 earned · 6 bought  │    │     (Pro/Max only — hidden on Free)
│     └──────────────────────┘    │
│                                  │
└─────────────────────────────────┘
```

### Elements
| Element | Data | Source |
|---|---|---|
| Username | "JOSEPH STEVENS" (uppercase) | `DataConfig.userName` |
| Level | Derived from total XP (every ~500 XP = 1 level) | Calculated |
| Subscription tier | "Free" / "Pro" / "Max" | `DataConfig.isProSubscribed` |
| XP bar | Progress toward next level | `DataConfig.TotalXP` |
| Current XP | "2,450 XP" | `DataConfig.TotalXP` |
| XP to next level | "480 to Level 13" | Calculated |
| Active streak highlight | Longest currently active streak | From streak data |
| Protocol Credits | Current spendable balance | New — tier-gated |

### XP vs. Credits — UI Distinction

These are two different currencies and the UI must make that obvious:

| | XP (Progress) | Protocol Credits |
|---|---|---|
| **Visual treatment** | Gold/amber bar, warm tones | Electric blue pill/badge, cool tones |
| **Label** | "2,450 XP" | "18 Credits" or "⚡ 18" |
| **Bar/indicator** | Progress bar (fills toward next level) | Simple counter (no bar — it's a balance, not progress) |
| **Visibility** | Always shown | Pro/Max only. Free tier sees "Upgrade to earn Credits" link |
| **Tap action** | Shows level breakdown / XP history | Shows credit balance, earn/spend history, conversion option |

```css
/* XP bar — warm, identity-focused */
.xp-bar { background: linear-gradient(90deg, #B58C1F, #FFD700); }

/* Credit badge — cool, utility-focused */
.credit-badge {
  background: rgba(82, 172, 255, 0.1);
  border: 1px solid rgba(82, 172, 255, 0.25);
  border-radius: 20px;
  padding: 6px 14px;
  color: #52ACFF;
}
```

### Free Tier Credit Teaser

Free users don't have credits yet, but they should see what they're missing:

```
┌──────────────────────────┐
│  ⚡ Protocol Credits       │
│  Upgrade to Pro to earn   │
│  credits toward rewards   │
│           [Learn More]    │
└──────────────────────────┘
```

This is soft conversion pressure — not a hard gate, just visibility.

### XP Bar Animation
```javascript
// UNITY: Image.DOFillAmount(progress, 0.5f).SetEase(Ease.OutQuad)
gsap.to(xpBar, {
  width: `${progressPercent}%`,
  duration: 0.5,
  ease: 'power2.out'
});
```

### Card Styling
```css
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 24px;
backdrop-filter: blur(20px);
padding: 32px 24px;
```

### Level System (New for Prototype)
The current app shows raw XP ("2,450 XP") with no progression context. Adding levels gives XP meaning:

| Level | XP Required | Title (optional) |
|---|---|---|
| 1-5 | 0-500 each | Beginner |
| 6-10 | 500 each | Consistent |
| 11-15 | 500 each | Dedicated |
| 16-20 | 750 each | Advanced |
| 21+ | 1000 each | Master |

XP drives levels. Credits do NOT. This separation is intentional — you can't buy your way to a higher level.

This is a prototype-only feature — not in the current Unity codebase. Flag as a design proposal for Jay and the team to evaluate. `UNITY: straightforward to add — just math on existing TotalXP`

---

## Section 2: Streaks & Achievements

The reward showcase. Currently streaks are small list items with icons. In the prototype, they become **hero cards** that celebrate your consistency.

### Streak Cards

Three streak categories, each as a glassmorphic card:

```
┌──── Sleep Streak ────────────────┐
│                                   │
│  🌙  7-Day Sleep Streak     x3   │  ← Icon, title, times claimed
│                                   │
│  ▓▓▓▓▓▓▓▓▓░░░░  5 of 7 days     │  ← Progress bar + text
│                                   │
│  Current run: 5 days              │
│                                   │
│  ┌─────────────────────────────┐ │
│  │        Claim Reward          │ │  ← Only if streak is claimable
│  └─────────────────────────────┘ │
└───────────────────────────────────┘
```

### Streak Types

| Streak | Icon | Color Accent | What it tracks |
|---|---|---|---|
| **Sleep** | Moon/stars | `#A78BFA` (purple) | Consecutive days with sleep data logged |
| **Hydration** | Water droplet | `#52ACFF` (blue) | Consecutive days with water logged |
| **Loadout** | Lightning bolt | `#FFB347` (amber) | Consecutive days with loadout locked |

### Streak Visual States

**Locked (never claimed):**
- Card shows lock icon instead of streak icon
- Muted colors, no progress bar
- Text: "Complete your first [type] streak to unlock"
- `UNITY: lockSprite shown when claimedCount == 0`

**Active (in progress):**
- Full color card with streak icon
- Progress bar filling: `currentRun / requiredDays`
- Pulsing glow on the progress bar edge
- Times claimed badge: "x3" in corner

**Claimable (streak completed, unclaimed):**
- Card has a bright glow border
- "Claim Reward" button visible
- XP reward shown: "+50 XP"
- Red notification badge (matches tab bar badge from nav shell)

**Claiming Animation:**
```javascript
// 1. Button press → card flashes
// UNITY: Image.DOColor(white, 0.1f) then back

// 2. XP flies from card toward header XP counter
// UNITY: DOAnchorPos from card position to XP counter position
gsap.to(xpOrb, {
  x: xpCounterPosition.x,
  y: xpCounterPosition.y,
  scale: 0.3,
  duration: 0.6,
  ease: 'power2.in'
});

// 3. XP counter pulses
// UNITY: DOScale(1.2f, 0.15f).SetLoops(2, LoopType.Yoyo)

// 4. Confetti burst (streak-colored)
spawnConfetti('streak');

// 5. Claimed count increments with pop: "x3" → "x4"
gsap.fromTo(claimBadge, { scale: 1.4 }, { scale: 1, duration: 0.3, ease: 'back.out(1.4)' });
```

### Milestones Section

Below streak cards, a compact milestones display:

```
─── Milestones ───

🔒 Lock-In #14        🔥 Login Streak: 14 days
    "Consistency is key. Good job."
```

- Shows current lock-in count and login streak
- Simple text — the celebration happens in the Congratulations popup when milestones are hit, not here
- This is a status display, not an interaction point

---

## Section 3: Analytics

The data layer. Stats, graphs, trends. This is where the reflection happens.

### Lifetime Stats Grid

The current app has 6 separate text fields. The prototype groups them into a clean 2×3 or 3×2 grid of stat cards:

```
┌───────────┐ ┌───────────┐ ┌───────────┐
│    127     │ │    84     │ │    312    │
│  Lock-ins  │ │ Hydrations│ │Sleep Cycles│
└───────────┘ └───────────┘ └───────────┘
┌───────────┐ ┌───────────┐ ┌───────────┐
│    95      │ │    82     │ │    88     │
│  Morning   │ │  Midday   │ │  Unwind   │
│ Check-ins  │ │ Check-ins │ │ Check-ins │
└───────────┘ └───────────┘ └───────────┘
```

Each stat card:
- Large number (24px, 700 weight, white)
- Label below (11px, 500 weight, text-secondary)
- Subtle glassmorphic background
- Numbers count up from 0 on first view

```javascript
// Count-up animation on stat entrance
// UNITY: DOTween.To(() => 0, x => text.text = x.ToString(), targetValue, 1f)
gsap.to(counter, {
  value: targetValue,
  duration: 1,
  ease: 'power2.out',
  onUpdate: () => { el.textContent = Math.floor(counter.value); }
});
```

### Radar Charts (Two Distinct Charts)

> **There are TWO different spider charts in the app.** They measure different things, come from different data sources, and serve different purposes. Do NOT combine them.

---

#### Chart A: Self-Assessment Radar (8-axis) — "Where Am I?"

**This is the chart that connects to onboarding.** When a user first sets up the app, they go through a questionnaire (4 categories × 3 difficulty levels: Activity, Routine, Sleep, Nutrition + Bonus). Their answers are scored server-side and produce the initial values for this chart. After onboarding, the values update through daily check-ins.

**8 Axes:**

| # | Axis | Onboarding Source | Scale | Description |
|---|---|---|---|---|
| 1 | **Constant Movement** | Activity Questions | 0-7 | Physical activity level |
| 2 | **Fitness Level** | Activity Questions | 0-7 | Cardiovascular/physical fitness |
| 3 | **Sleep Quantity** | Sleep Questions | 0-7 | Hours of sleep |
| 4 | **Sleep Quality** | Sleep Questions | 0-7 | Quality/restfulness of sleep |
| 5 | **Routine Planning** | Routine Questions | 0-7 | How well-planned the daily routine is |
| 6 | **Routine Execution** | Routine Questions | 0-7 | How well the plan is executed |
| 7 | **Nutrition IQ** | Nutrition Questions | 0-7 | Nutritional knowledge/habits |
| 8 | **Fasting** | Bonus Questions | 0-7 | Fasting protocol adherence |

- Values are on a 0-7 scale, normalized to 0-100 for display: `value × 14.2`
- **Initial values come from onboarding answers** (scored server-side)
- **Updated through daily check-ins** (the "Rate My Routine" flow)
- This chart tells the user: "Here's where you are across all wellness dimensions"
- `UNITY: RateMyRoutineSpiderGraph.cs` + `WeeklyRateMyRoutineSpiderChart.cs`

**This chart should ALWAYS be on the Profile screen** (both Direction 1 and Direction 2). It's a personal baseline and growth tracker — exactly what Profile is for.

**Growth Overlay (Design Proposal):**
Consider showing the onboarding baseline as a faded polygon underneath the current values. This creates a "before vs. now" visualization that shows the user how they've grown since starting the app. Mock this with two polygons — one dimmer (baseline) and one brighter (current).

```
┌─────────────────────────────────┐
│        Self-Assessment          │
│                                 │
│          Fitness                │
│           ╱╲                    │
│    Sleep ╱  ╲ Movement          │
│         ╱····╲                  │   ╌╌ = Onboarding baseline
│   Nutr ╱ ╌╌╌╌ ╲ Routine Plan   │   ── = Current values
│        ╲ ╌╌╌╌ ╱                 │
│   Fast  ╲····╱ Routine Exec    │
│          ╲╱                     │
│      Sleep Qty                  │
│                                 │
│    "Since you started, your     │
│     Sleep Quality is up 40%"    │  ← Insight callout (optional)
│                                 │
└─────────────────────────────────┘
```

---

#### Chart B: Gold Standard Performance Radar (6-axis) — "How's My Week?"

**This is the ongoing performance tracker.** Fed by daily app usage and check-in surveys, NOT by onboarding. This chart answers: "How did I perform this week across the key metrics?"

**6 Axes:**

| # | Axis | Data Source | Scale |
|---|---|---|---|
| 1 | **Weekly Sleep** | Sleep logs | value/maxValue × 100 |
| 2 | **Brain Fog** | Check-in survey | value/maxValue × 100 |
| 3 | **Habits** | Habit completion rate | value/maxValue × 100 |
| 4 | **Rested** | Check-in survey | value/maxValue × 100 |
| 5 | **Lock-ins** | Lock-in streak | value/maxValue × 100 |
| 6 | **Loadouts** | Loadout completion | value/maxValue × 100 |

- All values are percentages (0-100)
- `UNITY: RadarChartFeed.cs` + API endpoint `/api/app/checkin/gold-standard-performance`

**Where this lives depends on Home Screen direction:**
- **Direction 1:** On the Home Screen (see `SCOPE_Home_Screen.md`)
- **Direction 2:** Moves to Profile (below the 8-axis self-assessment chart)

---

#### Summary: Which Chart Goes Where

| Chart | Direction 1 | Direction 2 |
|---|---|---|
| **Self-Assessment (8-axis)** | Profile — always | Profile — always |
| **Gold Standard (6-axis)** | Home Screen | Profile (below self-assessment) |

---

### Radar Chart Visual (shared styling for both charts)
```
Background: rgba(255, 255, 255, 0.03)
Border-radius: 20px
Padding: 24px
```

- Axis lines: `rgba(255, 255, 255, 0.08)`
- Grid rings: `rgba(255, 255, 255, 0.05)` (concentric polygons at 25%, 50%, 75%, 100%)
- 6-axis chart → hexagonal rings. 8-axis chart → octagonal rings.
- Data fill: `--color-accent` at 15% opacity
- Data stroke: `--color-accent` at 60% opacity
- Growth overlay (baseline): `rgba(255, 255, 255, 0.08)` fill, `rgba(255, 255, 255, 0.15)` stroke
- Axis labels: `--color-text-secondary`, positioned at each point
- Percentage values: shown at each axis endpoint

### Radar Animation
```javascript
// Values slide from 0 to target on entry
// UNITY: RadarChartFeed.SlideValue(axis, targetValue, 0.5f)
axes.forEach((axis, i) => {
  gsap.fromTo(axis,
    { value: 0 },
    { value: targetValue, duration: 0.5, delay: i * 0.05, ease: 'power2.out' }
  );
});
```

### Flow State Readiness Gauge

(Only in Direction 2 — moved from Home Screen)

- Horizontal bar, 0–500 scale
- Animated arrow/pointer
- Spec'd in `SCOPE_Home_Screen.md` — same component, just rendered here instead

### Date Navigation

Allow browsing historical data:
- Left/right arrows to move between days/weeks
- Stats and radar chart update with animation
- Same pattern as current Home Screen: `OnPreviousDate()` / `OnNextDate()`

---

## Simplifications vs. Current App

| Current App | Prototype |
|---|---|
| Raw XP number ("2,450 XP") doing too many jobs (identity + currency + store) | Level system (XP = identity/mastery only) + separate Protocol Credits (spendable utility currency, tier-gated) |
| 6 lifetime stats as plain text | Animated stat grid with count-up on entry |
| 6 tallies with progress bars (separate from stats) | Merged — tallies integrated into stat cards as secondary info |
| Streak items as small list entries | Hero streak cards with glow, claim animation, confetti |
| Trophy celebration in a separate popup | Claiming happens inline on the streak card |
| 8-axis self-assessment + 6-axis performance (two separate charts, confusingly presented) | Clear separation: 8-axis self-assessment always on Profile (with onboarding baseline overlay), 6-axis Gold Standard on Home (D1) or Profile (D2) |
| Subscribe button on profile | Moved to Settings — Profile is about achievement, not upsell |
| Settings mixed into profile | Separate settings gear icon in header |

---

## Congratulations / Trophy System

When milestones are hit (lock-in count, login streak), the `CongratulationPanelPopUp` fires as an overlay from the shell — not from the Profile screen specifically. This is spec'd in the Nav Shell scope.

For the Profile prototype, we just need:
- The streak claiming flow (inline on the card)
- Milestone status display (compact text)
- The shell's confetti system fires when a streak is claimed

---

## Settings (Accessed from Profile)

A gear icon in the Profile header opens a settings bottom sheet:

| Setting | Input | Current Script |
|---|---|---|
| Wake-up time | Hour/Minute/AM-PM picker | `ProfilePopupPanel.cs` |
| Ideal sleep duration | Hours/Minutes picker | `ProfilePopupPanel.cs` |
| Chronotype | Early Bird / Third Bird / Night Owl | Moved here from Home Screen |
| Metabolism | Optimized / Suboptimal | Moved here from Home Screen |
| Subscription | Manage / Upgrade | `SubscriptionPanel.cs` |
| Account | Delete account | `ProfilePopupPanel.cs` |

The chronotype and metabolism settings moved here from the Home Screen because you set them once — they're not daily decisions.

For the prototype, settings is a **stub** — show the bottom sheet with the options listed but don't build full picker UIs. The point is demonstrating that these settings exist somewhere accessible, not buried or competing with daily content.

---

## Design System (Profile-Specific)

### Streak Card Colors
```
--color-streak-sleep: #A78BFA       (purple glow)
--color-streak-hydration: #52ACFF   (blue glow)
--color-streak-loadout: #FFB347     (amber glow)
--color-streak-locked: rgba(255, 255, 255, 0.1)  (muted, no glow)
```

### Streak Card Glow (Claimable State)
```javascript
// Pulsing border glow when streak is ready to claim
// UNITY-STRETCH: Outer glow shader. Fallback: animated border opacity
gsap.to(card, {
  boxShadow: '0 0 30px rgba(streak_color, 0.4)',
  duration: 1.5,
  yoyo: true,
  repeat: -1,
  ease: 'sine.inOut'
});
```

### Level Badge Colors
```
Beginner (1-5):    rgba(255, 255, 255, 0.2)   — subtle
Consistent (6-10): #52ACFF at 20%             — blue tint
Dedicated (11-15): #A78BFA at 20%             — purple tint
Advanced (16-20):  #FFB347 at 20%             — amber tint
Master (21+):      #FFD700 at 20%             — gold tint
```

---

## Unity Translation Notes

| Prototype Component | Unity Approach | Difficulty |
|---|---|---|
| XP bar fill | Image.DOFillAmount | `UNITY: straightforward` |
| Level calculation | Math on TotalXP | `UNITY: straightforward` (new feature) |
| Stat count-up | DOTween.To counter | `UNITY: straightforward` |
| Streak cards | Instantiated prefabs | `UNITY: straightforward` |
| Streak progress bar | Image.DOFillAmount | `UNITY: straightforward` |
| Claim animation (XP orb fly) | DOAnchorPos from card to counter | `UNITY: straightforward` |
| Pulsing glow on claimable | `UNITY-STRETCH` — animated border shader or sprite |
| Radar chart (6-axis) | RadarChartFeed already exists | `UNITY: straightforward` |
| Radar chart (8-axis) | RateMyRoutineSpiderGraph already exists | `UNITY: straightforward` |
| Flow state gauge | FlowStateRediness.cs already exists | `UNITY: straightforward` |
| Settings bottom sheet | DOAnchorPosY (PopupAndDownAnimator) | `UNITY: straightforward` |

---

## Mock Data

### User Identity
```
Name: "Joseph Stevens"
Total XP: 2,450 (Progress XP — non-spendable, drives level)
Level: 12 (Dedicated)
XP to next level: 480
Subscription: Pro
Current login streak: 14 days
Protocol Credits: 18 (spendable — 12 earned, 6 purchased)
Weekly credit cap: 25 (Pro tier)
Credits earned this week: 12 / 25
```

### Streaks
```
Sleep Streak:
  - Current run: 5 days
  - Required: 7 days
  - Claimed count: 3
  - Status: In progress
  - XP reward: 50

Hydration Streak:
  - Current run: 7 days
  - Required: 7 days
  - Claimed count: 2
  - Status: CLAIMABLE
  - XP reward: 50

Loadout Streak:
  - Current run: 0 days
  - Required: 7 days
  - Claimed count: 0
  - Status: Locked
```

### Lifetime Stats
```
Lock-ins: 127
Hydrations: 84
Sleep Cycles: 312
Morning Check-ins: 95
Midday Check-ins: 82
Unwind Check-ins: 88
```

### Self-Assessment Radar (8-axis — connected to onboarding)
```
Onboarding Baseline → Current Value (show both as overlay)
Constant Movement:  3 → 5  (out of 7)
Fitness Level:      2 → 4
Sleep Quantity:     4 → 5
Sleep Quality:      3 → 6
Routine Planning:   2 → 5
Routine Execution:  1 → 4
Nutrition IQ:       4 → 5
Fasting:            0 → 3
```

### Gold Standard Radar (6-axis — weekly performance, D2 only)
```
Weekly Sleep: 78%
Brain Fog: 65%
Habits: 72%
Rested: 80%
Lock-ins: 85%
Loadouts: 90%
```

### Flow State Readiness
```
Value: 320 / 500
```

---

## What's Out of Scope

- Actual user authentication / account data
- Real subscription management (Stripe, App Store)
- Full settings picker UIs (stub only)
- Delete account flow
- Onboarding restart
- HealthKit/Health Connect permissions
- Social features / sharing
- Credit spend/redeem flow (marketplace, partner rewards) — future scope
- Access Tokens (luxury/retreat currency) — future scope, no UI yet
- XP → Credit conversion UI — future scope, just show the balances for now

---

## Deliverables

1. **Three-section scrollable profile** — Identity Card, Streaks & Achievements, Analytics
2. **Identity card** with level system, XP bar, active streak highlight
3. **Streak hero cards** — three types (Sleep, Hydration, Loadout) with locked/active/claimable states
4. **Streak claim animation** — XP orb fly, confetti burst, counter increment
5. **Stat grid** with count-up animation on entry
6. **Self-Assessment radar** (8-axis, always on Profile) with onboarding baseline overlay showing growth
7. **Gold Standard radar** (6-axis, Direction 2 only — moved from Home)
7. **Flow state gauge** (Direction 2 only — moved from Home)
8. **Settings bottom sheet** (stub with listed options)
9. **DOTween mapping comments** on every animation

---

## Success Criteria

- [ ] Opening the Profile feels like opening an achievement showcase, not a data dump
- [ ] Claiming a streak is satisfying — the XP orb flying to the counter, confetti, badge incrementing
- [ ] The level system gives XP context that raw numbers don't ("Level 12, 480 to go" means more than "2,450 XP")
- [ ] Streak cards clearly communicate locked → in progress → claimable states
- [ ] The radar chart is legible and the values animate smoothly on entry
- [ ] Analytics section works with both Home Screen directions (with or without radar/flow state)
- [ ] Settings are accessible but not competing with achievements for attention
- [ ] A Unity dev sees streak cards and thinks "that's just an instantiated prefab with DOFillAmount and DOScale"

---

## Reference

- **Navigation Shell scope:** `prototypes/SCOPE_Navigation_Shell.md` (celebration overlay)
- **Home Screen scope:** `prototypes/SCOPE_Home_Screen.md` (Direction 2 moves radar + flow state here)
- **Current Unity scripts:** `Assets/Scripts/ProfilePanel.cs`, `ProfileStreakItem.cs`, `MileStonesPanel.cs`
- **Radar chart:** `Assets/Scripts/RadarChartFeed.cs`, `Assets/Scripts/RateMyRoutineSpiderGraph.cs`
- **Flow state:** `Assets/Scripts/FlowStateRediness.cs`
- **Celebration:** `Assets/Scripts/CongratulationPanelPopUp.cs`
