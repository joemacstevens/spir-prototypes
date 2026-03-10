# SPiR Health Prototype — Implementation Plan

**For:** Antigravity (dev team)
**Date:** 2026-03-09
**Purpose:** Close the gaps between what's built and what the scope docs require, plus add the new lock-in bridge, section celebrations, and dual-currency UI.
**Priority:** Ranked by retention impact. Do these in order.

---

## Current State Summary

The prototype has **strong bones**: 5 screens, 5 stores, 40+ GSAP animations, all three habits layout variants, fasting tool, breathing module, and profile with streaks. Roughly 80% of the scope is built.

But the 20% that's missing is the part that fixes the retention problem. The current prototype lets users check off habits but never celebrates them for it, never bridges them to the lock-in, and never shows the reward chain. That's the gap between "I used the app" and "I felt the app working."

---

## Phase 1: The Reward Chain (Highest Retention Impact)

These are the features identified as fixing the biggest retention gap: the 57% drop-off between loadout building and lock-in.

---

### 1.1 Section-Complete Celebrations

**What:** When all habits in an energy window (Morning, Midday, Unwind) are checked off, a celebration banner appears.

**Files to modify:**
- `src/screens/HabitsScreen.svelte`
- `src/lib/stores/habits.js`

**Implementation:**

In `habits.js`, the `windowCompletion` derived store already tracks `{ total, done, percent }` per window. Add a reactive check:

```javascript
// In habits.js — add a derived store for completed sections
export const completedSections = derived(
  [windowCompletion],
  ([$wc]) => {
    const result = {};
    for (const [windowId, stats] of Object.entries($wc)) {
      result[windowId] = stats.total > 0 && stats.done === stats.total;
    }
    return result;
  }
);
```

In `HabitsScreen.svelte`, watch `completedSections` changes. When a window flips from incomplete → complete:

1. **200ms pause** after the last habit check animation finishes
2. **Banner slides up** from bottom of that window section:
   ```
   ╔════════════════════════╗
   ║  ✨ Morning Complete    ║
   ║     3/3 · +30 XP       ║
   ╚════════════════════════╝
   ```
3. **GSAP animation:**
   ```javascript
   // Banner entrance
   gsap.from(banner, { y: 30, scale: 0.9, opacity: 0, duration: 0.4, ease: 'back.out(1.4)' });
   ```
4. **Section border/glow intensifies** to full brightness:
   ```javascript
   gsap.to(sectionBorder, { borderColor: fullWindowColor, duration: 0.5, ease: 'power2.out' });
   ```
5. **Scoped confetti** — small burst within just that section (not full-screen)
6. **After 2s**, banner fades to a compact "3/3 ✓" badge on the section header:
   ```javascript
   gsap.to(banner, { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in', delay: 2 });
   ```
7. **+30 XP** added via `addXP(30)` from `user.js`

**Important:** Track which sections have already been celebrated in component state to prevent re-triggering on re-renders.

**DOTween comments:**
```javascript
// UNITY: DOAnchorPosY from below + DOScale(1, 0.4f).SetEase(Ease.OutBack)
// UNITY: Image.DOColor(fullColor, 0.5f).SetEase(Ease.OutQuad)
```

---

### 1.2 Lock-In Bridge

**What:** After ALL sections are complete, a prominent card auto-appears at the bottom of the timeline prompting the user to lock in their day with a hold-to-confirm gesture.

**Files to modify:**
- `src/screens/HabitsScreen.svelte`
- `src/lib/stores/habits.js`

**Implementation:**

Add to `habits.js`:
```javascript
export const allSectionsComplete = derived(
  [windowCompletion],
  ([$wc]) => {
    return Object.values($wc).every(s => s.total > 0 && s.done === s.total);
  }
);

export const dayLockedIn = writable(false);
```

In `HabitsScreen.svelte`, when `$allSectionsComplete` becomes true AND `$dayLockedIn` is false:

1. **Auto-scroll** the timeline to the bottom where the Lock-In card appears
2. **Lock-In card slides up** with entrance animation:
   ```javascript
   gsap.to(scrollContainer, { scrollTo: lockInCard, duration: 0.5, ease: 'power2.out' });
   gsap.from(lockInCard, { y: 60, opacity: 0, duration: 0.5, ease: 'back.out(1.2)', delay: 0.3 });
   ```
