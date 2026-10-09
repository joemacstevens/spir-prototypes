/*
 * scheduler.js — the pure half of the "Optimize my day" reference prototype.
 *
 *  1. A line-for-line port of the live energy model:
 *       generateEnergyCurve      ← spir-mobile src/health/energy-curve.ts
 *       curveSessionWindows      ← spir-mobile src/lib/schedule.ts
 *       curveLevelAtMinute,
 *       peakWindows, landmarkMinutes ← spir-mobile src/health/peak-compute.ts
 *  2. The RF-2 solver from docs/FEATURE_PLAN_reflow.md (solveReflow).
 *
 * Pure and deterministic: no Date, no Math.random, no DOM. `now` is injected.
 * Loads as a classic <script> (window.SpirReflow) and as a CommonJS module, so
 * scripts/verify.js can exercise exactly the code the page runs.
 *
 * All clock values are minutes from local midnight (0–1440).
 */
(function (root) {
  'use strict';

  /* ══════════════════════════ Energy curve (port) ══════════════════════════ */

  const TWO_PI = Math.PI * 2;
  const OMEGA = TWO_PI / 24;
  const SAMPLE_START_HOUR = 6;
  const SAMPLE_END_HOUR = 23;
  const SAMPLE_STEP_H = 0.5;
  const TAU_DECAY_H = 3;
  const TAU_RISE_H = 18;
  const SP_BEDTIME = 1;
  const DEFAULT_SLEEP_H = 7;
  const IDEAL_SLEEP_H = 8;
  const K_HOMEO = 0.5;
  const C_AMP = [0.5, 0.8, 0.0, 0.0, 0.0];
  const C_PEAK_OFFSET = [7, 1.5, 0, 0, 0];
  const MORNING_WINDOW_H = 6;
  const DIP_WINDOW_H = 8;
  const DEBT_CAP_H = 16;
  const AMP_DEBT_FACTOR = 0.2;
  const AMP_HRV_FLOOR = 0.8;
  const AMP_HRV_RANGE = 0.2;
  const DEBT_PEAK_DELAY_H = 1.5;
  const CALIBRATING_AMPLITUDE = 0.85;
  const MAX_REPORTED_DIP_SHIFT_H = 1.5;
  const ZONE_FIRST_WIND = 'FIRST WIND · PEAK';
  const ZONE_DIP = 'AFTERNOON DIP';
  const ZONE_SECOND_WIND = 'SECOND WIND · PEAK';

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function sleepPressure(hoursAwake, s0) {
    const t = Math.max(0, hoursAwake);
    return 1 - (1 - s0) * Math.exp(-t / TAU_RISE_H);
  }
  function circadian(tau) {
    let c = 0;
    for (let i = 0; i < C_AMP.length; i++) c += C_AMP[i] * Math.cos((i + 1) * OMEGA * (tau - C_PEAK_OFFSET[i]));
    return c;
  }
  function wireTime(hour) {
    const hh = Math.floor(hour);
    const mm = Math.round((hour - hh) * 60);
    const n = mm === 60 ? { h: hh + 1, m: 0 } : { h: hh, m: mm };
    const h12 = n.h % 12 === 0 ? 12 : n.h % 12;
    return h12 + ':' + String(n.m).padStart(2, '0');
  }
  function landmarkLabel(hour) {
    const hh = Math.floor(hour) % 24;
    const mm = Math.round((hour - Math.floor(hour)) * 60);
    const n = mm === 60 ? { h: hh + 1, m: 0 } : { h: hh, m: mm };
    const ampm = n.h < 12 ? 'AM' : 'PM';
    const h12 = n.h % 12 === 0 ? 12 : n.h % 12;
    return h12 + ':' + String(n.m).padStart(2, '0') + ' ' + ampm;
  }

  function generateEnergyCurve(params) {
    if (params.reportedDipHour != null && Number.isFinite(params.reportedDipHour)) {
      const unshifted = generateEnergyCurve(Object.assign({}, params, { reportedDipHour: null }));
      if (unshifted.dipHour != null) {
        const shift = clamp(params.reportedDipHour - unshifted.dipHour, -MAX_REPORTED_DIP_SHIFT_H, MAX_REPORTED_DIP_SHIFT_H);
        return generateEnergyCurve(Object.assign({}, params, { reportedDipHour: null, phaseHour: params.phaseHour + shift }));
      }
    }
    const sleepHours = params.sleepHours;
    const calibrating = params.calibrating;
    const phaseHour = Number.isFinite(params.phaseHour) ? params.phaseHour : 8;
    const nowHour = Number.isFinite(params.nowHour) ? params.nowHour : SAMPLE_START_HOUR;
    const wakeHour = Number.isFinite(params.wakeHour == null ? NaN : params.wakeHour) ? params.wakeHour : phaseHour;
    const debt = clamp(params.sleepDebtH == null ? 0 : params.sleepDebtH, 0, DEBT_CAP_H);
    const hrvRecent = params.hrvRecent == null ? null : params.hrvRecent;
    const hrvBaseline = params.hrvBaseline == null ? null : params.hrvBaseline;

    const debtDelay = DEBT_PEAK_DELAY_H * (debt / DEBT_CAP_H);
    let amplitude;
    if (calibrating) amplitude = CALIBRATING_AMPLITUDE;
    else {
      const debtFactor = 1 - AMP_DEBT_FACTOR * (debt / DEBT_CAP_H);
      const hrvFactor = hrvBaseline != null && hrvBaseline > 0 && hrvRecent != null
        ? AMP_HRV_FLOOR + AMP_HRV_RANGE * Math.min(1, hrvRecent / hrvBaseline)
        : 1;
      amplitude = debtFactor * hrvFactor;
    }
    const anchor = phaseHour + debtDelay;
    const s0 = SP_BEDTIME * Math.exp(-(sleepHours == null ? DEFAULT_SLEEP_H : sleepHours) / TAU_DECAY_H);
    const s0Ideal = SP_BEDTIME * Math.exp(-IDEAL_SLEEP_H / TAU_DECAY_H);
    const alertnessAt = (h) => amplitude * circadian(h - anchor) - K_HOMEO * sleepPressure(h - wakeHour, s0);
    const referenceAt = (h) => circadian(h - anchor) - K_HOMEO * sleepPressure(h - wakeHour, s0Ideal);

    const grid = [];
    for (let h = SAMPLE_START_HOUR; h <= SAMPLE_END_HOUR + 1e-9; h += SAMPLE_STEP_H) grid.push({ hour: round2(h), a: alertnessAt(h), now: false });
    const inWindow = (lo, hi) => grid.filter((g) => g.hour >= lo && g.hour <= hi);
    const argmax = (xs) => xs.reduce((b, g) => (g.a > b.a ? g : b), xs[0]);
    const argmin = (xs) => xs.reduce((b, g) => (g.a < b.a ? g : b), xs[0]);
    const morningSet = inWindow(anchor, anchor + MORNING_WINDOW_H);
    const firstWind = (morningSet.length ? argmax(morningSet) : argmax(grid)) || grid[0];
    const dipSet = inWindow(firstWind.hour + 1, firstWind.hour + DIP_WINDOW_H);
    const dip = (dipSet.length ? argmin(dipSet) : null) || null;
    const secondSet = dip ? inWindow(dip.hour + 1, SAMPLE_END_HOUR) : [];
    const secondWind = secondSet.length ? argmax(secondSet) : null;
    if (firstWind) firstWind.zone = ZONE_FIRST_WIND;
    if (dip) dip.zone = ZONE_DIP;
    if (secondWind) secondWind.zone = ZONE_SECOND_WIND;

    const now = clamp(nowHour, SAMPLE_START_HOUR, SAMPLE_END_HOUR);
    const onGrid = grid.find((g) => Math.abs(g.hour - now) < 1e-6);
    if (onGrid) onGrid.now = true;
    else grid.push({ hour: round2(now), a: alertnessAt(now), now: true });
    grid.sort((p, q) => p.hour - q.hour);

    const refVals = grid.map((g) => referenceAt(g.hour));
    const refLo = Math.min.apply(null, refVals);
    const refHi = Math.max.apply(null, refVals);
    const refSpan = refHi - refLo;
    const norm = (a) => (refSpan > 0 ? clamp((a - refLo) / refSpan, 0, 1) : 0.5);
    const curve = grid.map((g) => {
      const p = { level: round2(norm(g.a)), time: wireTime(g.hour) };
      if (g.now) p.now = true;
      if (g.zone) p.zone = g.zone;
      return p;
    });
    return {
      curve: curve,
      firstWindPeak: firstWind ? landmarkLabel(firstWind.hour) : null,
      dipWindow: dip ? landmarkLabel(dip.hour) : null,
      dipHour: dip ? dip.hour : null,
      secondWindPeak: secondWind ? landmarkLabel(secondWind.hour) : null,
    };
  }

  /** peak-compute.ts resolveMinutes — "H:MM" wire times → monotonic minutes. */
  function resolveMinutes(curve) {
    if (curve.every((p) => typeof p.minutes === 'number')) return curve.map((p) => p.minutes);
    let prev = -Infinity;
    return curve.map((p) => {
      const m = String(p.time).match(/^(\d{1,2}):(\d{2})/);
      const base = m ? (Number(m[1]) % 12) * 60 + Number(m[2]) : 0;
      const minutes = base >= prev ? base : base + 720 >= prev ? base + 720 : base;
      prev = minutes;
      return minutes;
    });
  }

  /** peak-compute.ts curveLevelAtMinute. */
  function curveLevelAtMinute(curve, minute) {
    if (!curve.length) return null;
    const mins = resolveMinutes(curve);
    if (minute <= mins[0]) return curve[0].level;
    if (minute >= mins[mins.length - 1]) return curve[curve.length - 1].level;
    for (let i = 1; i < mins.length; i++) {
      if (minute <= mins[i]) {
        const span = mins[i] - mins[i - 1];
        const t = span > 0 ? (minute - mins[i - 1]) / span : 0;
        return curve[i - 1].level + t * (curve[i].level - curve[i - 1].level);
      }
    }
    return curve[curve.length - 1].level;
  }

  const PEAK_LEVEL_THRESHOLD = 0.7;
  function crossingMinute(m0, l0, m1, l1, level) { return l1 === l0 ? m0 : m0 + ((level - l0) / (l1 - l0)) * (m1 - m0); }
  /** peak-compute.ts peakWindows. */
  function peakWindows(curve) {
    if (curve.length < 2) return [];
    const mins = resolveMinutes(curve);
    const T = PEAK_LEVEL_THRESHOLD;
    const out = [];
    let inside = false;
    let start = 0;
    for (let i = 0; i < curve.length; i++) {
      const level = curve[i].level;
      if (!inside && level >= T) {
        start = i === 0 ? mins[0] : crossingMinute(mins[i - 1], curve[i - 1].level, mins[i], level, T);
        inside = true;
      } else if (inside && level < T) {
        out.push([start, crossingMinute(mins[i - 1], curve[i - 1].level, mins[i], level, T)]);
        inside = false;
      }
    }
    if (inside) out.push([start, mins[mins.length - 1]]);
    return out;
  }

  /** peak-compute.ts / schedule.ts landmarkMinutes ("h:MM AM/PM" → minutes). */
  function landmarkMinutes(label) {
    if (!label) return null;
    const m = String(label).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if ((m[3] || '').toUpperCase() === 'PM') h += 12;
    return h * 60 + Number(m[2]);
  }

  /** schedule.ts curveSessionWindows. */
  function curveSessionWindows(firstWindMin, secondWindMin, curveStartMin, curveEndMin) {
    const morningStart = Math.min(curveStartMin, firstWindMin);
    return {
      morning: [morningStart, firstWindMin],
      midday: [firstWindMin, secondWindMin],
      unwind: [secondWindMin, Math.max(secondWindMin, curveEndMin)],
    };
  }

  /* ════════════════════════════ RF-2 solver ═══════════════════════════════ */

  /**
   * Every number the solver uses. The page renders this object as editable
   * fields in the inspector; nothing below reads a numeric literal for policy.
   */
  const DEFAULT_CONFIG = {
    STEP_MIN: 15, // candidate grid (spec §25)
    BUFFER_MIN: 10, // a candidate starts no sooner than now + buffer, rounded up to the grid
    EXEC_PROBABILITY: 0.7, // P, a constant in the prototype (spec §33.1)
    W_PLACE: 1.0, // value of a habit being placed at a legal, future slot at all
    W_FIT: 1.0, // weight on biological fit (fit × P)
    W_DISPLACE_PER_H: 0.05, // displacement cost per hour away from the ORIGINAL time
    COST_MULT_LOW: 1.0, // movement_cost multipliers on displacement (spec §16)
    COST_MULT_MEDIUM: 1.5,
    COST_MULT_HIGH: 2.5,
    W_SESSION_CROSS: 0.1, // landing outside the habit's own session (free when landing in a PREFERRED one)
    W_PREF_MISS: 0.1, // landing outside a PREFERRED session
    W_SEQUENCE: 0.03, // per order inversion against same-session habits
    W_SOFT: 0.2, // per SOFT rule violated, scaled by overshoot
    SOFT_SCALE_MIN: 60, // overshoot at which a SOFT penalty saturates
    RECOVERY_RADIUS_MIN: 90, // RECOVERY fit falls to 0 this far from the dip / pre-bed window
    PRE_BED_WINDOW_MIN: [60, 15], // pre-bed recovery window = [bed − 60, bed − 15]
    MIN_MOVE_GAIN: 0.1, // a single move must gain at least this much to be proposed
    MIN_REFLOW_GAIN: 0.15, // the whole plan must beat the current schedule by this (spec §33.2)
    ACCEPT_RULE_STATUS: ['RATIFIED', 'PROVISIONAL'],
  };

  /**
   * Codes. TECR owns the registry (§14 abstention, §15 reason). `src` records
   * where each name comes from: PLAN = named in FEATURE_PLAN_reflow.md (which
   * cites TECR); ASSUMED = coined here because the TECR PDF was not readable in
   * this session — check the name against TECR §14–15 before anything ships.
   */
  const CODES = {
    // Reason codes (a move happened)
    RESCUE_PAST_DUE: { kind: 'reason', src: 'PLAN' },
    AVOID_CALENDAR_CONFLICT: { kind: 'reason', src: 'PLAN' },
    ALIGN_FOCUS_WINDOW: { kind: 'reason', src: 'PLAN' },
    ALIGN_RECOVERY_WINDOW: { kind: 'reason', src: 'ASSUMED' },
    AVOID_HABIT_OVERLAP: { kind: 'reason', src: 'ASSUMED' },
    PLACE_UNSCHEDULED: { kind: 'reason', src: 'ASSUMED' },
    RESPECT_TIMING_RULE: { kind: 'reason', src: 'ASSUMED' },
    // Abstention / preservation codes (nothing moved, for a habit or the plan)
    NO_MATERIAL_GAIN: { kind: 'abstain', src: 'PLAN' },
    NO_LEGAL_SLOT: { kind: 'abstain', src: 'PLAN' },
    CONTRACT_INCOMPLETE: { kind: 'abstain', src: 'PLAN' },
    DURATION_UNRESOLVED: { kind: 'abstain', src: 'PLAN' },
    POLICY_NEVER: { kind: 'abstain', src: 'ASSUMED' },
    HABIT_COMPLETED: { kind: 'immutable', src: 'ASSUMED' },
    HABIT_DID_NOT_DO: { kind: 'immutable', src: 'ASSUMED' },
    HABIT_IN_PROGRESS: { kind: 'immutable', src: 'ASSUMED' },
    USER_PINNED: { kind: 'immutable', src: 'ASSUMED' },
    NO_MOVABLE_HABITS: { kind: 'abstain', src: 'ASSUMED' },
    // Outcomes
    REFLOW_PROPOSED: { kind: 'outcome', src: 'ASSUMED' },
    REFLOW_ABSTAINED: { kind: 'outcome', src: 'PLAN' },
    REFLOW_PLAN_STALE: { kind: 'outcome', src: 'PLAN' },
  };

  /** Candidate rejection rules, in the order they are checked (first failure wins). */
  const REJECT_ORDER = ['OUTSIDE_DAY', 'CALENDAR_CONFLICT', 'HARD_RULE', 'SESSION_SCOPE', 'SESSION_REQUIRED', 'DIRECTION', 'EXCLUSIVE_OVERLAP'];

  function overlaps(a0, a1, b0, b1) { return a0 < b1 && b0 < a1; }
  function ceilTo(n, step) { return Math.ceil(n / step) * step; }
  function round3(n) { return Math.round(n * 1000) / 1000; }

  function sessionOf(t, sessions) {
    if (t < sessions.morning[1]) return 'morning';
    if (t < sessions.midday[1]) return 'midday';
    return 'unwind';
  }

  function anchorMinute(anchor, ctx) {
    if (anchor === 'WAKE') return ctx.wakeMin;
    if (anchor === 'BED') return ctx.bedMin;
    return null;
  }

  /** [lo, hi] start-time bounds an ANCHOR/WINDOW rule allows, or null when it can't be evaluated. */
  function ruleBounds(rule, ctx) {
    const a = anchorMinute(rule.anchor, ctx);
    if (a == null) return null;
    if (rule.relation === 'AFTER') return [a + rule.min_offset_min, a + rule.max_offset_min];
    if (rule.relation === 'BEFORE') return [a - rule.max_offset_min, a - rule.min_offset_min];
    return null;
  }

  function stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
  }
  function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  /**
   * Snapshot of the inputs a plan depends on, so Keep can refuse a stale plan
   * (spec §41). Any change to a habit's status, time, session or pin, or to the
   * calendar, makes the fingerprint differ.
   */
  function dayFingerprint(habits, busy) {
    return fnv1a(stableStringify({
      h: habits.map((h) => [h.id, h.status, h.currentMin, h.session, !!h.pinned]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      b: busy.map((b) => [b.id, b.startMin, b.endMin]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    }));
  }

  /**
   * solveReflow(input, config) → ReflowPlan (spec §35 shape + an inspector trace).
   *
   * input = {
   *   now, wakeMin, bedMin,
   *   curve,                       // EnergyPoint[] from generateEnergyCurve
   *   dipMin, sessions,            // landmarks + curveSessionWindows()
   *   habits: [{ id, name, habitKey, session, currentMin|null, originalMin|null,
   *              durationMin, status: PLANNED|COMPLETED|DID_NOT_DO|IN_PROGRESS, pinned }],
   *   contracts: { [habitKey]: Contract },
   *   busy: [{ id, title, startMin, endMin }],
   * }
   */
  function solveReflow(input, cfgIn) {
    const cfg = Object.assign({}, DEFAULT_CONFIG, cfgIn || {});
    const now = input.now;
    const ctx = { wakeMin: input.wakeMin, bedMin: input.bedMin };
    const sessions = input.sessions;
    const curveEndMin = sessions.unwind[1];
    const dayEnd = Math.min(input.bedMin, curveEndMin);
    const busy = input.busy.slice().sort((a, b) => a.startMin - b.startMin || (a.id < b.id ? -1 : 1));
    // Stable habit order: original time (untimed last), then id. Every loop below uses it.
    const habits = input.habits.slice().sort((a, b) => {
      const am = a.originalMin == null ? 1e9 : a.originalMin;
      const bm = b.originalMin == null ? 1e9 : b.originalMin;
      return am - bm || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });

    const costMult = { LOW: cfg.COST_MULT_LOW, MEDIUM: cfg.COST_MULT_MEDIUM, HIGH: cfg.COST_MULT_HIGH };
    const acceptedRule = (r) => cfg.ACCEPT_RULE_STATUS.indexOf(r.rule_status) !== -1;

    /* ── 1. Eligibility, in spec §31 order ─────────────────────────────── */
    const trace = {};
    const rows = habits.map((h) => {
      const contract = input.contracts[h.habitKey] || null;
      const steps = [];
      let verdict = null;
      let code = null;
      const check = (label, failed, v, c) => {
        if (verdict) return;
        steps.push({ check: label, result: failed ? 'STOP' : 'pass' });
        if (failed) { verdict = v; code = c; }
      };
      check('Status is COMPLETED?', h.status === 'COMPLETED', 'IMMUTABLE', 'HABIT_COMPLETED');
      check('Status is DID_NOT_DO?', h.status === 'DID_NOT_DO', 'IMMUTABLE', 'HABIT_DID_NOT_DO');
      check('Status is IN_PROGRESS?', h.status === 'IN_PROGRESS', 'IMMUTABLE', 'HABIT_IN_PROGRESS');
      check('Pinned by the user?', !!h.pinned, 'IMMUTABLE', 'USER_PINNED');
      check('Contract (TEC) available?', !contract, 'PRESERVE', 'CONTRACT_INCOMPLETE');
      check('reflow_policy is NEVER?', !!contract && contract.reflow_policy === 'NEVER', 'PRESERVE', 'POLICY_NEVER');
      let duration = h.durationMin;
      if (!verdict && contract && contract.temporal_semantics === 'DURATION_BLOCK') {
        const d = h.durationMin > 0 ? h.durationMin : contract.duration_default_min;
        duration = d;
        check('DURATION_BLOCK has a usable duration?', !(d > 0), 'PRESERVE', 'DURATION_UNRESOLVED');
      }
      if (!verdict) { verdict = 'MOVABLE'; steps.push({ check: 'Eligible to move', result: 'MOVABLE' }); }
      // Footprint on the clock. A POINT_EVENT keeps its catalog minutes as its
      // footprint (nothing is ever resized); an unknown duration occupies 1 minute.
      const footprint = Math.max(1, duration > 0 ? duration : h.durationMin > 0 ? h.durationMin : 1);
      const rules = contract ? (contract.rules || []).filter(acceptedRule) : [];
      const ignoredRules = contract ? (contract.rules || []).filter((r) => !acceptedRule(r)) : [];
      const row = { h, contract, verdict, code, footprint, rules, ignoredRules };
      trace[h.id] = {
        id: h.id, name: h.name, habitKey: h.habitKey, status: h.status, pinned: !!h.pinned,
        currentMin: h.currentMin, originalMin: h.originalMin, session: h.session, footprint,
        contractId: contract ? contract.contract_id : null,
        contractStatus: contract ? contract.lifecycle_status : null,
        eligibility: steps, verdict, code,
        ignoredRules: ignoredRules.map((r) => r.rule_id),
      };
      return row;
    });

    /* ── Utility of a habit at a start minute (spec §33: fit × P − disruption) ── */
    const sameSessionPeers = (row) => rows.filter((r) => r !== row && r.h.session === row.h.session && r.h.originalMin != null);

    function utilityAt(row, t) {
      const h = row.h;
      const c = row.contract;
      const end = t + row.footprint;
      // Biological fit from OPPORTUNITY rules (max over them; none → 0).
      let fit = 0;
      let fitTarget = null;
      for (const r of row.rules) {
        if (r.rule_type !== 'OPPORTUNITY') continue;
        let f = 0;
        if (r.target === 'FOCUS') {
          f = curveLevelAtMinute(input.curve, t + row.footprint / 2) || 0;
        } else if (r.target === 'RECOVERY') {
          const mid = t + row.footprint / 2;
          const dDip = input.dipMin == null ? Infinity : Math.abs(mid - input.dipMin);
          const pb0 = ctx.bedMin - cfg.PRE_BED_WINDOW_MIN[0];
          const pb1 = ctx.bedMin - cfg.PRE_BED_WINDOW_MIN[1];
          const dBed = mid < pb0 ? pb0 - mid : mid > pb1 ? mid - pb1 : 0;
          f = Math.max(0, 1 - Math.min(dDip, dBed) / cfg.RECOVERY_RADIUS_MIN);
        }
        if (f > fit) { fit = f; fitTarget = r.target; }
      }
      const fitTerm = cfg.W_FIT * fit * cfg.EXEC_PROBABILITY;
      // Displacement from the ORIGINAL time, monotonic, scaled by movement_cost.
      const mult = c ? costMult[c.movement_cost] || 1 : 1;
      const disp = h.originalMin == null ? 0 : cfg.W_DISPLACE_PER_H * mult * (Math.abs(t - h.originalMin) / 60);
      // Session crossing + preferred-session miss.
      const s = sessionOf(t, sessions);
      // Crossing INTO a preferred session is free; sitting outside it costs W_PREF_MISS.
      const preferred = !!c && c.session_policy === 'PREFERRED';
      const inPreferred = preferred && c.allowed_sessions.indexOf(s) !== -1;
      const cross = s !== h.session && !inPreferred ? cfg.W_SESSION_CROSS : 0;
      const pref = preferred && !inPreferred ? cfg.W_PREF_MISS : 0;
      // Sequence inversions vs same-session habits' original order.
      let inversions = 0;
      if (h.originalMin != null) {
        for (const p of sameSessionPeers(row)) {
          const before0 = h.originalMin < p.h.originalMin;
          const before1 = t < p.h.originalMin;
          if (h.originalMin !== p.h.originalMin && before0 !== before1) inversions++;
        }
      }
      const seq = cfg.W_SEQUENCE * inversions;
      // SOFT ANCHOR/WINDOW rules: penalty grows with overshoot, saturating.
      let soft = 0;
      const softHits = [];
      for (const r of row.rules) {
        if (r.hardness !== 'SOFT' || r.rule_type === 'OPPORTUNITY') continue;
        const b = ruleBounds(r, ctx);
        if (!b) continue;
        const over = t < b[0] ? b[0] - t : t > b[1] ? t - b[1] : 0;
        if (over > 0) {
          soft += cfg.W_SOFT * Math.min(1, over / cfg.SOFT_SCALE_MIN);
          softHits.push(r.rule_id);
        }
      }
      void end;
      const disruption = disp + cross + pref + seq + soft;
      const U = cfg.W_PLACE + fitTerm - disruption;
      return {
        t, U: round3(U), fit: round3(fit), fitTarget, fitTerm: round3(fitTerm),
        disp: round3(disp), cross: round3(cross), pref: round3(pref), seq: round3(seq), inversions,
        soft: round3(soft), softHits, session: s,
      };
    }

    /** First hard check a start minute fails, or null when legal (occupancy excluded). */
    function hardReject(row, t) {
      const c = row.contract;
      const end = t + row.footprint;
      if (t < ctx.wakeMin || end > dayEnd) return { rule: 'OUTSIDE_DAY', detail: 'outside wake → bed' };
      for (const b of busy) if (overlaps(t, end, b.startMin, b.endMin)) return { rule: 'CALENDAR_CONFLICT', detail: b.title };
      for (const r of row.rules) {
        if (r.hardness !== 'HARD' || r.rule_type === 'OPPORTUNITY') continue;
        const bd = ruleBounds(r, ctx);
        if (bd && (t < bd[0] || t > bd[1])) return { rule: 'HARD_RULE', detail: r.rule_id };
      }
      const s = sessionOf(t, sessions);
      if (c.mobility_scope === 'WITHIN_SESSION' && s !== row.h.session) return { rule: 'SESSION_SCOPE', detail: 'WITHIN_SESSION ' + row.h.session };
      if (c.session_policy === 'REQUIRED' && c.allowed_sessions.indexOf(s) === -1) return { rule: 'SESSION_REQUIRED', detail: 'REQUIRED ' + c.allowed_sessions.join('/') };
      const ref = row.h.originalMin;
      if (ref != null && c.movement_direction === 'FORWARD_ONLY' && t < ref) return { rule: 'DIRECTION', detail: 'FORWARD_ONLY' };
      if (ref != null && c.movement_direction === 'BACKWARD_ONLY' && t > ref) return { rule: 'DIRECTION', detail: 'BACKWARD_ONLY' };
      return null;
    }

    function occupantAt(t, end, occ) {
      for (const o of occ) if (overlaps(t, end, o.start, o.end)) return o;
      return null;
    }

    /* ── Occupancy (EXCLUSIVE). Done / did-not-do rows hold no future time. ── */
    const fixedOcc = [];
    for (const r of rows) {
      const h = r.h;
      if (r.verdict === 'MOVABLE') continue;
      if (h.status === 'COMPLETED' || h.status === 'DID_NOT_DO') continue;
      if (h.currentMin == null) continue;
      let start = h.currentMin;
      let end = h.currentMin + r.footprint;
      if (h.status === 'IN_PROGRESS') { start = Math.min(start, now); end = Math.max(end, now + cfg.STEP_MIN); }
      fixedOcc.push({ id: h.id, name: h.name, start, end });
    }

    /* ── Current schedule, scored the same way ─────────────────────────── */
    // A current slot is "placed" only if it hasn't started yet, is inside the day,
    // and doesn't sit on a calendar event or a HARD rule. Otherwise it counts as
    // unplaced (U = 0), which is what makes a rescue worth something.
    function currentState(row) {
      const h = row.h;
      if (h.currentMin == null) return { placed: false, why: 'UNTIMED' };
      if (h.currentMin < now) return { placed: false, why: 'PAST_DUE' };
      const end = h.currentMin + row.footprint;
      for (const b of busy) if (overlaps(h.currentMin, end, b.startMin, b.endMin)) return { placed: false, why: 'CALENDAR_CONFLICT', with: b.title };
      if (row.verdict === 'MOVABLE') {
        const hr = hardReject(row, h.currentMin);
        if (hr && hr.rule !== 'SESSION_SCOPE' && hr.rule !== 'DIRECTION') return { placed: false, why: hr.rule, with: hr.detail };
        const o = occupantAt(h.currentMin, end, fixedOcc.filter((x) => x.id !== h.id));
        if (o) return { placed: false, why: 'HABIT_OVERLAP', with: o.name };
      }
      return { placed: true };
    }

    const candStart = ceilTo(now + cfg.BUFFER_MIN, cfg.STEP_MIN);
    const movable = rows.filter((r) => r.verdict === 'MOVABLE');

    for (const r of rows) {
      const cs = currentState(r);
      r.cur = cs;
      r.curU = cs.placed ? utilityAt(r, r.h.currentMin) : null;
      trace[r.h.id].current = cs.placed
        ? Object.assign({ placed: true }, r.curU)
        : { placed: false, why: cs.why, with: cs.with || null, U: 0 };
    }

    /* ── 2. Candidates (TECR §12) against fixed occupancy ──────────────── */
    function evaluateCandidates(row, occ) {
      const out = [];
      for (let t = candStart; t + row.footprint <= dayEnd; t += cfg.STEP_MIN) {
        const hr = hardReject(row, t);
        if (hr) { out.push({ t, legal: false, rule: hr.rule, detail: hr.detail }); continue; }
        const o = occupantAt(t, t + row.footprint, occ);
        if (o) { out.push({ t, legal: false, rule: 'EXCLUSIVE_OVERLAP', detail: o.name }); continue; }
        out.push(Object.assign({ legal: true }, utilityAt(row, t)));
      }
      return out;
    }
    // Within one habit: higher U, then smaller displacement from original, then earlier.
    function pickBest(row, cands) {
      let best = null;
      for (const c of cands) {
        if (!c.legal) continue;
        if (!best) { best = c; continue; }
        const dc = row.h.originalMin == null ? 0 : Math.abs(c.t - row.h.originalMin);
        const db = row.h.originalMin == null ? 0 : Math.abs(best.t - row.h.originalMin);
        if (c.U > best.U || (c.U === best.U && (dc < db || (dc === db && c.t < best.t)))) best = c;
      }
      return best;
    }

    // Movables' own valid current slots occupy time until they are decided.
    const movableCurOcc = (exceptId) =>
      movable.filter((r) => r.h.id !== exceptId && r.cur.placed).map((r) => ({ id: r.h.id, name: r.h.name, start: r.h.currentMin, end: r.h.currentMin + r.footprint }));

    // Pass 1: potential gain per movable habit, for ordering only.
    for (const r of movable) {
      const cands = evaluateCandidates(r, fixedOcc.concat(movableCurOcc(r.h.id)));
      const best = pickBest(r, cands);
      r.potential = best ? round3(best.U - (r.curU ? r.curU.U : 0)) : -Infinity;
      r.potentialBest = best;
    }

    /* ── 3. Greedy assembly with tie-breaks (spec §18 — order assumed, see notes) ── */
    // 1) larger gain; 2) smaller displacement of its best slot from original;
    // 3) earlier original time; 4) id.
    const order = movable.slice().sort((a, b) => {
      if (b.potential !== a.potential) return b.potential - a.potential;
      const da = a.potentialBest && a.h.originalMin != null ? Math.abs(a.potentialBest.t - a.h.originalMin) : 0;
      const db = b.potentialBest && b.h.originalMin != null ? Math.abs(b.potentialBest.t - b.h.originalMin) : 0;
      if (da !== db) return da - db;
      const oa = a.h.originalMin == null ? 1e9 : a.h.originalMin;
      const ob = b.h.originalMin == null ? 1e9 : b.h.originalMin;
      if (oa !== ob) return oa - ob;
      return a.h.id < b.h.id ? -1 : 1;
    });

    const decided = []; // occupancy of rows already decided in pass 2
    const decidedIds = {};
    const moves = [];
    const kept = [];
    const unresolved = [];
    order.forEach((r, idx) => {
      const occ = fixedOcc.concat(decided, movableCurOcc(r.h.id).filter((o) => !decidedIds[o.id]));
      const cands = evaluateCandidates(r, occ);
      const best = pickBest(r, cands);
      const curU = r.curU ? r.curU.U : 0;
      const tr = trace[r.h.id];
      tr.assemblyRank = idx + 1;
      tr.potentialGain = r.potential === -Infinity ? null : r.potential;
      tr.candidates = cands;
      tr.best = best;
      const gain = best ? round3(best.U - curU) : null;
      tr.gain = gain;
      const needsMove = !r.cur.placed;
      if (best && gain >= cfg.MIN_MOVE_GAIN && best.t !== r.h.currentMin) {
        let reason;
        if (r.cur.why === 'PAST_DUE') reason = 'RESCUE_PAST_DUE';
        else if (r.cur.why === 'CALENDAR_CONFLICT') reason = 'AVOID_CALENDAR_CONFLICT';
        else if (r.cur.why === 'UNTIMED') reason = 'PLACE_UNSCHEDULED';
        else if (r.cur.why === 'HABIT_OVERLAP') reason = 'AVOID_HABIT_OVERLAP';
        else if (!r.cur.placed) reason = 'RESPECT_TIMING_RULE';
        else if (best.fitTerm > r.curU.fitTerm && best.fitTarget === 'FOCUS') reason = 'ALIGN_FOCUS_WINDOW';
        else if (best.fitTerm > r.curU.fitTerm && best.fitTarget === 'RECOVERY') reason = 'ALIGN_RECOVERY_WINDOW';
        else reason = 'RESPECT_TIMING_RULE';
        moves.push({
          id: r.h.id, name: r.h.name,
          from: { min: r.h.currentMin, session: r.h.session },
          to: { min: best.t, session: best.session },
          reason_code: reason, gain,
        });
        decided.push({ id: r.h.id, name: r.h.name, start: best.t, end: best.t + r.footprint });
        tr.decision = 'MOVE';
        tr.reason = reason;
      } else if (needsMove) {
        const code = best ? 'NO_MATERIAL_GAIN' : 'NO_LEGAL_SLOT';
        const blocking = cands.filter((c) => !c.legal).reduce((acc, c) => { acc[c.rule] = (acc[c.rule] || 0) + 1; return acc; }, {});
        unresolved.push({ id: r.h.id, name: r.h.name, code, why: r.cur.why, with: r.cur.with || null, blocking });
        tr.decision = 'UNRESOLVED';
        tr.reason = code;
      } else {
        decided.push({ id: r.h.id, name: r.h.name, start: r.h.currentMin, end: r.h.currentMin + r.footprint });
        kept.push(r.h.id);
        tr.decision = 'KEEP';
        tr.reason = best ? 'NO_MATERIAL_GAIN' : 'NO_LEGAL_SLOT';
      }
      decidedIds[r.h.id] = true;
    });

    // Non-movable rows sitting on a calendar event stay put but are surfaced (never dropped).
    const conflicts = [];
    for (const r of rows) {
      if (r.verdict === 'MOVABLE' || r.h.currentMin == null) continue;
      if (r.h.status !== 'PLANNED') continue;
      if (r.h.currentMin < now) continue;
      const end = r.h.currentMin + r.footprint;
      const b = busy.find((x) => overlaps(r.h.currentMin, end, x.startMin, x.endMin));
      if (b) conflicts.push({ id: r.h.id, name: r.h.name, with: b.title, code: r.code });
    }
    for (const r of rows) {
      const tr = trace[r.h.id];
      if (r.verdict !== 'MOVABLE') { tr.decision = r.verdict === 'IMMUTABLE' ? 'IMMUTABLE' : 'PRESERVE'; tr.reason = r.code; }
    }

    /* ── 4. Plan total vs current total vs threshold (spec §33.2) ──────── */
    const movedU = {};
    for (const m of moves) movedU[m.id] = trace[m.id].best.U;
    let currentTotal = 0;
    let planTotal = 0;
    for (const r of movable) {
      const cu = r.curU ? r.curU.U : 0;
      currentTotal += cu;
      planTotal += movedU[r.h.id] != null ? movedU[r.h.id] : cu;
    }
    currentTotal = round3(currentTotal);
    planTotal = round3(planTotal);
    const totalGain = round3(planTotal - currentTotal);

    let outcome = 'REFLOW_PROPOSED';
    let abstention = null;
    if (!movable.length) { outcome = 'REFLOW_ABSTAINED'; abstention = 'NO_MOVABLE_HABITS'; }
    else if (!moves.length) {
      outcome = 'REFLOW_ABSTAINED';
      abstention = unresolved.length && unresolved.every((u) => u.code === 'NO_LEGAL_SLOT') ? 'NO_LEGAL_SLOT' : 'NO_MATERIAL_GAIN';
    } else if (totalGain < cfg.MIN_REFLOW_GAIN) { outcome = 'REFLOW_ABSTAINED'; abstention = 'NO_MATERIAL_GAIN'; }
    const discardedMoves = outcome === 'REFLOW_ABSTAINED' ? moves.slice() : [];
    const finalMoves = outcome === 'REFLOW_ABSTAINED' ? [] : moves;
    if (outcome === 'REFLOW_ABSTAINED') for (const m of discardedMoves) trace[m.id].decision = 'MOVE_DISCARDED';

    const preserved = rows.filter((r) => r.verdict !== 'MOVABLE').map((r) => ({ id: r.h.id, code: r.code, verdict: r.verdict }));
    const keptCount = rows.length - finalMoves.length;

    const core = {
      outcome,
      abstention,
      moves: finalMoves.map((m) => ({ id: m.id, from: m.from, to: m.to, reason_code: m.reason_code })),
      preserved,
      unresolved: unresolved.map((u) => ({ id: u.id, code: u.code })),
    };
    return {
      outcome,
      abstention,
      moves: finalMoves,
      discardedMoves,
      kept: keptCount,
      preserved,
      unresolved,
      conflicts,
      totals: { current: currentTotal, plan: planTotal, gain: totalGain, threshold: cfg.MIN_REFLOW_GAIN },
      candidateStart: candStart,
      fingerprint: dayFingerprint(input.habits, input.busy),
      expected: input.habits.map((h) => ({ id: h.id, status: h.status, currentMin: h.currentMin, session: h.session, pinned: !!h.pinned })),
      planHash: fnv1a(stableStringify(core)),
      trace: habits.map((h) => trace[h.id]),
      config: cfg,
    };
  }

  /**
   * §58–§59 invariants, checked mechanically against a plan. Returns a list of
   * { name, pass, detail }.
   */
  function checkInvariants(input, plan) {
    const byId = {};
    for (const h of input.habits) byId[h.id] = h;
    const out = [];
    const moved = plan.moves.map((m) => byId[m.id]);
    const add = (name, bad) => out.push({ name, pass: bad.length === 0, detail: bad.join('; ') });
    add('Completed habits never move', moved.filter((h) => h.status === 'COMPLETED').map((h) => h.name));
    add('Did-not-do habits never move', moved.filter((h) => h.status === 'DID_NOT_DO').map((h) => h.name));
    add('In-progress habits never move', moved.filter((h) => h.status === 'IN_PROGRESS').map((h) => h.name));
    add('Pinned habits never move', moved.filter((h) => h.pinned).map((h) => h.name));
    add('Habits without a contract never move', moved.filter((h) => !input.contracts[h.habitKey]).map((h) => h.name));
    add('Nothing lands in elapsed time', plan.moves.filter((m) => m.to.min < input.now).map((m) => m.name));
    const footprint = (h) => {
      const c = input.contracts[h.habitKey];
      const d = c && c.temporal_semantics === 'DURATION_BLOCK' && !(h.durationMin > 0) ? c.duration_default_min : h.durationMin;
      return Math.max(1, d > 0 ? d : 1);
    };
    add('Nothing lands on a calendar event', plan.moves.filter((m) => input.busy.some((b) => overlaps(m.to.min, m.to.min + footprint(byId[m.id]), b.startMin, b.endMin))).map((m) => m.name));
    // No two placed (future, PLANNED) blocks overlap after the plan, among rows the plan touched.
    const after = input.habits.filter((h) => h.status === 'PLANNED').map((h) => {
      const m = plan.moves.find((x) => x.id === h.id);
      return { h, start: m ? m.to.min : h.currentMin, end: (m ? m.to.min : h.currentMin) + footprint(h), moved: !!m };
    }).filter((x) => x.start != null && x.start >= input.now);
    const clashes = [];
    for (const a of after) for (const b of after) if (a.moved && a !== b && overlaps(a.start, a.end, b.start, b.end)) clashes.push(a.h.name + ' × ' + b.h.name);
    add('A moved habit overlaps no other habit (EXCLUSIVE)', clashes);
    add('Nothing is resized (moves carry no duration)', plan.moves.filter((m) => 'duration' in m.to || 'durationMin' in m.to).map((m) => m.name));
    add('Nothing is dropped (every input habit is moved, kept, preserved or unresolved)',
      input.habits.filter((h) => !plan.trace.some((t) => t.id === h.id)).map((h) => h.name));
    return out;
  }

  const api = {
    generateEnergyCurve, curveLevelAtMinute, peakWindows, landmarkMinutes, curveSessionWindows, resolveMinutes,
    DEFAULT_CONFIG, CODES, REJECT_ORDER, solveReflow, checkInvariants, dayFingerprint, sessionOf, stableStringify, fnv1a,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SpirReflow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
