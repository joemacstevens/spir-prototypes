# SPEC · AJE-65 — Breathing Module Unity Hand-off

**Audience:** Abdul (Unity dev) · **Author:** Joe / Claude · **Status:** In Review

| | |
|---|---|
| **Linear ticket** | [AJE-65](https://linear.app/ajeo/issue/AJE-65/breathing-module-unity-hand-off-spec-for-the-existing-prototype) |
| **Live prototype** | https://breathing-module.vercel.app |
| **Source HTML** | [`index.html`](./index.html) — single static file (3,210 lines), GSAP via CDN, no build step |
| **Owning Unity panel** | `Assets/My Scripts/BreathworkPanel.cs:8` — `BreathworkPanel : SingletonBehaviourUI<BreathworkPanel>` (460 lines) |
| **Existing Unity prefab** | `Assets/Resources/Prefabs/UI/Panels/BreathworkPanel.prefab` |
| **Hands off to / from** | [SPEC_AJE-10.md](../todays-status-revamp/SPEC_AJE-10.md) (Today's Status Deep Breathing row routes here) · [AJE-11 paywall](https://github.com/joemacstevens/spir-prototypes/tree/main/paywall-revamp) (Pro/Max XP economics live here) |

---

## TL;DR

The breathing module already exists in the Unity app at `BreathworkPanel.cs` — this spec is **not** a from-scratch build. It's the visual + interaction reference for tightening the existing screen up to match the web prototype: glow layers around the breathing circle, SVG-style progress rings with rounded caps, an inline 5-cycle XP bar, a post-session summary screen, and a richer pattern-selection carousel. The four breathing patterns and their timings are unchanged.

**Two notable behavior changes vs the current panel:**

1. **5-cycle XP refund mechanic for Deep Breathing** (per Jay's 2026-05-01 23:46 SMS, captured in [AJE-12](https://linear.app/ajeo/issue/AJE-12)). Today the panel only *awards* XP at every 5-cycle mark via `GameManager.AddandRemoveXp(temp, "+", "Breathing Five Cycles")` (`BreathworkPanel.cs:380` and `:415`). The new mechanic is a gate-then-refund: starting a Deep Breathing session deducts XP up front (XP-gated entry, AJE-12), and completing 5 cycles refunds it. **This is net-new code** — the current panel doesn't deduct on entry. See feasibility flags.

2. **75% Max XP discount on Deep Breathing + Soundscape** (per Jay's 2026-05-01 23:35 SMS, [AJE-11](https://linear.app/ajeo/issue/AJE-11)). The data substrate already exists: `DataConfig.maxDiscount` and `DataConfig.proDiscount` are referenced at `BreathworkPanel.cs:120, 144, 148, 179, 183, 189`. Confirm the discount is wired into the gate-cost calculation in AJE-12, not the post-cycle award.

Everything else — the pattern data, the circle-scale-and-color animation, the `Image.DOFillAmount` ring fill, the +5 / +20 XP free/Pro split — is already implemented. The hand-off is mostly visual polish and the new XP-gate mechanic.

---

## Visual reference

Live prototype walks through all five surfaces — selection carousel, countdown, animation screen, summary, music modal:

**Live:** https://breathing-module.vercel.app

The web prototype was reverse-engineered from `BreathworkPanel.cs` then enhanced. Where the existing Unity panel and the prototype diverge, the prototype is the target.

---

## Interactive states demonstrated in the prototype

| Interaction | What it does in the prototype | What it maps to in Unity |
|---|---|---|
| **Swipe pattern carousel + tap a card** | Horizontal-scroll carousel with 4 pattern cards (4-7-8 / Box / Huberman / Resonant). Active card has a `MotionPathPlugin`-driven dot tracing its breathing curve. Dot indicator below carousel: 24px-wide active, 8px-circle inactive. Tapping a card sets the pattern and reveals the **Start** button. | Existing `breathSelectionScrollbar` value-change handler at `BreathworkPanel.cs:32–66` already drives `breathModeDots[]` active/inactive in 0.25 bands. Keep that, but replace static cards with prefab `BreathPatternCard.prefab` that has a small SVG-equivalent line drawing of the curve. The MotionPath dot is optional polish — stub as `Image` traveling along a `BezierPath` if needed, or skip until v2. |
| **Tap Start → countdown → animation screen** | 3-second countdown overlay fades over the selection screen (lines 1247–1250 in prototype), then the animation screen fades in. | Existing `startBreathing()` at `BreathworkPanel.cs:73–117` already does the screen swap via `CanvasGroup.DOFade(0/1, 0.5f)` on `breathSelection` / `breathAnimation`. Add a 3-count `TextMeshProUGUI` countdown overlay; reuse `DOFade` for the count digits. |
| **Breathing animation runs** | Central circle scales 1× → 2.2× on INHALE (sine.inOut, duration = phase seconds) and back on EXHALE; phase color crossfades over 1s; concentric SVG rings (3/4/4/2 active per pattern) fill via `stroke-dashoffset` over the phase duration; cycle counter increments "x1, x2…"; XP bar fills 20% per cycle, resets every 5. | All implemented at `BreathworkPanel.cs:385–431`. See element table for line numbers. |
| **Tap pause** | Pause icon → play icon, animation freezes mid-phase, breathing circle holds its current scale + color. | Existing `playBreathingAnimation()` at `BreathworkPanel.cs:277–326`. The pause path already calls `DOKill()` on the circle (line 444). |
| **Tap end** | Aborts the run, returns to selection. The web prototype shows a summary screen (cycles / minutes / pattern / avg-cycle-time / XP earned) before going back; the existing Unity panel skips straight to selection. **Add the summary screen as a new substate.** | Existing `endBreathing()` at `BreathworkPanel.cs:218–247` clears state and shows selection. New: insert `breathSummary` panel between, populated from `counterIndex` + pattern timings, with a "Back" button that triggers the existing flow. |

---

## Element-by-element build table

Each row declares exactly how the element gets built in Unity. **Blank cells = flag for discussion before starting.**

| # | Element | Current in-app | New (prototype) | Unity primitive | DOTween / animation | Owning script | Backend touch? |
|---|---|---|---|---|---|---|---|
| 1 | **Selection carousel** | Horizontal scroll, 4 mode tiles, dot indicators below | Same shape but each card has a small SVG-style line preview of its breathing curve, plus a premium-only badge on Huberman | `ScrollRect` + 4× `BreathPatternCard.prefab` (new sub-prefab). Each card: `Image` (background) + `Image` (mini line preview, baked sprite per pattern) + `TMP_Text` (name + timing) + optional badge `Image` | Existing scrollbar value-change at `BreathworkPanel.cs:32–66`; no new tween | `BreathworkPanel.cs` | No |
| 2 | **Active-card breathing-curve dot** | None | A 6px glowing dot traces the breathing curve drawn on the active card, looping in sync with the pattern's timings | `Image` (dot) animated along a `BezierPath` (use a path-tracing utility, or `Vector3.Lerp` along a baked `LineRenderer` path). **Optional polish — skip for v1 if the curve sprite alone reads.** | `transform.DOPath(pathPoints, totalDuration, PathType.CatmullRom).SetLoops(-1, LoopType.Restart)` | `BreathworkPanel.cs` | No |
| 3 | **Dot indicator row** | Already exists, 4 dots toggled active per scrollbar band | Active dot is a 24px-wide pill (lozenge), inactive dots are 8px circles | `Image` × 4 with two states each (pill sprite vs circle sprite). Existing `breathModeDots[]` array stays. | Tween width via `RectTransform.DOSizeDelta` if you want smooth transitions; skip if instant swap reads fine | `BreathworkPanel.cs` | No |
| 4 | **Start button** | Already exists | Pill button "Start [Pattern Name]" with a slight pulse animation while idle | `Button` + `Image` (pill bg) + `TMP_Text`. | `transform.DOScale(1.04f, 1f).SetLoops(-1, LoopType.Yoyo)` | `BreathworkPanel.cs` | No |
| 5 | **3-second countdown overlay** | Doesn't exist | "3 → 2 → 1 → GO" digits crossfade over the selection screen, then animation screen fades in | New `GameObject` with `CanvasGroup` + `TMP_Text`. | Sequence: `text.DOFade(1, 0.15f).OnComplete(...)` → swap text → repeat. Then `selection.DOFade(0, 0.5f)` and `animation.DOFade(1, 0.5f)`. | `BreathworkPanel.cs` (new method `RunCountdown()`) | No |
| 6 | **Breathing circle** (center) | Single `Image`, scales 1× → 4× on INHALE (`blueCircle.transform.DOScale(...)` at `BreathworkPanel.cs:426`) | Same scaling but capped at **2.2×** for mobile-viewport reasons (the prototype found 4× overflows). Add a soft outer **glow layer** (separate `Image` with radial gradient sprite) at 1.6× the circle's scale. | Inner: `Image` (circle, color-tweened). Outer: `Image` (radial-gradient sprite). | Inner: `transform.DOScale(2.2f or 1f, phaseSeconds).SetEase(Ease.InOutSine)`. Outer: `transform.DOScale(1.6f * inner, phaseSeconds).SetEase(Ease.InOutSine)`. Color: `image.DOColor(phaseColor, 1f)` (existing line 429–430). | `BreathworkPanel.cs:420–431` (`UpdateStatus`) — change DOScale target from `4` → `2.2` and add the glow tween | No |
| 7 | **Concentric progress rings** | `progressImages[]` array of 4 `Image` elements, `DOFillAmount(1, duration)` per phase at `BreathworkPanel.cs:423` | Same fill behavior but with **rounded stroke caps + drop-shadow glow** matching the prototype's SVG appearance | 4× `Image` with `Type = Filled, Fill Method = Radial360, Fill Origin = Top, Clockwise = true`. Use the existing `Assets/Custom Shader/OuterRoundedFillFixed.shader` for caps + glow (the same shader AJE-10's hydration ring uses). | Existing `image.DOFillAmount(1, phaseSeconds)` stays. | `BreathworkPanel.cs:385–418, 350–383` | No |
| 8 | **Status text** ("INHALE" / "HOLD" / "EXHALE") | `Status_Text.text = status` at `BreathworkPanel.cs:422` | Same, 22px bold, 6px letter-spacing, all-caps. Crossfades when phase changes. | `TMP_Text` with `letterSpacing` set in inspector. | `text.DOFade(0, 0.2f).OnComplete(() => { text.text = newPhase; text.DOFade(1, 0.2f); })` | `BreathworkPanel.cs:422` | No |
| 9 | **Cycle counter** ("x1", "x2"…) | `Counter_Text.text = "x" + counterIndex` at `BreathworkPanel.cs:358, 393` | Same, 15px, secondary text color, just below status | `TMP_Text` | None — direct binding | `BreathworkPanel.cs:357–358, 392–393` | No |
| 10 | **XP bar** (5-cycle) | `xpBar.fillAmount = progressStep * 0.2f` (`BreathworkPanel.cs:364, 399`) | 6px height linear-gradient fill (accent → light blue), label below: "x / 5 cycles" | `Image` (track) + `Image` (fill, `Type = Filled, Fill Method = Horizontal`) + `TMP_Text` label | `xpBar.DOFillAmount(progressStep / 5f, 0.4f).SetEase(Ease.OutCubic)` (currently set instantly — adding a small tween smooths it) | `BreathworkPanel.cs:361–365, 396–400` | No |
| 11 | **Music / volume control overlay** | Doesn't exist | Modal opened by music-note icon: track list + volume slider | New `BreathworkMusicModal.prefab`. **Out of scope for this hand-off** if Unity needs the audio assets first — flag and defer. | Slide-up `transform.DOAnchorPosY(0, 0.4f).SetEase(Ease.OutCubic)` | New script `BreathworkMusicModal.cs` | Maybe — depends on where audio assets live |
| 12 | **End button** | Returns to selection | Returns via the new summary screen (element 13) | `Button` | None | `BreathworkPanel.cs:216–247` (`endBreathing`) — insert summary-show step before `breathSelection` activates | No |
| 13 | **Post-session summary screen** | Doesn't exist | Stats grid (cycles / minutes / pattern / avg-cycle), XP-earned celebration block, "Back to selection" button | New `breathSummary` `GameObject` (sibling of `breathSelection` and `breathAnimation`). 2×2 grid of `TMP_Text` stat cards + `Image` celebration block + `Button`. | `summary.DOFade(0→1, 0.4f)` on enter; the XP block can `transform.DOPunchScale(Vector3.one * 0.1f, 0.4f)` on first show | `BreathworkPanel.cs` (new `ShowSummary()` method) | No |

---

## Token map — prototype CSS → Unity hex

| CSS var | Hex | Where it's used |
|---|---|---|
| `--color-inhale` | `#52ACFF` | Breathing circle on INHALE phase |
| `--color-hold` | `#EFF7FF` | Breathing circle on HOLD phase (off-white) |
| `--color-exhale` | `#00FA3A` | Breathing circle on EXHALE phase |
| `--color-bg` | `#0A0A1A` | Animation-screen background |
| `--color-accent` | `#52ACFF` | XP bar gradient start, dot indicators, accent UI |
| `--color-accent-light` | (inferred from gradient) | XP bar gradient end |
| `--color-text-primary` | (system white) | Status text "INHALE"/"HOLD"/"EXHALE" |
| `--color-text-secondary` | (system muted) | Cycle counter "x1, x2…", XP label |
| `--circle-base-scale` | `1` | Default scale of breathing circle |
| `--circle-max-scale` | `2.2` | Inhale-target scale (capped from Unity's `4` per `BreathworkPanel.cs:426`) |
| `--transition-fade` | `0.5s` | Screen-to-screen `CanvasGroup.DOFade` duration |
| `--color-transition` | `1s` | `Image.DOColor` duration on phase change (matches `BreathworkPanel.cs:430`) |
| `--xp-per-set-free` | `5` | Free-tier XP awarded per 5-cycle set (`BreathworkPanel.cs:289, 376, 411`) |
| `--xp-per-set-pro` | `20` | Pro-tier XP awarded per 5-cycle set (`BreathworkPanel.cs:289, 376, 411`) |
| `--cycles-per-set` | `5` | Cycle count for one XP set, drives bar reset (`BreathworkPanel.cs:361, 396`) |

The full CSS variable block lives at `index.html:19–64` — 18 tokens. Treat that block as the source of truth and copy any newer entries into Unity serialized fields on `BreathworkPanel`.

---

## Animation notes — GSAP → DOTween

The prototype uses GSAP. Every animation in the prototype maps to an existing DOTween idiom.

| Prototype (GSAP) | Unity (DOTween) | Where in prototype | Where in BreathworkPanel.cs |
|---|---|---|---|
| `gsap.to(circle, { scale: 2.2, duration: phase, ease: 'sine.inOut' })` | `transform.DOScale(2.2f, phase).SetEase(Ease.InOutSine)` | lines 2323–2327 | line 426 (currently `DOScale(4)`, no easing — set `Ease.InOutSine`) |
| `gsap.to(circle, { backgroundColor: color, duration: 1, ease: 'power1.inOut' })` | `image.DOColor(color, 1f).SetEase(Ease.InOutQuad)` | lines 2337–2347 | lines 429–430 |
| `gsap.fromTo(ring, { strokeDashoffset: c }, { strokeDashoffset: 0, duration: phase, ease: 'none' })` | `image.DOFillAmount(1f, phase).SetEase(Ease.Linear)` | lines 2354–2358 | line 423 |
| `gsap.to(glowLayer, { scale: 1.6 * circleScale, duration: phase, ease: 'sine.inOut' })` | `glow.DOScale(1.6f * inner, phase).SetEase(Ease.InOutSine)` | line 2330 | **NEW** (glow layer doesn't exist on the current panel) |
| `gsap.to(xpBar, { width: pct + '%', duration: 0.4, ease: 'power2.out' })` | `xpBar.DOFillAmount(pct, 0.4f).SetEase(Ease.OutCubic)` | lines 2420–2436 | lines 364, 399 (currently set instantly) |
| `gsap.to(panel, { autoAlpha: 1, duration: 0.5 })` | `canvasGroup.DOFade(1f, 0.5f)` | various | lines 166–168, 206–208 |

**One thing not portable:** the prototype uses GSAP's `MotionPathPlugin` to trace a glowing dot along an SVG breathing curve on each pattern card (line 1987 onward). DOTween has no direct equivalent. If you want it: (a) skip for v1, (b) bake the path as a `BezierPath` and animate an `Image` along it with `transform.DOPath()`, or (c) approximate with a sprite-sheet animation. Mark optional.

---

## XP economics — Pro / Max + 5-cycle refund

This is the part most likely to change between this spec and the AJE-12 in-app popup work. Capturing the current state and the deltas.

### What's already implemented in `BreathworkPanel.cs`

* **Free / Pro split:** `if (DataConfig.isProSubscribed) { temp = 20; } else { temp = 5; }` at lines 280–289, 368–376, 403–411
* **Award call:** `GameManager.instance.AddandRemoveXp(temp, "+", "Breathing Five Cycles")` at lines 380, 415 — fires when the 5th cycle completes
* **Discount fields read but not yet wired into a deduction:** `DataConfig.maxDiscount` and `DataConfig.proDiscount` are referenced at lines 120, 144, 148, 179, 183, 189. Today these read but don't drive anything user-visible — they're scaffolding for the AJE-11/AJE-12 work.

### What [AJE-11 paywall](../paywall-revamp/index.html) commits to

* **Max-only**: 75% XP discount on Soundscape + Deep Breathing (per Jay's 2026-05-01 23:35 SMS)
* **Max-only**: XP Multipliers
* **All tiers can play** — the gate just costs more XP at lower tiers

### What [AJE-12 in-app gate popup](https://linear.app/ajeo/issue/AJE-12) commits to

* The XP-spend popup that fires when a user taps "Open Deep Breathing" from any surface (including AJE-10's Today's Status row). On confirm, deduct XP via `GameManager.AddandRemoveXp(cost, "-", "Deep Breathing Gate")`.

### What's net-new in this spec

The **5-cycle refund** mechanic — per Jay's 2026-05-01 23:46 SMS, *Deep Breathing earns the gate XP back after 5 cycles complete*. Today the panel only awards XP at the 5-cycle mark; the new mechanic is "deduct on entry, refund on completion." Touch points:

* On gate confirm (AJE-12 lives): deduct the gate cost, post via `AddandRemoveXp(cost, "-", "Deep Breathing Gate")`. The cost is `baseCost * (1 - DataConfig.maxDiscount)` for Max, `baseCost * (1 - DataConfig.proDiscount)` for Pro.
* On 5-cycle completion (this spec): the existing `AddandRemoveXp` award now serves *two roles*:
  1. The refund of the gate cost (label: `"Deep Breathing 5-cycle refund"`)
  2. The bonus XP reward (`+5 free` / `+20 Pro` — existing semantics)
* These should be two separate calls so the journal shows both, not one combined entry.

This is the **single biggest open feasibility flag** — see below.

---

## Files Abdul will touch

| File | What changes |
|---|---|
| `Assets/My Scripts/BreathworkPanel.cs` | Capped `DOScale(4)` → `DOScale(2.2f, phase).SetEase(Ease.InOutSine)`. Add glow-layer scale tween. Add countdown overlay + summary screen states. Add 5-cycle refund-side `AddandRemoveXp` call paired with the existing bonus award. Smooth XP bar via `DOFillAmount` instead of instant set. |
| `Assets/Resources/Prefabs/UI/Panels/BreathworkPanel.prefab` | New: glow layer `Image`, countdown overlay `GameObject`, summary screen `GameObject` (stats grid + XP celebration + back button), `BreathPatternCard.prefab` instances replacing static carousel children, music-modal stub if scoping audio. |
| `Assets/Custom Shader/OuterRoundedFillFixed.shader` | **Reuse** for the 4 progress rings (rounded caps + glow). Already used by AJE-10's hydration / soundscape mini-rings — this matches that visual language. |
| New: `Assets/Resources/Prefabs/UI/BreathPatternCard.prefab` | Pattern-card sub-prefab — bg `Image` + curve-preview `Image` (baked sprite per pattern) + name `TMP_Text` + premium badge `Image`. |
| New: `Assets/Resources/Prefabs/UI/BreathSummary.prefab` | Post-session summary stats grid + XP block. |

**Existing helpers reused, no changes needed:**

* `SingletonBehaviourUI<T>` — `BreathworkPanel:8` already inherits this; same pattern AJE-10's `CheckInsPanel` uses.
* `GameManager.AddandRemoveXp(amount, "+|-", label)` — XP journal entry. Used at `:380`, `:415`. Same call surface for both the refund and the existing bonus award.
* `DataConfig.isProSubscribed`, `DataConfig.isMaxSubscribed`, `DataConfig.maxDiscount`, `DataConfig.proDiscount` — already present, read by `BreathworkPanel`. Just need to be wired into the gate-cost calculation in AJE-12.
* `CanvasGroup.DOFade()` for screen transitions — existing pattern at `:166–168, 206–208`.

**External callers (don't break):**

* `Assets/My Scripts/FooterMenu.cs` — calls `BreathworkPanel.Show()` and `.Hide()` (footer bar entry point).
* `Assets/My Scripts/FocusModePanel.cs` — calls `BreathworkPanel.Show()` (focus-mode launches breathing).
* **NEW caller** for [AJE-10](../todays-status-revamp/SPEC_AJE-10.md): the Today's-Status compact-card "Open Deep Breathing →" button needs to call `BreathworkPanel.Show()` (gate popup fires from AJE-12 in between). The Deep Breathing satellite ring on Today's Status reads back from `BreathworkPanel`'s `counterIndex` × pattern duration → minutes.

---

## Open feasibility flags for Abdul

* **5-cycle XP refund mechanic is net-new.** The current panel only *awards* XP at the 5-cycle mark. Adding the refund means: (a) AJE-12's gate popup deducts on confirm, (b) `BreathworkPanel` posts a *refund* call at the 5-cycle mark in addition to the existing bonus. Confirm with product whether the bonus award (+5 free / +20 Pro) stays on top of the refund or replaces it — Jay's SMS implied **both** ("earned back after every 5 cycles" suggests the gate cost is refunded; the existing bonus is separate).
* **Hardcoded 1s color-transition duration vs variable phase duration.** `Image.DOColor(newColor, 1f)` at `BreathworkPanel.cs:430` is hardcoded to 1 second regardless of phase length. For Resonant (5s phases) this is fine; for Huberman's 1s INHALE it overshoots. Consider making the duration `Min(1f, phaseSeconds * 0.4f)` or similar.
* **`DOScale(4)` overflows mobile.** The prototype clamped to 2.2× because 4× was too much circle on a 390-wide phone. Decide whether to match the prototype (2.2×) or keep the existing 4× and instead clamp the parent container. The prototype's choice produces a calmer animation.
* **Commented-out XP block at `:228–268`.** Old free/Pro logic that was never deleted. Worth a follow-up cleanup ticket — not blocking this spec.
* **MotionPath dot polish on selection cards.** No direct DOTween equivalent. Skip for v1 unless the curve sprite alone reads as static; revisit if QA flags the cards as visually flat.
* **Audio.** The prototype uses Web Audio API to synthesize bells / whoosh / drone — it does NOT load `.mp3` files. If Unity wants audio, the prototype is not your reference; coordinate with Pau (animator/sound). Audio is **out of scope** for this spec.

---

## Acceptance criteria mirror (from [AJE-65](https://linear.app/ajeo/issue/AJE-65))

* [x] **`SPEC_breathing.md` lands in the same shape as SPEC_AJE-10.md** — this document.
* [x] **Spec grounded in the actual `BreathworkPanel.cs` line numbers, not invented** — every Unity reference cites a line in the 460-line source.
* [ ] **Cross-linked: AJE-10's spec points here for the Deep Breathing route; AJE-11's docs reference the 5-cycle refund + 75% discount mechanics here** — pending the AJE-10 / AJE-11 spec updates that ship in the same commit as this file.
* [ ] **Index doc at `prototypes/AJE_PROTOTYPES.md`** — pending, ships in the same commit.
* [ ] **Abdul confirms feasibility against the existing `BreathworkPanel.cs` panel** — pending Abdul. Joe to route.

---

*Last updated: 2026-05-06 · Authored alongside the AJE-65 ticket.*
