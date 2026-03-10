import { writable, derived } from 'svelte/store';

// ── Energy Windows ──
// 5 windows with time ranges (personalized to wake 6:30 AM)
export const energyWindows = [
    {
        id: 'dayPrep', label: 'Day Prep', emoji: '🌅',
        start: '6:30', end: '8:00',
        color: 'rgba(255,255,255,0.15)', bgTint: 'rgba(255,255,255,0.02)',
        borderColor: 'rgba(255,255,255,0.15)',
        energyLevel: 0.4, description: 'Gentle morning routine'
    },
    {
        id: 'firstWind', label: 'First Wind', emoji: '✨',
        start: '8:00', end: '12:00',
        color: '#B58C1F', bgTint: 'rgba(181,140,31,0.04)',
        borderColor: '#B58C1F',
        energyLevel: 0.9, description: 'Peak morning energy'
    },
    {
        id: 'energyDip', label: 'Energy Dip', emoji: '😴',
        start: '12:00', end: '14:00',
        color: 'rgba(255,255,255,0.1)', bgTint: 'rgba(255,255,255,0.01)',
        borderColor: 'rgba(255,255,255,0.1)',
        energyLevel: 0.3, description: 'Natural lull — refuel & rest'
    },
    {
        id: 'secondWind', label: 'Second Wind', emoji: '🔥',
        start: '14:00', end: '18:00',
        color: '#DD3493', bgTint: 'rgba(221,52,147,0.04)',
        borderColor: '#DD3493',
        energyLevel: 0.75, description: 'Afternoon peak — deep work'
    },
    {
        id: 'preBed', label: 'Pre-Bed', emoji: '🌙',
        start: '18:00', end: '22:30',
        color: '#3399E6', bgTint: 'rgba(51,153,230,0.04)',
        borderColor: '#3399E6',
        energyLevel: 0.2, description: 'Wind down for sleep'
    }
];

// ── All Available Habits (with TIME positions) ──
export const allHabits = [
    // Day Prep (6:30–8:00)
    { id: 'hydrate-am', name: 'Hydrate', icon: '💧', window: 'dayPrep', time: '6:30', tool: 'water' },
    { id: 'stretch-am', name: 'Stretch', icon: '🧘', window: 'dayPrep', time: '6:45', tool: null },
    { id: 'cold-shower', name: 'Cold Shower', icon: '🚿', window: 'dayPrep', time: '7:15', tool: null },
    // First Wind (8:00–12:00)
    { id: 'journal', name: 'Journal', icon: '📝', window: 'firstWind', time: '8:00', tool: null },
    { id: 'meditate', name: 'Meditate', icon: '🧠', window: 'firstWind', time: '8:30', tool: 'breathing' },
    { id: 'walk-am', name: 'Walk', icon: '🚶', window: 'firstWind', time: '9:00', tool: null },
    { id: 'focus-block-am', name: 'Focus Block', icon: '🎯', window: 'firstWind', time: '10:30', tool: 'focus' },
    // Energy Dip (12:00–14:00)
    { id: 'healthy-lunch', name: 'Healthy Lunch', icon: '🥗', window: 'energyDip', time: '12:00', tool: null },
    { id: 'power-walk', name: 'Power Walk', icon: '🏃', window: 'energyDip', time: '13:00', tool: null },
    // Second Wind (14:00–18:00)
    { id: 'no-caffeine', name: 'No Caffeine', icon: '☕', window: 'secondWind', time: '14:00', tool: null },
    { id: 'stretch-pm', name: 'Stretch Break', icon: '🤸', window: 'secondWind', time: '15:00', tool: null },
    { id: 'deep-work', name: 'Deep Work', icon: '💪', window: 'secondWind', time: '15:30', tool: 'focus' },
    { id: 'hydrate-pm', name: 'Hydrate', icon: '💧', window: 'secondWind', time: '16:30', tool: 'water' },
    // Pre-Bed (18:00–22:30)
    { id: 'no-screens', name: 'No Screens', icon: '📵', window: 'preBed', time: '20:00', tool: null },
    { id: 'read', name: 'Read', icon: '📖', window: 'preBed', time: '20:30', tool: null },
    { id: 'gratitude', name: 'Gratitude', icon: '🙏', window: 'preBed', time: '21:00', tool: null },
    { id: 'sleep-prep', name: 'Sleep Prep', icon: '😴', window: 'preBed', time: '21:30', tool: null },
    { id: 'breathwork-pm', name: 'Breathwork', icon: '🌬️', window: 'preBed', time: '22:00', tool: 'breathing' },
    // Cross-window
    { id: 'fasting', name: 'Fasting', icon: '⏱️', window: 'dayPrep', time: '7:00', tool: 'fasting' }
];

