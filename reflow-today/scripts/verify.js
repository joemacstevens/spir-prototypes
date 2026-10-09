#!/usr/bin/env node
/*
 * Headless checks for the reflow prototype: the six presets' expected outcomes,
 * determinism (§59), the §58–§59 invariants, the edge cases RF-2 names, a clock
 * sweep and a seeded fuzz. Runs the exact scheduler.js / fixtures.js the page loads.
 *
 *   node scripts/verify.js
 */
'use strict';
const path = require('path');
const S = require(path.join(__dirname, '..', 'scheduler.js'));
const F = require(path.join(__dirname, '..', 'fixtures.js'));

let pass = 0;
let fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); }
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const fmt = (m) => (m == null ? '—' : Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'));

function stateFor(key, tweak) {
  const p = F.PRESETS.find((x) => x.key === key);
  const st = F.scenarioFromPreset(p);
  if (p.goalPending) { st.habits.push(...F.goalAdditions()); st.goalPending = false; }
  if (tweak) tweak(st);
  return st;
}
function run(st, cfg) {
  const input = F.buildInput(st, S);
  return { input, plan: S.solveReflow(input, cfg) };
}
function invariantsHold(input, plan, label) {
  const bad = S.checkInvariants(input, plan).filter((i) => !i.pass);
  ok(bad.length === 0, label + ': §58–§59 invariants', bad.map((b) => b.name + ' [' + b.detail + ']').join('; '));
}
function deterministic(input, label, n) {
  const ref = S.solveReflow(clone(input));
  let same = 0;
  for (let i = 0; i < n; i++) {
    const p = S.solveReflow(clone(input));
    if (p.planHash === ref.planHash && S.stableStringify(p.trace) === S.stableStringify(ref.trace)) same++;
  }
  ok(same === n, label + ': identical input → identical plan ×' + n, same + '/' + n);
}
const moved = (plan, id) => plan.moves.find((m) => m.id === id);

console.log('\nPresets');
{
  const { input, plan } = run(stateFor('slipped'));
  const e = moved(plan, 'h-electrolytes');
  ok(plan.outcome === 'REFLOW_PROPOSED', '1 Morning slipped: proposes');
  ok(e && e.reason_code === 'RESCUE_PAST_DUE' && e.to.min >= input.now, '1: Electrolytes rescued forward', e && fmt(e.to.min));
  ok(plan.unresolved.some((u) => u.id === 'h-breakfast' && u.code === 'NO_LEGAL_SLOT'), '1: Breakfast unresolved (HARD window wake+30–240 closed at 10:30), not dropped');
  invariantsHold(input, plan, '1');
  deterministic(input, '1', 100);
}
{
  const { input, plan } = run(stateFor('collision'));
  const m = moved(plan, 'h-meditation');
  ok(m && m.reason_code === 'AVOID_CALENDAR_CONFLICT', '2 Meeting collision: Meditation moves out', m && fmt(m.to.min));
  ok(!moved(plan, 'h-lunch') && plan.conflicts.some((c) => c.id === 'h-lunch'), '2: Lunch (no contract) stays and is flagged');
  ok(!moved(plan, 'h-deepwork'), '2: in-progress Deep work never moves');
  invariantsHold(input, plan, '2');
  deterministic(input, '2', 100);
}
{
  const { input, plan } = run(stateFor('abstain'));
  ok(plan.outcome === 'REFLOW_ABSTAINED' && plan.abstention === 'NO_MATERIAL_GAIN' && plan.moves.length === 0, '3 Nothing to gain: abstains NO_MATERIAL_GAIN');
  invariantsHold(input, plan, '3');
  deterministic(input, '3', 100);
}
{
  const { input, plan } = run(stateFor('impossible'));
  ok(moved(plan, 'h-meditation') && moved(plan, 'h-meditation').to.min === F.hm(18, 30), '4 Impossible afternoon: Meditation takes the only gap (6:30 PM)');
  ok(plan.unresolved.some((u) => u.id === 'h-breathwork' && u.code === 'NO_LEGAL_SLOT'), '4: Breathwork unresolved (WITHIN_SESSION, Unwind fully booked)');
  invariantsHold(input, plan, '4');
  deterministic(input, '4', 100);
}
{
  // 5 Stale: the plan's fingerprint stops matching once a habit is ticked.
  const st = stateFor('stale');
  const { plan } = run(st);
  st.habits.find((h) => h.id === 'h-electrolytes').status = 'COMPLETED';
  const after = F.buildInput(st, S);
  ok(S.dayFingerprint(after.habits, after.busy) !== plan.fingerprint, '5 Stale plan: completing a habit after preview changes the fingerprint → Keep refuses');
  const st2 = stateFor('stale');
  const { plan: p2 } = run(st2);
  const same = F.buildInput(st2, S);
  ok(S.dayFingerprint(same.habits, same.busy) === p2.fingerprint, '5: an unchanged day keeps the same fingerprint');
}
{
  const { input, plan } = run(stateFor('goal'));
  ok(moved(plan, 'h-dayprep') && moved(plan, 'h-dayprep').reason_code === 'PLACE_UNSCHEDULED', '6 Goal accepted: Day prep placed (demo contract)');
  ok(moved(plan, 'h-plantomorrow') && moved(plan, 'h-plantomorrow').reason_code === 'PLACE_UNSCHEDULED', '6: Plan tomorrow placed (demo contract)');
  invariantsHold(input, plan, '6');
  deterministic(input, '6', 100);
  const { plan: honest } = run(stateFor('goal', (st) => { st.demo = []; }));
  ok(!moved(honest, 'h-dayprep') && !moved(honest, 'h-plantomorrow'), '6 without demo contracts: untimed goal habits stay untimed (CONTRACT_INCOMPLETE)');
}

console.log('\nEdge cases (RF-2 list)');
{
  const { input, plan } = run(stateFor('slipped', (st) => { st.habits.find((h) => h.id === 'h-electrolytes').pinned = true; }));
  ok(!moved(plan, 'h-electrolytes'), 'pinned habit never moves');
  ok(plan.trace.find((t) => t.id === 'h-electrolytes').code === 'USER_PINNED', 'pinned → USER_PINNED');
  invariantsHold(input, plan, 'pinned');
}
{
  const { input, plan } = run(stateFor('slipped', (st) => { st.habits.find((h) => h.id === 'h-electrolytes').status = 'DID_NOT_DO'; }));
  ok(!moved(plan, 'h-electrolytes'), 'DID_NOT_DO habit never moves');
  invariantsHold(input, plan, 'did-not-do');
}
{
  const { plan } = run(stateFor('slipped'));
  ok(plan.trace.find((t) => t.id === 'h-sunlight').verdict === 'IMMUTABLE', 'completed habit is IMMUTABLE');
  ok(plan.trace.find((t) => t.id === 'h-walk').code === 'CONTRACT_INCOMPLETE', 'no contract → CONTRACT_INCOMPLETE');
}
{
  const st = stateFor('collision');
  const input = F.buildInput(st, S);
  const med = input.habits.find((h) => h.id === 'h-meditation');
  med.durationMin = 0;
  input.contracts = Object.assign({}, input.contracts, { meditation: Object.assign({}, input.contracts.meditation, { duration_default_min: null }) });
  const plan = S.solveReflow(input);
  ok(!moved(plan, 'h-meditation') && plan.trace.find((t) => t.id === 'h-meditation').code === 'DURATION_UNRESOLVED', 'unknown-duration DURATION_BLOCK stays put (DURATION_UNRESOLVED)');
  invariantsHold(input, plan, 'unknown duration');
}
{
  const st = stateFor('impossible');
  const input = F.buildInput(st, S);
  input.contracts = Object.assign({}, input.contracts, {
    meditation: Object.assign({}, input.contracts.meditation, { session_policy: 'REQUIRED', allowed_sessions: ['midday'] }),
  });
  const plan = S.solveReflow(input);
  const m = moved(plan, 'h-meditation');
  ok(!m || S.sessionOf(m.to.min, input.sessions) === 'midday', 'REQUIRED session is never crossed', m && fmt(m.to.min));
  invariantsHold(input, plan, 'required session');
}
{
  const st = stateFor('collision');
  const input = F.buildInput(st, S);
  input.contracts = Object.assign({}, input.contracts, { meditation: Object.assign({}, input.contracts.meditation, { movement_direction: 'FORWARD_ONLY' }) });
  const plan = S.solveReflow(input);
  const m = moved(plan, 'h-meditation');
  ok(!m || m.to.min >= m.from.min, 'FORWARD_ONLY never moves earlier', m && fmt(m.to.min));
}
{
  const { plan } = run(stateFor('slipped'));
  ok(plan.trace.find((t) => t.id === 'h-deepwork').code === 'HABIT_COMPLETED', 'Deep work (done) is immutable');
  const { plan: p2 } = run(stateFor('collision', (st) => { st.habits.find((h) => h.id === 'h-deepwork').status = 'PLANNED'; }));
  ok(p2.trace.find((t) => t.id === 'h-deepwork').code === 'CONTRACT_INCOMPLETE', 'Deep work without the demo contract → CONTRACT_INCOMPLETE (TECR blocks it)');
}
{
  const { plan } = run(stateFor('slipped'));
  ok(plan.moves.every((m) => !('duration' in m.to) && !('durationMin' in m.to)), 'moves carry no duration (nothing resized)');
}
{
  // Displacement is from the ORIGINAL time: a habit already moved once scores against where it started.
  const st = stateFor('collision');
  const med = st.habits.find((h) => h.id === 'h-meditation');
  med.currentMin = F.hm(16, 0); // pretend an earlier Reflow moved it
  const { plan } = run(st);
  const t = plan.trace.find((x) => x.id === 'h-meditation');
  ok(t.current.placed && t.current.disp > 0, 'displacement measured from original (a moved habit pays for distance already travelled)', 'disp=' + t.current.disp);
}

console.log('\nClock sweep: every 5 minutes, 6:00 → 23:00, presets 1, 2, 4, 6');
for (const key of ['slipped', 'collision', 'impossible', 'goal']) {
  let bad = 0;
  let detail = '';
  for (let now = 360; now <= 1380; now += 5) {
    const st = stateFor(key, (s) => { s.now = now; });
    const { input, plan } = run(st);
    const fails = S.checkInvariants(input, plan).filter((i) => !i.pass);
    const early = plan.moves.filter((m) => m.to.min < now + S.DEFAULT_CONFIG.BUFFER_MIN);
    if (fails.length || early.length) { bad++; detail = fmt(now) + ' ' + fails.map((f) => f.name).join(',') + (early.length ? ' early' : ''); }
  }
  ok(bad === 0, key + ': invariants hold at all 205 clock times', detail);
}

console.log('\nSeeded fuzz: 500 random days (statuses, pins, calendar), invariants + determinism');
{
  let seed = 20261009;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  let bad = 0;
  let nondet = 0;
  let detail = '';
  for (let i = 0; i < 500; i++) {
    const st = stateFor(['slipped', 'collision', 'abstain', 'impossible', 'goal'][i % 5], (s) => {
      s.now = 360 + Math.floor(rnd() * 205) * 5;
      for (const h of s.habits) {
        const r = rnd();
        h.status = r < 0.2 ? 'COMPLETED' : r < 0.27 ? 'DID_NOT_DO' : r < 0.3 ? 'IN_PROGRESS' : 'PLANNED';
        h.pinned = rnd() < 0.12;
      }
      s.busy = [];
      const nb = Math.floor(rnd() * 4);
      for (let b = 0; b < nb; b++) {
        const start = 420 + Math.floor(rnd() * 56) * 15;
        s.busy.push({ id: 'f' + b, title: 'Busy ' + b, startMin: start, endMin: start + 15 * (1 + Math.floor(rnd() * 8)) });
      }
      if (rnd() < 0.3) s.demo = ['deep_work', 'day_prep', 'plan_tomorrow'];
    });
    const { input, plan } = run(st);
    const fails = S.checkInvariants(input, plan).filter((x) => !x.pass);
    if (fails.length) { bad++; detail = 'case ' + i + ': ' + fails.map((f) => f.name + ' [' + f.detail + ']').join(','); }
    if (S.solveReflow(clone(input)).planHash !== plan.planHash) nondet++;
  }
  ok(bad === 0, 'fuzz: invariants hold on 500 random days', detail);
  ok(nondet === 0, 'fuzz: every plan reproduces from its input', nondet + ' differed');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
