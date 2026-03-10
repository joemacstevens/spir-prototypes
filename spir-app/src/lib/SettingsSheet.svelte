<script>
    import {
        direction,
        layoutVariant,
        activeBottomSheet,
    } from "./stores/navigation.js";
    import { onMount } from "svelte";
    import gsap from "gsap";

    let sheetEl;
    let backdropEl;

    onMount(() => {
        // Slide up animation
        gsap.fromTo(
            backdropEl,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, ease: "power2.out" },
        );
        gsap.fromTo(
            sheetEl,
            { y: "100%" },
            { y: "0%", duration: 0.4, ease: "power3.out" },
        );
    });

    function close() {
        gsap.to(backdropEl, {
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
        });
        gsap.to(sheetEl, {
            y: "100%",
            duration: 0.3,
            ease: "power3.in",
            onComplete: () => {
                activeBottomSheet.set(null);
            },
        });
    }

    // svelte-ignore non_reactive_update
    function setDirection(val) {
        direction.set(val);
    }

    // svelte-ignore non_reactive_update
    function setLayout(val) {
        layoutVariant.set(val);
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="bottom-sheet-overlay" bind:this={backdropEl} onclick={close}>
    <div
        class="bottom-sheet"
        bind:this={sheetEl}
        onclick={(e) => e.stopPropagation()}
    >
        <div class="sheet-handle"></div>

        <div class="sheet-header">
            <h2>Settings & Dev Controls</h2>
            <button class="close-btn" onclick={close}>✕</button>
        </div>

        <div class="sheet-content">
            <div class="setting-group">
                <label>App Direction (Phase 2.3)</label>
                <div class="segment-control">
                    <button
                        class:active={$direction === 1}
                        onclick={() => setDirection(1)}
                    >
                        Direction 1 (D1)
                    </button>
                    <button
                        class:active={$direction === 2}
                        onclick={() => setDirection(2)}
                    >
                        Direction 2 (D2)
                    </button>
                </div>
                <p class="setting-desc">D1: Home & Habits separate. D2: Merged 'Today' view.</p>
            </div>

            <div class="setting-group">
                <label>Habit Timeline Layout</label>
                <div class="segment-control">
                    <button
                        class:active={$layoutVariant === "a"}
                        onclick={() => setLayout("a")}
                    >
                        Expanded
                    </button>
                    <button
                        class:active={$layoutVariant === "b"}
                        onclick={() => setLayout("b")}
                    >
                        Auto
                    </button>
                    <button
                        class:active={$layoutVariant === "c"}
                        onclick={() => setLayout("c")}
                    >
                        Column
                    </button>
                </div>
                <p class="setting-desc">A: All open. B: Current window opens. C: Dual columns.</p>
            </div>

            <div class="setting-group stub-group">
                <label>Account Settings</label>
                <button class="stub-btn">Edit Profile</button>
                <button class="stub-btn">Notifications</button>
                <button class="stub-btn">Privacy Policy</button>
            </div>
            
            <button class="logout-btn">Log Out</button>
        </div>
    </div>
</div>

<style>
    .bottom-sheet-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 2000;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
    }

    .bottom-sheet {
        background: var(--color-bg);
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        padding: 12px 24px 40px;
        border-top: 1px solid var(--color-card-border);
        box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
    }

    .sheet-handle {
        width: 40px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        margin: 0 auto 16px;
    }

    .sheet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    .sheet-header h2 {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--color-text-secondary);
        font-size: 20px;
        cursor: pointer;
        padding: 4px;
    }

    .sheet-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .setting-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .setting-group label {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .setting-desc {
        font-size: 11px;
        color: var(--color-text-muted);
        margin: 0;
        line-height: 1.4;
    }

    .segment-control {
        display: flex;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 4px;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .segment-control button {
        flex: 1;
        background: none;
        border: none;
        padding: 10px 4px;
        border-radius: 8px;
        color: var(--color-text-secondary);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .segment-control button.active {
        background: rgba(255, 255, 255, 0.1);
        color: var(--color-text-primary);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .stub-group {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 24px;
        margin-top: 8px;
        gap: 12px;
    }

    .stub-btn {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 14px;
        color: var(--color-text-primary);
        font-size: 15px;
        font-weight: 500;
        text-align: left;
        cursor: pointer;
    }

    .logout-btn {
        background: rgba(221, 52, 147, 0.1);
        border: 1px solid rgba(221, 52, 147, 0.3);
        border-radius: 12px;
        padding: 14px;
        color: #f7a1c4;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
    }
</style>
