<script>
    import {
        fabExpanded,
        activeOverlay,
        activeTab,
    } from "./stores/navigation.js";
    import gsap from "gsap";
    import { onMount } from "svelte";

    let fabEl;
    let fabIconEl;
    let actionEls = [];
    let scrimEl;

    const actions = [
        { id: "fast", icon: "⏱️", label: "Start Fast", overlay: "fasting" },
        { id: "water", icon: "💧", label: "Log Water", overlay: null },
        { id: "breathe", icon: "🌬️", label: "Breathwork", screen: "breathing" },
        { id: "focus", icon: "🎯", label: "Focus Timer", overlay: "focus" },
    ];

    function toggleFAB() {
        if ($fabExpanded) {
            collapseFAB();
        } else {
            expandFAB();
        }
    }

    function expandFAB() {
        fabExpanded.set(true);

        // Scrim fade in
        gsap.to(scrimEl, { opacity: 1, duration: 0.2, display: "block" });

        // UNITY: DOLocalRotate(45°, 0.3f)
        gsap.to(fabIconEl, { rotation: 45, duration: 0.3, ease: "power2.out" });

        // UNITY: DOAnchorPos for each button + DOScale from 0 → 1
        actionEls.forEach((el, i) => {
            if (el) {
                gsap.fromTo(
                    el,
                    { scale: 0, y: 0, opacity: 0, display: "none" },
                    {
                        scale: 1,
                        y: -(70 * (i + 1)),
                        opacity: 1,
                        display: "flex",
                        duration: 0.3,
                        delay: i * 0.05,
                        ease: "back.out(1.4)",
                    },
                );
            }
        });
    }

    function collapseFAB() {
        fabExpanded.set(false);

        gsap.to(scrimEl, { opacity: 0, duration: 0.2, display: "none" });
        gsap.to(fabIconEl, { rotation: 0, duration: 0.3, ease: "power2.out" });

        actionEls.forEach((el, i) => {
            if (el) {
                gsap.to(el, {
                    scale: 0,
                    y: 0,
                    opacity: 0,
                    duration: 0.2,
                    delay: (actionEls.length - i - 1) * 0.03,
                    onComplete: () => {
                        if (el) el.style.display = "none";
                    },
                });
            }
        });
    }

    function handleAction(action) {
        collapseFAB();

        if (action.id === "water") {
            // Instant water logging — no screen change
            if (window.showToast) {
                window.showToast("+500ml logged", "💧");
                setTimeout(() => {
                    window.showToast("+5 XP — Hydration added", "🎯");
                }, 600);
            }
        } else if (action.screen) {
            activeTab.set(action.screen);
        } else if (action.overlay) {
            activeOverlay.set(action.overlay);
        }
    }
</script>

<!-- Scrim -->
<div class="fab-scrim" bind:this={scrimEl} onclick={collapseFAB}></div>

<!-- FAB Container -->
<div class="fab-container">
    <!-- Action buttons -->
    {#each actions as action, i}
        <button
            class="fab-action"
            bind:this={actionEls[i]}
            onclick={() => handleAction(action)}
        >
            <span class="fab-action-label">{action.label}</span>
            <span class="fab-action-icon">{action.icon}</span>
        </button>
    {/each}

    <!-- Main FAB -->
    <button class="fab-button" bind:this={fabEl} onclick={toggleFAB}>
        <span class="fab-icon" bind:this={fabIconEl}>+</span>
    </button>
</div>

<style>
    .fab-scrim {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 110;
        opacity: 0;
        display: none;
    }

    .fab-container {
        position: absolute;
        bottom: calc(var(--tab-bar-height) + 12px);
        right: 20px;
        z-index: 120;
    }

    .fab-button {
        width: var(--fab-size);
        height: var(--fab-size);
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #52acff, #3d8be0);
        box-shadow: var(--shadow-fab);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        -webkit-tap-highlight-color: transparent;
        transition: transform 0.15s ease;
    }

    .fab-button:active {
        transform: scale(0.92);
    }

    .fab-icon {
        color: white;
        font-size: 28px;
        font-weight: 300;
        line-height: 1;
        display: block;
    }

    .fab-action {
        position: absolute;
        right: 0;
        bottom: 0;
        display: none;
        align-items: center;
        gap: 10px;
        border: none;
        background: none;
        cursor: pointer;
        white-space: nowrap;
        transform-origin: bottom right;
        opacity: 0;
        scale: 0;
    }

    .fab-action-label {
        padding: 8px 14px;
        background: rgba(20, 20, 40, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        color: var(--color-text-primary);
        font-size: 13px;
        font-weight: 500;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .fab-action-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }
</style>
