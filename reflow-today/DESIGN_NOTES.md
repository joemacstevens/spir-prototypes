# Design notes — Optimize my day on Today

Written alongside the reference prototype in this folder (2026-10-09). Sources:
`REALIGNMENT_DECISIONS.md` (the authority), `FEATURE_PLAN_reflow.md` (RF-1/RF-2),
`REPORT_goals_simplify.md`, and the live Today code (`day-surface.tsx`,
`energy-spine-horizontal.tsx`, `loadout-line.tsx`, `playbook-habit-row.tsx`).

> **Read this first: two sources were not available.**
> 1. **Jay's two PDFs** (Reflow Spec v0.3 and TECR v0.1) are Messages attachments, and this
>    session's permission policy blocked reading them. I worked from `FEATURE_PLAN_reflow.md`,
>    which cites them section by section, and from the Oct 7 readiness doc (the Claude Doc
>    "Timeline Reflow v0.3 — Build Readiness"). So the **§18 tie-break order** and any **TECR
>    §14–15 code** not named in the plan are my assumptions. The inspector marks every one of
>    those codes `ASSUMED`. Check them against the PDFs before any of this reaches the app.
> 2. **Pencil was not running**, so I couldn't open Playbook Main `e0W7L`. The phone follows the
>    live implementation instead (tokens from `theme.ts`, layout from `day-surface.tsx`), which
>    is the newer source anyway. The plan notes there is no Reflow frame in the pen yet.

---

## 1. Goals and Optimize on Today: recommendation

Today will carry two kinds of suggestion. Goals proposes **what** to add (shipped as one
count-only line, "N SUGGESTIONS FOR YOUR GOAL →"). Reflow proposes **when** to do things. The
three options can be switched in the panel.

### Recommended: (c) surface Optimize only when something slipped

