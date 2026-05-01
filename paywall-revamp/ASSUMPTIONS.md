# ASSUMPTIONS — paywall-revamp

This prototype uses **placeholder data** in every numerical, copy, and tier field.
Each row below maps a placeholder to one of the 5 BLOCKING questions you need to answer
on [AJE-11](https://linear.app/ajeo/issue/AJE-11/paywall-spir-pro-vs-spir-max-comparative-analysis-screen).

Once you answer, swapping placeholders for real values is a find-and-replace pass
in `index.html`.

| Placeholder | Used in | BLOCKING question |
|---|---|---|
| SPiR Pro · **$9.99/mo** | V1, V2, V3 | Final price points for SPiR Pro and SPiR Max? |
| SPiR Max · **$19.99/mo** | V1, V2, V3 | (same) |
| Annual: Pro $79.99/yr · Max $179.99/yr (Save 25%) | V3 toggle | Billing cadence — monthly only? annual option? |
| 7-day free Max trial — no card required | V3 only | Free trial or intro offer? |
| 10 invented features split Pro / Max / Pro&Max | V1, V2, V3 | Full feature differentiation — what's Max-only beyond AI insights? |
| 3 mock testimonials (Megan I., Devon T., Priya K.) | V2, V3 | Copy for the rating/review element — real, mock, or placeholder? |
| Rating "4.8 stars / 250K reviews / 1.2M downloads" | V2, V3 | (same) |

## Confirmed (not placeholder)

- ✅ **SPiR Ai (Actionable insights)** — Max only. Confirmed by you on 2026-04-24.

## Invented Features (PLACEHOLDER, drawn from app surface in CLAUDE.md)

These are filler so the comparison table has something to render. **All must be confirmed by you** before shipping.

| Feature | Pro | Max |
|---|---|---|
| SPiR Ai (Actionable insights) | — | ✓ ⭐ confirmed |
| Sleep tracking & debt analysis | ✓ | ✓ |
| Hydration tracker | ✓ | ✓ |
| Fasting timer | ✓ | ✓ |
| Breathwork library — basic 4 sessions | ✓ | — |
| Breathwork library — full 20+ sessions | — | ✓ |
| Habit loadouts | up to 3 | unlimited |
| HRV trends & weekly reports | — | ✓ |
| Multi-device sync | ✓ | ✓ |
| Priority support | — | ✓ |

## CTA Wiring (Mock)

- Every "Subscribe" / "Get Max" / "Continue with Pro" button currently does **nothing functional** — the click handler runs `console.log("would open Stripe checkout: { tier, period }")`.
- In production, per your 2026-04-24 SMS, these CTAs hand off to the **existing Stripe flow on the website User Dashboard**.
- Stripe wiring is **out of scope** for this ticket — tracked downstream in AJE-13.
- Unity-side, the CTA would be `Application.OpenURL("https://spir.health/dashboard?subscribe={tier}&period={period}")` or similar.

## What needs to happen before this ships

1. You answer the 5 BLOCKING questions above.
2. Replace placeholders in `index.html` with confirmed values.
3. Real review copy / rating numbers swapped in (or backend endpoint wired up if reviews are dynamic).
4. Pick ONE variant. The Linear ticket can then move to **In Review**, with the chosen variant's **Files to touch** section becoming the dev brief for Abdul.
5. Stripe URL pattern confirmed with the website team so the Unity `Application.OpenURL` call points at the right endpoint.
