# SPEC · AJE-66 — Fasting Tracker Mini-App Hand-off

**Audience:** Abdul (Unity dev) · **Author:** Joe / Claude · **Status:** In Review

| | |
|---|---|
| **Linear ticket** | [AJE-66](https://linear.app/ajeo/issue/AJE-66/fasting-tracker-full-mini-app-revamp-replaces-giant-ring-8-wheel) |
| **Live prototype** | https://spir-fasting-tracker.vercel.app |
| **Source HTML** | [`index.html`](./index.html) — single static file (~1,200 lines), GSAP via CDN, no build step |
| **Owning Unity panel** | `Assets/My Scripts/FastingPopup.cs:9` — `FastingPopup : SingletonBehaviourUI<FastingPopup>` (921 lines) |
| **Existing Unity prefab** | `Assets/Resources/Prefabs/UI/Panels/FastingPopup.prefab` |
| **Hands off to / from** | [SPEC_AJE-10.md](../todays-status-revamp/SPEC_AJE-10.md) (the old "Fasting Window" edit row was renamed to Soundscape — the standalone Fasting Tracker is this prototype) · [SPEC_breathing.md](../breathing-module/SPEC_breathing.md) (mirror mini-app structure, same shader for the ring) · [AJE-11 paywall](../paywall-revamp/) (we killed the 100 XP manual-end-time gate — see feasibility flags) · [AJE-12 XP gate popup](https://linear.app/ajeo/issue/AJE-12) (no current routing, may be added if "Extend +1h" gets a cost) |

---

## TL;DR

The current Fasting popup is functional but architecturally loud — eight scroll-wheel pickers for setup (`SimpleScrollSnap` × 8), a screen-eating fillImage ring with 90pt countdown, weekly bar chart always visible at the bottom, and `VerticalLayoutGroup` padding hacks (top=1300, bottom=2200 → top=150, bottom=3000 — `FastingPopup.cs:210–211, 576–577`) to toggle picker visibility. That last bit is the "scrolls off the page" issue Jay flagged on 2026-05-06 23:07.

**This rebuilds the screen as a mini-app:** three self-contained screens (selection / active / summary), none of which need to scroll, with the same chrome and shader vocabulary as the breathing module ([AJE-65](https://linear.app/ajeo/issue/AJE-65)). Setup drops from 8 scroll-wheel interactions to 3 taps. The active-fast ring drops from ~300px to 168px and gains phase-color (amber → gold → green) plus a heartbeat-lite pulse. Single-tap stop is replaced by a swipe-to-end track to prevent fat-finger cancellation mid-fast.

**Two notable behavior changes:**

1. **The 100 XP manual-end-time gate is killed** (was at `FastingPopup.cs:632–645`). With Coach's Instincts now the headline Max-only feature ([AJE-11](../paywall-revamp/)), gating the basic ability to set a custom fast length looks like friction without value. Custom is free for everyone in this spec — confirm with Jay before Abdul ships.
2. **Weekly bar chart moves out of always-visible.** Currently `BarChartFeedFasting` lives at the bottom of the active screen and contributes to the overflow problem. Spec moves it into a tap-into "Stats" sub-screen accessed from the streak chip; the always-visible representation becomes a small "N-day streak" pill.

Backend touches stay the same: `NetworkAPImanager.weeklyFasting()`, `AddEnergyToTodayCheckIn("fasting", ...)`, `PlayerPrefs` (StartTime / EndTime / TimerRunning). No new model fields required for v1; if product wants the `extend` action to update server-side end times, that's a separate small wire-up.

---

## Visual reference

Live prototype walks through all three screens — selection (with the when-chips, hour slider, preset cards, hold-to-start), active fast (refined ring with phase color, info row, extend + swipe-to-end), and summary (XP celebration block).

**Live:** https://spir-fasting-tracker.vercel.app

The prototype runs an **accelerated clock** (a "16h" fast finishes in ~16 seconds) so reviewers can see all three phases (amber → gold → green) and the completion summary without waiting hours. The Unity implementation uses real-time elapsed seconds — see the `Update()` method at `FastingPopup.cs:438–463`.

---

## Interactive states demonstrated in the prototype

| Interaction | What it does in the prototype | What it maps to in Unity |
|---|---|---|
| **Tap "Just now" / "Earlier today"** | "Just now" sets start time to current time and hides the hour slider. "Earlier today" reveals an inline hour slider (1–12 hours ago) and updates the live preview row at the bottom. | Two `Button`s in a 1:1 grid bound to `StartChoice` enum. "Earlier today" toggles a child `GameObject` containing a `UnityEngine.UI.Slider` (range 1–12). On change, recompute `startTime = DateTime.Now.AddHours(-slider.value)`. |
| **Pick a preset card** (16:8 / 18:6 / 20:4 / 24h / Custom) | Carousel of 5 cards. Selected card gets the amber glow border. **Custom** reveals a 12–48h slider underneath. Live preview row recomputes end time on any change. | `HorizontalScrollSnap` (or `ScrollRect` + `HorizontalLayoutGroup`) of 5 `FastingPresetCard.prefab` instances. Card model: `{ hours: int, label: string, tag: string, description: string }`. Custom card reveals a child `UnityEngine.UI.Slider`. |
| **Hold to start** (1 second hold) | Button fills clockwise as you hold (amber → green gradient). Release before 1s and it resets. Complete and the active screen fades in. | Reuse existing `LongPressButton` already driving `startFastingBtn` (`FastingPopup.cs:225, 310`). Hold duration: 1 second. Fill is now an inset `Image` with `Type = Filled, Fill Method = Horizontal` tweened via `image.DOFillAmount(1, 1f)`. On complete, transition to active screen and call existing `StartCounter()` at `FastingPopup.cs:291` (PlayerPrefs save unchanged). |
| **Refined ring tracks elapsed time** | 168px ring fills clockwise (`stroke-dashoffset` in the prototype, `Image.fillAmount` in Unity). Color crossfades amber → gold → green at 33%/66% phase boundaries. Subtle 1.025× pulse every ~4 seconds. Time inside the ring shows `HH:MM` remaining. Phase eyebrow above the ring labels the current phase ("Building hunger" / "Fat-burning window" / "Approaching completion"). | New `Image` (Type=Filled, Fill Method=Radial360, Fill Origin=Top) using existing `OuterRoundedFillFixed.shader` for caps + glow (same shader AJE-10's hydration ring + AJE-65's progress rings use). Pulse: `ring.transform.DOScale(1.025f, 0.4f).SetEase(Ease.InOutSine).SetLoops(-1, LoopType.Yoyo)` inside a `DOTween.Sequence` with a 3.6s gap. Phase color: `DOTween.To(() => image.color, x => image.color = x, target, 0.5f)` on phase boundary cross. |
| **Tap "+ Extend 1h"** | Adds 1 hour to the end time, updates the "Ends" cell, ring rescales fill proportionally to the new total duration. | Update `PlayerPrefs.SetString("EndTime", newEnd)`, recompute `totalDuration`, animate ring to new `fillAmount` via `image.DOFillAmount(newAmount, 0.4f)`. Optional toast confirmation. Future: route through [AJE-12](https://linear.app/ajeo/issue/AJE-12) gate popup if product wants Extend to cost XP. |
| **Swipe to end fast** | Drag thumb across track. Below 85% drag distance, releases and snaps back. At 85%, triggers completion → summary screen. | Replaces single-tap `stopFasting()` at `FastingPopup.cs:216–224`. Use Unity's `EventSystems.IDragHandler` on the track. On 85% threshold, fire existing `StopFasting()` + transition to summary screen instead of straight back to selection. |
| **Summary screen on completion** | Celebration emoji + "16h 0m fast complete", Duration + Day streak stat cards, XP earned in a glow block (with `back.out(1.7)` pop animation), "Done" / "Start another" buttons. | New `summaryScreen` GameObject (sibling to selection + active). Triggered from completion at `FastingPopup.cs:444–449` instead of going straight to reset. XP value derived from existing logic; "Day streak" reads from `DataConfig.fastingStreak` (new int) or computes locally from `weeklyFasting` data. |

---

## Element-by-element build table

| # | Element | Current in-app | New (prototype) | Unity primitive | DOTween / animation | Owning script | Backend touch? |
|---|---|---|---|---|---|---|---|
| 1 | **Selection screen header** | Standard popup header | Back chevron (left) + "Start a fast" centered + help icon (right) | `Button` (back) + `TMP_Text` (title) + `Button` (help) in a `HorizontalLayoutGroup` | None | `FastingPopup.cs` (new method or inline) | No |
| 2 | **"When did you stop eating?" chips** | 4 scroll wheels for start time (`simpleScrollSnaps[]`, lines 24, 109–152) | Two `Button` chips: "Just now" (default, shows current time) and "Earlier today" (reveals hour slider on tap) | 2× `Button` with `Image` (bg) + 2× `TMP_Text` (name + sub). Tap toggles selected state via outline color. | None | `FastingPopup.cs` | No (was reading from PlayerPrefs only) |
| 3 | **Earlier-today hour slider** | (none — was 4 scroll wheels) | Reveals under chips when "Earlier today" is selected. `UnityEngine.UI.Slider` 1–12, with the live "Started at HH:MM PM" text below | `UnityEngine.UI.Slider` (`minValue=1, maxValue=12, wholeNumbers=true`) + `TMP_Text` for the live readout | Optional: `RectTransform.DOSizeDelta` for the reveal animation; or simpler: `CanvasGroup.DOFade` + `gameObject.SetActive` | `FastingPopup.cs` — bind `OnValueChanged` to recompute startTime | No |
| 4 | **Preset cards row** (16:8 / 18:6 / 20:4 / 24h / Custom) | 4 scroll wheels for end time (`simpleScrollSnaps_End[]`, lines 25, 162–199) | `ScrollRect` (horizontal) of 5 `FastingPresetCard.prefab`. Selected card gets amber border + glow. | `ScrollRect` with `HorizontalLayoutGroup`. Cards: `Image` (bg) + 3× `TMP_Text` (number + tag + description). Tap → toggle active class. | Optional: tap pulse via `transform.DOPunchScale(Vector3.one * 0.04f, 0.2f)` | `FastingPopup.cs` (new `OnPresetSelected(int hours)` method) | No |
| 5 | **Custom hours slider** | XP-gated at 100 XP (`ContinueInputManualEndTime`, lines 630–667) | Reveals when "Custom" preset is selected. `UnityEngine.UI.Slider` 12–48, no XP cost. | `UnityEngine.UI.Slider` (`minValue=12, maxValue=48, wholeNumbers=true`) | Same reveal pattern as #3 | `FastingPopup.cs` — `OnCustomHoursChanged(int hours)` | No |
| 6 | **Live preview row** | (none — wasn't shown until commit) | Always visible at the bottom of selection. Shows duration + start phrasing + computed end time, all bound to current selections. | `Image` (amber-tinted bg) + 2× `TMP_Text` (left + right) | None — direct bindings | `FastingPopup.cs` — derived from selection state | No |
| 7 | **Hold-to-start button** | `LongPressButton` already at `:225, 310` — fills via `fillImage.fillAmount = 1` on success | Same `LongPressButton`, now with the fill rendered as an inset `Image` tweening 0→1 over 1 second; success transitions to active screen | `Button` + `Image` (bg pill) + child `Image` (fill, `Type=Filled, Fill Method=Horizontal`) + `TMP_Text` (label) | `image.DOFillAmount(1, 1f).SetEase(Ease.Linear)` on hold; reset to 0 on release < 100% via `DOFillAmount(0, 0.25f).SetEase(Ease.OutCubic)` | `FastingPopup.cs:225, 310` (existing); on completion call existing `StartCounter()` at `:291` | No (PlayerPrefs save unchanged) |
| 8 | **Active screen header** | Standard popup header | Back chevron (left) + "Fasting" title + streak chip (right) | `Button` + `TMP_Text` + small custom `Pill.prefab` (dot + text) | None | `FastingPopup.cs` | No |
| 9 | **Phase eyebrow** | (none — was a single static label) | Above the ring. Color matches active phase. Text: "Building hunger / Fat-burning window / Approaching completion · Xh Ym in" | `TMP_Text` with `letterSpacing` set in inspector | Crossfade on phase change: `text.DOFade(0, 0.2f).OnComplete(...)` | `FastingPopup.cs:438–463` (`Update`) — set color + text on phase boundary cross | No |
| 10 | **Refined ring** (168px) | `fillImage` at `:30`, ~300px+, no animation, no color tween | 168 × 168 `Image` with `Type=Filled, Fill Method=Radial360, Fill Origin=Top, Clockwise=true`. Color tweens by phase. Soft pulse via DOTween Yoyo. | `Image` using `OuterRoundedFillFixed.shader` for rounded caps + glow. Inner `Image` for track (alpha 0.06). | Fill: `image.DOFillAmount(targetPct, 0.6f)` on tick. Color: `DOTween.To(() => image.color, x => image.color = x, phaseColor, 0.5f)` on phase cross. Pulse: `transform.DOScale(1.025f, 0.4f).SetEase(Ease.InOutSine).SetLoops(-1, LoopType.Yoyo)` inside a `Sequence` with 3.6s gap. | `FastingPopup.cs:438–463` (`Update`) — replace `fillImage.fillAmount = elapsed / totalDuration` with the DOTween calls above | No (mirrors elapsed-time tick) |
| 11 | **Time inside ring** | `remainingTimeText` at `:31`, font 90pt | `HH:MM` remaining at 32px + percent / time-remaining sub | `TMP_Text` (large) + `TMP_Text` (small) stacked in a centered group | None — direct binding | `FastingPopup.cs:438–463` — `text.text = FormatTime(...)` (existing helper) | No |
| 12 | **3-cell info row** (Started / Plan / Ends) | 2 `TMP_Text` labels (`startTimeText`, `endTimeText`, `:27–28`) | 3 cells in a `HorizontalLayoutGroup`: Started / Plan / Ends. Each: small label + value. | `HorizontalLayoutGroup` of 3 `FastingInfoCell.prefab` instances. Each: `Image` bg + 2× `TMP_Text` | None — direct bindings | `FastingPopup.cs:71` (`showTimeinText` becomes a 3-cell update) | No |
| 13 | **Streak chip** | (none — was the bar chart) | Pill in top-right of active screen header. "N-day streak" with a green dot. | `Image` (pill bg) + `Image` (dot, 6px) + `TMP_Text` | Optional: green dot pulses with `DOFade` on tick | `FastingPopup.cs` — reads from `DataConfig.fastingStreak` (new int) or computes from `weeklyFasting` data already fetched at `:50` | No (uses existing data path) |
| 14 | **Extend +1h button** | `extendFastingBtn` at `:23` | Purple pill button on left of actions row. Tap adds 1 hour to end time. | `Button` + `Image` (purple pill bg) + `TMP_Text` | Tap pulse: `transform.DOPunchScale(Vector3.one * 0.05f, 0.25f)` | `FastingPopup.cs:23` — wire `OnClick` to recompute end time + animate ring fill via `DOFillAmount` | Maybe — if Extend gets an XP cost via [AJE-12](https://linear.app/ajeo/issue/AJE-12), the popup fires here |
| 15 | **Swipe-to-end track** | Single-tap stop at `StopFasting()` (`:216–224`) | Drag-to-confirm track. Below 85% drag distance, snaps back. At 85%, triggers completion. | `Image` (bg track) + `Image` (fill overlay, `Type=Filled, Fill Method=Horizontal`) + `Image` (thumb, draggable) + `TMP_Text` (label). Implement drag via `EventSystems.IDragHandler`. | Fill: `image.DOFillAmount(dragPct, 0.05f)` on drag. Snap-back: `image.DOFillAmount(0, 0.25f).SetEase(Ease.OutCubic)`. | `FastingPopup.cs:216–224` — replace direct `StopFasting()` call with the swipe completion path | No |
| 16 | **Summary screen** | (none — went straight back to selection) | Celebration emoji + title + sub-text + 2 stat cards + XP celebration block + 2 buttons | New `summaryScreen` GameObject sibling. Stat cards: 2× `Image` + 2× `TMP_Text`. XP block: `Image` (gradient bg) + `TMP_Text` (number) + `TMP_Text` (label) | XP block pop on first show: `transform.DOPunchScale(Vector3.one * 0.1f, 0.5f).SetEase(Ease.OutBack)` and `transform.DOScale(1, 0.5f).From(0.92f).SetEase(Ease.OutBack(1.7f))`. Emoji rotate-pop: `transform.DORotate(0, 0.6f).From(-15f).SetEase(Ease.OutBack(2f))` | `FastingPopup.cs` (new `ShowSummary()` method) — invoked from completion at `:444–449` and from swipe-end | No (existing data + computed values) |
| 17 | **Bar chart** (current always-visible) | `BarChartFeedFasting` at the bottom (`:34, 35`) | Moved into a tap-into "Stats" sub-screen accessed from the streak chip. Out of v1 scope; placeholder pin. | Existing `BarChartFeedFasting.cs` (161 lines) inside a new `BreathFastStats.prefab` shown via separate panel transition | None new | `FastingPopup.cs` — remove always-on instantiation; show on demand | No (existing `weeklyFasting` data path) |

---

## Token map — prototype CSS → Unity hex

| CSS var | Hex | Where it's used |
|---|---|---|
| `--color-amber` | `#F5A623` | Phase 0–33% (building hunger), when-chip active border, hold-button bg, hour-slider thumb |
| `--color-amber-hi` | `#FFB94A` | Hold-button gradient end |
| `--color-gold` | `#C29A2F` | Phase 33–66% (fat-burning window) |
| `--color-gold-hi` | `#DDB148` | Gold gradient highlight |
| `--color-green` | `#5FD063` | Phase 66–100% (approaching completion), streak chip dot, summary XP block |
| `--color-green-hi` | `#72E876` | Green gradient highlight, completed phase ring |
| `--color-extend` | `#7B68EE` | Extend button color (matches `--accent-purple` shared with AJE-10 / AJE-65) |
| `--color-bg` | `#0A0A0F` | Phone interior root background |
| `--color-bg-2` | `#14141C` | Subtle gradient layer |
| `--color-card-bg` | `rgba(255,255,255,0.04)` | All card / chip backgrounds inside the phone |
| `--color-card-border` | `rgba(255,255,255,0.08)` | Card borders inside the phone |
| `--color-text-primary` | `#F0EDE8` | Primary in-phone text |
| `--color-text-secondary` | `rgba(240,237,232,0.65)` | Subtitles + secondary labels |
| `--color-text-muted` | `rgba(240,237,232,0.4)` | Tertiary labels (uppercase mono) |
| `--ring-size` | `168px` | Refined ring diameter (was ~300px+ in current Unity) |
| `--ring-stroke` | `8` | Ring stroke width |
| `--card-radius` | `18px` | Standard card border radius |
| `--pill-radius` | `100px` | Hold-button + action chips + streak chip |
| `--t-fast` | `0.18s` | Hover/tap state changes |
| `--t-med` | `0.32s` | Reveal/collapse + screen swaps |
| `--t-slow` | `0.5s` | Phase color crossfades |

The full CSS variable block lives at `index.html:18–80`. Treat that as the source of truth and copy any newer entries into Unity serialized fields on `FastingPopup`.

---

## Animation notes — GSAP → DOTween

| Prototype (GSAP / native JS) | Unity (DOTween) | Where in prototype | Where in FastingPopup.cs |
|---|---|---|---|
| `ring.scale: 1.025, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatDelay: 3.6` | `transform.DOScale(1.025f, 0.4f).SetEase(Ease.InOutSine).SetLoops(-1, LoopType.Yoyo)` inside a `DOTween.Sequence` with a 3.6s `AppendInterval` | line ~2270 (heartbeat-lite) | NEW (no current animation) |
| `ringFill.style.stroke = phaseColor` (instant) + `ring-fill { transition: stroke 0.5s }` | `DOTween.To(() => image.color, x => image.color = x, phaseColor, 0.5f).SetEase(Ease.InOutQuad)` | active-tick `phase < 0.33 / 0.66 / 1` branches | NEW — phase boundaries on `Update()` at `:438–463` |
| `ringFill.setAttribute('stroke-dashoffset', circumference * (1 - pct))` | `image.DOFillAmount(pct, 0.6f).SetEase(Ease.OutCubic)` | active-tick fill update | replaces `fillImage.fillAmount = elapsed / totalDuration` at `:451` |
| `holdFill.style.transform = 'scaleX(' + pct + ')'` (manual rAF tick) | `image.DOFillAmount(1, 1f).SetEase(Ease.Linear)` while held | hold-to-start `holdTick()` | reuse existing `LongPressButton` at `:225, 310` |
| `swipeFill.style.transform = 'scaleX(' + pct + ')'` (manual on `pointermove`) | `image.fillAmount = dragPct` (direct set, no tween while dragging) + `image.DOFillAmount(0, 0.25f).SetEase(Ease.OutCubic)` on snap-back | swipe-to-end `swipeMove()` | replaces `StopFasting()` direct call at `:216–224` |
| `gsap.fromTo('.summary-xp', { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' })` | `transform.DOScale(1f, 0.5f).From(0.92f).SetEase(Ease.OutBack(1.7f))` + `canvasGroup.DOFade(1, 0.5f).From(0)` | summary celebration | NEW — invoked on `ShowSummary()` |
| `gsap.fromTo('.summary-emoji', { scale: 0.3, rotate: -15 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2)' })` | `transform.DORotate(Vector3.zero, 0.6f).From(new Vector3(0,0,-15f)).SetEase(Ease.OutBack(2f))` | summary celebration | NEW |
| `screen.classList.toggle('hidden')` (CSS opacity transition 0.32s) | `canvasGroup.DOFade(0/1, 0.32f).OnComplete(() => gameObject.SetActive(false/true))` | screen-state-machine | NEW — three sibling GameObjects with their own `CanvasGroup` |

**One thing to note:** the prototype uses an accelerated clock (`state.protoSpeedMs = 16 * 1000` — a 16h fast finishes in ~16 seconds) so reviewers can see the full phase-color arc in a single sitting. Production uses real elapsed time via existing `Update()` tick at `FastingPopup.cs:438–463` — no acceleration logic needed.

---

## Files Abdul will touch

| File | What changes |
|---|---|
| `Assets/My Scripts/FastingPopup.cs` | Refactor to a screen-state-machine pattern (selection / active / summary). Drop the eight `simpleScrollSnaps`/`simpleScrollSnaps_End` references at lines 24–25 and the picker logic at lines 109–201. Drop the `VerticalLayoutGroup` padding hacks at lines 210–211, 576–577, 599–600, 607–608. Keep `InitializeTimer()` / `StartCounter()` / `Update()` tick logic. Repurpose `StopFasting()` (`:216`) as the swipe-to-end completion. **Kill the manual-end-time XP gate at `:632–645`** (confirm with Jay first). Add `OnPhaseChange(int phaseIndex)` to drive phase color + label crossfade. |
| `Assets/Resources/Prefabs/UI/Panels/FastingPopup.prefab` | New hierarchy: 3 sibling `GameObjects` (selection / active / summary), each with their own `CanvasGroup` for fade swaps. Drop the eight scroll-wheel pickers entirely. Drop the always-visible `BarChartFeedFasting` from the active screen. |
| **New:** `Assets/Resources/Prefabs/UI/FastingPresetCard.prefab` | Sub-prefab — bg `Image` + 3× `TMP_Text`. Bake all 5 instances into the `selection` GameObject's `ScrollRect`, or instantiate from a `FastingPresetCatalog` ScriptableObject. |
| **New:** `Assets/Resources/Prefabs/UI/FastingInfoCell.prefab` | Sub-prefab — bg `Image` + 2× `TMP_Text` (label + value). Three instances on the active screen. |
| **New:** `Assets/Resources/Prefabs/UI/FastingSwipeEnd.prefab` | Swipe-to-end track. Implement drag via `EventSystems.IDragHandler` on the thumb. Track + fill `Image` + thumb `Image` + label `TMP_Text`. |
| **Reuse:** `Assets/Custom Shader/OuterRoundedFillFixed.shader` | Same rounded-cap-with-glow shader AJE-10's hydration ring + AJE-65's progress rings use. Apply to the new 168px ring. |
| **Reuse:** `Assets/My Scripts/LongPressButton.cs` (existing — already wired at `:225, 310`) | Hold-to-start button. Hold duration: 1 second. |

**Existing helpers reused, no changes:**

* `SingletonBehaviourUI<T>` — `FastingPopup:9` already inherits this; same pattern AJE-10 / AJE-65 use.
* `NetworkAPImanager.weeklyFasting()` (`:50`) + `AddEnergyToTodayCheckIn("fasting", DataConfig.userTodaySurvey.fastingValue, ...)` (`:429`) — backend writes unchanged.
* `PlayerPrefs.SetString("StartTime" / "EndTime" / "TimerRunning", ...)` (in `StartCounter` at `:291`) — persistence unchanged.
* `GameManager.SpawnEffect(confettiBlue)` (`:405`) — completion confetti, fired on summary-screen show.
* `FastingCompletePopup.cs` — kept as the underlying completion handler invoked from the summary screen's "Done" path.
* `BarChartFeedFasting.cs` — moved into a separate "Stats" sub-screen accessible from the streak chip; not deleted.

**External callers (don't break):**

* `Assets/My Scripts/CheckInsPanel.cs` — calls `FastingPopup.Show()`. Was the AJE-10 "Fasting Window" edit row; that row was renamed to Soundscape in this revamp pass, but Today's-Status still keeps a path to the standalone tracker via the FAB / footer.
* `Assets/My Scripts/FooterMenu.cs` — footer-bar entry to `FastingPopup.Show()`.
* `Assets/My Scripts/HomeScreenPanel.cs` — home-screen entry.
* `Assets/My Scripts/FocusModePanel.cs` — focus-mode launches Fasting.
* `Assets/My Scripts/FiveHoursBeforeBedTimePopup.cs` — bedtime nudge that can deep-link to Fasting.

All five entry points stay. `Show()` should land on the **active screen** if a fast is already running (PlayerPrefs `TimerRunning=true`), else the **selection screen**.

---

## Open feasibility flags for Abdul

* **Manual end-time XP gate killed.** `FastingPopup.cs:632–645` charged 100 XP just to set a non-preset end time. With Coach's Instincts as the headline Max-only feature ([AJE-11](../paywall-revamp/)), this small gate looked like friction without value. **Confirm with Jay before Abdul ships.** If product wants to keep an XP gate somewhere in the flow, "Extend +1h" would be a more justifiable spot (route it through [AJE-12](https://linear.app/ajeo/issue/AJE-12) gate popup).
* **Bar chart move.** Always-visible `BarChartFeedFasting` at the bottom is part of the "scrolls off the page" problem. Spec moves it into a tap-into "Stats" sub-screen accessed from the streak chip. **Confirm OK to move.** If Jay wants the chart visible on the active screen, the spec needs to grow a 4th screen or the active screen needs a vertical scroll — both undermine the mini-app structure.
* **Active-screen entry behavior.** When `FastingPopup.Show()` is called and PlayerPrefs `TimerRunning=true`, spec lands directly on the active screen and skips selection. Today's flow at `:25–73` doesn't make this explicit. Confirm.
* **Pulse animation density.** Heartbeat-lite (`DOScale(1.025, 0.4f)` every 4s) reads "alive" without overdoing it. If Jay wants louder, we add the liquid-wave shader from `SCOPE_Fasting_Screen.md`. If Jay wants quieter, we drop the pulse entirely and rely on phase color alone.
* **Swipe-to-end threshold.** Spec uses 85% drag distance to confirm. If QA finds 85% too easy to trigger accidentally, raise to 90%; too hard, drop to 80%. Trivial to tweak.
* **Stats sub-screen content.** The bar chart move implies a new "Stats" sub-screen, which is unspec'd in this pass. Quickest scope: just the existing `BarChartFeedFasting` rendered full-bleed in a panel that fades over the active screen, with a back chevron. If product wants more (averages, longest streak, weekly compliance %), that's a follow-up ticket.
* **Notifications.** Currently the panel doesn't fire phase-cross notifications ("You're in your fat-burning window now"). Out of scope here — worth a separate ticket if product wants them.

---

## Acceptance criteria mirror (from [AJE-66](https://linear.app/ajeo/issue/AJE-66))

* [x] **Single-file HTML/CSS/JS prototype** — this `index.html` (~1,200 lines), GSAP via CDN, no build step.
* [x] **Three screens work end-to-end in the browser, none scroll** — selection, active (with accelerated clock), summary.
* [x] **Topbar + phone mock + docs panel chrome matches AJE-10 / AJE-11 / AJE-65** — same Ajeo brand kit, same workspace grid.
* [x] **Spec grounded in `FastingPopup.cs` line numbers** — every Unity reference cites a line in the 921-line source.
* [ ] **Listed as 05 on `spir-presentation` + entry added to `AJE_PROTOTYPES.md` index** — pending, ships in the same commit as this file.
* [ ] **Live at `https://spir-fasting-tracker.vercel.app`** — pending Vercel deploy in this commit.
* [ ] **Abdul confirms feasibility against existing `FastingPopup.cs`** — pending Abdul. Joe to route.

---

*Last updated: 2026-05-07 · Authored alongside the AJE-66 ticket.*