3. **Card content:**
   - "🔒 You crushed it."
   - "{done}/{total} habits done"
   - "🔥 Day {streak} streak"
   - "+250 XP waiting"
   - Hold-to-confirm button

4. **Hold-to-confirm interaction** (reuse pattern from FastingTool's hold-to-start):
   - `pointerdown` → start filling progress bar over 2 seconds
   - `pointerup` before 2s → reset bar, cancel
   - Bar reaches 100% → trigger lock-in
   ```javascript
   // Progress fill during hold
   gsap.to(progressBar, { width: '100%', duration: 2, ease: 'none' });
   ```

5. **On lock-in confirmed:**
   - Card flashes white (0.1s)
   - **Full-screen confetti** (the BIG one — `spawnConfetti('full')`)
   - **XP orbs fly** from card to XP counter in header:
     ```javascript
     gsap.to(xpOrb, {
       x: xpCounterPosition.x,
       y: xpCounterPosition.y,
       scale: 0.3,
       duration: 0.6,
       ease: 'power2.in'
     });
     ```
   - XP counter pulses: `gsap.to(xpCounter, { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1 })`
   - Streak counter pops: `gsap.fromTo(streak, { scale: 1.4 }, { scale: 1, duration: 0.3, ease: 'back.out(1.4)' })`
   - Toast: "Day 15 locked in! +250 XP"
   - `addXP(250)` via user store
   - `dayLockedIn.set(true)`
   - Card transforms into Day Complete summary

**Partial completion fallback:**

Add a manual trigger: if it's past the user's bedtime (22:30 from mock data) OR if the user taps a "Lock in what I've done" button in the header/FAB:
- Same card but softer tone: "Ready to wrap up?"
- Shows actual count: "12/15 habits · Still a solid day."
- Reduced XP: "+150 XP" (proportional to completion)
- No streak bonus below 80% completion

---

### 1.3 XP "Fly" Animation

**What:** When XP is earned (habit check, section complete, lock-in), a small XP orb visually flies from the source to the XP counter in the header.

**Files to modify:**
- `src/lib/Shell.svelte` (or new `XPOrb.svelte` component)
- `src/lib/Header.svelte`

**Implementation:**

Create a shared function/component that:
1. Spawns a small circle (12px, gold, with glow) at the source element's position
2. Animates it along an arc to the XP counter position in the header
3. On arrival, pulses the XP counter and updates the displayed value

```javascript
// Spawn XP orb at source, fly to header counter
function flyXP(sourceEl, amount) {
  const orb = createOrbElement(); // 12px gold circle
  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = xpCounter.getBoundingClientRect();

  orb.style.left = sourceRect.x + 'px';
  orb.style.top = sourceRect.y + 'px';
  document.body.appendChild(orb);

  // UNITY: DOAnchorPos from source to XP counter + DOScale
  gsap.to(orb, {
    x: targetRect.x - sourceRect.x,
    y: targetRect.y - sourceRect.y,
    scale: 0.4,
    duration: 0.6,
    ease: 'power2.in',
    onComplete: () => {
      orb.remove();
      addXP(amount);
      // Pulse the counter
      gsap.to(xpCounter, { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1 });
    }
  });
}
```

Wire this into:
- Habit completion: `flyXP(habitCard, 10)` (small orb)
- Section complete: `flyXP(sectionBanner, 30)` (medium orb)
- Lock-in: `flyXP(lockInCard, 250)` (multiple orbs in a burst)

---

## Phase 2: Fixing Existing Gaps

These are things the scope docs require that are currently missing or broken.

---

### 2.1 Calendar Events Inline on Timeline

**What:** The scope requires calendar events to appear inline on the vertical timeline at their time positions, mixed with habits. Currently the events are in mock data (`calendarEvents` in `habits.js`) but not rendered on the timeline.

**Files to modify:**
- `src/screens/HabitsScreen.svelte`

**Implementation:**

The `calendarEvents` data already exists in `habits.js`:
```javascript
{ title: 'Team Standup', start: '10:00', end: '10:30' },
{ title: 'Lunch Meeting', start: '13:00', end: '14:00' },
{ title: 'Focus Time', start: '15:30', end: '17:00' }
```

For each energy window section, interleave calendar events with habits:
1. Filter events whose start time falls within the window's time range
2. Render them between habit cards with distinct styling:
   ```css
   .calendar-event {
     background: rgba(255, 255, 255, 0.04);
     border: 1px solid rgba(255, 255, 255, 0.08);
     border-left: 3px solid var(--color-accent);
     border-radius: 12px;
     padding: 10px 14px;
   }
   ```
3. Show time range: "10:00 – 10:30 · Team Standup"
4. Calendar events are NOT checkable — they're context, not tasks

For **Variant C (Dual Column)**, calendar events go in the right column only.

---

### 2.2 Radar Chart Data Binding

**What:** Both radar charts (Home Screen 6-axis, Profile 8-axis) are currently hardcoded. They should read from the `metrics.js` store.

**Files to modify:**
- `src/screens/HomeScreen.svelte`
- `src/screens/ProfileScreen.svelte`

**Implementation:**

The data already exists in `metrics.js`:
- `radarData` for the 6-axis Gold Standard
- `selfAssessment` for the 8-axis with baseline + current

Replace hardcoded SVG polygon points with reactive values from stores. The calculation is already done — just wire it up.

Also add the **growth overlay** on the 8-axis chart (Profile):
- Render two polygons on the same SVG
- First polygon: `baseline` values, faded (`rgba(255,255,255,0.08)` fill, dashed stroke)
- Second polygon: `current` values, bright (accent color fill and stroke)
- Growth callout text: "Since you started, your Sleep Quality is up 40%"

---

### 2.3 Direction 1 vs 2 Toggle in UI

**What:** Both Home Screen directions are built but there's no UI to switch between them. The scope says this should be switchable via URL params AND a settings toggle.

**Files to modify:**
- `src/lib/Shell.svelte` or `src/lib/Header.svelte`

**Implementation:**

`navigation.js` already has `direction` and `initFromURL()`. Add:
1. A small toggle in the header or settings: "Layout: Separate / Merged"
2. Changing direction updates the tab bar (via the existing `tabs` derived store)
3. In Direction 2: remove Home tab, rename first tab to "Today", move radar + flow gauge to Profile

The store logic is there — just needs a UI control.

---

### 2.4 History Screen Sync

**What:** The History screen has hardcoded completion data. It should reflect actual habit completion from the current day (at minimum, today's dot should be live).

**Files to modify:**
- `src/screens/HistoryScreen.svelte`
- `src/lib/stores/habits.js`

**Implementation:**

Add a derived value in `habits.js`:
```javascript
export const todayCompletionPercent = derived(
  [windowCompletion],
  ([$wc]) => {
    const totalDone = Object.values($wc).reduce((sum, w) => sum + w.done, 0);
    const totalHabits = Object.values($wc).reduce((sum, w) => sum + w.total, 0);
    return totalHabits > 0 ? totalDone / totalHabits : 0;
  }
);
```

In `HistoryScreen.svelte`, override today's dot color with the live value. Past days remain mock data.

---

## Phase 3: Dual-Currency UI (Profile)

Lower urgency — this is a design proposal, not a retention fix. But it tests whether users understand two currencies.

---

### 3.1 Protocol Credits on Identity Card

**What:** Add a Protocol Credits balance to the Profile identity card, visually distinct from XP.

**Files to modify:**
- `src/screens/ProfileScreen.svelte`
- `src/lib/stores/user.js`

**Implementation:**

In `user.js`, add:
```javascript
export const protocolCredits = writable({
  balance: 18,
  earnedThisWeek: 12,
  weeklyCap: 25,
  purchased: 6
});
```

In `ProfileScreen.svelte`, below the XP bar, add a credit badge:
```html
<!-- Pro/Max only -->
{#if $user.subscription !== 'Free'}
  <div class="credit-badge">
    ⚡ {$protocolCredits.balance} Protocol Credits
    <span class="credit-detail">{$protocolCredits.earnedThisWeek} earned · {$protocolCredits.purchased} bought</span>
  </div>
{:else}
  <div class="credit-teaser">
    ⚡ Protocol Credits — Upgrade to Pro to earn credits toward rewards
  </div>
{/if}
```

**Styling:**
```css
.credit-badge {
  background: rgba(82, 172, 255, 0.1);
  border: 1px solid rgba(82, 172, 255, 0.25);
  border-radius: 20px;
  padding: 8px 16px;
  color: #52ACFF;
  font-size: 13px;
  font-weight: 500;
}
```

The XP bar stays gold/amber. Credits are blue. Two different colors = two different things.

---

## Phase 4: Polish & Fixes

Lower priority items that improve quality but aren't retention-critical.

---

### 4.1 Settings Bottom Sheet (Stub)

**What:** A gear icon in the Profile header opens a settings bottom sheet. Stub only — show the options, don't build full picker UIs.

**Files to modify:**
- `src/screens/ProfileScreen.svelte`

**Options to list:**
- Wake-up time (show current: 6:30 AM)
- Ideal sleep duration (show current: 8h)
- Chronotype (Early Bird / Third Bird / Night Owl)
- Metabolism (Optimized / Suboptimal)
- Layout Direction (Direction 1 / Direction 2)
- Subscription (Free / Pro / Max)

Each option shows current value but tapping does nothing (or shows a "coming soon" toast).

---

### 4.2 Lock Loadout Button

**What:** The "Lock loadout" button in the Habits Screen exists but has no logic.

**Files to modify:**
- `src/screens/HabitsScreen.svelte`

**Implementation:**

Wire it to prevent habit editing after lock:
1. Add `loadoutLocked` state to `habits.js`
2. When locked: hide "+Add" buttons, disable habit card tap-to-remove, show a lock icon
3. Locking animation: button transforms, subtle haptic note in DOTween comment

---

### 4.3 Focus Timer Stub

**What:** The FAB has a "Focus Mode" action that currently does nothing.

**Files to modify:**
- `src/tools/FocusTimer.svelte` (create)

**Implementation:**

Minimal stub: a full-screen overlay with a countdown timer (25min Pomodoro default). Start/pause/reset buttons. No complex state — just proves the interaction pattern exists.

---

## Implementation Order (Summary)

| # | Task | Impact | Effort | Files |
|---|------|--------|--------|-------|
| 1.1 | Section-complete celebrations | 🔴 High | Low | HabitsScreen, habits.js |
| 1.2 | Lock-in bridge + partial fallback | 🔴 Critical | Medium | HabitsScreen, habits.js |
| 1.3 | XP fly animation | 🔴 High | Low | Shell/Header, new XPOrb component |
| 2.1 | Calendar events inline | 🟡 Medium | Low | HabitsScreen |
| 2.2 | Radar chart data binding | 🟡 Medium | Low | HomeScreen, ProfileScreen |
| 2.3 | Direction toggle in UI | 🟡 Medium | Low | Shell/Header |
| 2.4 | History screen live sync | 🟡 Medium | Low | HistoryScreen, habits.js |
| 3.1 | Protocol Credits on Profile | 🟢 Low | Low | ProfileScreen, user.js |
| 4.1 | Settings bottom sheet stub | 🟢 Low | Low | ProfileScreen |
| 4.2 | Lock loadout button | 🟢 Low | Low | HabitsScreen |
| 4.3 | Focus timer stub | 🟢 Low | Low | New FocusTimer.svelte |

**Estimated total effort:** 2-3 focused sessions. Phase 1 is the priority — ship that and test before polishing Phase 2-4.

---

## Reference Docs

- `SCOPE_Habits_Screen.md` (v3) — Section celebrations, lock-in bridge, ASCII diagrams
- `SCOPE_Profile_Stats.md` — Dual-currency UI, radar charts, growth overlay
- `SCOPE_Home_Screen.md` — Gold Standard radar spec, direction toggle
- `SCOPE_Navigation_Shell.md` — History tab, tab bar updates
- `MASTER_OVERVIEW.md` — Build order, decision matrix

---

## Key Principle

> The app's retention problem isn't the product — it's that users don't feel the product working. They do the work but don't get the hit. Section celebrations create three dopamine hits per day. The lock-in bridge makes the final step impossible to miss. The XP fly animation makes every reward feel earned and physical. Ship these three things and the gap between 34.7% habit completion and where you need it closes.
