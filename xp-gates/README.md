# XP Payment Gates · AJE-12

In-app popup for spending XP, with paywall fallback. Two popup directions for soundscapes; Unity hand-off spec for Abdul.

## Live

- Prototype: <https://xp-gates.vercel.app>
- Linear: [AJE-12](https://linear.app/ajeo/issue/AJE-12)
- Paywall (handoff target): <https://paywall-revamp.vercel.app> (AJE-11)

## What's here

| File | Purpose |
|---|---|
| [`index.html`](./index.html) | Single-file proposal doc — both variants, mock catalog, balance simulator, telemetry debug panel |
| [`SPEC.md`](./SPEC.md) | Build instructions for Abdul. Refactors `BuySubscriptionPopup` in place. Names every method by `file:line`. |
| [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) | Placeholders mapped to the 3 open questions in the ticket + 5 secondary questions |
| `spec-screenshots/` | 4 PNGs (sufficient + insufficient × A + B), embedded in the Linear comment |

## How to read it

1. Open the live URL. Top of the page has the variant nav.
2. Each variant has a phone-mock (left) and notes/spec column (right).
3. Tap any locked tile (⚡) on either phone — popup opens. Walk both states using the **Balance Simulator** above each phone (set to 20 XP for insufficient, 230 XP for sufficient).
4. Watch the **Telemetry** panel (bottom-right) light up — 4 events fire across the flows: `gate_shown` / `spend_confirmed` / `spend_canceled` / `paywall_cued`.
5. The "See plans" CTA in the insufficient state deep-links to the AJE-11 paywall prototype at <https://paywall-revamp.vercel.app>.

## Run locally

```bash
# from prototypes/xp-gates/
python3 -m http.server 8100
open http://localhost:8100/
```

The launch.json config `xp-gates` is configured for `python3 -m http.server 8100 --directory prototypes/xp-gates`.

## Re-capture screenshots

The 4 PNGs in `spec-screenshots/` are produced by a small puppeteer script:

```bash
cd spec-screenshots
npm install puppeteer
node capture.mjs   # uses http://localhost:8100/ by default; override with SCREENSHOT_URL
```

`node_modules` and `package-lock.json` are gitignored.

## Stack

Vanilla HTML / CSS / JS. No build step. No framework. Mirrors `paywall-revamp` and `todays-status-revamp` — single-file proposal-doc pattern that Vercel serves from `prototypes/xp-gates/`.
