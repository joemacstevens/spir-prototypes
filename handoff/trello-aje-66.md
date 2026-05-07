# Trello packet · AJE-66 · Fasting Tracker (mini-app revamp)

Paste-ready Trello card content. See [`README.md`](./README.md) for how to use.

---

## 1. Card title

```
[AJE-66] Fasting Tracker — mini-app revamp (3 screens, refined ring, swipe-to-end)
```

---

## 2. Card description

```markdown
**Live prototype:** https://spir-fasting-tracker.vercel.app
**Spec (source of truth):** https://github.com/joemacstevens/spir-prototypes/blob/main/fasting-tracker/SPEC_fasting.md
**Linear ticket:** https://linear.app/ajeo/issue/AJE-66
**Phone view (fullscreen):** https://spir-fasting-tracker.vercel.app?fullscreen=1

## What changes

Reimagined as a **focused mini-app** (per Jay 2026-05-07): three self-contained screens (selection / active / summary), none of which need to scroll. Same backbone as today — same `FastingPopup.cs` lifecycle, same `PlayerPrefs` state, same `weeklyFasting` API call.

**Setup drops from 8 scroll-wheel pickers to 3 taps:**
- "When did you stop eating?" → Just now / Earlier today + hour slider
- 5 preset cards: 16:8 / 18:6 / 20:4 / 24h / Custom (Custom is free — see below)
- Hold-to-start (1 second) using existing `LongPressButton` mechanic

**Active screen replaces the giant ring:**
- 168px ring (was ~300px+ screen-eater) using `OuterRoundedFillFixed.shader` — same shader AJE-10 / AJE-65 use
- Phase color amber → gold → green at 33% / 66% boundaries (`DOTween.To` color)
- Soft heartbeat-lite pulse every ~4s (`DOScale(1.025).Yoyo`)
- 3-cell info row (Started / Plan / Ends)
- Extend +1h button + **swipe-to-end** track (replaces single-tap stop — prevents fat-finger cancellation)

**Completion summary** (new substate): celebration emoji + duration + day streak + XP earned (with `back.out(1.7)` pop animation) + Done / Start another buttons.

## Two notable behavior changes

1. **Killed the 100 XP manual-end-time gate** at `FastingPopup.cs:632–645`. With Coach's Instincts as the headline Max-only feature (AJE-11), this small gate looked like friction without value. **Custom is free for everyone.** Confirmed with Jay 2026-05-07.
2. **Weekly bar chart moves out of always-visible.** `BarChartFeedFasting` was a major contributor to the "scrolls off the page" problem. Spec moves it into a tap-into "Stats" sub-screen accessed from a small streak chip on the active screen.

## What stays the same

- All four entry points (`CheckInsPanel.cs`, `FooterMenu.cs`, `HomeScreenPanel.cs`, `FocusModePanel.cs`, `FiveHoursBeforeBedTimePopup.cs`) keep calling `FastingPopup.Show()` — just lands on the active screen if a fast is running, else selection
- `NetworkAPImanager.weeklyFasting()` (line 50) and `AddEnergyToTodayCheckIn("fasting", …)` (line 429) — backend writes unchanged
- `PlayerPrefs` save/load (StartTime / EndTime / TimerRunning) unchanged
- `FastingCompletePopup.cs` invoked from the new summary screen
- `BarChartFeedFasting.cs` — moved into the new Stats sub-screen, not deleted

## Hand-off references

- Cross-prototype index: https://github.com/joemacstevens/spir-prototypes/blob/main/AJE_PROTOTYPES.md
- Local run instructions: https://github.com/joemacstevens/spir-prototypes/blob/main/RUNNING_LOCALLY.md
- Hand-off snapshot tag: https://github.com/joemacstevens/spir-prototypes/releases/tag/handoff-2026-q2-v1

## Notes for the prototype

The prototype runs an **accelerated clock** (a "16h" fast finishes in ~16 seconds) so reviewers can see the full phase-color arc without waiting hours. Production uses real elapsed seconds via existing `Update()` tick at lines 438–463.

## Open feasibility flags

- Active-screen entry behavior (Show() lands on active vs selection based on PlayerPrefs `TimerRunning`) — confirm the routing
- Swipe-to-end threshold is 85% in the prototype — easy to tweak if QA finds it too easy / hard
- Stats sub-screen content unspec'd beyond "show the existing BarChartFeedFasting" — if product wants more, separate ticket
- Notifications during a fast ("you're in your fat-burning window now") — out of scope; separate ticket if wanted
```

---

## 3. Checklist items (paste into a "Files Abdul will touch" checklist)

```
Assets/My Scripts/FastingPopup.cs — refactor to screen-state-machine pattern (selection/active/summary); drop 8 simpleScrollSnaps references at lines 24–25; drop picker logic at lines 109–201; drop VerticalLayoutGroup padding hacks at lines 210–211, 576–577; keep InitializeTimer/StartCounter/Update tick logic; repurpose StopFasting() (line 216) as swipe-to-end completion; KILL the manual-end-time XP gate at lines 632–645 (Jay confirmed 2026-05-07)
Assets/Resources/Prefabs/UI/Panels/FastingPopup.prefab — new hierarchy: 3 sibling GameObjects (selection/active/summary), each with own CanvasGroup for fade swaps; drop the 8 scroll-wheel pickers entirely; drop always-visible BarChartFeedFasting from active screen
Assets/Resources/Prefabs/UI/FastingPresetCard.prefab — NEW sub-prefab; bg + 3 TMP_Texts; bake all 5 instances or instantiate from FastingPresetCatalog ScriptableObject
Assets/Resources/Prefabs/UI/FastingInfoCell.prefab — NEW sub-prefab; bg + 2 TMP_Texts (label + value); 3 instances on active screen
Assets/Resources/Prefabs/UI/FastingSwipeEnd.prefab — NEW sub-prefab; track + fill + thumb; implement drag via EventSystems.IDragHandler; 85% threshold to confirm
Assets/Resources/Prefabs/UI/FastingSummary.prefab — NEW sub-prefab; celebration emoji + 2 stat cards + XP block + 2 buttons
Assets/Custom Shader/OuterRoundedFillFixed.shader — reuse for the 168px ring (same shader AJE-10 / AJE-65 use)
Bind to existing helpers without modifying: SingletonBehaviourUI<FastingPopup>, NetworkAPImanager.weeklyFasting + AddEnergyToTodayCheckIn, PlayerPrefs save/load, GameManager.SpawnEffect(confettiBlue), FastingCompletePopup.cs, LongPressButton (already wired at lines 225, 310)
Don't break external callers: CheckInsPanel.cs, FooterMenu.cs, HomeScreenPanel.cs, FocusModePanel.cs, FiveHoursBeforeBedTimePopup.cs (all call FastingPopup.Show())
Add OnPhaseChange(int phaseIndex) to drive ring color + label crossfade at 33% / 66% boundaries
Add heartbeat-lite pulse: ring.transform.DOScale(1.025f, 0.4f).SetEase(Ease.InOutSine).SetLoops(-1, LoopType.Yoyo) inside a DOTween.Sequence with 3.6s gap
Active screen Show() routing — land on active screen if PlayerPrefs TimerRunning=true, else selection screen
```
