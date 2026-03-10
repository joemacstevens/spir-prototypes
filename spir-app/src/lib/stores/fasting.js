import { writable, derived } from 'svelte/store';

// ── Fasting State ──

// States: 'idle' | 'choosing' | 'starting' | 'active' | 'complete' | 'waiting'
export const fastingState = writable('idle');

// Start time (timestamp or null)
export const startTime = writable(null);

// Duration in hours
export const duration = writable(16);

// Elapsed seconds (updated by interval)
export const elapsed = writable(0);

// Selected preset id
export const selectedPreset = writable('16:8');

// When the user last ate (timestamp or null)
export const lastAteTime = writable(null);

// ── Derived Stores ──

export const progress = derived([elapsed, duration], ([$elapsed, $duration]) => {
    const totalSeconds = $duration * 3600;
    if (totalSeconds === 0) return 0;
    return Math.min($elapsed / totalSeconds, 1);
});

export const remainingSeconds = derived([elapsed, duration], ([$elapsed, $duration]) => {
    const totalSeconds = $duration * 3600;
    return Math.max(totalSeconds - $elapsed, 0);
});

export const endTime = derived([startTime, duration], ([$startTime, $duration]) => {
    if (!$startTime) return null;
    return new Date($startTime.getTime() + $duration * 3600 * 1000);
});

// Color based on progress
export const ringColor = derived(progress, ($progress) => {
    if ($progress < 0.33) return '#FFB347';      // amber
    if ($progress < 0.66) return '#FFD700';       // gold
    if ($progress < 0.90) return '#B8E986';       // green-gold
    return '#00FA3A';                              // bright green
});

export const ringGlow = derived(progress, ($progress) => {
    if ($progress < 0.33) return 'rgba(255, 179, 71, 0.3)';
    if ($progress < 0.66) return 'rgba(255, 215, 0, 0.3)';
    if ($progress < 0.90) return 'rgba(184, 233, 134, 0.3)';
    return 'rgba(0, 250, 58, 0.4)';
});

// ── Preset Templates ──

export const presets = [
    { id: '16:8', name: '16:8', label: 'The Classic', hours: 16, description: '16 hours fasting, 8 hour eating window' },
    { id: '18:6', name: '18:6', label: 'Extended', hours: 18, description: '18 hours fasting, 6 hour eating window' },
    { id: '20:4', name: '20:4', label: 'Warrior', hours: 20, description: '20 hours fasting, 4 hour eating window' },
    { id: '24hr', name: '24hr', label: 'Full Reset', hours: 24, description: '24 hour fast, one meal a day' },
];

// ── Weekly History (Mock) ──

export const weeklyHistory = writable([
    { day: 'S', hours: 0 },
    { day: 'M', hours: 16 },
    { day: 'T', hours: 18 },
    { day: 'W', hours: 0 },
    { day: 'T', hours: 0, today: true },  // today, will update when fasting
    { day: 'F', hours: 0 },
    { day: 'S', hours: 0 },
]);

// ── Timer Interval ──

let timerInterval = null;

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        elapsed.update(e => e + 1);

        // Check for completion
        let currentElapsed, currentDuration;
        elapsed.subscribe(v => currentElapsed = v)();
        duration.subscribe(v => currentDuration = v)();

        if (currentElapsed >= currentDuration * 3600) {
            fastingState.set('complete');
            stopTimer();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ── Actions ──

export function setLastAteTime(when) {
    // when: 'now' or Date object
    if (when === 'now') {
        lastAteTime.set(new Date());
    } else {
        lastAteTime.set(when);
    }
    fastingState.set('choosing');
}

export function selectPreset(presetId) {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
        selectedPreset.set(presetId);
        duration.set(preset.hours);
    }
}

export function startFast() {
    let ate;
    lastAteTime.subscribe(v => ate = v)();

    startTime.set(ate || new Date());

    // Calculate pre-elapsed time if "earlier today"
    if (ate) {
        const preElapsed = Math.floor((Date.now() - ate.getTime()) / 1000);
        elapsed.set(Math.max(0, preElapsed));
    } else {
        elapsed.set(0);
    }

    fastingState.set('starting');

    // After hero animation, transition to active
    setTimeout(() => {
        fastingState.set('active');
        startTimer();
    }, 2200);
}

export function stopFast() {
    stopTimer();
    fastingState.set('idle');
    startTime.set(null);
    elapsed.set(0);
    lastAteTime.set(null);
}

export function completeFast() {
    stopTimer();
    fastingState.set('complete');

    // Update weekly history for today
    weeklyHistory.update(history => {
        let dur;
        duration.subscribe(v => dur = v)();
        return history.map(d => d.today ? { ...d, hours: dur } : d);
    });
}

export function extendFast(extraHours) {
    duration.update(d => d + extraHours);
}

export function resetFast() {
    stopTimer();
    fastingState.set('idle');
    startTime.set(null);
    elapsed.set(0);
    lastAteTime.set(null);
    selectedPreset.set('16:8');
    duration.set(16);
}

// Format seconds to HH:MM:SS
export function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return {
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
        display: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    };
}
