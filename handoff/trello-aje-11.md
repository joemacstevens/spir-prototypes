# Trello packet · AJE-11 · Paywall (V3 — Jay's pick)

Paste-ready Trello card content. See [`README.md`](./README.md) for how to use.

---

## 1. Card title

```
[AJE-11] Paywall — SPiR Pro vs Max (V3 chosen direction, $5 / $25 monthly)
```

---

## 2. Card description

```markdown
**Live prototype:** https://paywall-revamp.vercel.app
**Spec (source of truth):** Docs panel inside https://github.com/joemacstevens/spir-prototypes/blob/main/paywall-revamp/index.html — V3 section (lines 1346–1612)
**Changelog:** https://github.com/joemacstevens/spir-prototypes/blob/main/paywall-revamp/ASSUMPTIONS.md
**Linear ticket:** https://linear.app/ajeo/issue/AJE-11
**Phone view (V3 only, fullscreen):** https://paywall-revamp.vercel.app?fullscreen=1#v3

## What ships

Net-new `PaywallPanel` prefab. Two side-by-side tier cards (Pro / Max), Max elevated with a "Best value" ribbon and embedded "Trusted by Season 1 alumni" social-proof block. CTA per card hands off to the website User Dashboard via `Application.OpenURL("https://spir.health/dashboard?subscribe={tier}")` — Stripe wiring stays on the website (no in-app payment).

Pricing is locked: **Pro $5/mo, Max $25/mo, monthly only, no trial** (per Jay 2026-05-01 23:35 SMS).

## Feature delta (Max-only unless noted)

- **Coach's Instincts** (the AI feature, renamed by Jay 2026-05-06 12:47 from "SPiR Ai · Actionable insights")
- **Automatic Lock-In**
- **75% XP Discount on Soundscape + Deep Breathing** (applies via DataConfig.maxDiscount — wired in BreathworkPanel; AJE-12 owns the gate-cost calculation)
- **XP Multipliers**
- **Custom Loadout slots:** Free 3 / Pro 7 / Max 14 (tier-scaled, all tiers can use)
- **SPiR Leagues — Rivalry XP cost:** Highest (Free) → Lower (Pro) → Lowest (Max)

Framing line on every variant: *Every feature is on Free; Pro and Max just lower the XP cost.*

## Hand-off references

- Cross-prototype index: https://github.com/joemacstevens/spir-prototypes/blob/main/AJE_PROTOTYPES.md
- Local run instructions: https://github.com/joemacstevens/spir-prototypes/blob/main/RUNNING_LOCALLY.md
- Hand-off snapshot tag: https://github.com/joemacstevens/spir-prototypes/releases/tag/handoff-2026-q2-v1

## Notes

- V1 (Comparative Matrix) and V2 (Social-Proof Hero) are still in the source for context but Jay picked **V3** on 2026-05-07. Build V3 only.
- Mobile users land directly on V3 fullscreen (`?fullscreen=1#v3`); desktop reviewers can still scroll to V1 / V2.
- "Trusted by Season 1 alumni" testimonials in V3 reference Rachel B. / Jessica S. / Matt F. (sourced from spir.health on 2026-05-06; Jay confirmed selection 2026-05-06 23:01).

## Open items (none blocking — all closed by Jay's 2026-05-06 / 2026-05-07 replies)

- ✅ Pricing, billing cadence, trial, feature delta, AI naming, testimonials all resolved
- ⚠ Stripe URL pattern needs verification with the website team (not blocking the panel build)
```

---

## 3. Checklist items (paste into a "Files Abdul will touch" checklist)

```
Assets/Resources/Prefabs/UI/Panels/PaywallPanel.prefab — net-new prefab; two tier cards in a HorizontalLayoutGroup, "Best value" ribbon on Max, embedded social-proof block
Assets/Resources/Prefabs/UI/TierCard.prefab — sub-prefab (one per Pro / Max instance); name + tagline + price + feature list + CTA
Assets/Resources/Prefabs/UI/EmbeddedRating.prefab — Max-card-only sub-prefab; star row + "Trusted by Season 1 alumni" line
Assets/Scripts/PaywallPanel.cs — net-new; CTA wiring to Application.OpenURL("…/dashboard?subscribe={tier}"); inherit from SingletonBehaviourUI<PaywallPanel>
Assets/Scripts/SingletonBehaviourUI.cs — register PaywallPanel as a known panel type (existing pattern)
Assets/Scripts/GameManager.cs — add OpenPaywall(string source) entry point so other panels (XP gate, locked feature) can launch it
Bake the "Best value" ribbon as a pre-rotated sprite (don't rotate at runtime — anti-alias degrades on Adreno GPUs)
Verify Stripe URL pattern with the website team before shipping
```
