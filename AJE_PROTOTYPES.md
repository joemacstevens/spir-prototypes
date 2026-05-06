# SPiR Health — Linear-tracked prototypes

Three deployed web prototypes that hand off to the Unity dev team (Abdul) as Unity-implementable specs. Each one tracks against a Linear ticket in the **Ajeo / SPIR** project.

This doc is the index. The specs themselves are the source of truth.

---

## At a glance

| # | Prototype | Linear | Live | Spec | Status |
|---|---|---|---|---|---|
| 1 | **Today's Status** (Checkin Screen revamp) | [AJE-10](https://linear.app/ajeo/issue/AJE-10) | https://todays-status-revamp.vercel.app | [SPEC_AJE-10.md](./todays-status-revamp/SPEC_AJE-10.md) | In Review (Jay's 2026-05-01 + 2026-05-06 direction landed) |
| 2 | **Paywall** (Pro vs Max comparative-analysis screen) | [AJE-11](https://linear.app/ajeo/issue/AJE-11) | https://paywall-revamp.vercel.app | docs panel inside [`paywall-revamp/index.html`](./paywall-revamp/index.html) + changelog [`ASSUMPTIONS.md`](./paywall-revamp/ASSUMPTIONS.md) | In Review (BLOCKING questions resolved 2026-05-01 / 2026-05-06; testimonial selection pending Jay) |
| 3 | **Breathing module** (existing in-app screen) | [AJE-65](https://linear.app/ajeo/issue/AJE-65) | https://breathing-module.vercel.app | [SPEC_breathing.md](./breathing-module/SPEC_breathing.md) | Backlog (spec authored 2026-05-06; awaiting Abdul feasibility review) |

The three Vercel deployments are **independent projects** in the same `joemacstevens-projects` team (each subdir has its own `.vercel/project.json`). The parent `spir-prototypes` repo's `vercel.json` only deploys `spir-app/dist`, so each prototype must be deployed via `vercel deploy --prod` from inside its own subdirectory.

---

## How they hand off to each other

The three prototypes look like separate screens but share three live mechanics. Knowing how they connect is the part most likely to drift if the specs are read in isolation.

### Coach's Instincts (the AI feature)

* **Renamed by Jay 2026-05-06 12:47 ET** from "SPiR Ai · Actionable insights" → **"Coach's Instincts"** (after a back-and-forth on whether "Instincts" or "Insights" pairs better with "Actionable" — they ended up dropping the prefix).
* **AJE-11 paywall** advertises it as Max-only with a gold ★ marker on the V3 Max card and on the V1 comparison row.
* **AJE-10 Today's Status** doesn't surface the feature directly today, but any future "what's new" or "upgrade" cue on the Checkin Screen should use this exact name.
* **Breathing spec doesn't reference Coach's Instincts** — the AI feature is unrelated to breathing.

### Deep Breathing (the activity)

* **AJE-10's compact-card row "Open Deep Breathing →"** routes to the breathing module's `BreathworkPanel.Show()` flow. The Deep Breathing satellite ring above the row reads back the day's cycle total from `BreathworkPanel`'s `counterIndex` × pattern duration → minutes.
* **AJE-11 paywall** advertises Max-only "75% off Soundscape + Deep Breathing XP" — that discount applies to the gate cost owned by [AJE-12](https://linear.app/ajeo/issue/AJE-12) (the in-app XP gate popup), not to a feature flag on the breathing module itself.
* **AJE-65 SPEC_breathing.md** is where the implementation actually lives — `DataConfig.maxDiscount` is read at `BreathworkPanel.cs:120, 144, 148, 179, 183, 189`. The spec calls out the wiring as one of its open feasibility flags.

### 5-cycle XP refund

* **Jay's 2026-05-01 23:46 SMS** ("Deep Breathing earned back after every 5 cycles") established a gate-deduct-and-refund mechanic for Deep Breathing.
* **AJE-11 paywall ASSUMPTIONS.md** documents the mechanic as advertised.
* **AJE-12 (XP gate popup)** owns the entry deduction.
* **AJE-65 SPEC_breathing.md** owns the refund-side implementation. It's flagged as the spec's biggest open feasibility item: today the panel only *awards* +5 free / +20 Pro at the 5-cycle mark via `BreathworkPanel.cs:380, 415` — the refund is net-new code.

---

## Doc shape (so all three feel like a set)

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

If the AJE-11 paywall ever gets pulled out of `index.html` into its own `SPEC_AJE-11.md`, this is the skeleton to use. For now it lives embedded in the variant docs panels.

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

* **"Whole UI needs a revamp"** — Jay 2026-05-06 01:27 SMS, context unclear, awaiting Jay to scope which UI he meant
* **XP costs per gate (flat vs scaled)** — Joe asked, Jay replied only "XP costs per gate" 2026-05-06 00:23. Pending.
* **"Fasting (Manual Input)" as a 5th XP gate** — flagged on [AJE-12](https://linear.app/ajeo/issue/AJE-12) for Jay confirmation
* **AJE-13 (XP Packages on website Stripe)** — Jay paused 2026-05-02 (users racking 15-20K XP/week against current packages)
* **AJE-64 Loot Box v1** — fresh ticket, no prototype yet
* **XP Multipliers + Automatic Lock-In (Max-only)** — advertised by AJE-11, not yet specced
* **Antigravity Svelte app project** at `prototypes/MASTER_OVERVIEW.md` + `SCOPE_*.md` is a separate Mar-2026 doc series, not part of this AJE-tracked set

---

*Last updated: 2026-05-06 · Authored alongside [SPEC_breathing.md](./breathing-module/SPEC_breathing.md) and the AJE-65 hand-off bundle.*