The Goals line stays exactly as shipped. The Spine shows nothing new until a dry-run solve
finds a habit it can *fix*: one that is past due, sitting on the calendar, overlapping another
habit, or without a time. Then the slipped habit's dot gets a quiet warm ring, the caption
grows an "Optimize my day" button, and one plain line underneath says what happened
("Electrolytes slipped. There's still room for it today." / "Meditation now overlaps your
calendar."). With nothing to fix, the Spine looks exactly like today's build.

Why:

1. **It is never a dead button.** I swept the sample day every 15 minutes with the user on
   track (everything before now ticked). Optimize **abstains at 50 of 66 times**. All 16
   proposals it does make are alignment-only: it nudges Meditation toward the morning peak
   early in the day. In the same sweep with Electrolytes and Meditation left unticked, it
   proposes a fix at 61 of 66 times. In V1 only
   four habits can move at all. An always-on button (a) mostly answers "Your day is already
   well positioned", which teaches people to stop pressing it.
2. **It appears at the thing that changed.** The cue is on the Spine, on the dot that slipped,
   and the Spine is what the action rearranges. That matches the realignment's "current action
   emphasized" job, and the FAB stays action-only.
3. **It leaves the shipped Goals pattern alone.** Goals owns *what*. Its pointer stays
   count-only and points away from Today, as `REPORT_goals_simplify.md` settled. Nothing about
   the Goal moves back onto Today.
4. **The two cues never compete.** When Accept adds untimed habits, (c) turns that into the
   timing cue ("Day prep and Plan tomorrow have no time yet."). The *what* step hands
   naturally to the *when* step without a combined surface.

Costs, and how to carry them:

- **No "optimize anyway" on Today.** Alignment-only gains (Meditation into the peak) are never
  offered unprompted. Put a permanent "Optimize my day" in the **expanded** Spine (the full
  timeline the card morphs into), where people go to look at timing on purpose. That isn't in
  this prototype.
- **It needs a silent solve** on every Today render to know whether a fix exists. The solver is
  pure and takes milliseconds, and nothing is written or shown until the user taps. But spec V3
  "proactive Reflow" is out of scope, and a silent solve sits close to that line. **Jay needs to
  rule on it** (see the questions below).
- **Discoverability.** A user who never slips never meets the feature. That is arguably correct
  for V1.

### (a) Separate: Goals line plus a Spine trigger (the plan's decision 5)

The Goals line stays under the Loadout. "Optimize my day" sits permanently in the Spine
caption row, next to "Next ·", whenever the day is open.

- For: the simplest model, each action sits next to what it changes, and it is always reachable.
- Against: it mostly abstains in V1 (see the numbers above). It takes the caption row's right
  slot, which pushes **PEAK used / available** off the card. The live build put PEAK there
  deliberately, so (a) needs a new home for it. It is also one more permanent control on a
  screen the realignment is trying to calm.

### (b) One suggestions row that opens either

One "SUGGESTIONS FOR TODAY →" row under the Loadout opens a sheet with "Add N habits for your
Goal" (which hands off to Goals) and "Optimize my day".

- For: one entry point, and the Spine stays untouched.
- Against: the timing action leaves the Spine it acts on. Both actions gain a tap. It puts the
  slow Goal loop back onto Today as a peer of the day's timing, which the realignment
  separated on purpose. The count is muddy too: it counts actionable *entries*, not habits, and
  "Optimize" is always there whether or not it has anything to offer.

---

## 2. Calls the specs don't settle

Every one of these is a constant or a few lines in `scheduler.js` / `app.js`, and each is
reversible.

### Solver (RF-2)

1. **Tie-break order (§18, unread).** Across habits: larger potential gain, then smaller
   displacement of the best slot from the original time, then earlier original time, then id.
   Within one habit: higher U, then smaller displacement, then earlier slot.
2. **The utility shape.** `U = W_PLACE + fit × W_FIT × P − (disp + cross + pref + seq + soft)`.
   `W_PLACE` is the value of a habit being placed at all. It is what makes a rescue worth
   something, since an unplaced current slot scores 0. The plan says "fit × P − disruption" and
   that a past-due slot "counts as unplaced". W_PLACE is my way of making those two statements
   compose.
3. **The weights were tuned to the plan's main use case.** With my first weights, a LOW-cost
   habit 4¾ hours late (Electrolytes at 11:10) was *not* worth rescuing. The plan calls
   past-due rescue the strongest use case, so I lowered displacement to 0.05 per hour and the
   SOFT and session costs to match. As a result, rescue nearly always wins and alignment-only
   moves need about 0.1–0.3 of real fit gain. All values are in CONFIG.
4. **A per-move floor** (`MIN_MOVE_GAIN` 0.1) on top of the plan threshold (`MIN_REFLOW_GAIN`
   0.15). Without it, a plan carrying one big rescue also carried 30-minute nudges worth 0.05.
   The spec only defines the plan-level threshold.
5. **Session crossing.** The session of a time comes from the curve's windows
   (`curveSessionWindows`: Morning until first wind, Midday until second wind, Unwind after).
   It is compared with the habit's stored session label. Crossing **into** a PREFERRED session
   is free; anything else outside the habit's own session costs `W_SESSION_CROSS`, and sitting
   outside a PREFERRED session costs `W_PREF_MISS`. A WITHIN_SESSION habit may only land where
   the window matches its label.
6. **Past due means the start time has passed.** There is no grace period. A habit due in 5
   minutes keeps its slot; new candidates start at now + `BUFFER_MIN` on the 15-minute grid.
7. **Occupancy (EXCLUSIVE).** Done and did-not-do habits hold no future time. An in-progress
   habit holds from its start (or now) to at least now + 15 minutes. Each movable habit's own
   valid slot stays occupied until the greedy pass decides it, so two movers can't swap into
   each other's slots in one plan.
8. **POINT_EVENT footprint = catalog minutes.** Breakfast is a POINT_EVENT with duration
   NOT_APPLICABLE, but it still takes 20 minutes of the user's day. I let the catalog minutes
   reserve time. The contract duration is only used for DURATION_BLOCK, and only when the
   catalog says 0, so nothing is ever resized.
9. **Abstention discards everything.** If the plan total is below the threshold, no move is
   proposed, not even the ones that individually cleared `MIN_MOVE_GAIN`. The inspector lists
   them as "discarded".
10. **What counts as unresolved.** A habit with a contract that *needed* a move (past due,
    colliding or untimed) and got none is unresolved and is listed. A past-due habit with no
    contract simply stays OVERDUE, as it does today, with no extra line. Lunch-style collisions
    with no contract get one calm "move it yourself" line, so a calendar clash is never silent.

### The plan contradicts itself on Breakfast

The plan's on-device check says that at 11:10, with Electrolytes and Breakfast unticked,
"both show as rescued". Its own draft rule for Breakfast is `WINDOW WAKE AFTER 30–240, HARD`.
With wake at 6:30, that window closes at **10:30**, so at 11:10 Breakfast has no legal slot.
The prototype follows the rule. Preset 1 shows Breakfast as unresolved ("Breakfast's best
window has passed for today. It stays on your list."), and moving the clock back to 10:00
rescues both. Jay should decide whether a late breakfast is "not breakfast" (keep HARD) or
"worse but still fine" (HARD up to some later cap, SOFT beyond 240).

### Habits with no time (preset 6)

The Goals Accept path (`addCheckinHabit`) writes `scheduled_at = null`, and Day prep and Plan
tomorrow have no contract. Under the rules ("a no-contract habit stays put"), Reflow **cannot**
place them; the honest V1 result is that they stay untimed. To show the flow the prompt asks
for, preset 6 switches on two **demo-only contracts** (badged NOT RATIFIED) and uses an assumed
reason code, `PLACE_UNSCHEDULED`. On device today, these rows would get a display-only time
from `getPlaybook`'s spread. The prototype shows "No time yet" instead, so the gap is visible.

### Flow and UI

1. **Stale check (§41).** Keep refuses when the day's fingerprint differs: any habit's status,
   time, session or pin, or any calendar event. It also refuses when a move's target time has
   already passed. Moving the clock alone doesn't make a plan stale. After a refusal, the
   refused preview is cleared from the Spine and the rows.
2. **Undo after Keep (§44)** restores only rows that are still PLANNED and still exactly where
   the plan put them; anything the user touched since is skipped. It is one level deep and
   valid until the next Optimize or Lock In. Once the snackbar is dismissed, the prototype has
   nowhere else to undo from (see the questions below).
3. **"Undo" means two things.** The prompt names the preview's dismiss button "Undo", and the
   snackbar's revert is also "Undo". In preview nothing has happened yet, so **"Cancel"** may
   read better there. The prototype keeps the specified label.
4. **Where a moved row sits.** During preview, a moved row stays in its current group and shows
   "6:45 AM → 11:30 AM" plus a session tag (MIDDAY) when it crosses. After Keep, the session is
   written (decision 3) and the row moves to its new group.
5. **ANALYZING is staged.** The solve takes milliseconds. The three §52 lines run about 1.9
   seconds in total because the spec asks for them. Shorten or drop them if the trust gain
   doesn't hold up on device.
6. **Calendar on the Spine.** Events are drawn as hatched violet blocks with a solid foot. This
   is new visual language: there is no pen frame for it, and the live card doesn't draw
   calendar events.
7. **The FAB steps aside** while the preview bar or the snackbar owns the bottom edge.
8. **Result notes stay inline** on the Spine card ("already well positioned", unresolved,
   overlaps) until the day changes. No toast for those.
9. **Copy.** One static sentence per reason code, all in `COPY` (`app.js`). An abstained plan
   that still has unresolved habits shows the unresolved lines, never "well positioned".
10. **Placeholders.** PRIMED 74, 2,480 XP and the Flow State Loadout name are illustrative. The
    Spine's x-axis is the model's 6 AM–11 PM window.

### Codes coined here (check against TECR §14–15)

`ALIGN_RECOVERY_WINDOW`, `AVOID_HABIT_OVERLAP`, `PLACE_UNSCHEDULED`, `RESPECT_TIMING_RULE`,
`POLICY_NEVER`, `HABIT_COMPLETED`, `HABIT_DID_NOT_DO`, `HABIT_IN_PROGRESS`, `USER_PINNED`,
`NO_MOVABLE_HABITS`, `REFLOW_PROPOSED`. From the plan: `RESCUE_PAST_DUE`,
`AVOID_CALENDAR_CONFLICT`, `ALIGN_FOCUS_WINDOW`, `NO_MATERIAL_GAIN`, `NO_LEGAL_SLOT`,
`CONTRACT_INCOMPLETE`, `DURATION_UNRESOLVED`, `REFLOW_ABSTAINED`, `REFLOW_PLAN_STALE`.

---

## 3. Open questions

### For Jay

1. **Offsets.** Ratify or replace the RF-1 draft rules. In particular, should **Breakfast's**
   window close at wake + 4 h (HARD), or degrade softly? See above.
2. **The §18 tie-break order** and the **reason/abstention code list**. Does the coined list
   above map onto TECR names, and which list wins where the spec's §36 disagrees?
3. **A silent dry-run solve** to decide whether to show a cue (option c). Is that allowed in
   V1, or is it "proactive Reflow" (V3)? Nothing is proposed or written without a tap.
4. **A per-move minimum gain** in addition to the plan threshold. Is that in the spirit of §33.2?
5. **POINT_EVENT footprint.** Does a 20-minute breakfast reserve 20 minutes under EXCLUSIVE
   concurrency, or is it a point?
6. **Contracts for Day prep (BIO-HAB-043, "partial") and Plan tomorrow (no TECR row).** Without
   them, Goal-added habits can never be timed by Reflow. Is that the intended V1 behavior?
7. **A WITHIN_SESSION habit whose session is fully booked** (Breathwork in preset 4). Is
   "unresolved, stays on your list" right, or may it relax to an adjacent session?

### For Joe

1. **Option (c)?** And if so, put a permanent trigger in the expanded Spine for deliberate
   optimizing.
2. **The label** "Optimize my day" (decision 6), and **"Undo" vs "Cancel"** on the preview bar.
3. **Where Undo lives after the snackbar goes.** The spec keeps undo valid until the next run or
   day close, but nothing on Today holds it once the snackbar is dismissed.
4. **"No time yet" rows.** Show them honestly on Today, or keep the current display-time spread
   (which invents a time that isn't stored)?
5. **The ANALYZING beat.** Keep the roughly 2-second progress lines, or show the result
   immediately?
6. **PEAK readout.** If (a) is chosen, where does "PEAK used / available" go?
7. **Pen frames.** The plan says to draw the trigger, preview and abstain frames before RF-4.
   These screenshots (`screens/`) could serve as the brief for them.
