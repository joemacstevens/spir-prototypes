# Source-of-truth changelog — paywall-revamp

All five BLOCKING questions on [AJE-11](https://linear.app/ajeo/issue/AJE-11/paywall-spir-pro-vs-spir-max-comparative-analysis-screen) are now **RESOLVED**. This doc is the audit trail for what landed in `index.html`, with a single open item left.

## Resolved

| Question | Answer | Source | Landed in |
|---|---|---|---|
| Final price points | **Pro $5/mo · Max $25/mo** | Jay (SMS, 2026-05-01 23:35 ET) | V1 CTAs · V2 mini-tier · V3 tier cards |
| Billing cadence | **Monthly only** | Jay (SMS, 2026-05-01 23:35 ET) | V3 annual toggle removed; footer reads "Monthly only · Cancel anytime" |
| Free trial / intro offer | **No** | Jay (SMS, 2026-05-01 23:35 ET) | V3 trial-hook badge removed; Max CTA changed from "Start free 7-day trial" to "Get Max" |
| Feature differentiation | See feature matrix below | Jay (SMS, 2026-05-01 23:35 ET) | V1 comparison table rebuilt · V2 mini-tier rebuilt · V3 cards rebuilt |
| Rating / review copy | **Real testimonials from spir.health (Season 1 site)** | Jay (SMS, 2026-05-01 23:35 ET) — "We still have the reviews from the Season 1 website"; URL confirmed by Joe 2026-05-06 | V2 testimonial cards (Rachel B., Jessica S., Matt F.) · rating block reframed to "Trusted by Season 1 alumni" |
| AI feature naming | **Coach's Instincts** (formerly "SPiR Ai · Actionable insights") | Jay (SMS, 2026-05-06 12:47 ET, after a back-and-forth that resolved on Coach's Instincts as the brand-aligned alternative to "Insights") | V1 feature row · V2 mini-tier · V3 Max card feature list (with gold ★ confirmed marker) |

## Confirmed feature matrix

Free is the canonical experience — every feature is available there. Pro and Max scale up by lowering XP costs and unlocking automation.

| Feature | Free | Pro ($5/mo) | Max ($25/mo) |
|---|---|---|---|
| Coach's Instincts (Ai) | — | — | ✓ |
| Automatic Lock-In | — | — | ✓ |
| 75% XP Discount on Soundscape + Deep Breathing | — | — | ✓ |
| XP Multipliers | — | — | ✓ |
| Custom Loadout slots | 3 | 7 | 14 |
| SPiR Leagues — Rivalry XP cost | Highest | Lower | Lowest |

Source: Jay (SMS, 2026-05-01 23:35 ET).

### Where these mechanics live in code

The paywall is just the surface that *advertises* these benefits — the implementation lives elsewhere. For Abdul's reference:

- **75% XP Discount on Soundscape + Deep Breathing** — `DataConfig.maxDiscount` is already referenced inside `BreathworkPanel.cs` (lines 120, 144, 148, 179, 183, 189). The discount needs to be wired into the gate-cost calculation owned by [AJE-12](https://linear.app/ajeo/issue/AJE-12) (the in-app XP gate popup), not the post-cycle award. See [SPEC_breathing.md](../breathing-module/SPEC_breathing.md) "XP economics" for the full Pro/Max ladder.
- **5-cycle XP refund on Deep Breathing** (Jay 2026-05-01 23:46) — the existing `BreathworkPanel.cs:380, 415` only awards bonus XP every 5 cycles; the new mechanic is "deduct on entry, refund on completion." Spec'd in [SPEC_breathing.md](../breathing-module/SPEC_breathing.md) "XP economics" — flagged as the biggest open feasibility item there.
- **XP Multipliers (Max-only)** and **Automatic Lock-In** — not yet specced. Likely a follow-up after AJE-12 lands.
- **Loadout slots / Rivalry XP cost** — out of scope for the breathing spec; will be specced in their own panels.

## CTA wiring (still mock)

- Every CTA opens a fake confirmation overlay and `console.log("would open Stripe checkout: { tier, period }")`.
- Stripe is wired on the website User Dashboard already — the in-app CTA hand-off in production becomes `Application.OpenURL("https://spir.health/dashboard?subscribe={tier}")` (monthly-only — `period` and `trial` params no longer needed).
- AJE-13 owns the website-side Stripe XP-package definitions; Jay paused that ticket on 2026-05-02 because users were racking 15-20K XP/week against the current packages. Don't touch.

## One open item

- **Confirm with Jay that the three Season 1 testimonials chosen (Rachel B., Jessica S., Matt F.) are the ones we want to surface in V2.** The two we omitted are Sarah K. (Marketing Director) and the INSPiRED tribe quote — both available at https://www.spir.health if Jay would rather swap one in. The three we picked all carry a Level + streak + XP badge, which gives the V2 cards a richer texture.

## What needs to happen before this ships

1. Jay confirms the testimonial selection above (or swaps).
2. Jay picks a single variant (V1 / V2 / V3) — the docs section for the chosen variant becomes the Unity dev brief for Abdul.
3. Stripe URL pattern verified with the website team so the Unity `Application.OpenURL` call points at the right endpoint.

## Sibling specs

This paywall is one of three deployed prototypes that hand off to each other. Index: [AJE_PROTOTYPES.md](../AJE_PROTOTYPES.md).

- **[Today's Status (AJE-10)](../todays-status-revamp/SPEC_AJE-10.md)** — the Checkin Screen that surfaces the Coach's Instincts AI feature renamed here, and routes to the breathing module via the Deep Breathing row.
- **[Breathing module (AJE-65)](../breathing-module/SPEC_breathing.md)** — where the 75% Max XP discount and 5-cycle refund mechanics this paywall advertises actually get implemented.
