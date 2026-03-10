<script>
    import { tabs, activeTab, fabExpanded } from "./stores/navigation.js";
    import { onMount } from "svelte";
    import gsap from "gsap";

    let indicatorEl;
    let tabEls = [];

    function switchTab(tabId) {
        fabExpanded.set(false);
        activeTab.set(tabId);
    }

    // Animate indicator on tab change
    $effect(() => {
        const currentTab = $activeTab;
        const idx = $tabs.findIndex((t) => t.id === currentTab);
        if (idx >= 0 && indicatorEl && tabEls[idx]) {
            const tabEl = tabEls[idx];
            const rect = tabEl.getBoundingClientRect();
            const parentRect = tabEl.parentElement.getBoundingClientRect();
            // UNITY: bar.transform.DOMove(points[index].position, 0.4f).SetEase(Ease.OutQuad)
            gsap.to(indicatorEl, {
                x: rect.left - parentRect.left + rect.width / 2 - 16,
                duration: 0.4,
                ease: "power2.out",
            });
        }
    });

    // Tab icons (simple SVG paths)
    const icons = {
        home: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        habits: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        today: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
        calendar: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        breathing: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a7.5 7.5 0 1 0 0 8.6"/><path d="M21 12h-4"/></svg>`,
        profile: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    };
</script>

<nav class="tab-bar">
    <div class="tab-bar-content">
        {#each $tabs as tab, i}
            <button
                class="tab"
                class:active={$activeTab === tab.id}
                onclick={() => switchTab(tab.id)}
                bind:this={tabEls[i]}
            >
                <span class="tab-icon">{@html icons[tab.icon]}</span>
                <span class="tab-label">{tab.label}</span>
            </button>
        {/each}
        <div class="indicator" bind:this={indicatorEl}></div>
    </div>
</nav>

<style>
    .tab-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: var(--tab-bar-height);
        background: rgba(255, 255, 255, 0.04);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 100;
        padding-bottom: var(--safe-area-bottom);
    }

    .tab-bar-content {
        display: flex;
        align-items: center;
        justify-content: space-around;
        height: var(--tab-bar-content);
        position: relative;
    }

    .tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px 0;
        -webkit-tap-highlight-color: transparent;
        position: relative;
    }

    .tab-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.4);
        transition: color 0.25s ease;
    }

    .tab.active .tab-icon {
        color: #ffffff;
    }

    .tab-label {
        font-size: 10px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.4);
        transition: color 0.25s ease;
    }

    .tab.active .tab-label {
        color: #ffffff;
    }

    .indicator {
        position: absolute;
        bottom: -1px;
        width: 32px;
        height: 3px;
        border-radius: 3px;
        background: var(--color-accent);
        box-shadow: 0 0 10px var(--color-accent-glow);
        pointer-events: none;
    }
</style>
