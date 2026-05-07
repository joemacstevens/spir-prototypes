# Trello packet · AJE-65 · Breathing module (existing screen, polished)

Paste-ready Trello card content. See [`README.md`](./README.md) for how to use.

---

## 1. Card title

```
[AJE-65] Breathing module — visual polish + summary screen (NOT a rebuild)
```

---

## 2. Card description

```markdown
**Live prototype:** https://breathing-module.vercel.app
**Spec (source of truth):** https://github.com/joemacstevens/spir-prototypes/blob/main/breathing-module/SPEC_breathing.md
**Linear ticket:** https://linear.app/ajeo/issue/AJE-65
**Phone view (fullscreen):** https://breathing-module.vercel.app?fullscreen=1

## What changes

The breathing module already lives in the Unity app at `BreathworkPanel.cs` (460 lines). This is **visual polish and one new substate**, not a rewrite. The four breathing patterns (4-7-8, Box, Huberman, Resonant) and their timings stay exactly as they are today.

Polish items:
- **Soft outer glow halo** around the breathing circle (1.6× the inner scale, color-matched to active phase)
- **Cap circle scale at 2.2×** instead of the existing `DOScale(4)` at line 426 (4× overflows mobile viewports per prototype testing)
- **Concentric progress rings get rounded caps + glow** — apply existing `OuterRoundedFillFixed.shader` (same shader Today's Status uses for hydration ring)
- **3-second countdown overlay** between Start tap and animation begin
- **Post-session summary screen** (new substate) — cycles / minutes / pattern / avg-cycle / XP earned, with a celebratory pulse on the XP block
- **Smoother XP bar fill** via `DOFillAmount` tween (currently set instantly at lines 364, 399)
- **Pattern-card carousel** with mini line-art curve previews (replaces static buttons)

## XP behavior (clarified by Jay 2026-05-06 23:01)

The existing 5-cycle award (+5 free / +20 Pro at lines 380, 415) **stays as-is, standalone**. There is **no refund mechanic** — entry XP from the AJE-12 gate is one-way. Quoting Jay: "It replaces it. XP is gone once spent to activate it, therefore the +5 and the +20 are just merely rewards."

## Backend touch

- `DataConfig.maxDiscount` and `DataConfig.proDiscount` are already read inside `BreathworkPanel.cs` (lines 120, 144, 148, 179, 183, 189) — wire them into the gate-cost calculation owned by AJE-12
- `GameManager.AddandRemoveXp()` call at lines 380, 415 stays unchanged
- No new model fields required for v1

## Hand-off references

- Cross-prototype index: https://github.com/joemacstevens/spir-prototypes/blob/main/AJE_PROTOTYPES.md
- Local run instructions: https://github.com/joemacstevens/spir-prototypes/blob/main/RUNNING_LOCALLY.md
- Hand-off snapshot tag: https://github.com/joemacstevens/spir-prototypes/releases/tag/handoff-2026-q2-v1

## Open feasibility flags

- Hardcoded 1s color-transition at line 430 overshoots Huberman's 1s INHALE — suggest `Min(1f, phaseSeconds * 0.4f)`
- MotionPath dot polish on selection cards has no direct DOTween equivalent — skip for v1 if static curve reads
- Audio is out of scope here; coordinate with Pau separately
```

---

## 3. Checklist items (paste into a "Files Abdul will touch" checklist)

```
Assets/My Scripts/BreathworkPanel.cs — cap DOScale(4) → DOScale(2.2f).SetEase(Ease.InOutSine) at line 426; add glow-layer scale tween; add countdown overlay + summary screen states; smooth XP bar via DOFillAmount instead of instant set
Assets/Resources/Prefabs/UI/Panels/BreathworkPanel.prefab — new glow-layer Image, countdown overlay GameObject, summary screen GameObject (stats grid + XP celebration + back button), pattern-card sub-prefab instances
Assets/Resources/Prefabs/UI/BreathPatternCard.prefab — NEW sub-prefab; bg + curve preview sprite + name + premium badge
Assets/Resources/Prefabs/UI/BreathSummary.prefab — NEW sub-prefab; post-session stats grid + XP celebration block
Assets/Custom Shader/OuterRoundedFillFixed.shader — reuse for the 4 progress rings (no shader changes)
Bind to existing helpers without modifying: SingletonBehaviourUI<BreathworkPanel>, GameManager.AddandRemoveXp, DataConfig.isProSubscribed/isMaxSubscribed/maxDiscount/proDiscount, CanvasGroup.DOFade
Don't break external callers: FooterMenu.cs, FocusModePanel.cs (both call BreathworkPanel.Show())
NEW caller: AJE-10's "Open Deep Breathing →" button on Today's Status compact card calls BreathworkPanel.Show()
Optional cleanup: commented-out XP block at lines 228–268 (old free/Pro logic, dead code)
```
