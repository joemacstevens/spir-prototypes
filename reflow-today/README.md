# Optimize my day — reference prototype

A clickable reference for **Timeline Reflow** ("Optimize my day") on Today. The phone on the
left is what the user sees. The panel on the right stages the day and shows the scheduler's
work. It is a design artifact. It writes nothing, talks to no backend, and isn't deployed.

## Run it

No build step. Serve the folder and open it (a server is needed only because some browsers
block scripts on `file://`):

```bash
python3 -m http.server 8765 --directory prototypes/reflow-today
```

Then open <http://127.0.0.1:8765>. Opening `index.html` directly also works in Chrome and Safari.

| File | What it is |
| --- | --- |
| `scheduler.js` | Pure, deterministic. Holds the **port of the live energy model** (`generateEnergyCurve`, `curveSessionWindows`, `curveLevelAtMinute`, `peakWindows`, from spir-mobile `src/health/energy-curve.ts`, `src/lib/schedule.ts` and `src/health/peak-compute.ts`), the **RF-2 solver** `solveReflow`, the `CONFIG` defaults, the code registry and the invariant checker. No `Date`, no `Math.random`, no DOM. |
| `fixtures.js` | The sample day, the RF-1 pilot contracts, the demo-only contracts and the six presets. |
| `app.js` | The page: Today, the flow state machine (§51), the panel, and `COPY`, the one table of user-facing sentences per reason code (the future LLM seam, §37). |
| `scripts/verify.js` | Headless checks: `node scripts/verify.js` (46 checks). |
| `scripts/screens.sh` | Regenerates `screens/` with headless Chrome from URL-staged states. |

## The presets

Each preset loads a full day state. **Reset preset** reloads it. The clock slider (6:00–23:00)
works on any preset.

| # | Preset | Clock | What it shows |
| --- | --- | --- | --- |
| 1 | **Morning slipped** | 11:10 | Electrolytes and Breakfast never got ticked. Electrolytes is **rescued** to 11:30 AM (`RESCUE_PAST_DUE`) and crosses from Morning into Midday. Breakfast is **unresolved**: its draft HARD rule (wake + 30–240 min) closed at 10:30, so no legal slot exists. It stays on the list with "Breakfast's best window has passed for today." Drag the clock back to 10:00 and both are rescued. |
| 2 | **Meeting collision** | 10:05 | A 12:00–1:00 "Team sync" lands on Meditation and Lunch. Meditation has a contract and moves to 11:00 (`AVOID_CALENDAR_CONFLICT`), the first slot after the in-progress Deep work block. Lunch has no contract, so it stays (`CONTRACT_INCOMPLETE`) and gets a calm "Lunch overlaps Team sync. Move it yourself if you need to." |
| 3 | **Nothing to gain** | 3:00 PM | Everything before 3 PM is done and Breathwork already sits in its pre-bed window. The plan equals the current schedule, so it **abstains** (`NO_MATERIAL_GAIN`): "Your day is already well positioned." Inline, no toast. |
| 4 | **Impossible afternoon** | 1:40 PM | The calendar runs wall to wall from 2 PM to bedtime with one 15-minute gap at 6:30. Meditation (past due) takes the gap. Breathwork is `WITHIN_SESSION` Unwind and Unwind is fully booked, so it's **unresolved**: "1 habit couldn't be placed without conflicting with your schedule." Three no-contract habits that also overlap the calendar are summarized in one line. |
| 5 | **Stale plan** | 11:10 | Opens the preset 1 preview automatically. **Tick Electrolytes** (in the phone or the panel), then press **Keep**. The commit is **refused** (`REFLOW_PLAN_STALE`, §41): "Your day changed since this preview, so nothing was moved." **Preview again** runs a fresh solve. Now only Breakfast remains, and it can't be placed. |
| 6 | **Goal accepted** | 7:20 | The shipped "2 SUGGESTIONS FOR YOUR GOAL →" line is showing. Tap it, then **Accept**: Day prep and Plan tomorrow join the day **with no time**. Optimize places them (`PLACE_UNSCHEDULED`) and also pulls Meditation into the first-wind peak (`ALIGN_FOCUS_WINDOW`). This works **only because two demo-only contracts are switched on** (badged NOT RATIFIED). Untick them under Contracts to see the honest V1 result, where both stay untimed. |

Things to try on any preset:
- **Keep**, then **Undo** on the snackbar: the moves are restored.
- **Keep**, change a moved habit (tick it, or edit its time), then **Undo**: that row is skipped and the rest are restored (§44).
- **Force commit failure** (panel): Keep fails, nothing changes, and **Try again** commits.
- **Day locked in**, or **LOCK IN YOUR DAY** in the phone: the trigger disappears.
- **Pin** a habit, or set it to did-not-do or in-progress: it never moves.
- Add a **calendar event** on top of a habit.
- Switch on the **Demo-only Deep Work contract**. The NOT RATIFIED badge shows in the panel only, never in the phone.
- Switch the **coexistence option** (a / b / c). See `DESIGN_NOTES.md`.

