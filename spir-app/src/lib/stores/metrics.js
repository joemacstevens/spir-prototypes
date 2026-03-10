import { writable } from 'svelte/store';

// Daily metrics (for progress rings)
export const dailyMetrics = writable({
    steps: { current: 3452, target: 5000 },
    checkIns: { current: 2, target: 5 },
    fasting: { current: 8, target: 16 },
    sleepCycles: { current: 4, target: 5 }
});

// Weekly radar chart data (6-axis)
export const radarData = writable({
    sleep: 78,
    lockIns: 85,
    loadouts: 90,
    habits: 72,
    brainFog: 65,
    rested: 80
});

// Flow state readiness
export const flowState = writable({ value: 320, max: 500 });

// Self-assessment radar (8-axis — connected to onboarding)
// Scale: 0-7 per axis, normalize to 0-100 for display: value × 14.2
export const selfAssessment = writable({
    axes: [
        { label: 'Movement', baseline: 3, current: 5, max: 7 },
        { label: 'Fitness', baseline: 2, current: 4, max: 7 },
        { label: 'Sleep Qty', baseline: 4, current: 5, max: 7 },
        { label: 'Sleep Qlty', baseline: 3, current: 6, max: 7 },
        { label: 'Plan', baseline: 2, current: 5, max: 7 },
        { label: 'Execution', baseline: 1, current: 4, max: 7 },
        { label: 'Nutrition', baseline: 4, current: 5, max: 7 },
        { label: 'Fasting', baseline: 0, current: 3, max: 7 }
    ]
});

// Fasting state
export const fastingState = writable({
    active: false,
    startTime: null,
    duration: 16, // hours
    elapsed: 0,   // hours
    preset: null   // '16:8', '18:6', '20:4', '24hr'
});

// Weekly fasting history
export const weeklyFasting = writable([
    { day: 'Sun', hours: 0 },
    { day: 'Mon', hours: 16 },
    { day: 'Tue', hours: 18 },
    { day: 'Wed', hours: 0 },
    { day: 'Thu', hours: 4 },  // today, in progress
    { day: 'Fri', hours: 0 },
    { day: 'Sat', hours: 0 }
]);

// Streak data
export const streaks = writable({
    sleep: {
        currentRun: 5,
        required: 7,
        claimedCount: 3,
        status: 'active', // 'locked', 'active', 'claimable'
        xpReward: 50,
        color: '#A78BFA',
        icon: '🌙',
        label: 'Sleep Streak'
    },
    hydration: {
        currentRun: 7,
        required: 7,
        claimedCount: 2,
        status: 'claimable',
        xpReward: 50,
        color: '#52ACFF',
        icon: '💧',
        label: 'Hydration Streak'
    },
    loadout: {
        currentRun: 0,
        required: 7,
        claimedCount: 0,
        status: 'locked',
        xpReward: 50,
        color: '#FFB347',
        icon: '⚡',
        label: 'Loadout Streak'
    }
});

// Lifetime stats
export const lifetimeStats = writable([
    { label: 'Lock-ins', value: 127 },
    { label: 'Hydrations', value: 84 },
    { label: 'Sleep Cycles', value: 312 },
    { label: 'Morning', value: 95 },
    { label: 'Midday', value: 82 },
    { label: 'Unwind', value: 88 }
]);

// Calendar events (mock)
export const calendarEvents = writable([
    { id: 1, title: 'Team Standup', start: '10:00', end: '10:30', color: 'rgba(82, 172, 255, 0.2)' },
    { id: 2, title: 'Lunch Meeting', start: '13:00', end: '14:00', color: 'rgba(221, 52, 147, 0.2)' },
    { id: 3, title: 'Focus Time', start: '15:30', end: '17:00', color: 'rgba(181, 140, 31, 0.2)' }
]);