// ── Calendar Events (mock) ──
export const calendarEvents = [
    { id: 'evt-1', title: 'Team Standup', time: '10:00', duration: 30, window: 'firstWind' },
    { id: 'evt-2', title: 'Lunch Meeting', time: '13:00', duration: 60, window: 'energyDip' },
    { id: 'evt-3', title: 'Focus Time', time: '15:30', duration: 90, window: 'secondWind' },
    { id: 'evt-4', title: 'Dinner', time: '18:30', duration: 60, window: 'preBed' }
];

// ── Loadout Templates ──
export const loadoutTemplates = [
    {
        id: 'rise-shine',
        name: 'Rise & Shine',
        description: 'Morning-heavy, light evening',
        habits: ['hydrate-am', 'stretch-am', 'cold-shower', 'journal', 'meditate', 'walk-am', 'healthy-lunch', 'read', 'sleep-prep']
    },
    {
        id: 'peak-focus',
        name: 'Peak Focus',
        description: 'Distributed throughout the day',
        habits: ['hydrate-am', 'meditate', 'focus-block-am', 'healthy-lunch', 'no-caffeine', 'deep-work', 'hydrate-pm', 'breathwork-pm']
    },
    {
        id: 'easy-day',
        name: 'Easy Day',
        description: 'Minimal habits, recovery-focused',
        habits: ['hydrate-am', 'stretch-am', 'walk-am', 'read']
    },
    {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Light morning, heavy afternoon',
        habits: ['hydrate-am', 'focus-block-am', 'deep-work', 'stretch-pm', 'hydrate-pm', 'no-screens', 'gratitude', 'breathwork-pm']
    }
];

// ── Stores ──

// Active habits for today (set by loadout selection)
export const activeHabits = writable([]);

// Completed habit IDs
export const completedHabits = writable(new Set());

// Whether loadout is locked for the day
export const loadoutLocked = writable(false);

// Currently selected loadout ID
export const selectedLoadoutId = writable(null);

// ── Derived: habits grouped by window for timeline rendering ──
export const habitsByWindow = derived(activeHabits, ($activeHabits) => {
    const groups = {};
    for (const w of energyWindows) {
        groups[w.id] = $activeHabits
            .filter(h => h.window === w.id)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    }
    return groups;
});

// ── Derived: events grouped by window ──
export const eventsByWindow = derived([], () => {
    const groups = {};
    for (const w of energyWindows) {
        groups[w.id] = calendarEvents.filter(e => e.window === w.id);
    }
    return groups;
});

// ── Derived: completion stats per window ──
export const windowCompletion = derived(
    [activeHabits, completedHabits],
    ([$activeHabits, $completedHabits]) => {
        const stats = {};
        for (const w of energyWindows) {
            const windowHabits = $activeHabits.filter(h => h.window === w.id);
            const done = windowHabits.filter(h => $completedHabits.has(h.id)).length;
            stats[w.id] = {
                total: windowHabits.length,
                done,
                percent: windowHabits.length > 0 ? (done / windowHabits.length) * 100 : 0
            };
        }
        return stats;
    }
);

export const completedSections = derived(
    [windowCompletion],
    ([$wc]) => {
        const result = {};
        for (const [windowId, stats] of Object.entries($wc)) {
            result[windowId] = stats.total > 0 && stats.done === stats.total;
        }
        return result;
    }
);

export const allSectionsComplete = derived(
    [windowCompletion],
    ([$wc]) => {
        const windows = Object.values($wc);
        return windows.length > 0 && windows.every(s => s.total > 0 && s.done === s.total);
    }
);

export const dayLockedIn = writable(false);


// ── Actions ──

export function selectLoadout(templateId) {
    const template = loadoutTemplates.find(t => t.id === templateId);
    if (!template) return;
    const habits = template.habits
        .map(hId => allHabits.find(h => h.id === hId))
        .filter(Boolean);
    activeHabits.set(habits);
    completedHabits.set(new Set());
    loadoutLocked.set(false);
    selectedLoadoutId.set(templateId);
}

export function toggleHabit(habitId) {
    completedHabits.update(set => {
        const next = new Set(set);
        if (next.has(habitId)) {
            next.delete(habitId);
        } else {
            next.add(habitId);
        }
        return next;
    });
}

export function clearLoadout() {
    activeHabits.set([]);
    completedHabits.set(new Set());
    loadoutLocked.set(false);
    selectedLoadoutId.set(null);
}

// ── Helpers ──

export function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

export function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function getCurrentWindowId() {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    for (const w of energyWindows) {
        const start = timeToMinutes(w.start);
        const end = timeToMinutes(w.end);
        if (minutes >= start && minutes < end) return w.id;
    }
    return 'preBed'; // default to last window
}
