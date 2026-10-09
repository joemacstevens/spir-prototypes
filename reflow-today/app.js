/*
 * app.js — the page: SPiR's Today in a phone frame, the "Optimize my day" flow,
 * and the scenario / inspection panel. The scheduler itself is scheduler.js (pure);
 * the sample day and presets are fixtures.js.
 *
 * No AI anywhere. Every user-facing sentence about a reason code lives in COPY
 * below — that table is the seam a future LLM narration would fill (spec §37).
 */
(function () {
  'use strict';
  const S = window.SpirReflow;
  const F = window.SpirFixtures;

  /* ══════════════════ COPY — one static sentence per code ══════════════════ */
  const COPY = {
    // Reason codes (a move)
    RESCUE_PAST_DUE: 'You missed it earlier, so it moves to your next open slot.',
    AVOID_CALENDAR_CONFLICT: 'Moved out from under something on your calendar.',
    ALIGN_FOCUS_WINDOW: 'Lands closer to your energy peak, when focus comes easier.',
    ALIGN_RECOVERY_WINDOW: 'Lands where your energy dips, a better time to recover.',
    AVOID_HABIT_OVERLAP: 'Moved so it no longer runs into another habit.',
    PLACE_UNSCHEDULED: 'It had no time yet, so it gets the first slot that suits it.',
    RESPECT_TIMING_RULE: 'Moved back inside the hours that suit it best.',
    // Results the user can read (abstention, unresolved, stale, failure)
    NO_MATERIAL_GAIN: 'Your day is already well positioned.',
    UNRESOLVED_SCHEDULE: '{n} couldn\'t be placed without conflicting with your schedule. It stays on your list.',
    UNRESOLVED_WINDOW: '{name}\'s best window has passed for today. It stays on your list.',
    UNRESOLVED_OTHER: '{name} couldn\'t be placed today. It stays on your list.',
    CONFLICT_ONE: '{name} overlaps {event}. Move it yourself if you need to.',
    CONFLICT_MANY: '{n} habits overlap your calendar. Move them yourself if you need to.',
    REFLOW_PLAN_STALE: 'Your day changed since this preview, so nothing was moved.',
    COMMIT_FAILED: 'Couldn\'t update your day. Nothing changed.',
    // Option (c) cue lines (page copy, not registry codes)
    CUE_SLIPPED: '{name} slipped. There\'s still room for it today.',
    CUE_CALENDAR: '{name} now overlaps your calendar.',
    CUE_UNTIMED: '{names} {verb} no time yet.',
    CUE_MANY: '{n} habits slipped or clash with your calendar.',
  };

  const STEPS = ['Finding open windows', 'Checking your energy curve', 'Protecting calendar commitments'];
  const SESSION_LABEL = { morning: 'Morning', midday: 'Midday', unwind: 'Unwind' };
  const SESSION_COLOR = { morning: '#1A6AEB', midday: '#D4A437', unwind: '#00C787' };
  const SESSION_TINT = { morning: '#5B9BFF', midday: '#F0D68A', unwind: '#4FD4A8' };
  const RANGE = [360, 1380]; // the spine's x-domain: 6 AM → 11 PM (the model's sample window)
  const FLOW_STATES = ['IDLE', 'ANALYZING', 'PREVIEWING', 'COMMITTING', 'COMMITTED', 'FAILED'];

  const OPTIONS = {
    a: {
      name: '(a) Separate',
      desc: 'The shipped Goals line stays under the Loadout ("N SUGGESTIONS FOR YOUR GOAL →"). "Optimize my day" sits on the Energy Spine\'s caption row, next to "Next ·", whenever the day is open. Two affordances, each next to the thing it changes. Cost: the trigger is always there and mostly abstains in V1, and it pushes the PEAK readout off the caption row.',
    },
    b: {
      name: '(b) One suggestions row',
      desc: 'One row under the Loadout, "SUGGESTIONS FOR TODAY →", opens a sheet with both: "Add N habits for your Goal" (hands off to Goals) and "Optimize my day". One entry point. Cost: the timing action leaves the Spine it acts on, both actions gain a tap, and it pulls Goal work back onto Today.',
    },
    c: {
      name: '(c) Only when something slipped',
      desc: 'Goals line unchanged. The Spine shows a quiet warm ring on a slipped or colliding habit\'s dot and the caption reads "Breakfast slipped · Optimize my day". With nothing to fix, the Spine looks exactly like today\'s build. Cost: no manual "optimize anyway" on Today; the cue needs a silent dry-run solve to know there is a fix.',
      rec: true,
    },
  };

  /* ══════════════════════════════ Utilities ══════════════════════════════ */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function fmt(min) {
    if (min == null) return '—';
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  const fmtShort = (min) => { const h = Math.floor(min / 60) % 24; return (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? 'A' : 'P'); };
  const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const ICON = {
    drop: '<path d="M12 3c3.5 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.8 6-11z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    meal: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.7 0-3 2-3 5s1.3 4 3 4v9"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    focus: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    mind: '<path d="M12 21c-4 0-7-2-7-5 0-2 1.5-3 3-3.5C7 11 8 9 10 9c0-2 1-4 2-4s2 2 2 4c2 0 3 2 2 3.5 1.5.5 3 1.5 3 3.5 0 3-3 5-7 5z"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M9 21l2-6 3 3v3M11 15l-1-5 4-2 2 4 3 1M10 10l-3 2v3"/>',
    rest: '<path d="M3 12h4l2-3 3 6 2-3h7"/>',
    breath: '<path d="M4 9h11a3 3 0 1 0-3-3M4 15h14a3 3 0 1 1-3 3M4 12h8"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    pin: '<path d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    flow: '<path d="M3 7h11l-3-3M21 17H10l3 3M17 7c2 0 4 2 4 5M7 17c-2 0-4-2-4-5"/>',
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    leagues: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 6h3v2a3 3 0 0 1-3 3M7 6H4v2a3 3 0 0 0 3 3"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  };
  const icon = (name, color, sw) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round">' + (ICON[name] || '') + '</svg>';

  /* ══════════════════════════════ App state ══════════════════════════════ */
  const params = new URLSearchParams(location.search);
  const INSTANT = params.get('instant') === '1';

  const app = {
    presetKey: 'slipped',
    scenario: null,
    config: clone(S.DEFAULT_CONFIG),
    option: params.get('option') || 'a',
    flow: 'IDLE',
    plan: null, // the plan being previewed / committed
    planInput: null,
    analyzeStep: 0,
    anim: 1,
    note: null, // { plan } — inline result note on the Spine card
    failure: null, // 'STALE' | 'COMMIT'
    event: null, // last committed move set, for Undo
    snack: null,
    sheet: null, // 'goals' | 'suggestions'
    goalTicks: {},
    dial: false,
    forceFail: false,
    arrived: [],
    lastRun: null, // { input, plan, at }
    inspectMode: 'auto',
    detCheck: null,
    timers: [],
  };

  function later(fn, ms) {
    if (INSTANT) { fn(); return; }
    app.timers.push(setTimeout(fn, ms));
  }
  function clearTimers() { app.timers.forEach(clearTimeout); app.timers = []; }

  function loadPreset(key) {
    clearTimers();
    const p = F.PRESETS.find((x) => x.key === key);
    app.presetKey = key;
    app.scenario = F.scenarioFromPreset(p);
    app.flow = 'IDLE';
    app.plan = app.planInput = null;
    app.note = app.failure = app.event = app.snack = app.sheet = null;
    app.dial = false;
    app.arrived = [];
    app.lastRun = null;
    app.detCheck = null;
    app.goalTicks = {};
    renderAll();
    if (p.autoRun) later(optimize, INSTANT ? 0 : 500);
  }

  /** Any edit to the day clears the stale result note (the preview itself is left alone, so §41 can bite). */
  function mutate(fn) {
    fn(app.scenario);
    if (app.flow === 'IDLE') app.note = null;
    app.detCheck = null;
    renderAll();
  }

  const input = () => F.buildInput(app.scenario, S);
  const solve = (inp) => S.solveReflow(inp, app.config);

  /* ═════════════════════ The flow (spec §51 state machine) ═════════════════════ */
  function optimize() {
    if (app.scenario.locked) return;
    clearTimers();
    app.event = null; // a new run ends the previous run's Undo window
    app.snack = null;
    app.note = null;
    app.failure = null;
    app.sheet = null;
    const inp = input();
    const plan = solve(inp);
    app.planInput = inp;
    app.plan = plan;
    app.lastRun = { input: inp, plan, at: app.scenario.now };
    app.inspectMode = 'auto';
    app.flow = 'ANALYZING';
    app.analyzeStep = 0;
    renderAll();
    const stepMs = 480;
    STEPS.forEach((_, i) => later(() => { app.analyzeStep = i + 1; renderPhone(); }, stepMs * (i + 1)));
    later(() => {
      if (plan.outcome === 'REFLOW_ABSTAINED') {
        app.flow = 'IDLE';
        app.note = { plan };
        app.plan = null;
        renderAll();
      } else {
        app.flow = 'PREVIEWING';
        app.anim = 0;
        app.note = { plan };
        renderAll();
        animate(0, 1, 900);
      }
    }, stepMs * (STEPS.length + 1));
  }

  function animate(from, to, ms) {
    if (INSTANT) { app.anim = to; renderSpineOnly(); return; }
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      app.anim = from + (to - from) * ease(k);
      renderSpineOnly();
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function discardPreview() {
    clearTimers();
    app.flow = 'IDLE';
    app.plan = null;
    app.note = null;
    app.failure = null;
    renderAll();
  }

  function keep() {
    if (app.flow !== 'PREVIEWING' && !(app.flow === 'FAILED' && app.failure === 'COMMIT')) return;
    app.flow = 'COMMITTING';
    app.failure = null;
    renderAll();
    later(() => {
      const plan = app.plan;
      const nowInp = input();
      // §41: refuse when anything the plan depended on changed, or a target is no longer in the future.
      const fp = S.dayFingerprint(nowInp.habits, nowInp.busy);
      const elapsed = plan.moves.some((m) => m.to.min < app.scenario.now);
      if (fp !== plan.fingerprint || elapsed) {
        app.flow = 'FAILED';
        app.failure = 'STALE';
        renderAll();
        return;
      }
      if (app.forceFail) {
        app.flow = 'FAILED';
        app.failure = 'COMMIT';
        renderAll();
        return;
      }
      // One transaction: every move or none.
      const byId = {};
      app.scenario.habits.forEach((h) => (byId[h.id] = h));
      plan.moves.forEach((m) => {
        const h = byId[m.id];
        h.currentMin = m.to.min;
        h.session = m.to.session; // session is writable (decision 3); original_* is never touched
      });
      app.event = { moves: plan.moves.map((m) => ({ id: m.id, name: m.name, from: m.from, to: m.to })) };
      app.arrived = plan.moves.map((m) => m.id);
      app.flow = 'COMMITTED';
      const n = plan.moves.length;
      app.snack = { kind: 'kept', text: 'Moved ' + n + ' habit' + (n === 1 ? '' : 's') + '.' };
      app.plan = null;
      renderAll();
      later(() => { app.flow = 'IDLE'; app.arrived = []; renderAll(); }, 1400);
    }, 550);
  }

  /** §44: restore only rows still exactly where the plan put them and still PLANNED. */
  function undoEvent() {
    if (!app.event) return;
    const byId = {};
    app.scenario.habits.forEach((h) => (byId[h.id] = h));
    let restored = 0;
    let skipped = 0;
    app.event.moves.forEach((m) => {
      const h = byId[m.id];
      if (h && h.status === 'PLANNED' && h.currentMin === m.to.min && h.session === m.to.session) {
        h.currentMin = m.from.min;
        h.session = m.from.session;
        restored++;
      } else skipped++;
    });
    app.event = null;
    app.note = null;
    app.snack = {
      kind: 'undone',
      text: !skipped ? 'Back to your earlier times.'
        : !restored ? (skipped === 1 ? 'That habit changed since, so it stays as is.' : 'Those habits changed since, so they stay as they are.')
          : 'Restored ' + restored + '. ' + skipped + ' changed since, so ' + (skipped === 1 ? 'it stays' : 'they stay') + ' as is.',
    };
    renderAll();
  }

  /* ══════════════════════════════ Phone ══════════════════════════════ */
  function dayView() {
    const sc = app.scenario;
    const now = sc.now;
    const habits = sc.habits;
    let current = habits.find((h) => h.status === 'IN_PROGRESS');
    if (!current) current = habits.find((h) => h.status === 'PLANNED' && h.currentMin != null && h.currentMin <= now && now < h.currentMin + Math.max(h.durationMin, 15));
    if (!current) {
      current = habits
        .filter((h) => h.status === 'PLANNED' && h.currentMin != null && h.currentMin >= now)
        .sort((a, b) => a.currentMin - b.currentMin)[0];
    }
    const rowState = (h) => {
      if (h.status === 'COMPLETED') return 'done';
      if (h.status === 'DID_NOT_DO') return 'dnd';
      if (current && h.id === current.id) return 'current';
      if (h.status === 'PLANNED' && h.currentMin != null && h.currentMin < now) return 'overdue';
      return 'pending';
    };
    return { current, rowState };
  }

  /** A plan still on screen: being previewed, being kept, or a failed Keep that can be retried. A stale plan is not shown. */
  const planIsLive = () => !!app.plan && (app.flow === 'PREVIEWING' || app.flow === 'COMMITTING' || (app.flow === 'FAILED' && app.failure === 'COMMIT'));

  /** The silent dry run options (b) and (c) need. Pure + cheap; never shown as a plan. */
  function dryRun() {
    const plan = solve(input());
    const fixable = plan.outcome === 'REFLOW_PROPOSED'
      ? plan.moves.filter((m) => ['RESCUE_PAST_DUE', 'AVOID_CALENDAR_CONFLICT', 'PLACE_UNSCHEDULED', 'AVOID_HABIT_OVERLAP'].indexOf(m.reason_code) !== -1)
      : [];
    return { plan, fixable };
  }

  function goalCount() {
    const sc = app.scenario;
    if (!sc.goalPending) return 0;
    return F.goalAdditions().filter((g) => !sc.habits.some((h) => h.id === g.id)).length;
  }

  function spineSVG(dry) {
    const W = 324;
    const H = 96;
    const padTop = 26;
    const padBottom = 22;
    const inp = app.planInput && app.flow !== 'IDLE' ? app.planInput : input();
    const curve = inp.curve;
    const mins = S.resolveMinutes(curve);
    const xOf = (m) => ((m - RANGE[0]) / (RANGE[1] - RANGE[0])) * W;
    const yOf = (l) => padTop + (1 - Math.max(0, Math.min(1, l))) * (H - padTop - padBottom);
    const lvl = (m) => S.curveLevelAtMinute(curve, m);
    const pts = curve.map((p, i) => ({ x: xOf(mins[i]), y: yOf(p.level) }));
    let d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || pts[i + 1];
      d += ' C' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ' ' + (p1.y + (p2.y - p0.y) / 6).toFixed(1) + ' ' +
        (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ' ' + (p2.y - (p3.y - p1.y) / 6).toFixed(1) + ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    const area = d + ' L' + pts[pts.length - 1].x.toFixed(1) + ' ' + H + ' L' + pts[0].x.toFixed(1) + ' ' + H + ' Z';
    let svg = '<svg class="spine-svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs><linearGradient id="sg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#FF6835"/><stop offset="0.34" stop-color="#D4A437"/><stop offset="0.62" stop-color="#00C787"/><stop offset="1" stop-color="#1A6AEB"/></linearGradient>' +
      '<filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>' +
      '<filter id="nglow"><feGaussianBlur stdDeviation="4"/></filter>' +
      '<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#A78BFA" stroke-width="1.4" opacity="0.5"/></pattern></defs>';
    // Calendar events: hatched blocks spanning the plot, a solid foot at the floor.
    for (const b of app.scenario.busy) {
      const x0 = xOf(Math.max(RANGE[0], b.startMin));
      const x1 = xOf(Math.min(RANGE[1], b.endMin));
      if (x1 <= x0) continue;
      svg += '<rect x="' + x0.toFixed(1) + '" y="4" width="' + (x1 - x0).toFixed(1) + '" height="' + (H - 8) + '" fill="url(#hatch)" opacity="0.55" rx="3"/>' +
        '<rect x="' + x0.toFixed(1) + '" y="' + (H - 5) + '" width="' + (x1 - x0).toFixed(1) + '" height="3" fill="#A78BFA" rx="1.5"/>';
    }
    svg += '<path d="' + d + '" stroke="url(#sg)" stroke-width="10" fill="none" opacity="0.4" filter="url(#glow)"/>' +
      '<path d="' + area + '" fill="url(#sg)" opacity="0.16"/>' +
      '<path d="' + d + '" stroke="url(#sg)" stroke-width="3" fill="none" stroke-linecap="round"/>';

    // Habit dots. In preview, a moved dot travels from→to and leaves a ghost behind.
    const moving = {};
    if (planIsLive()) {
      app.plan.moves.forEach((m) => (moving[m.id] = m));
    }
    const slipIds = {};
    if (app.option === 'c' && dry && app.flow === 'IDLE' && !app.scenario.locked) dry.fixable.forEach((m) => (slipIds[m.id] = true));
    for (const h of app.scenario.habits) {
      const m = moving[h.id];
      const color = SESSION_COLOR[h.session];
      if (m) {
        const fromMin = m.from.min;
        if (fromMin != null) {
          const gx = xOf(fromMin);
          const gy = yOf(lvl(fromMin));
          svg += '<circle cx="' + gx.toFixed(1) + '" cy="' + gy.toFixed(1) + '" r="3" fill="#0B0B0F" stroke="' + color + '" stroke-width="1.4" stroke-dasharray="2 2" opacity="0.45"/>';
        }
        const startMin = fromMin == null ? m.to.min : fromMin;
        const cur = startMin + (m.to.min - startMin) * app.anim;
        const cx = xOf(cur);
        const cy = yOf(lvl(cur));
        if (fromMin != null) {
          svg += '<line x1="' + xOf(fromMin).toFixed(1) + '" y1="' + yOf(lvl(fromMin)).toFixed(1) + '" x2="' + cx.toFixed(1) + '" y2="' + cy.toFixed(1) + '" stroke="#5B9BFF" stroke-width="1" stroke-dasharray="2 3" opacity="0.6"/>';
        }
        const op = fromMin == null ? app.anim : 1;
        svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="7" fill="#5B9BFF" opacity="' + (0.25 * op).toFixed(2) + '" filter="url(#nglow)"/>' +
          '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3.4" fill="#0B0B0F" stroke="#5B9BFF" stroke-width="1.8" opacity="' + op.toFixed(2) + '"/>';
        continue;
      }
      if (h.currentMin == null) continue;
      const x = xOf(h.currentMin);
      const y = yOf(lvl(h.currentMin));
      if (h.status === 'COMPLETED') svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="' + color + '"/>';
      else if (h.status === 'DID_NOT_DO') svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.4" fill="#0B0B0F" stroke="#63636F" stroke-width="1.4"/>';
      else svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.4" fill="#0B0B0F" stroke="' + color + '" stroke-width="1.6"/>';
      if (slipIds[h.id]) {
        svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" fill="none" stroke="#FF9A6E" stroke-width="1.4">' +
          (INSTANT ? '' : '<animate attributeName="r" values="5;10;5" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0.15;0.9" dur="2.4s" repeatCount="indefinite"/>') + '</circle>';
      }
    }
    // NOW
    const now = app.scenario.now;
    if (now >= RANGE[0] && now <= RANGE[1]) {
      const x = xOf(now);
      const y = yOf(lvl(now));
      svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="13" fill="#fff" opacity="0.14" filter="url(#nglow)"/>' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6.5" fill="#0B0B0F"/><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5" fill="#fff"/>';
      if (!INSTANT) {
        svg += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="9" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.4"><animate attributeName="r" values="9;20" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="2.6s" repeatCount="indefinite"/></circle>';
      }
    }
    return svg + '</svg>';
  }

  function unresolvedLines(plan) {
    const out = [];
    const sched = plan.unresolved.filter((u) => {
      const b = u.blocking || {};
      const top = Object.keys(b).sort((x, y) => b[y] - b[x])[0];
      u._cause = u.why === 'CALENDAR_CONFLICT' || top === 'CALENDAR_CONFLICT' || top === 'EXCLUSIVE_OVERLAP' ? 'schedule' : top === 'HARD_RULE' ? 'window' : 'other';
      return u._cause === 'schedule';
    });
    if (sched.length) out.push({ cls: 'warn', text: fill(COPY.UNRESOLVED_SCHEDULE, { n: sched.length === 1 ? '1 habit' : sched.length + ' habits' }) });
    plan.unresolved.filter((u) => u._cause === 'window').forEach((u) => out.push({ cls: 'warn', text: fill(COPY.UNRESOLVED_WINDOW, { name: u.name }) }));
    plan.unresolved.filter((u) => u._cause === 'other').forEach((u) => out.push({ cls: 'warn', text: fill(COPY.UNRESOLVED_OTHER, { name: u.name }) }));
    if (plan.conflicts.length === 1) out.push({ cls: 'dim', text: fill(COPY.CONFLICT_ONE, { name: plan.conflicts[0].name, event: plan.conflicts[0].with }) });
    else if (plan.conflicts.length > 1) out.push({ cls: 'dim', text: fill(COPY.CONFLICT_MANY, { n: plan.conflicts.length }) });
    return out;
  }

  function captionHTML(dry, view) {
    const sc = app.scenario;
    if (app.flow === 'ANALYZING') {
      return '<div class="analyzing">' + STEPS.map((s, i) => {
        const cls = i < app.analyzeStep ? 'done' : i === app.analyzeStep ? 'on' : '';
        return '<div class="step ' + cls + '"><span class="dot"></span>' + esc(s) + '</div>';
      }).join('') + '</div>';
    }
    const nx = view.current;
    const next = nx
      ? 'Next · <b>' + esc(nx.name) + '</b>' + (nx.currentMin != null ? ' at ' + fmt(nx.currentMin) : '')
      : 'All caught up';
    const trigger = '<button class="optimize" data-act="optimize">' + icon('flow', null, 2) + 'Optimize my day</button>';
    const inp = input();
    const pw = S.peakWindows(inp.curve);
    const used = sc.habits.filter((h) => h.status === 'COMPLETED' && h.currentMin != null).reduce((acc, h) => {
      for (const [a, b] of pw) acc += Math.max(0, Math.min(b, h.currentMin + h.durationMin) - Math.max(a, h.currentMin));
      return acc;
    }, 0);
    const avail = pw.reduce((a, [s, e]) => a + (e - s), 0) / 60;
    const peak = '<span class="peak">PEAK ' + Math.round(used) + 'm / ' + avail.toFixed(1) + 'h</span>';
    let row;
    const open = !sc.locked && app.flow === 'IDLE';
    if (open && app.option === 'a') row = '<span class="next">' + next + '</span>' + trigger;
    else if (open && app.option === 'c' && dry.fixable.length) {
      const f = dry.fixable;
      let cue;
      if (f.every((m) => m.reason_code === 'PLACE_UNSCHEDULED')) {
        cue = fill(COPY.CUE_UNTIMED, { names: f.length === 2 ? f[0].name + ' and ' + f[1].name : f.length === 1 ? f[0].name : f.length + ' habits', verb: f.length === 1 ? 'has' : 'have' });
      } else if (f.length === 1) {
        cue = fill(f[0].reason_code === 'AVOID_CALENDAR_CONFLICT' ? COPY.CUE_CALENDAR : COPY.CUE_SLIPPED, { name: f[0].name });
      } else cue = fill(COPY.CUE_MANY, { n: f.length });
      row = '<span class="next">' + next + '</span><span class="slip-cue">' + trigger + '</span></div><div class="inline-note warn">' + esc(cue);
    } else row = '<span class="next">' + next + '</span>' + peak;
    let html = '<div class="caption">' + row + '</div>';
    // Inline result note (abstain / unresolved / conflicts), calm and on the card.
    if (app.note && (app.flow === 'IDLE' || app.flow === 'PREVIEWING' || app.flow === 'COMMITTED')) {
      const p = app.note.plan;
      const lines = unresolvedLines(p);
      if (p.outcome === 'REFLOW_ABSTAINED' && !p.unresolved.length && !p.conflicts.length) lines.unshift({ cls: '', text: COPY.NO_MATERIAL_GAIN });
      else if (p.outcome === 'REFLOW_ABSTAINED' && !p.unresolved.length) lines.unshift({ cls: '', text: 'Nothing else needs to move.' });
      if (lines.length) html += lines.map((l) => '<div class="inline-note ' + l.cls + '">' + esc(l.text) + '</div>').join('');
    }
    return html;
  }

  function rowHTML(h, view, moveById, unresolvedById) {
    const st = view.rowState(h);
    const m = moveById[h.id];
    const u = unresolvedById[h.id];
    const color = SESSION_COLOR[h.session];
    let cls = 'row ' + st;
    if (m) cls += ' moved';
    if (u) cls += ' unresolved';
    if (app.arrived.indexOf(h.id) !== -1) cls += ' arrived';
    const done = h.status === 'COMPLETED';
    let tags = '';
    if (st === 'current' && h.status === 'IN_PROGRESS') tags += '<span class="tag run">RUNNING</span>';
    else if (st === 'current') tags += '<span class="tag now">NOW</span>';
    if (st === 'overdue' && !m) tags += '<span class="tag overdue">OVERDUE</span>';
    if (h.status === 'DID_NOT_DO') tags += '<span class="tag muted">NOT TODAY</span>';
    const pin = h.pinned ? '<svg class="pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + ICON.pin + '</svg>' : '';
    let sub;
    if (m) {
      sub = (m.from.min != null ? '<span class="from">' + fmt(m.from.min) + '</span>' : '<span class="from">No time</span>') +
        '<span class="arrow">→</span><span class="to">' + fmt(m.to.min) + '</span>' +
        (m.to.session !== m.from.session ? '<span class="tag muted">' + SESSION_LABEL[m.to.session].toUpperCase() + '</span>' : '');
    } else {
      sub = '<span>' + (h.currentMin != null ? fmt(h.currentMin) : 'No time yet') + '</span><span>· ' + h.durationMin + 'm</span>';
    }
    const reason = m ? '<div class="row-reason">' + esc(COPY[m.reason_code] || '') + '</div>' : '';
    return '<div class="' + cls + '" data-row="' + h.id + '">' +
      '<button class="check ' + (done ? 'on' : '') + '" data-act="tick" data-id="' + h.id + '" aria-label="Check ' + esc(h.name) + '">' + (done ? icon('check', '#0B0B0F', 2.6) : '') + '</button>' +
      '<div class="ico" style="background:' + color + '22">' + icon(h.icon, SESSION_TINT[h.session]) + '</div>' +
      '<div class="row-main"><div class="row-name">' + esc(h.name) + pin + tags + '</div><div class="row-sub">' + sub + '</div>' + reason + '</div>' +
      '</div>';
  }

  function renderPhone() {
    const sc = app.scenario;
    const screen = $('screen');
    const scroll = screen.scrollTop;
    const view = dayView();
    const dry = dryRun();
    const gN = goalCount();
    $('sb-time').textContent = fmt(sc.now).replace(/ (AM|PM)$/, '');

    const moveById = {};
    const unresolvedById = {};
    if (planIsLive()) {
      app.plan.moves.forEach((m) => (moveById[m.id] = m));
    }
    if (app.note && app.flow !== 'ANALYZING') app.note.plan.unresolved.forEach((u) => (unresolvedById[u.id] = u));

    let html = '<div class="hdr"><span class="date">FRI · OCT 9</span>' +
      (sc.locked ? '<span class="pill-locked">LOCKED IN</span>' : '') +
      '<span class="xp-chip">⬢ 2,480 XP</span></div>';
    html += '<div class="spine-card"><i class="bracket tl"></i><i class="bracket tr"></i><i class="bracket bl"></i><i class="bracket br"></i>' +
      '<div class="spine-top"><span class="lbl primed">PRIMED 74</span><span class="lbl stats">STATS ›</span></div>' +
      '<div id="spine-wrap">' + spineSVG(dry) + '</div>' +
      '<div class="ruler">' + [360, 540, 720, 900, 1080, 1260].map((m) => '<span>' + fmtShort(m) + '</span>').join('') + '</div>' +
      captionHTML(dry, view) + '</div>';

    // Loadout line + Goals pointer (+ option b's combined row)
    html += '<div class="loadout-line"><span class="loadout-name">' + esc(F.GOAL.loadout) + '</span><span class="edit">EDIT</span></div>';
    if (app.option === 'b' && !sc.locked) {
      const n = (gN ? 1 : 0) + (dry.fixable.length ? 1 : 0); // actionable entries in the sheet
      html += '<button class="pointer" data-act="open-suggestions">' + icon('zap', '#D4A437') +
        (n ? n + ' SUGGESTION' + (n === 1 ? '' : 'S') + ' FOR TODAY →' : 'SUGGESTIONS FOR TODAY →') + '</button>';
    } else if (gN) {
      html += '<button class="pointer" data-act="open-goals">' + icon('zap', '#D4A437') + gN + ' SUGGESTION' + (gN === 1 ? '' : 'S') + ' FOR YOUR GOAL →</button>';
    }

    // Checklist, grouped by (writable) session
    ['morning', 'midday', 'unwind'].forEach((s) => {
      const rows = sc.habits.filter((h) => h.session === s).sort((a, b) => {
        const am = a.currentMin == null ? 1e9 : a.currentMin;
        const bm = b.currentMin == null ? 1e9 : b.currentMin;
        return am - bm || (a.id < b.id ? -1 : 1);
      });
      if (!rows.length) return;
      const timed = rows.filter((h) => h.currentMin != null).map((h) => h.currentMin);
      const range = timed.length ? fmtShort(Math.min.apply(null, timed)) + ' — ' + fmtShort(Math.max.apply(null, timed)) : '';
      const doneN = rows.filter((h) => h.status === 'COMPLETED').length;
      html += '<div class="group-hdr"><span class="diamond" style="background:' + SESSION_COLOR[s] + ';box-shadow:0 0 8px ' + SESSION_COLOR[s] + '"></span>' +
        '<span class="group-name" style="color:' + SESSION_TINT[s] + '">' + SESSION_LABEL[s].toUpperCase() + '</span>' +
        '<span class="group-range">' + range + '</span><span class="group-line"></span><span class="group-count">' + doneN + '/' + rows.length + '</span></div>';
      html += rows.map((h) => rowHTML(h, view, moveById, unresolvedById)).join('');
    });
    html += '<div class="hint">▶ FOCUS OPENS PLAY MODE · ○ CHECKS IT DONE</div>';
    html += '<button class="lockin ' + (sc.locked ? 'locked' : '') + '" data-act="lock">' + (sc.locked ? 'LOCKED IN ✓' : 'LOCK IN YOUR DAY') + '</button>';
    screen.innerHTML = html;
    screen.scrollTop = scroll;

    // Overlays
    // The FAB stays action-only (the logging dial). It steps aside while a bar owns the bottom edge.
    const barUp = app.flow === 'PREVIEWING' || app.flow === 'COMMITTING' || app.flow === 'FAILED' || !!app.snack;
    let ov = barUp ? '' : '<button class="fab" data-act="dial" aria-label="Log">' + icon('plus', '#0B0B0F', 2.4) + '</button>';
    if (app.dial && !barUp) ov += '<div class="dial">' + ['Meal', 'Activity', 'Hydrate', 'Fast', 'Breath', 'Nap'].map((x) => '<span>' + x + '</span>').join('') + '</div>';
    if (app.flow === 'PREVIEWING' || app.flow === 'COMMITTING') {
      const p = app.plan;
      ov += '<div class="previewbar"><div class="sum"><b>' + p.moves.length + ' moved</b> · ' + p.kept + ' kept</div>' +
        '<button class="btn ghost" data-act="discard" ' + (app.flow === 'COMMITTING' ? 'disabled' : '') + '>Undo</button>' +
        '<button class="btn primary" data-act="keep" ' + (app.flow === 'COMMITTING' ? 'disabled' : '') + '>' + (app.flow === 'COMMITTING' ? 'Keeping…' : 'Keep') + '</button></div>';
    } else if (app.flow === 'FAILED') {
      const stale = app.failure === 'STALE';
      ov += '<div class="previewbar failbar"><div class="failmsg">' + esc(stale ? COPY.REFLOW_PLAN_STALE : COPY.COMMIT_FAILED) + '</div>' +
        '<div class="failbtns"><button class="btn ghost" data-act="discard">Close</button>' +
        (stale ? '<button class="btn primary" data-act="optimize">Preview again</button>' : '<button class="btn primary" data-act="keep">Try again</button>') + '</div></div>';
    } else if (app.snack) {
      ov += '<div class="snackbar"><span class="msg">' + esc(app.snack.text) + '</span>' +
        (app.snack.kind === 'kept' && app.event ? '<button class="act" data-act="undo">Undo</button>' : '') +
        '<button class="x" data-act="snack-x" aria-label="Dismiss">✕</button></div>';
    }
    if (app.sheet === 'goals') ov += goalsSheet();
    if (app.sheet === 'suggestions') ov += suggestionsSheet(dry, gN);
    $('overlays').innerHTML = ov;

    $('tabbar').innerHTML = [['today', 'Today'], ['goals', 'Goals'], ['leagues', 'Leagues'], ['profile', 'Profile']]
      .map(([k, l], i) => '<div class="tab ' + (i === 0 ? 'on' : '') + '">' + icon(k) + '<span>' + l + '</span></div>').join('');
  }

  function renderSpineOnly() {
    const w = $('spine-wrap');
    if (w) w.innerHTML = spineSVG(app.option === 'c' ? dryRun() : null);
  }

  function goalsSheet() {
    const adds = F.goalAdditions().filter((g) => !app.scenario.habits.some((h) => h.id === g.id));
    const ticked = adds.filter((g) => app.goalTicks[g.id] !== false);
    return '<div class="scrim" data-act="close-sheet"></div><div class="sheet"><div class="grab"></div>' +
      '<div class="kicker">GOALS · ' + esc(F.GOAL.name.toUpperCase()) + '</div>' +
      '<h3>Add ' + adds.length + ' essential habit' + (adds.length === 1 ? '' : 's') + '</h3>' +
      '<p>Your Goal needs these today. They join today\'s Loadout without a time.</p>' +
      adds.map((g) => '<div class="opt"><button class="check ' + (app.goalTicks[g.id] !== false ? 'on' : '') + '" data-act="goal-tick" data-id="' + g.id + '">' +
        (app.goalTicks[g.id] !== false ? icon('check', '#0B0B0F', 2.6) : '') + '</button>' +
        '<div class="row-main"><div class="row-name">' + esc(g.name) + '</div><div class="row-sub">' + SESSION_LABEL[g.session] + ' · ' + g.durationMin + 'm</div></div><span class="ess">ESSENTIAL</span></div>').join('') +
      '<div class="actions"><button class="btn ghost" data-act="goal-decline">Not today</button>' +
      '<button class="btn primary" data-act="goal-accept" ' + (ticked.length ? '' : 'disabled') + '>Accept · ' + ticked.length + ' of ' + adds.length + '</button></div>' +
      '<div class="stub">STAND-IN FOR THE GOALS TAB\'S PROPOSAL CARD (SHIPPED)</div></div>';
  }

  function suggestionsSheet(dry, gN) {
    let h = '<div class="scrim" data-act="close-sheet"></div><div class="sheet"><div class="grab"></div><div class="kicker">TODAY</div><h3>Suggestions</h3><p>What to add comes from your Goal. When to do things comes from your Energy Spine.</p>';
    if (gN) h += '<button class="entry" data-act="open-goals">' + '<div class="ico" style="background:#D4A43722">' + icon('zap', '#F0D68A') + '</div><div><div class="t">Add ' + gN + ' habit' + (gN === 1 ? '' : 's') + ' for your Goal</div><div class="s">Opens Goals</div></div></button>';
    h += '<button class="entry" data-act="optimize">' + '<div class="ico" style="background:#1A6AEB22">' + icon('flow', '#5B9BFF') + '</div><div><div class="t">Optimize my day</div><div class="s">' +
      (dry.fixable.length ? dry.fixable.length + ' habit' + (dry.fixable.length === 1 ? '' : 's') + ' could use a new time' : 'Move habits to better times. Nothing changes until you keep it.') + '</div></div></button>';
    return h + '</div>';
  }

  /* ══════════════════════════════ Panel ══════════════════════════════ */
  function renderScenario() {
    const sc = app.scenario;
    const p = F.PRESETS.find((x) => x.key === app.presetKey);
    $('card-scenario').innerHTML =
      '<h2>Scenario <span class="r"><button class="smallbtn" data-act="reset">Reset preset</button></span></h2>' +
      '<div class="presets">' + F.PRESETS.map((x) => '<button class="preset ' + (x.key === app.presetKey ? 'on' : '') + '" data-act="preset" data-key="' + x.key + '"><div class="n">PRESET ' + x.n + '</div><div class="t">' + esc(x.title) + '</div></button>').join('') + '</div>' +
      '<div class="preset-blurb">' + esc(p ? p.blurb : '') + '</div>' +
      '<div class="clock"><span class="muted m">CLOCK</span><input type="range" id="clock" min="360" max="1380" step="5" value="' + sc.now + '"><span class="v" id="clock-v">' + fmt(sc.now) + '</span></div>' +
      '<div class="toggles"><label><input type="checkbox" data-act="lock" ' + (sc.locked ? 'checked' : '') + '> Day locked in</label>' +
      '<label><input type="checkbox" data-act="force-fail" ' + (app.forceFail ? 'checked' : '') + '> Force commit failure (§54)</label></div>' +
      '<div class="mt"><div class="muted m" style="margin-bottom:5px">FLOW STATE (§51)</div><div class="flowstates">' +
      FLOW_STATES.map((s) => '<span class="statechip ' + (s === app.flow ? 'on' : '') + '">' + s + '</span>').join('') + '</div>' +
      (app.failure ? '<span class="chip warn">' + (app.failure === 'STALE' ? 'REFLOW_PLAN_STALE' : 'COMMIT_FAILED') + '</span>' : '') + '</div>';
  }

  function renderOption() {
    const o = OPTIONS[app.option];
    $('card-option').innerHTML = '<h2>Goals + Optimize on Today <span class="r muted">the design question</span></h2>' +
      '<div class="seg">' + Object.keys(OPTIONS).map((k) => '<button class="' + (k === app.option ? 'on' : '') + '" data-act="option" data-key="' + k + '">' + esc(OPTIONS[k].name) + (OPTIONS[k].rec ? ' ★' : '') + '</button>').join('') + '</div>' +
      '<div class="opt-desc">' + esc(o.desc) + '</div>' +
      '<div class="opt-desc"><span class="rec">★ Recommended: (c).</span> It only appears when it can fix something, at the dot that slipped, so it never becomes a button that mostly says "already well positioned". Full reasoning in DESIGN_NOTES.md. Goals suggestions only show in preset 6.</div>';
  }

  function renderHabits() {
    const sc = app.scenario;
    const contracts = input().contracts;
    const rows = sc.habits.slice().sort((a, b) => (a.originalMin == null ? 1e9 : a.originalMin) - (b.originalMin == null ? 1e9 : b.originalMin));
    $('card-habits').innerHTML = '<h2>Habits <span class="r muted">status · pin · time (editing a time resets intent, decision 7)</span></h2>' +
      '<table class="t"><tr><th>Habit</th><th>Session</th><th>Time</th><th>Original</th><th>Status</th><th>Pin</th><th>Contract</th></tr>' +
      rows.map((h) => {
        const c = contracts[h.habitKey];
        const cchip = c ? (c.lifecycle_status === 'DEMO_NOT_RATIFIED' ? '<span class="chip nr">NOT RATIFIED</span>' : '<span class="chip ok">' + esc(c.contract_id) + '</span>') : '<span class="chip">none</span>';
        const t = h.currentMin == null ? '' : String(Math.floor(h.currentMin / 60)).padStart(2, '0') + ':' + String(h.currentMin % 60).padStart(2, '0');
        return '<tr><td>' + esc(h.name) + '</td><td class="m">' + h.session + '</td>' +
          '<td><input type="time" step="300" value="' + t + '" data-act="time" data-id="' + h.id + '"></td>' +
          '<td class="m">' + (h.originalMin !== h.currentMin ? fmt(h.originalMin) : '<span class="muted">same</span>') + '</td>' +
          '<td><select data-act="status" data-id="' + h.id + '">' + ['PLANNED', 'COMPLETED', 'DID_NOT_DO', 'IN_PROGRESS'].map((s) => '<option ' + (s === h.status ? 'selected' : '') + '>' + s + '</option>').join('') + '</select></td>' +
          '<td><input type="checkbox" data-act="pin" data-id="' + h.id + '" ' + (h.pinned ? 'checked' : '') + '></td><td>' + cchip + '</td></tr>';
      }).join('') + '</table>';
  }

  function renderCalendar() {
    const sc = app.scenario;
    $('card-calendar').innerHTML = '<h2>Calendar <span class="r muted">immutable, hard constraints (§24)</span></h2>' +
      (sc.busy.length ? '<table class="t">' + sc.busy.map((b) => '<tr><td>' + esc(b.title) + '</td><td class="m">' + fmt(b.startMin) + ' – ' + fmt(b.endMin) + '</td><td style="text-align:right"><button class="x-btn" data-act="cal-del" data-id="' + b.id + '">✕</button></td></tr>').join('') + '</table>' : '<div class="muted">No events.</div>') +
      '<div class="addcal"><input id="cal-title" placeholder="Title" value="Meeting" size="10"><input id="cal-start" type="time" value="12:00"><input id="cal-end" type="time" value="13:00"><button data-act="cal-add">Add event</button></div>';
  }

  function contractHTML(c, demoKey) {
    const on = demoKey ? app.scenario.demo.indexOf(demoKey) !== -1 : true;
    const rules = c.rules.map((r) => r.rule_id + ' · ' + r.rule_type + ' ' + (r.anchor ? r.anchor + ' ' + r.relation + ' ' + r.min_offset_min + '–' + r.max_offset_min + 'm' : 'target ' + r.target) + ' · ' + r.hardness + ' · ' + r.rule_status).join('<br>');
    return '<div class="contract"><div class="hd">' +
      (demoKey ? '<label><input type="checkbox" data-act="demo" data-key="' + demoKey + '" ' + (on ? 'checked' : '') + '> </label>' : '') +
      '<b>' + esc(F.SAMPLE_DAY.find((h) => h.habitKey === c.habit_key).name) + '</b><span class="chip">' + esc(c.contract_id) + '</span>' +
      (c.canonical_object_id ? '<span class="chip">' + esc(c.canonical_object_id) + '</span>' : '') +
      (demoKey ? (on ? '<span class="chip nr">NOT RATIFIED</span>' : '<span class="chip">demo · off</span>') : '<span class="chip warn">PROVISIONAL</span>') + '</div>' +
      '<div class="fields">' + [c.temporal_semantics, c.reflow_policy, c.mobility_scope + ' / ' + c.session_policy + ' ' + c.allowed_sessions.join('/'), 'dir ' + c.movement_direction, 'dur ' + c.duration_source + (c.duration_default_min ? ' ' + c.duration_default_min + 'm' : ''), 'cost ' + c.movement_cost, c.concurrency].join(' · ') + '</div>' +
      '<div class="rules">' + rules + '</div></div>';
  }

  function renderContracts() {
    $('card-contracts').innerHTML = '<h2>Contracts (TECR) <span class="r muted">RF-1 pilot table; everything else → CONTRACT_INCOMPLETE</span></h2>' +
      Object.keys(F.PILOT_CONTRACTS).map((k) => contractHTML(F.PILOT_CONTRACTS[k])).join('') +
      '<div class="muted m" style="margin:12px 0 6px">DEMO-ONLY · OFF BY DEFAULT · TECR BLOCKS DEEP WORK UNTIL VARIANT MAPPING EXISTS</div>' +
      Object.keys(F.DEMO_CONTRACTS).map((k) => contractHTML(F.DEMO_CONTRACTS[k], k)).join('');
  }

  function inspected() {
    const useLast = app.lastRun && (app.inspectMode === 'last' || (app.inspectMode === 'auto' && app.flow !== 'IDLE') || (app.inspectMode === 'auto' && app.note));
    if (useLast) return { input: app.lastRun.input, plan: app.lastRun.plan, label: 'Last Optimize run · clock ' + fmt(app.lastRun.at) + ' · frozen' };
    const inp = input();
    return { input: inp, plan: solve(inp), label: 'Live dry run · re-solves on every change' };
  }

  function renderRun() {
    const { input: inp, plan, label } = inspected();
    const curFp = S.dayFingerprint(input().habits, input().busy);
    const t = plan.totals;
    const span = Math.max(0.5, Math.abs(t.gain), t.threshold * 2);
    const gW = Math.min(100, (Math.abs(t.gain) / span) * 100);
    const thX = Math.min(100, (t.threshold / span) * 100);
    const inv = S.checkInvariants(inp, plan);
    const lm = inp.landmarks;
    $('card-run').innerHTML = '<h2>Last run <span class="r"><span class="seg" style="font-size:11px">' +
      [['auto', 'Auto'], ['last', 'Last run'], ['live', 'Live']].map(([k, l]) => '<button class="' + (app.inspectMode === k ? 'on' : '') + '" data-act="inspect" data-key="' + k + '" style="padding:3px 8px">' + l + '</button>').join('') + '</span></span></h2>' +
      '<div class="muted" style="margin-bottom:8px">' + esc(label) + '</div>' +
      '<div class="state-line"><span class="chip ' + (plan.outcome === 'REFLOW_PROPOSED' ? 'blue' : 'ok') + '">' + plan.outcome + '</span>' +
      (plan.abstention ? '<span class="chip warn">' + plan.abstention + '</span>' : '') +
      '<span class="chip">plan ' + plan.planHash + '</span>' +
      '<span class="chip ' + (curFp === plan.fingerprint ? 'ok' : 'bad') + '">day ' + plan.fingerprint + (curFp === plan.fingerprint ? ' = now' : ' ≠ now ' + curFp + ' → STALE') + '</span></div>' +
      '<div class="totals"><div class="kv"><span class="k">current schedule</span><span class="m">' + t.current + '</span><span class="k">plan</span><span class="m">' + t.plan + '</span><span class="k">gain</span><span class="m">' + t.gain + '  vs MIN_REFLOW_GAIN ' + t.threshold + (t.gain >= t.threshold ? ' ✓ clears' : ' ✗ below → abstain') + '</span></div>' +
      '<div class="bar"><div class="g ' + (t.gain < 0 ? 'neg' : '') + '" style="width:' + gW + '%"></div><div class="th" style="left:' + thX + '%"></div></div>' +
      '<div class="legend"><span>0</span><span style="color:#FFB547">│ threshold</span><span>' + span.toFixed(2) + '</span></div></div>' +
      '<div class="kv mt"><span class="k">moves</span><span>' + (plan.moves.length ? plan.moves.map((m) => esc(m.name) + ' <span class="m">' + fmt(m.from.min) + ' → ' + fmt(m.to.min) + '</span> <span class="chip blue">' + m.reason_code + '</span> <span class="m muted">+' + m.gain + '</span>').join('<br>') : '<span class="muted">none</span>') + '</span>' +
      (plan.discardedMoves.length ? '<span class="k">discarded</span><span>' + plan.discardedMoves.map((m) => esc(m.name) + ' <span class="m">' + fmt(m.from.min) + ' → ' + fmt(m.to.min) + '</span> <span class="m muted">+' + m.gain + ' (plan below threshold)</span>').join('<br>') + '</span>' : '') +
      '<span class="k">unresolved</span><span>' + (plan.unresolved.length ? plan.unresolved.map((u) => esc(u.name) + ' <span class="chip warn">' + u.code + '</span> <span class="m muted">' + u.why + (u.with ? ' · ' + esc(u.with) : '') + '</span>').join('<br>') : '<span class="muted">none</span>') + '</span>' +
      '<span class="k">calendar overlaps</span><span>' + (plan.conflicts.length ? plan.conflicts.map((c) => esc(c.name) + ' × ' + esc(c.with) + ' <span class="chip">' + c.code + '</span>').join('<br>') : '<span class="muted">none</span>') + '</span>' +
      '<span class="k">candidates from</span><span class="m">' + fmt(plan.candidateStart) + ' (now ' + fmt(inp.now) + ' + ' + plan.config.BUFFER_MIN + 'm, up to the ' + plan.config.STEP_MIN + '-min grid)</span>' +
      '<span class="k">sessions</span><span class="m">Morning →' + fmt(inp.sessions.morning[1]) + ' · Midday →' + fmt(inp.sessions.midday[1]) + ' · Unwind →' + fmt(inp.sessions.unwind[1]) + '</span>' +
      '<span class="k">curve</span><span class="m">first wind ' + lm.firstWindPeak + ' · dip ' + lm.dipWindow + ' · second wind ' + lm.secondWindPeak + ' · wake ' + fmt(inp.wakeMin) + ' · bed ' + fmt(inp.bedMin) + '</span></div>' +
      '<div class="mt"><button class="smallbtn" data-act="det">Determinism: solve this input 100× (§59)</button> ' +
      (app.detCheck ? '<span class="chip ' + (app.detCheck.ok ? 'ok' : 'bad') + '">' + app.detCheck.same + '/100 identical · ' + app.detCheck.hash + '</span>' : '') + '</div>' +
      '<div class="mt"><div class="muted m">INVARIANTS (§58–§59), CHECKED ON THIS PLAN</div><ul class="inv">' +
      inv.map((i) => '<li><span class="' + (i.pass ? 'y' : 'n') + '">' + (i.pass ? '✓' : '✗') + '</span><span>' + esc(i.name) + (i.detail ? ' — <span class="n">' + esc(i.detail) + '</span>' : '') + '</span></li>').join('') + '</ul></div>';
  }

  const REJECT_COLOR = { OUTSIDE_DAY: '#2a2c36', CALENDAR_CONFLICT: '#A78BFA', HARD_RULE: '#FF5C6C', SESSION_SCOPE: '#4a6fa8', SESSION_REQUIRED: '#4a6fa8', DIRECTION: '#777', EXCLUSIVE_OVERLAP: '#c97b3a' };

  function stripHTML(tr, inp) {
    const lo = RANGE[0];
    const hi = RANGE[1];
    const x = (m) => ((m - lo) / (hi - lo)) * 100;
    const step = tr.candidates.length > 1 ? tr.candidates[1].t - tr.candidates[0].t : 15;
    const legalU = tr.candidates.filter((c) => c.legal).map((c) => c.U);
    const uMin = Math.min.apply(null, legalU.concat([0]));
    const uMax = Math.max.apply(null, legalU.concat([1]));
    let h = '<div class="strip">';
    for (const c of tr.candidates) {
      let col;
      if (c.legal) {
        const k = uMax > uMin ? (c.U - uMin) / (uMax - uMin) : 1;
        col = 'rgba(61,220,151,' + (0.2 + 0.8 * k).toFixed(2) + ')';
      } else col = REJECT_COLOR[c.rule] || '#444';
      h += '<span class="c" title="' + fmt(c.t) + (c.legal ? ' U=' + c.U : ' ✗ ' + c.rule + ' ' + (c.detail || '')) + '" style="left:' + x(c.t) + '%;width:calc(' + ((step / (hi - lo)) * 100) + '% - 1px);background:' + col + '"></span>';
    }
    if (tr.currentMin != null) h += '<span class="cur" title="current ' + fmt(tr.currentMin) + '" style="left:' + x(tr.currentMin) + '%"></span>';
    h += '<span class="now" style="left:' + x(inp.now) + '%"></span>';
    if (tr.best && (tr.decision === 'MOVE' || tr.decision === 'MOVE_DISCARDED' || tr.decision === 'KEEP')) h += '<span class="pick" style="left:calc(' + x(tr.best.t) + '% - 1px);width:calc(' + ((step / (hi - lo)) * 100) + '% + 2px)"></span>';
    h += '</div><div class="strip-axis">' + [360, 540, 720, 900, 1080, 1260, 1380].map((m) => '<span>' + fmtShort(m) + '</span>').join('') + '</div>' +
      '<div class="legend-row"><span><i style="background:rgba(61,220,151,.9)"></i>legal (brighter = higher U)</span>' +
      Object.keys(REJECT_COLOR).map((k) => '<span><i style="background:' + REJECT_COLOR[k] + '"></i>' + k + '</span>').join('') +
      '<span><i style="background:#FF6835;width:2px"></i>current</span><span><i style="background:#fff;width:2px"></i>now</span><span><i style="border:2px solid #fff;background:none"></i>best</span></div>';
    return h;
  }

  function scoreRow(label, u, cls) {
    return '<tr class="' + (cls || '') + '"><td>' + label + '</td><td>' + u.fit + (u.fitTarget ? ' ' + u.fitTarget[0] : '') + '</td><td>' + u.fitTerm + '</td><td>−' + u.disp + '</td><td>−' + u.cross + '</td><td>−' + u.pref + '</td><td>−' + u.seq + (u.inversions ? ' (' + u.inversions + ')' : '') + '</td><td>−' + u.soft + '</td><td><b>' + u.U + '</b></td></tr>';
  }

  function renderWhy() {
    const { input: inp, plan } = inspected();
    const order = plan.trace.slice().sort((a, b) => (a.assemblyRank || 99) - (b.assemblyRank || 99));
    const decisionChip = (t) => {
      const m = { MOVE: 'blue', MOVE_DISCARDED: 'warn', KEEP: 'ok', UNRESOLVED: 'warn', IMMUTABLE: '', PRESERVE: '' }[t.decision];
      return '<span class="chip ' + m + '">' + t.decision + '</span>';
    };
    $('card-why').innerHTML = '<h2>Why <span class="r muted">each habit, in assembly order (movable first)</span></h2>' +
      '<div class="muted" style="margin-bottom:8px;line-height:1.5">U = W_PLACE + fit × W_FIT × P − (displacement + session crossing + preferred-session miss + sequence + SOFT rules). A current slot that has passed, sits on the calendar or breaks a HARD rule scores 0 (unplaced). Gain = best U − current U.</div>' +
      order.map((t) => {
        const open = t.verdict === 'MOVABLE' && (t.decision === 'MOVE' || t.decision === 'UNRESOLVED');
        let body = '<div><h4>Eligibility (spec §31 order)</h4><ol class="elig">' + t.eligibility.map((s) => '<li><span class="' + (s.result === 'STOP' ? 'stop' : s.result === 'MOVABLE' ? 'mov' : 'pass') + '">' + esc(s.check) + ' — ' + s.result + '</span></li>').join('') + '</ol>' +
          (t.verdict !== 'MOVABLE' ? '<div class="mt">→ <b>' + t.verdict + '</b> <span class="chip warn">' + t.code + '</span> ' + (t.verdict === 'PRESERVE' ? 'stays exactly where it is.' : 'never moves.') + '</div>' : '') +
          (t.ignoredRules && t.ignoredRules.length ? '<div class="muted mt">Ignored rules (status not in ACCEPT_RULE_STATUS): ' + t.ignoredRules.join(', ') + '</div>' : '') + '</div>';
        if (t.verdict === 'MOVABLE' && t.candidates) {
          const rej = t.candidates.filter((c) => !c.legal).reduce((a, c) => { a[c.rule] = (a[c.rule] || 0) + 1; return a; }, {});
          const legal = t.candidates.filter((c) => c.legal).sort((a, b) => b.U - a.U || a.t - b.t);
          body += '<div><h4>Current slot</h4>' + (t.current.placed
            ? '<span class="m">' + fmt(t.currentMin) + '</span> placed, U = ' + t.current.U
            : '<span class="m">' + fmt(t.currentMin) + '</span> <span class="chip warn">' + t.current.why + '</span>' + (t.current.with ? ' ' + esc(t.current.with) : '') + ' → counts as unplaced, U = 0') + '</div>';
          body += '<div><h4>Candidates · ' + t.candidates.length + ' tried, ' + legal.length + ' legal</h4>' + stripHTML(t, inp) +
            '<div class="mt m muted">rejected: ' + (Object.keys(rej).length ? S.REJECT_ORDER.filter((k) => rej[k]).map((k) => k + ' ×' + rej[k]).join(' · ') : 'none') + '</div></div>';
          if (legal.length || t.current.placed) body += '<div><h4>Scores (top legal + current)</h4><table class="t cands"><tr><th>slot</th><th>fit</th><th>fit·P</th><th>disp</th><th>cross</th><th>pref</th><th>seq</th><th>soft</th><th>U</th></tr>' +
            (t.current.placed ? scoreRow('current ' + fmt(t.currentMin), t.current, 'curr') : '') +
            legal.slice(0, 6).map((c) => scoreRow(fmt(c.t), c, t.best && c.t === t.best.t ? 'pick' : '')).join('') + '</table></div>';
          body += '<div><h4>Decision</h4>' + decisionChip(t) + ' <span class="chip ' + (t.decision === 'MOVE' ? 'blue' : 'warn') + '">' + t.reason + '</span> ' +
            (t.best ? 'best ' + fmt(t.best.t) + ', gain ' + t.gain + ' vs MIN_MOVE_GAIN ' + plan.config.MIN_MOVE_GAIN : 'no legal slot') +
            (t.decision === 'MOVE_DISCARDED' ? ' — discarded because the whole plan fell below MIN_REFLOW_GAIN' : '') +
            (t.reason && COPY[t.reason] && t.decision === 'MOVE' ? '<div class="mt muted">User copy: “' + esc(COPY[t.reason]) + '”</div>' : '') + '</div>';
        }
        return '<details class="hab" ' + (open ? 'open' : '') + '><summary><span class="rank">' + (t.assemblyRank ? '#' + t.assemblyRank : '') + '</span><span class="nm">' + esc(t.name) + '</span>' +
          '<span class="chip">' + t.verdict + '</span>' + decisionChip(t) + (t.reason ? '<span class="chip">' + t.reason + '</span>' : '') +
          (t.contractStatus === 'DEMO_NOT_RATIFIED' ? '<span class="chip nr">NOT RATIFIED</span>' : '') +
          '<span class="m muted" style="margin-left:auto">' + fmt(t.currentMin) + ' · ' + t.footprint + 'm</span></summary><div class="hab-body">' + body + '</div></details>';
      }).join('');
  }

  function renderConfig() {
    const d = S.DEFAULT_CONFIG;
    $('card-config').innerHTML = '<h2>CONFIG <span class="r"><button class="smallbtn" data-act="cfg-reset">Reset</button></span></h2>' +
      '<div class="cfg">' + Object.keys(d).filter((k) => typeof d[k] === 'number').map((k) =>
        '<label>' + k + '<input data-act="cfg" data-key="' + k + '" value="' + app.config[k] + '" class="' + (app.config[k] !== d[k] ? 'changed' : '') + '"></label>').join('') + '</div>' +
      '<div class="muted mt m">PRE_BED_WINDOW_MIN ' + JSON.stringify(app.config.PRE_BED_WINDOW_MIN) + ' · ACCEPT_RULE_STATUS ' + JSON.stringify(app.config.ACCEPT_RULE_STATUS) + '</div>';
  }

  function renderCopy() {
    $('card-copy').innerHTML = '<h2>Reason copy <span class="r muted">COPY in app.js · the future LLM seam (§37)</span></h2>' +
      '<table class="t copy-table"><tr><th>Code</th><th>Source</th><th>User sees</th></tr>' +
      Object.keys(COPY).map((k) => '<tr><td class="m">' + k + '</td><td>' + (S.CODES[k] ? '<span class="chip ' + (S.CODES[k].src === 'PLAN' ? 'ok' : 'warn') + '">' + S.CODES[k].src + '</span>' : '<span class="chip">UI</span>') + '</td><td>' + esc(COPY[k]) + '</td></tr>').join('') + '</table>' +
      '<div class="muted mt">PLAN = named in FEATURE_PLAN_reflow.md (which cites TECR §14–15). ASSUMED = coined for this prototype; check against TECR before shipping. UI = page chrome, not a registry code.</div>';
  }

  function renderPanel() {
    renderScenario();
    renderOption();
    renderHabits();
    renderCalendar();
    renderContracts();
    renderRun();
    renderWhy();
    renderConfig();
    renderCopy();
  }

  function renderAll() {
    renderPhone();
    renderPanel();
  }

  /* ══════════════════════════════ Events ══════════════════════════════ */
  const toMin = (v) => { const m = String(v).match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id;
    const key = el.dataset.key;
    const tag = el.tagName;
    if ((tag === 'INPUT' || tag === 'SELECT') && act !== 'lock' && act !== 'force-fail' && act !== 'pin' && act !== 'demo') return;
    switch (act) {
      case 'optimize': return optimize();
      case 'keep': return keep();
      case 'discard': return discardPreview();
      case 'undo': return undoEvent();
      case 'snack-x': app.snack = null; return renderPhone();
      case 'dial': app.dial = !app.dial; return renderPhone();
      case 'preset': return loadPreset(key);
      case 'reset': return loadPreset(app.presetKey);
      case 'option': app.option = key; return renderAll();
      case 'inspect': app.inspectMode = key; return renderPanel();
      case 'tick':
        return mutate((sc) => { const h = sc.habits.find((x) => x.id === id); h.status = h.status === 'COMPLETED' ? 'PLANNED' : 'COMPLETED'; });
      case 'lock':
        e.preventDefault();
        return mutate((sc) => {
          sc.locked = !sc.locked;
          if (sc.locked) { app.event = null; app.snack = null; if (app.flow === 'PREVIEWING') { app.flow = 'IDLE'; app.plan = null; app.note = null; } }
        });
      case 'force-fail': app.forceFail = el.checked; return renderPanel();
      case 'pin': return mutate((sc) => { sc.habits.find((x) => x.id === id).pinned = el.checked; });
      case 'demo': return mutate((sc) => { const i = sc.demo.indexOf(key); if (el.checked && i === -1) sc.demo.push(key); if (!el.checked && i !== -1) sc.demo.splice(i, 1); });
      case 'cal-del': return mutate((sc) => { sc.busy = sc.busy.filter((b) => b.id !== id); });
      case 'cal-add': {
        const s = toMin($('cal-start').value);
        const en = toMin($('cal-end').value);
        if (s == null || en == null || en <= s) return;
        const title = $('cal-title').value || 'Event';
        return mutate((sc) => { sc.busy.push({ id: 'cal-' + s + '-' + en + '-' + sc.busy.length, title, startMin: s, endMin: en }); });
      }
      case 'open-goals': app.sheet = 'goals'; return renderPhone();
      case 'open-suggestions': app.sheet = 'suggestions'; return renderPhone();
      case 'close-sheet': app.sheet = null; return renderPhone();
      case 'goal-tick': app.goalTicks[id] = app.goalTicks[id] === false; return renderPhone();
      case 'goal-accept': {
        const adds = F.goalAdditions().filter((g) => !app.scenario.habits.some((h) => h.id === g.id) && app.goalTicks[g.id] !== false);
        app.sheet = null;
        app.snack = { kind: 'info', text: 'Added ' + adds.length + ' habit' + (adds.length === 1 ? '' : 's') + ' to today.' };
        return mutate((sc) => { sc.habits.push.apply(sc.habits, adds); sc.goalPending = false; });
      }
      case 'goal-decline':
        app.sheet = null;
        app.snack = { kind: 'info', text: 'Skipped for today. It\'ll be waiting on Goals.' };
        return mutate((sc) => { sc.goalPending = false; });
      case 'det': {
        const { input: inp } = inspected();
        const ref = solve(clone(inp));
        let same = 0;
        for (let i = 0; i < 100; i++) {
          const p = solve(clone(inp));
          if (p.planHash === ref.planHash && S.stableStringify(p.trace) === S.stableStringify(ref.trace)) same++;
        }
        app.detCheck = { same, ok: same === 100, hash: ref.planHash };
        return renderRun();
      }
      case 'cfg-reset': app.config = clone(S.DEFAULT_CONFIG); return renderAll();
      default:
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    const act = el.dataset && el.dataset.act;
    if (act === 'status') return mutate((sc) => { sc.habits.find((x) => x.id === el.dataset.id).status = el.value; });
    if (act === 'time') {
      const m = toMin(el.value);
      // A manual time is a new intent: both current and original (decision 7).
      return mutate((sc) => { const h = sc.habits.find((x) => x.id === el.dataset.id); h.currentMin = m; h.originalMin = m; });
    }
    if (act === 'cfg') {
      const v = Number(el.value);
      if (!Number.isFinite(v)) return renderConfig();
      app.config[el.dataset.key] = v;
      app.detCheck = null;
      return renderAll();
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id !== 'clock') return;
    app.scenario.now = Number(e.target.value);
    $('clock-v').textContent = fmt(app.scenario.now);
    if (app.flow === 'IDLE') app.note = null;
    renderPhone();
    renderRun();
    renderWhy();
    renderHabits();
  });

  function fitPhone() {
    const k = Math.min(1, (window.innerHeight - 50) / 864);
    $('phone').style.transform = k < 1 ? 'scale(' + k.toFixed(3) + ')' : '';
    $('phone').style.margin = k < 1 ? ((844 * (k - 1)) / 2).toFixed(0) + 'px 0' : '';
  }
  window.addEventListener('resize', fitPhone);

  /* ── Boot. URL params stage a state directly (used for the screenshots):
       ?preset=slipped&step=preview|result|stale|goal-preview|goal-result|undo&option=a&instant=1 ── */
  fitPhone();
  const preset = params.get('preset') || 'slipped';
  loadPreset(preset);
  const step = params.get('step');
  if (step) {
    const sc = app.scenario;
    if (step.indexOf('goal') === 0) {
      const adds = F.goalAdditions();
      sc.habits.push.apply(sc.habits, adds);
      sc.goalPending = false;
    }
    if (step === 'sheet') { app.sheet = 'goals'; renderAll(); }
    if (step === 'suggestions') { app.sheet = 'suggestions'; renderAll(); }
    if (/preview|result|stale|undo/.test(step) && app.flow === 'IDLE') optimize();
    if (step === 'stale' || step === 'stale-result') {
      const h = sc.habits.find((x) => x.id === 'h-electrolytes');
      h.status = 'COMPLETED';
      renderAll();
      if (step === 'stale-result') keep();
    }
    if (/result|undo/.test(step) && step !== 'stale-result') keep();
    if (step === 'undo') undoEvent();
  }
  window.__app = app; // for console poking
})();
