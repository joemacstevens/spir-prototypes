# Trello packet · AJE-10 · Today's Status (Checkin Screen) revamp

Paste-ready Trello card content. See [`README.md`](./README.md) for how to use.

---

## 1. Card title

```
[AJE-10] Today's Status — Checkin Screen revamp (slider + recovery snapshot + renames)
```

---

## 2. Card description

```markdown
**Live prototype:** https://todays-status-revamp.vercel.app
**Spec (source of truth):** https://github.com/joemacstevens/spir-prototypes/blob/main/todays-status-revamp/SPEC_AJE-10.md
**Linear ticket:** https://linear.app/ajeo/issue/AJE-10
**Phone view (scan QR on the live URL):** https://todays-status-revamp.vercel.app?fullscreen=1

## What changes

V1 layout + V2 recovery snapshot, shipped together. The First Wind input becomes a continuous 0–100 slider (was a 3-state battery picker). The Recovery Snapshot becomes 3 satellite mini-rings (Hydration / Deep Breathing Mins / Soundscape Minutes) above a compact card with two edit rows.

Per Jay's 2026-05-01 SMS:
- "Energy Available" → **"Energy Consumed"** (the slider input now reflects what the user *spent*, not what's available)
- "Nap" → **"Deep Breathing Mins"** (satellite ring) + **"Deep Breathing"** (compact-card row, routes to BreathworkPanel — see AJE-65)
- "Fasting" → **"Soundscape Minutes"** (satellite ring) + **"Soundscape"** (compact-card row, defers to existing in-app tool)

## Backend dependency (coordinate before starting)

`Survey.firstWindValue` and `Survey.secondWindValue` in `GameManager.cs:1782` are currently `string` ("low" / "medium" / "high"). To support the slider they need to accept a numeric percentage (0–100). API contract change required first.

## Hand-off references

- Cross-prototype index: https://github.com/joemacstevens/spir-prototypes/blob/main/AJE_PROTOTYPES.md
- Local run instructions: https://github.com/joemacstevens/spir-prototypes/blob/main/RUNNING_LOCALLY.md
- Hand-off snapshot tag: https://github.com/joemacstevens/spir-prototypes/releases/tag/handoff-2026-q2-v1

## Open feasibility flags (read in spec for full context)

- API contract change (string → numeric) needs backend coordination before the slider work can land
- TMP Rubik font asset must exist in the project (300/400/500/600/700/800 weights)
- Mini-ring rounded caps + glow use `OuterRoundedFillFixed.shader` (already in repo)
- Existing `firstWind[]` Image array is currently 3 elements — extending to 4 in the prefab needs the array to be re-bound
```

---

## 3. Checklist items (paste into a "Files Abdul will touch" checklist)

```
Assets/My Scripts/CheckInsPanel.cs — add slider + readout to First Wind card; restructure recovery section into satellite tiles + compact card; existing MarkTodaysStatusComplete() handler unchanged
Assets/My Scripts/HabbitPanel.cs — extend firstWind[] / secondWind[] Image arrays from 3 to 4 elements; refactor SetFirstWindData(int) / SetSecondWindData(int) at lines 3781–3826 from switch to numeric mapping
Assets/My Scripts/LoadoutEnergyBar.cs — refactor 3-case switch in SetFirstWindData() / SetSecondWindData() to numeric range mapping (red 0–25, amber 26–50, yellow 51–75, green 76–100)
Assets/My Scripts/GameManager.cs — change Survey.firstWindValue / secondWindValue from string to numeric (line 1782); drop or repurpose energy_List at line 302
Assets/Resources/Prefabs/UI/Panels/ — Checkin Screen prefab: add slider + readout, add 4th battery, add 3 mini-ring satellites, restructure recovery card
Assets/Custom Shader/OuterRoundedFillFixed.shader — reuse for mini-ring rounded caps + glow (no shader changes; just apply)
Migration consideration: existing user data has firstWindValue as "low"/"medium"/"high" — decide on a one-time backfill mapping (e.g. low→25, medium→50, high→75)
```
