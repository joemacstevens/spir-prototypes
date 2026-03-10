import { writable, derived } from 'svelte/store';

// Mock user data
const initialUser = {
    name: 'Joseph Stevens',
    totalXP: 2450,
    protocolCredits: 1250,
    wakeTime: '6:30 AM',
    bedTime: '10:30 PM',
    chronotype: 'Third Bird',
    metabolism: 'Optimized',
    subscription: 'Pro',
    loginStreak: 14
};

export const user = writable(initialUser);

// Level system: every 500 XP = 1 level (simplified)
export const level = derived(user, ($user) => {
    const xp = $user.totalXP;
    if (xp < 2500) return Math.floor(xp / 500) + 1; // 1-5: 500 each
    if (xp < 5000) return 5 + Math.floor((xp - 2500) / 500); // 6-10: 500 each
    if (xp < 7500) return 10 + Math.floor((xp - 5000) / 500); // 11-15: 500 each
    if (xp < 10500) return 15 + Math.floor((xp - 7500) / 750); // 16-20: 750 each
    return 20 + Math.floor((xp - 10500) / 1000); // 21+: 1000 each
});

export const levelProgress = derived(user, ($user) => {
    const xp = $user.totalXP;
    const levelSize = xp < 7500 ? 500 : xp < 10500 ? 750 : 1000;
    const xpInLevel = xp % levelSize;
    return {
        current: xpInLevel,
        required: levelSize,
        remaining: levelSize - xpInLevel,
        percent: (xpInLevel / levelSize) * 100
    };
});

export const levelTitle = derived(level, ($level) => {
    if ($level <= 5) return 'Beginner';
    if ($level <= 10) return 'Consistent';
    if ($level <= 15) return 'Dedicated';
    if ($level <= 20) return 'Advanced';
    return 'Master';
});

// Add XP with animation callback
export function addXP(amount) {
    user.update(u => ({ ...u, totalXP: u.totalXP + amount }));
}

// Add PC
export function addPC(amount) {
    user.update(u => ({ ...u, protocolCredits: (u.protocolCredits || 0) + amount }));
}
