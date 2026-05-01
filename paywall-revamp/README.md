# Paywall Revamp · Prototype

Live: **[paywall-revamp.vercel.app](https://paywall-revamp.vercel.app)**

3 distinct paywall directions for **SPiR Pro vs SPiR Max**, built as a single proposal
doc (phone mock + Unity implementation spec per variant). Designed to be reviewed
so you can pick a direction before dev work starts.

Tracking: [AJE-11](https://linear.app/ajeo/issue/AJE-11/paywall-spir-pro-vs-spir-max-comparative-analysis-screen) (Backlog).

## Variants

| | Tagline | Inspiration |
|---|---|---|
| **V1 · Comparative Matrix** | "See every difference at a glance." | Canva Pro vs Business pricing page |
| **V2 · Social-Proof Hero** ⭐ | "You're in good hands." | `IMG_9931.PNG` — your "superstar" |
| **V3 · Tiered Cards w/ Embedded Rating** | "Pick your plan." | Athlytic Pro + Opal |

Each variant section in `index.html` includes:

- Phone mock (CSS-rendered, ~390×content)
- Numbered annotations mapping each UI element to a Unity script/prefab
- "Files to touch" — concrete `Assets/...` paths for Abdul
- Unity implementation notes — variant-specific gotchas (rating stars via `Image.Type=Filled`, ScrollRect for testimonials, `Toggle` for annual switch, etc.)
- Tradeoff table (visual impact, implementation cost, sprint risk, etc.)
- "Why we'd pick this variant"

## Files

- [`index.html`](./index.html) — the full proposal (sticky nav at top, three variant sections, footer)
- [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) — every placeholder maps to one of the 5 BLOCKING questions you need to answer on AJE-11

## Run locally

```bash
open prototypes/paywall-revamp/index.html
```

No build step — vanilla HTML + inline CSS + inline JS.

## Deploy

Linked to Vercel project `joemacstevens-projects/paywall-revamp`. Production URL is
aliased at `paywall-revamp.vercel.app`. Manual deploy:

```bash
cd prototypes/paywall-revamp
vercel --prod --scope joemacstevens-projects
```
