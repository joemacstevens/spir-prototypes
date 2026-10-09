/*
 * fixtures.js — the sample day, the TECR contracts and the six presets.
 * Shared by the page (window.SpirFixtures) and scripts/verify.js (CommonJS), so the
 * headless checks run against exactly what the page shows.
 *
 * Catalog names and minutes are the live catalog's; the times are illustrative.
 */
(function (root) {
  'use strict';

  const hm = (h, m) => h * 60 + (m || 0);

  /** Last night + body clock, fed to the ported generateEnergyCurve. */
  const BODY = { phaseHour: 6.5, wakeHour: 6.5, sleepHours: 7.4, sleepDebtH: 2, hrvRecent: 62, hrvBaseline: 65 };
  const WAKE_MIN = hm(6, 30);
  const BED_MIN = hm(22, 30);

  /** The sample day. `session` is the catalog session label (Morning / Midday / Unwind). */
  const SAMPLE_DAY = [
    { id: 'h-electrolytes', habitKey: 'electrolytes', name: 'Electrolytes', session: 'morning', min: hm(6, 45), durationMin: 2, icon: 'drop' },
    { id: 'h-sunlight', habitKey: 'sunlight', name: 'Sunlight', session: 'morning', min: hm(7, 0), durationMin: 5, icon: 'sun' },
    { id: 'h-breakfast', habitKey: 'breakfast', name: 'Breakfast', session: 'morning', min: hm(7, 30), durationMin: 20, icon: 'meal' },
    { id: 'h-dayprep', habitKey: 'day_prep', name: 'Day prep', session: 'morning', min: hm(8, 0), durationMin: 10, icon: 'list' },
    { id: 'h-deepwork', habitKey: 'deep_work', name: 'Deep work block', session: 'midday', min: hm(9, 30), durationMin: 90, icon: 'focus' },
    { id: 'h-meditation', habitKey: 'meditation', name: 'Meditation', session: 'midday', min: hm(12, 15), durationMin: 10, icon: 'mind' },
    { id: 'h-lunch', habitKey: 'lunch', name: 'Lunch', session: 'midday', min: hm(12, 30), durationMin: 30, icon: 'meal' },
    { id: 'h-walk', habitKey: 'walk', name: 'Walk', session: 'midday', min: hm(13, 15), durationMin: 20, icon: 'walk' },
    { id: 'h-nsdr', habitKey: 'nsdr', name: 'NSDR', session: 'midday', min: hm(14, 30), durationMin: 20, icon: 'rest' },
    { id: 'h-plantomorrow', habitKey: 'plan_tomorrow', name: 'Plan tomorrow', session: 'unwind', min: hm(19, 0), durationMin: 10, icon: 'list' },
    { id: 'h-breathwork', habitKey: 'breathwork', name: 'Breathwork', session: 'unwind', min: hm(21, 30), durationMin: 5, icon: 'breath' },
    { id: 'h-winddown', habitKey: 'wind_down', name: 'Wind-down', session: 'unwind', min: hm(21, 45), durationMin: 10, icon: 'moon' },
  ];

  /**
   * RF-1 pilot contracts — exactly the plan's table. Every offset is a
   * PROVISIONAL placeholder for Jay to ratify (source_authority HABITS_LIBRARY).
   */
  const PILOT_CONTRACTS = {
    electrolytes: {
      contract_id: 'TEC-013-v0', canonical_object_id: 'BIO-HAB-013', habit_key: 'electrolytes',
      temporal_semantics: 'POINT_EVENT', reflow_policy: 'AUTO_WITHIN_BOUNDS',
      mobility_scope: 'CROSS_SESSION', session_policy: 'PREFERRED', allowed_sessions: ['morning'],
      movement_direction: 'EITHER', duration_source: 'NOT_APPLICABLE', duration_default_min: null,
      movement_cost: 'LOW', concurrency: 'EXCLUSIVE', lifecycle_status: 'PROVISIONAL', contract_version: 1,
      rules: [
        { rule_id: 'R-013-1', rule_type: 'ANCHOR', hardness: 'SOFT', anchor: 'WAKE', relation: 'AFTER', min_offset_min: 0, max_offset_min: 90, target: null, source_authority: 'HABITS_LIBRARY', rule_status: 'PROVISIONAL' },
      ],
    },
    breakfast: {
      contract_id: 'TEC-048-v0', canonical_object_id: 'BIO-HAB-048', habit_key: 'breakfast',
      temporal_semantics: 'POINT_EVENT', reflow_policy: 'AUTO_WITHIN_BOUNDS',
      mobility_scope: 'CROSS_SESSION', session_policy: 'PREFERRED', allowed_sessions: ['morning'],
      movement_direction: 'EITHER', duration_source: 'NOT_APPLICABLE', duration_default_min: null,
      movement_cost: 'MEDIUM', concurrency: 'EXCLUSIVE', lifecycle_status: 'PROVISIONAL', contract_version: 1,
      rules: [
        // Stand-in for the MEAL anchor, which has no data source.
        { rule_id: 'R-048-1', rule_type: 'WINDOW', hardness: 'HARD', anchor: 'WAKE', relation: 'AFTER', min_offset_min: 30, max_offset_min: 240, target: null, source_authority: 'HABITS_LIBRARY', rule_status: 'PROVISIONAL' },
      ],
    },
    meditation: {
      contract_id: 'TEC-014-v0', canonical_object_id: 'BIO-HAB-014', habit_key: 'meditation',
      temporal_semantics: 'DURATION_BLOCK', reflow_policy: 'AUTO_WITHIN_BOUNDS',
      mobility_scope: 'CROSS_SESSION', session_policy: 'PREFERRED', allowed_sessions: ['morning'],
      movement_direction: 'EITHER', duration_source: 'LIBRARY_DEFAULT', duration_default_min: 10,
      movement_cost: 'LOW', concurrency: 'EXCLUSIVE', lifecycle_status: 'PROVISIONAL', contract_version: 1,
      rules: [
        { rule_id: 'R-014-1', rule_type: 'OPPORTUNITY', hardness: 'SOFT', anchor: null, relation: null, min_offset_min: null, max_offset_min: null, target: 'FOCUS', source_authority: 'HABITS_LIBRARY', rule_status: 'PROVISIONAL' },
      ],
    },
    breathwork: {
      contract_id: 'TEC-022-v0', canonical_object_id: 'BIO-HAB-022', habit_key: 'breathwork',
      temporal_semantics: 'DURATION_BLOCK', reflow_policy: 'AUTO_WITHIN_BOUNDS',
      mobility_scope: 'WITHIN_SESSION', session_policy: 'PREFERRED', allowed_sessions: ['unwind'],
      movement_direction: 'EITHER', duration_source: 'LIBRARY_DEFAULT', duration_default_min: 5,
      movement_cost: 'LOW', concurrency: 'EXCLUSIVE', lifecycle_status: 'PROVISIONAL', contract_version: 1,
      rules: [
        { rule_id: 'R-022-1', rule_type: 'ANCHOR', hardness: 'SOFT', anchor: 'BED', relation: 'BEFORE', min_offset_min: 15, max_offset_min: 120, target: null, source_authority: 'HABITS_LIBRARY', rule_status: 'PROVISIONAL' },
        { rule_id: 'R-022-2', rule_type: 'OPPORTUNITY', hardness: 'SOFT', anchor: null, relation: null, min_offset_min: null, max_offset_min: null, target: 'RECOVERY', source_authority: 'HABITS_LIBRARY', rule_status: 'PROVISIONAL' },
      ],
    },
  };

  /**
   * Demo-only contracts. NOT RATIFIED and not in the RF-1 table. TECR blocks Deep
   * Work until Variant Mapping exists; Day prep (BIO-HAB-043) is "partial" and Plan
   * tomorrow has no TECR row at all. Each is off unless toggled in the panel.
   */
  const DEMO_CONTRACTS = {
    deep_work: {
      contract_id: 'DEMO-016', canonical_object_id: 'BIO-HAB-016', habit_key: 'deep_work',
      temporal_semantics: 'DURATION_BLOCK', reflow_policy: 'AUTO_WITHIN_BOUNDS',
      mobility_scope: 'CROSS_SESSION', session_policy: 'PREFERRED', allowed_sessions: ['morning', 'midday'],
      movement_direction: 'EITHER', duration_source: 'LIBRARY_DEFAULT', duration_default_min: 90,
      movement_cost: 'HIGH', concurrency: 'EXCLUSIVE', lifecycle_status: 'DEMO_NOT_RATIFIED', contract_version: 0,
      rules: [
        { rule_id: 'D-016-1', rule_type: 'OPPORTUNITY', hardness: 'SOFT', anchor: null, relation: null, min_offset_min: null, max_offset_min: null, target: 'FOCUS', source_authority: 'DEMO', rule_status: 'PROVISIONAL' },
      ],
    },
    day_prep: {
      contract_id: 'DEMO-043', canonical_object_id: 'BIO-HAB-043', habit_key: 'day_prep',
      temporal_semantics: 'DURATION_BLOCK', reflow_policy: 'AUTO_WITHIN_BOUNDS',
      mobility_scope: 'CROSS_SESSION', session_policy: 'PREFERRED', allowed_sessions: ['morning'],
      movement_direction: 'EITHER', duration_source: 'LIBRARY_DEFAULT', duration_default_min: 10,
      movement_cost: 'LOW', concurrency: 'EXCLUSIVE', lifecycle_status: 'DEMO_NOT_RATIFIED', contract_version: 0,
      rules: [
        { rule_id: 'D-043-1', rule_type: 'ANCHOR', hardness: 'SOFT', anchor: 'WAKE', relation: 'AFTER', min_offset_min: 30, max_offset_min: 150, target: null, source_authority: 'DEMO', rule_status: 'PROVISIONAL' },
      ],
    },
    plan_tomorrow: {
      contract_id: 'DEMO-PT', canonical_object_id: null, habit_key: 'plan_tomorrow',
      temporal_semantics: 'DURATION_BLOCK', reflow_policy: 'AUTO_WITHIN_BOUNDS',
      mobility_scope: 'CROSS_SESSION', session_policy: 'PREFERRED', allowed_sessions: ['unwind'],
      movement_direction: 'EITHER', duration_source: 'LIBRARY_DEFAULT', duration_default_min: 10,
      movement_cost: 'LOW', concurrency: 'EXCLUSIVE', lifecycle_status: 'DEMO_NOT_RATIFIED', contract_version: 0,
      rules: [
        { rule_id: 'D-PT-1', rule_type: 'ANCHOR', hardness: 'SOFT', anchor: 'BED', relation: 'BEFORE', min_offset_min: 60, max_offset_min: 210, target: null, source_authority: 'DEMO', rule_status: 'PROVISIONAL' },
      ],
    },
  };

  const GOAL = { name: 'Flow State', loadout: 'Flow State', adds: ['day_prep', 'plan_tomorrow'] };

  const done = (ids) => ids.reduce((a, id) => { a[id] = { status: 'COMPLETED' }; return a; }, {});

  /**
   * Presets. Each builds a full scenario state from the sample day:
   *   now, overrides (per-habit status / time / pin), busy (calendar), omit (habits
   *   not on the day yet), demo (demo contracts switched on), autoRun.
   */
  const PRESETS = [
    {
      key: 'slipped', n: 1, title: 'Morning slipped',
      blurb: '11:10. Electrolytes and Breakfast never got ticked. Rescue moves what its rules allow and says plainly what it can\'t.',
      now: hm(11, 10),
      overrides: done(['h-sunlight', 'h-dayprep', 'h-deepwork']),
      busy: [],
    },
    {
      key: 'collision', n: 2, title: 'Meeting collision',
      blurb: 'A 12:00–1:00 meeting lands on Meditation and Lunch. Meditation has a contract and moves; Lunch has none, so it stays and is flagged.',
      now: hm(10, 5),
      overrides: Object.assign(done(['h-electrolytes', 'h-sunlight', 'h-breakfast', 'h-dayprep']), { 'h-deepwork': { status: 'IN_PROGRESS' } }),
      busy: [{ id: 'cal-sync', title: 'Team sync', startMin: hm(12, 0), endMin: hm(13, 0) }],
    },
    {
      key: 'abstain', n: 3, title: 'Nothing to gain',
      blurb: '3:00 PM and on track. Breathwork already sits in its pre-bed window, so there is nothing worth moving: it abstains, which is a successful result.',
      now: hm(15, 0),
      overrides: done(['h-electrolytes', 'h-sunlight', 'h-breakfast', 'h-dayprep', 'h-deepwork', 'h-meditation', 'h-lunch', 'h-walk', 'h-nsdr']),
      busy: [],
    },
    {
      key: 'impossible', n: 4, title: 'Impossible afternoon',
      blurb: '1:40 PM and the calendar is wall to wall. One 15-minute gap; Meditation takes it. Breathwork can\'t leave Unwind, and Unwind is booked.',
      now: hm(13, 40),
      overrides: done(['h-electrolytes', 'h-sunlight', 'h-breakfast', 'h-dayprep', 'h-deepwork', 'h-lunch']),
      busy: [
        { id: 'cal-ws', title: 'Client workshop', startMin: hm(14, 0), endMin: hm(15, 30) },
        { id: 'cal-board', title: 'Board prep', startMin: hm(15, 30), endMin: hm(17, 0) },
        { id: 'cal-kids', title: 'School pickup', startMin: hm(17, 0), endMin: hm(18, 30) },
        { id: 'cal-dinner', title: 'Dinner out', startMin: hm(18, 45), endMin: hm(19, 45) },
        { id: 'cal-show', title: 'Concert', startMin: hm(19, 45), endMin: hm(22, 30) },
      ],
    },
    {
      key: 'stale', n: 5, title: 'Stale plan',
      blurb: 'Opens a preview of the slipped morning. Tick Electrolytes (in the phone or the panel), then press Keep: the plan is refused and a fresh preview is offered.',
      now: hm(11, 10),
      overrides: done(['h-sunlight', 'h-dayprep', 'h-deepwork']),
      busy: [],
      autoRun: true,
      stale: true,
    },
    {
      key: 'goal', n: 6, title: 'Goal accepted',
      blurb: 'Accept the Goals suggestion: Day prep and Plan tomorrow arrive with no time. With their demo contracts on, Optimize places them.',
      now: hm(7, 20),
      overrides: done(['h-electrolytes', 'h-sunlight']),
      busy: [],
      omit: ['h-dayprep', 'h-plantomorrow'],
      demo: ['day_prep', 'plan_tomorrow'],
      goalPending: true,
    },
  ];

  /** A fresh scenario state (the page's mutable model) from a preset. */
  function scenarioFromPreset(preset) {
    const p = preset || { now: hm(9, 0), overrides: {}, busy: [] };
    const omit = p.omit || [];
    return {
      presetKey: p.key || null,
      now: p.now,
      locked: false,
      habits: SAMPLE_DAY.filter((h) => omit.indexOf(h.id) === -1).map((h) => {
        const o = (p.overrides || {})[h.id] || {};
        const min = o.min !== undefined ? o.min : h.min;
        return {
          id: h.id, habitKey: h.habitKey, name: h.name, icon: h.icon, session: h.session,
          durationMin: h.durationMin,
          currentMin: min, originalMin: min,
          status: o.status || 'PLANNED',
          pinned: !!o.pinned,
        };
      }),
      busy: (p.busy || []).map((b) => Object.assign({}, b)),
      demo: (p.demo || []).slice(),
      goalPending: !!p.goalPending,
    };
  }

  /** The habits a Goal "Accept" adds — no time, so original is null too (addCheckinHabit). */
  function goalAdditions() {
    return SAMPLE_DAY.filter((h) => GOAL.adds.indexOf(h.habitKey) !== -1).map((h) => ({
      id: h.id, habitKey: h.habitKey, name: h.name, icon: h.icon, session: h.session,
      durationMin: h.durationMin, currentMin: null, originalMin: null, status: 'PLANNED', pinned: false,
    }));
  }

  /** Solver input from scenario state, with the curve generated for `now` by the ported model. */
  function buildInput(state, S) {
    const g = S.generateEnergyCurve(Object.assign({}, BODY, { nowHour: state.now / 60 }));
    const firstWindMin = S.landmarkMinutes(g.firstWindPeak);
    const secondWindMin = S.landmarkMinutes(g.secondWindPeak);
    const dipMin = S.landmarkMinutes(g.dipWindow);
    const sessions = S.curveSessionWindows(firstWindMin, secondWindMin, 6 * 60, 23 * 60);
    const contracts = Object.assign({}, PILOT_CONTRACTS);
    for (const k of state.demo || []) if (DEMO_CONTRACTS[k]) contracts[k] = DEMO_CONTRACTS[k];
    return {
      now: state.now,
      wakeMin: WAKE_MIN,
      bedMin: BED_MIN,
      curve: g.curve,
      landmarks: { firstWindMin, dipMin, secondWindMin, firstWindPeak: g.firstWindPeak, dipWindow: g.dipWindow, secondWindPeak: g.secondWindPeak },
      dipMin,
      sessions,
      habits: state.habits.map((h) => ({
        id: h.id, name: h.name, habitKey: h.habitKey, session: h.session,
        currentMin: h.currentMin, originalMin: h.originalMin, durationMin: h.durationMin,
        status: h.status, pinned: h.pinned,
      })),
      contracts,
      busy: state.busy.map((b) => ({ id: b.id, title: b.title, startMin: b.startMin, endMin: b.endMin })),
    };
  }

  const api = { hm, BODY, WAKE_MIN, BED_MIN, SAMPLE_DAY, PILOT_CONTRACTS, DEMO_CONTRACTS, GOAL, PRESETS, scenarioFromPreset, goalAdditions, buildInput };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SpirFixtures = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
