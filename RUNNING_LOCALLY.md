# Running the SPiR prototypes locally

Each of the four Q2 prototypes is a single static HTML file with embedded CSS + JS (and GSAP via CDN). No build step, no `npm install`. You can:

* **Open the live URL in a browser** — easiest, no setup
* **Scan the QR from the live URL** — opens fullscreen on your phone, no AirDrop / typing
* **Run locally with one command** — for offline iteration or hacking on the source

---

## Live URLs (no setup)

| # | Prototype | Live | Source on GitHub |
|---|---|---|---|
| 1 | Today's Status | https://todays-status-revamp.vercel.app | [`todays-status-revamp/`](https://github.com/joemacstevens/spir-prototypes/tree/main/todays-status-revamp) |
| 2 | Paywall (V3) | https://paywall-revamp.vercel.app | [`paywall-revamp/`](https://github.com/joemacstevens/spir-prototypes/tree/main/paywall-revamp) |
| 3 | Breathing | https://breathing-module.vercel.app | [`breathing-module/`](https://github.com/joemacstevens/spir-prototypes/tree/main/breathing-module) |
| 4 | Fasting | https://spir-fasting-tracker.vercel.app | [`fasting-tracker/`](https://github.com/joemacstevens/spir-prototypes/tree/main/fasting-tracker) |

All four show:
* Desktop: phone-mock + docs panel side-by-side (the chrome you see)
* Mobile (<=720px viewport): auto-fullscreen, just the app, no chrome
* `?fullscreen=1` query param: forces fullscreen on any width
* **"Phone view ↗"** chip in the topbar: opens a QR-code modal you can scan from your phone

The prototype landing page at https://spir-presentation.vercel.app links all four in one place.

---

## On your phone (the easy way)

1. Open any prototype URL on your laptop
2. Click the purple **Phone view ↗** chip in the topbar (top-right)
3. Scan the QR with your phone's camera
4. The prototype opens fullscreen — no chrome, just the app

The QR encodes the URL with `?fullscreen=1` already appended, so it lands clean.

---

## Run locally (clone + serve)

```sh
# One-time: clone the repo (it's public — no SSH key / login needed for HTTPS)
git clone https://github.com/joemacstevens/spir-prototypes.git
cd spir-prototypes

# Pick a prototype and serve it on localhost
cd todays-status-revamp           # or breathing-module / fasting-tracker / paywall-revamp
python3 -m http.server 8000

# Then open in any browser:
# http://localhost:8000
```

That's it. The prototypes have no dependencies beyond GSAP (loaded from CDN at runtime), so the only thing `python3 -m http.server` needs is to serve `index.html`.

To run two prototypes side-by-side, use different ports:

```sh
(cd breathing-module && python3 -m http.server 8001) &
(cd fasting-tracker && python3 -m http.server 8002) &
# open http://localhost:8001 and http://localhost:8002
```

---

## Updating to the latest prototype

```sh
cd spir-prototypes
git pull origin main
```

Tagged hand-off snapshots are at https://github.com/joemacstevens/spir-prototypes/releases — check `handoff-2026-q2-v1` for the version of the prototypes that match the Trello cards we handed off.

---

## What you cannot do locally (yet)

* The paywall variant V1 / V2 are still in the source but Jay picked V3 on 2026-05-07. V1 / V2 are kept for context only — V3 is the chosen direction.
* The fasting prototype runs an **accelerated clock** (a "16h" fast finishes in ~16 seconds) so the phase-color arc is visible in one sitting. Production uses real elapsed seconds — that's a Unity-side change in `FastingPopup.cs:438–463`.
* The breathing prototype synthesizes audio via Web Audio API (no `.mp3` files); Unity audio is a separate workstream coordinated with Pau.

---

## Specs

Each prototype directory has a `SPEC_*.md` file (the Unity hand-off doc) — that's the source of truth for what to build:

* [`todays-status-revamp/SPEC_AJE-10.md`](https://github.com/joemacstevens/spir-prototypes/blob/main/todays-status-revamp/SPEC_AJE-10.md)
* [`paywall-revamp/ASSUMPTIONS.md`](https://github.com/joemacstevens/spir-prototypes/blob/main/paywall-revamp/ASSUMPTIONS.md) (paywall docs are inside `index.html`'s docs panel; ASSUMPTIONS.md is the changelog)
* [`breathing-module/SPEC_breathing.md`](https://github.com/joemacstevens/spir-prototypes/blob/main/breathing-module/SPEC_breathing.md)
* [`fasting-tracker/SPEC_fasting.md`](https://github.com/joemacstevens/spir-prototypes/blob/main/fasting-tracker/SPEC_fasting.md)

The cross-prototype index lives at [`AJE_PROTOTYPES.md`](https://github.com/joemacstevens/spir-prototypes/blob/main/AJE_PROTOTYPES.md) — start there if you want the bird's-eye view of how the four prototypes hand off to each other (shared shader, Coach's Instincts naming, XP economics).
