# SPiR Health — Linear-tracked prototypes

Four deployed web prototypes that hand off to the Unity dev team (Abdul) as Unity-implementable specs. Each one tracks against a Linear ticket in the **Ajeo / SPIR** project.

This doc is the index. The specs themselves are the source of truth.

---

## At a glance

| # | Prototype | Linear | Live | Spec | Status |
|---|---|---|---|---|---|
| 1 | **Today's Status** (Checkin Screen revamp) | [AJE-10](https://linear.app/ajeo/issue/AJE-10) | https://todays-status-revamp.vercel.app | [SPEC_AJE-10.md](./todays-status-revamp/SPEC_AJE-10.md) | In Review (Jay's 2026-05-01 + 2026-05-06 direction landed) |
| 2 | **Paywall** (Pro vs Max comparative-analysis screen) | [AJE-11](https://linear.app/ajeo/issue/AJE-11) | https://paywall-revamp.vercel.app | docs panel inside [`paywall-revamp/index.html`](./paywall-revamp/index.html) + changelog [`ASSUMPTIONS.md`](./paywall-revamp/ASSUMPTIONS.md) | In Review (Jay picked **V3** on 2026-05-07 — that closes the BLOCKING list) |
| 3 | **Breathing module** (existing in-app screen, polished) | [AJE-65](https://linear.app/ajeo/issue/AJE-65) | https://breathing-module.vercel.app | [SPEC_breathing.md](./breathing-module/SPEC_breathing.md) | Backlog (spec authored 2026-05-06; awaiting Abdul feasibility review) |
| 4 | **Fasting Tracker** (mini-app revamp — replaces giant ring + 8-wheel pickers) | [AJE-66](https://linear.app/ajeo/issue/AJE-66) | https://spir-fasting-tracker.vercel.app | [SPEC_fasting.md](./fasting-tracker/SPEC_fasting.md) | Backlog (spec authored 2026-05-07; one open question for Jay — confirm the killed manual-end-time XP gate) |

The four Vercel deployments are **independent projects** in the same `joemacstevens-projects` team (each subdir has its own `.vercel/project.json`). The parent `spir-prototypes` repo's `vercel.json` only deploys `spir-app/dist`, so each prototype must be deployed via `vercel deploy --prod` from inside its own subdirectory.

---

## How they hand off to each other

The four prototypes look like separate screens but share a few live mechanics. Knowing how they connect is the part most likely to drift if the specs are read in isolation.

### Coach's Instincts (the AI feature)

* **Renamed by Jay 2026-05-06 12:47 ET** from "SPiR Ai · Actionable insights" → **"Coach's Instincts"** (after a back-and-forth on whether "Instincts" or "Insights" pairs better with "Actionable" — they ended up dropping the prefix).
* **AJE-11 paywall** advertises it as Max-only with a gold ★ marker on the V3 Max card and on the V1 comparison row. Jay picked V3 on 2026-05-07.
* **AJE-10 Today's Status** doesn't surface the feature directly today, but any future "what's new" or "upgrade" cue on the Checkin Screen should use this exact name.
* **Breathing + Fasting specs don't reference Coach's Instincts** — the AI feature is unrelated.

### Deep Breathing & Soundscape (XP-discounted activities)

* **AJE-10's compact-card row "Open Deep Breathing →"** routes to the breathing module's `BreathworkPanel.Show()` flow. The Deep Breathing satellite ring above the row reads back the day's cycle total from `BreathworkPanel`'s `counterIndex` × pattern duration → minutes.
* **AJE-11 paywall** advertises Max-only "75% off Soundscape + Deep Breathing XP" — that discount applies to the gate cost owned by [AJE-12](https://linear.app/ajeo/issue/AJE-12) (the in-app XP gate popup), not to a feature flag on the activity panels themselves.
* **AJE-65 SPEC_breathing.md** is where the breathing-side implementation lives — `DataConfig.maxDiscount` is read at `BreathworkPanel.cs:120, 144, 148, 179, 183, 189`.

### XP-gate mechanics (clarified by Jay 2026-05-06 23:01)

Earlier specs (mine) described a "5-cycle refund" for Deep Breathing as if entry XP got refunded on 5-cycle completion. **Jay clarified this is wrong:** _"It replaces it. XP is gone once spent to activate it, therefore the +5 and the +20 are just merely rewards."_ Net:

* **AJE-12 gate popup** deducts XP on entry (one-way). No refund pathway exists.
* **AJE-65 breathing panel** continues to award the existing +5 free / +20 Pro at the 5-cycle mark via `GameManager.AddandRemoveXp(temp, "+", "Breathing Five Cycles")` (`BreathworkPanel.cs:380, 415`) — that's a **standalone reward**, not a refund of the gate cost.
* **AJE-66 fasting** doesn't currently route through the gate popup. Future "Extend +1h" with an XP cost would be the natural place to add it.

The breathing spec + paywall ASSUMPTIONS.md still describe the mechanic in the older "refund" framing — that's a course-correction commit pending separately.

### XP costs per gate (clarified by Jay 2026-05-06 23:01)

**Flat across gates** (not scaled per gate type). Was previously open.

---

## Doc shape (so all four feel like a set)

Each spec follows the same skeleton — read them in this order to skim quickly:

1. **Header table** — audience, Linear ticket, live URL, source HTML path, owning Unity panel, hand-off direction
2. **TL;DR** — the change in 3-5 sentences, with the backend dependencies up top
3. **Visual reference** — screenshots and / or live URL
4. **Interactive states demonstrated in the prototype** — table mapping each in-prototype interaction to its Unity counterpart
5. **Element-by-element build table** — every visual element with its Unity primitive, DOTween call, owning script, and backend touch
6. **Token map (CSS → Unity hex)** — design tokens copied 1:1 to Unity serialized fields
7. **Spacing / typography / animation notes** — DOTween idioms reused from existing scripts where possible
8. **Files Abdul will touch** — concrete `Assets/...` paths, including which existing helpers to reuse without modifying
9. **Open feasibility flags** — the things most likely to need Abdul's input before starting
10. **Acceptance criteria mirror** — pasted from the Linear ticket, with checkboxes

If the AJE-11 paywall ever gets pulled out of `index.html` into its own `SPEC_AJE-11.md`, this is the skeleton to use. For now it lives embedded in the variant docs panels (now narrowed to V3 since Jay picked it).

---

## Working with the deploys

Live URLs are tied to Vercel production aliases. To update one:

```sh
cd prototypes/<prototype>
vercel deploy --prod         # promotes to <prototype>.vercel.app
```

Auto-deploy from `main` does **not** apply — the parent `vercel.json` only handles `spir-app/dist`. Push-to-main alone will not refresh the prototype URLs.

For local review without touching Vercel:

```sh
cd prototypes/<prototype>
python3 -m http.server 8000
# then open http://localhost:8000
```

---

## Punted / out-of-scope items (tracked elsewhere)

* **AJE-13 (XP Packages on website Stripe)** — Jay paused 2026-05-02 (users racking 15-20K XP/week against current packages)
* **AJE-64 Loot Box v1** — fresh ticket, no prototype yet
* **XP Multipliers + Automatic Lock-In (Max-only)** — advertised by AJE-11, not yet specced
* **Notifications during a fast** ("you're in your fat-burning window now") — out of scope on AJE-66; worth a separate ticket
* **Fasting Stats sub-screen** — AJE-66 moves the always-visible bar chart into a tap-into Stats screen but doesn't fully spec that screen; if product wants more than a chart (averages, longest streak, weekly compliance %), that's a follow-up
* **Antigravity Svelte app project** at `prototypes/MASTER_OVERVIEW.md` + `SCOPE_*.md` is a separate Mar-2026 doc series, not part of this AJE-tracked set

### Resolved since the prior version of this doc

* ✅ **"Whole UI needs a revamp"** (Jay 2026-05-06 01:27 SMS) — clarified 2026-05-06 23:01 as the **Fasting Clock/Tracker**. Now AJE-66, this doc's #4.
* ✅ **XP costs per gate** — Jay said flat, 2026-05-06 23:01.
* ✅ **"Fasting (Manual Input)" as a 5th XP gate** — Jay's "whole UI needs a revamp" clarification (Fasting Tracker UI) likely scoped that earlier 01:26 SMS to the Fasting Tracker UI, not to a new XP gate. Gates stay at 4.
* ✅ **Paywall variant** — Jay picked V3 on 2026-05-07.
* ✅ **V2 testimonial selection** — moot since V3 doesn't surface individual quotes (just the "Trusted by Season 1 alumni" rating block).

---

*Last updated: 2026-05-07 · Authored alongside [SPEC_fasting.md](./fasting-tracker/SPEC_fasting.md) and the AJE-66 hand-off bundle.*
