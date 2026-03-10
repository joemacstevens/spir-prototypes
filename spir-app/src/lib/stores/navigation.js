import { writable, derived } from 'svelte/store';

// Active tab
export const activeTab = writable('home');

// Home screen direction: 1 = separate, 2 = merged
export const direction = writable(1);

// Energy curve layout variant: 'a', 'b', or 'c'
export const layoutVariant = writable('b');

// Active tool overlay (null, 'fasting', 'breathing', 'focus')
export const activeOverlay = writable(null);

// FAB expanded state
export const fabExpanded = writable(false);

// Active popup (null or popup config object)
export const activePopup = writable(null);

// Active bottom sheet (null or sheet config object)
export const activeBottomSheet = writable(null);

// Tab configs for each direction
export const tabs = derived(direction, ($direction) => {
    if ($direction === 1) {
        return [
            { id: 'home', label: 'Home', icon: 'home' },
            { id: 'habits', label: 'Habits', icon: 'habits' },
            { id: 'history', label: 'History', icon: 'calendar' },
            { id: 'profile', label: 'Profile', icon: 'profile' }
        ];
    } else {
        return [
            { id: 'habits', label: 'Today', icon: 'today' },
            { id: 'history', label: 'History', icon: 'calendar' },
            { id: 'breathing', label: 'Breathing', icon: 'breathing' },
            { id: 'profile', label: 'Profile', icon: 'profile' }
        ];
    }
});

// Initialize from URL params
export function initFromURL() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const d = params.get('direction');
    const l = params.get('layout');
    if (d === '1' || d === '2') direction.set(parseInt(d));
    if (l === 'a' || l === 'b' || l === 'c') layoutVariant.set(l);
}
