<script>
    import { activeOverlay } from "../lib/stores/navigation.js";
    import { onMount } from "svelte";
    import gsap from "gsap";

    let containerEl;
    let ringEl;

    // Timer state
    const DEFAULT_TIME = 25 * 60; // 25 minutes
    let timeRemaining = $state(DEFAULT_TIME);
    let isRunning = $state(false);
    let interval;

    // Formatted time
    let minutes = $derived(Math.floor(timeRemaining / 60).toString().padStart(2, "0"));
    let seconds = $derived((timeRemaining % 60).toString().padStart(2, "0"));

    // Progress math
    const ringRadius = 140;
    const ringCircumference = 2 * Math.PI * ringRadius;
    let progress = $derived(timeRemaining / DEFAULT_TIME);

    onMount(() => {
        // Entrance animation
        gsap.fromTo(
            containerEl,
            { opacity: 0, y: 50 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
        );

        if (ringEl) {
            gsap.fromTo(
                ringEl,
                { strokeDashoffset: ringCircumference },
                { strokeDashoffset: ringCircumference * (1 - progress), duration: 1, ease: "power2.out" }
            );
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    });

    function close() {
        gsap.to(containerEl, {
            opacity: 0,
            y: 30,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
                activeOverlay.set(null);
            }
        });
    }

    function toggleTimer() {
        if (isRunning) {
            clearInterval(interval);
            isRunning = false;
        } else {
            isRunning = true;
            interval = setInterval(() => {
                if (timeRemaining > 0) {
                    timeRemaining -= 1;
                } else {
                    clearInterval(interval);
                    isRunning = false;
                    if (window.spawnConfetti) window.spawnConfetti("achievement");
                    if (window.showToast) window.showToast("Focus session complete!", "🎯");
                }
            }, 1000);
        }
    }

    function resetTimer() {
        clearInterval(interval);
        isRunning = false;
        timeRemaining = DEFAULT_TIME;
    }
</script>

<div class="overlay-container" bind:this={containerEl}>
    <!-- Top bar -->
    <div class="top-bar">
        <button class="close-btn" onclick={close}>✕</button>
        <span class="title">Focus Mode</span>
        <div style="width: 44px"></div> <!-- Spacer -->
    </div>

    <div class="timer-content">
        <!-- SVG Timer Ring -->
        <div class="ring-container">
            <svg viewBox="0 0 320 320" width="320" height="320">
                <!-- Background track -->
                <circle
                    cx="160"
                    cy="160"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.05)"
                    stroke-width="12"
                />
                <!-- Progress ring -->
                <circle
                    bind:this={ringEl}
                    cx="160"
                    cy="160"
                    r={ringRadius}
                    fill="none"
                    stroke="#FF6B6B"
                    stroke-width="12"
                    stroke-linecap="round"
                    stroke-dasharray={ringCircumference}
                    stroke-dashoffset={ringCircumference * (1 - progress)}
                    transform="rotate(-90 160 160)"
                    style="transition: stroke-dashoffset 1s linear;"
                />
            </svg>
            
            <div class="time-display mono">
                {minutes}:{seconds}
            </div>
            <div class="mode-label">Deep Work</div>
        </div>

        <!-- Controls -->
        <div class="controls">
            <button class="reset-btn" onclick={resetTimer}>
                <span class="icon">↺</span>
            </button>
            <button class="play-btn" onclick={toggleTimer}>
                <span class="icon">{isRunning ? "⏸" : "▶"}</span>
            </button>
        </div>
    </div>
</div>

<style>
    .overlay-container {
        position: absolute;
        inset: 0;
        background: rgba(18, 18, 20, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        z-index: 1000; /* above header & shell */
        display: flex;
        flex-direction: column;
    }

    .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
        height: 60px;
        margin-top: var(--safe-area-top);
    }

    .title {
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--color-text-secondary);
    }

    .close-btn {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 18px;
        color: var(--color-text-primary);
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .timer-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding-bottom: 60px;
    }

    .ring-container {
        position: relative;
        width: 320px;
        height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        margin-bottom: 40px;
    }

    .ring-container svg {
        position: absolute;
        inset: 0;
        filter: drop-shadow(0 0 20px rgba(255, 107, 107, 0.2));
    }

    .time-display {
        font-size: 64px;
        font-weight: 300;
        letter-spacing: -2px;
        color: var(--color-text-primary);
        z-index: 1;
        text-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
    }

    .mode-label {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #FF6B6B;
        z-index: 1;
        margin-top: 8px;
    }

    .controls {
        display: flex;
        align-items: center;
        gap: 32px;
    }

    .play-btn {
        width: 80px;
        height: 80px;
        border-radius: 40px;
        background: #FF6B6B;
        border: none;
        color: white;
        font-size: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3);
        transition: transform 0.2s ease;
    }

    .play-btn:active {
        transform: scale(0.95);
    }

    .reset-btn {
        width: 56px;
        height: 56px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: var(--color-text-secondary);
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, background 0.2s ease;
    }

    .reset-btn:active {
        transform: scale(0.95);
        background: rgba(255, 255, 255, 0.2);
    }
</style>