## How to read the inspector

**Last run** (top right) shows one solve. *Auto* shows the last Optimize press while a result is
on screen, and a live dry run otherwise. *Last run* and *Live* pin either one.

- **Outcome chips.** `REFLOW_PROPOSED` or `REFLOW_ABSTAINED`, plus the abstention code, the
  plan hash, and the **day fingerprint**. When the fingerprint no longer matches the current
  day, the chip turns red and reads `≠ now … → STALE`. That is exactly the check Keep runs.
- **Totals.** Each movable habit's utility is summed for the current schedule and for the plan.
  The bar shows the gain against `MIN_REFLOW_GAIN` (the amber tick). Below the tick, the plan
  abstains even if individual moves looked good; those appear under **discarded**.
- **Moves, unresolved, calendar overlaps.** The plan in TECR terms.
- **Candidates from.** The first slot: now plus `BUFFER_MIN`, rounded up to the `STEP_MIN` grid.
- **Sessions and curve.** The landmarks the live model produced for this day (first wind,
  dip, second wind) and the session windows derived from them.
- **Determinism.** Solves the same input 100 times and compares hashes and full traces (§59).
- **Invariants.** §58–§59, checked mechanically against the plan on screen: done, did-not-do,
  in-progress, pinned and no-contract habits never move; nothing lands in elapsed time or on
  the calendar; no two habits overlap; nothing is resized; nothing is dropped.

**Why** lists every habit in assembly order (movable habits first, ranked by potential gain).
Open one to see:

1. **Eligibility**, in spec §31 order: completed, did-not-do, in-progress, pinned, contract
   available, `reflow_policy = NEVER`, usable duration. The first STOP decides the habit is
   IMMUTABLE or PRESERVE, and gives the code.
2. **Current slot.** Placed (with its utility) or unplaced (`PAST_DUE`, `CALENDAR_CONFLICT`,
   `UNTIMED`, `HARD_RULE`, `HABIT_OVERLAP`) with U = 0. Unplaced is what makes a rescue worth
   something.
3. **Candidates.** A strip across the day, one cell per 15-minute slot. Green cells are legal,
   and brighter means a higher U. Other colours are the **first** rule that rejected the slot,
   in order: `OUTSIDE_DAY`, `CALENDAR_CONFLICT`, `HARD_RULE`, `SESSION_SCOPE`,
   `SESSION_REQUIRED`, `DIRECTION`, `EXCLUSIVE_OVERLAP`. Hover a cell for its value. The orange
   line marks the current slot, the white line marks now, and the white box marks the best slot.
4. **Scores.** The current slot and the six best legal slots, broken into terms:
   `U = W_PLACE + fit × W_FIT × P − (disp + cross + pref + seq + soft)`.
   - **fit**: FOCUS reads the curve level at the block's midpoint. RECOVERY rewards nearness to
     the dip or the pre-bed window. No OPPORTUNITY rule means a fit of 0.
   - **disp**: hours from the **original** time × `W_DISPLACE_PER_H` × the movement_cost multiplier.
   - **cross**: landing outside the habit's own session. This is free when the habit lands in a
     PREFERRED session.
   - **pref**: sitting outside a PREFERRED session.
   - **seq**: order inversions against same-session habits (the count is in brackets).
   - **soft**: SOFT anchor or window rules, scaled by overshoot and saturating at `SOFT_SCALE_MIN`.
5. **Decision.** MOVE, KEEP, UNRESOLVED or MOVE_DISCARDED, with the reason or abstention code,
   the gain against `MIN_MOVE_GAIN`, and the exact sentence the user sees.

**CONFIG** has every number the solver uses. Edit a field and press Enter or Tab: everything
re-solves, and changed fields turn amber. **Reason copy** is the `COPY` table, with each code's
provenance. PLAN means the code is named in `FEATURE_PLAN_reflow.md`. ASSUMED means it was coined
here (see DESIGN_NOTES).

## Verify

```bash
node scripts/verify.js
```

This runs 46 checks: the six presets' expected outcomes, 100× determinism per preset, every
RF-2 edge case (pinned, did-not-do, in-progress, no contract, unknown duration, a REQUIRED
session, FORWARD_ONLY, displacement measured from the original time), a sweep of every 5
minutes from 6:00 to 23:00 on four presets, and a seeded fuzz over 500 random days.

To re-shoot `screens/`, start the server above, then run `bash scripts/screens.sh`. The
`?preset=…&step=…&option=…&instant=1` URL parameters stage any state directly. Steps are
`preview`, `result`, `undo`, `stale`, `stale-result`, `sheet`, `suggestions`, `goal-preview`
and `goal-result`.
