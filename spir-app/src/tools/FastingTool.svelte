<script>
    import {
        fastingState,
        startTime,
        duration,
        elapsed,
        progress,
        remainingSeconds,
        endTime,
        ringColor,
        ringGlow,
        presets,
        selectedPreset,
        weeklyHistory,
        setLastAteTime,
        selectPreset,
        startFast,
        stopFast,
        extendFast,
        resetFast,
        formatTime,
    } from "../lib/stores/fasting.js";
    import { addXP } from "../lib/stores/user.js";
    import { activeOverlay } from "../lib/stores/navigation.js";
    import { onMount } from "svelte";
    import gsap from "gsap";

    // ── Element refs ──
    let overlayEl;
    let ringEl;
    let ringFillEl;
    let ringBgEl;
    let waveGroupEl;
    let countdownEl;
    let weeklyBarEls = [];
    let presetCardEls = [];
    let checkmarkEl;
    let xpTextEl;
    let hourCountEl;

    // ── Local UI state ──
    let showExtendOptions = false;
    let holdProgress = 0;
    let holdTimer = null;
    let completedHoursDisplay = 0;
    let heroTimeline = null;

    // ── Ring dimensions ──
    const ringSize = 240;
    const ringStroke = 10;
    const ringRadius = (ringSize - ringStroke) / 2;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringCenter = ringSize / 2;

    // ── Entrance animation ──
    onMount(() => {
        if (overlayEl) {
            gsap.fromTo(
                overlayEl,
                { y: "100%" },
                { y: "0%", duration: 0.4, ease: "power2.out" },
            );
        }
    });

    // ── Animate weekly bars on mount ──
    $effect(() => {
        if ($fastingState === "idle" && weeklyBarEls.length > 0) {
            weeklyBarEls.forEach((el, i) => {
                if (el) {
                    // UNITY: DOSizeDelta or DOAnchorPosY for each bar with stagger
                    gsap.fromTo(
                        el,
                        { scaleY: 0 },
                        {
                            scaleY: 1,
                            duration: 0.4,
                            delay: i * 0.05,
                            ease: "power2.out",
                            transformOrigin: "bottom",
                        },
                    );
                }
            });
        }
    });

    // ── Heartbeat pulse while active ──
    let heartbeatTween = null;

    $effect(() => {
        if ($fastingState === "active" && ringEl) {
            // UNITY: transform.DOScale(1.02f, 1.5f).SetLoops(-1, LoopType.Yoyo).SetEase(Ease.InOutSine)
            heartbeatTween = gsap.to(ringEl, {
                scale: 1.02,
                duration: 1.5,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut",
            });
        } else if (heartbeatTween) {
            heartbeatTween.kill();
            heartbeatTween = null;
        }
    });

    // ── Completion animation ──
    $effect(() => {
        if ($fastingState === "complete") {
            runCompletionAnimation();
        }
    });

    function runCompletionAnimation() {
        // 1. Ring flash
        if (ringEl) {
            gsap.to(ringEl, {
                scale: 1.1,
                duration: 0.2,
                ease: "power2.out",
                onComplete: () => {
                    gsap.to(ringEl, {
                        scale: 1,
                        duration: 0.3,
                        ease: "power2.out",
                    });
                },
            });
        }

        // 2. Confetti
        if (window.spawnConfetti) window.spawnConfetti("achievement");

        // 3. Checkmark entrance
        if (checkmarkEl) {
            gsap.fromTo(
                checkmarkEl,
                { scale: 0.5, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.4,
                    delay: 0.3,
                    ease: "back.out(1.4)",
                },
            );
        }

        // 4. Hours count up
        let dur;
        duration.subscribe((v) => (dur = v))();
        const counter = { value: 0 };
        gsap.to(counter, {
            value: dur,
            duration: 1,
            delay: 0.5,
            ease: "power2.out",
            onUpdate: () => {
                completedHoursDisplay = Math.floor(counter.value);
            },
        });

        // 5. XP toast
        addXP(100);
        setTimeout(() => {
            if (window.showToast)
                window.showToast("+100 XP — Fast Complete!", "🎉");
        }, 1200);
    }

    // ── Hold-to-start ──
    function startHold() {
        holdProgress = 0;
        holdTimer = setInterval(() => {
            holdProgress += 2;
            if (holdProgress >= 100) {
                clearInterval(holdTimer);
                holdTimer = null;
                holdProgress = 100;
                startFast();
            }
        }, 30);
    }

    function cancelHold() {
        if (holdTimer) {
            clearInterval(holdTimer);
            holdTimer = null;
        }
        holdProgress = 0;
    }

    // ── Close overlay ──
    function closeOverlay() {
        gsap.to(overlayEl, {
            y: "100%",
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
                activeOverlay.set(null);
                // Don't reset fasting state — it persists
            },
        });
    }

    // ── Go back from choosing to idle ──
    function goBack() {
        fastingState.set("idle");
    }

    // ── "Earlier today" time selection (simplified) ──
    let earlierHours = [
        { label: "6 AM", hour: 6 },
        { label: "7 AM", hour: 7 },
        { label: "8 AM", hour: 8 },
        { label: "9 AM", hour: 9 },
        { label: "10 AM", hour: 10 },
        { label: "12 PM", hour: 12 },
        { label: "2 PM", hour: 14 },
        { label: "4 PM", hour: 16 },
        { label: "6 PM", hour: 18 },
        { label: "8 PM", hour: 20 },
    ];
    let showEarlierPicker = false;

    function pickEarlierTime(hour) {
        const now = new Date();
        const ate = new Date(now);
        ate.setHours(hour, 0, 0, 0);
        // If that hour hasn't happened yet, assume yesterday
        if (ate > now) ate.setDate(ate.getDate() - 1);
        setLastAteTime(ate);
        showEarlierPicker = false;
    }

    // ── Computed end time display ──
    function getEndTimeDisplay() {
        let start, dur;
        startTime.subscribe((v) => (start = v))();
        duration.subscribe((v) => (dur = v))();
        if (!start) {
            // Estimate from last ate time or now
            let ate;
            import("../lib/stores/fasting.js").then((m) => {
                // no-op for reactivity
            });
            const est = new Date();
            est.setHours(est.getHours() + dur);
            return est.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
            });
        }
        const end = new Date(start.getTime() + dur * 3600 * 1000);
        return end.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    function getStartTimeDisplay() {
        let start;
        startTime.subscribe((v) => (start = v))();
        if (!start) return "";
        return start.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    // ── Stagger entrance for preset cards ──
    $effect(() => {
        if ($fastingState === "choosing" && presetCardEls.length > 0) {
            presetCardEls.forEach((el, i) => {
                if (el) {
                    gsap.fromTo(
                        el,
                        { scale: 0.8, opacity: 0, y: 20 },
                        {
                            scale: 1,
                            opacity: 1,
                            y: 0,
                            duration: 0.4,
                            delay: i * 0.06,
                            ease: "back.out(1.2)",
                        },
                    );
                }
            });
        }
    });

    // Estimated end time for preset cards
    function getPresetEndTime(hours) {
        let ate;
        import("../lib/stores/fasting.js").then(() => {});
        // Use lastAteTime or now
        const base = new Date();
        base.setHours(base.getHours() + hours);
        return base.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    }
</script>

<div class="fasting-overlay" bind:this={overlayEl}>
    <!-- ── Header ── -->
    <div class="fasting-header">
        {#if $fastingState === "choosing"}
            <button class="header-btn" onclick={goBack}>
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg
                >
            </button>
        {:else}
            <div></div>
        {/if}
        <span class="header-title">Fasting</span>
        <button class="header-btn" onclick={closeOverlay}>
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg
            >
        </button>
    </div>

    <div class="fasting-content">
        <!-- ════════════════════════════════════════ -->
        <!-- STATE: IDLE -->
        <!-- ════════════════════════════════════════ -->
        {#if $fastingState === "idle"}
            <div class="state-idle">
                <!-- Dormant Ring -->
                <div class="ring-container">
                    <svg
                        width={ringSize}
                        height={ringSize}
                        viewBox="0 0 {ringSize} {ringSize}"
                        class="fasting-ring"
                    >
                        <!-- Background track -->
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(255, 179, 71, 0.1)"
                            stroke-width={ringStroke}
                        />
                    </svg>
                    <div class="ring-center-text">
                        <span class="ring-prompt">Ready to fast?</span>
                    </div>
                </div>

                <!-- Question -->
                <h2 class="question">When did you stop eating?</h2>

                <!-- Options -->
                <div class="time-options">
                    <button
                        class="time-btn glass-card"
                        onclick={() => {
                            setLastAteTime("now");
                        }}
                    >
                        <span class="time-icon">🕐</span>
                        <span class="time-label">Just now</span>
                    </button>
                    <button
                        class="time-btn glass-card"
                        onclick={() => {
                            showEarlierPicker = true;
                        }}
                    >
                        <span class="time-icon">⏪</span>
                        <span class="time-label">Earlier today</span>
                    </button>
                </div>

                <!-- Earlier time picker -->
                {#if showEarlierPicker}
                    <div class="earlier-picker">
                        <div class="picker-grid">
                            {#each earlierHours as h}
                                <button
                                    class="picker-time glass-card"
                                    onclick={() => pickEarlierTime(h.hour)}
                                >
                                    {h.label}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                <!-- Weekly Chart -->
                <div class="weekly-section">
                    <div class="weekly-label">This Week</div>
                    <div class="weekly-chart">
                        {#each $weeklyHistory as day, i}
                            <div class="bar-group">
                                <div class="bar-track">
                                    <div
                                        class="bar-fill"
                                        class:today={day.today}
                                        bind:this={weeklyBarEls[i]}
                                        style="height: {(day.hours / 24) *
                                            100}%"
                                    ></div>
                                </div>
                                <span class="bar-day">{day.day}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- ════════════════════════════════════════ -->
            <!-- STATE: CHOOSING DURATION -->
            <!-- ════════════════════════════════════════ -->
        {:else if $fastingState === "choosing"}
            <div class="state-choosing">
                <!-- Ring preview -->
                <div class="ring-container small">
                    <svg
                        width={160}
                        height={160}
                        viewBox="0 0 160 160"
                        class="fasting-ring"
                    >
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke="rgba(255, 179, 71, 0.1)"
                            stroke-width="6"
                        />
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke="#FFB347"
                            stroke-width="6"
                            stroke-linecap="round"
                            stroke-dasharray={2 * Math.PI * 70}
                            stroke-dashoffset={2 * Math.PI * 70 * 0.75}
                            transform="rotate(-90 80 80)"
                            style="transition: stroke-dashoffset 0.5s ease-out;"
                        />
                    </svg>
                    <div class="ring-center-text">
                        <span class="ring-duration mono">{$duration}h</span>
                        <span class="ring-ends"
                            >ends ~{getPresetEndTime($duration)}</span
                        >
                    </div>
                </div>

                <!-- Choose your fast -->
                <h2 class="section-title">Choose your fast</h2>

                <!-- Preset cards -->
                <div class="preset-grid">
                    {#each presets as preset, i}
                        <button
                            class="preset-card glass-card"
                            class:selected={$selectedPreset === preset.id}
                            bind:this={presetCardEls[i]}
                            onclick={() => selectPreset(preset.id)}
                        >
                            <div class="preset-name mono">{preset.name}</div>
                            <div class="preset-hours">
                                {preset.hours} hours
                            </div>
                            <div class="preset-label">{preset.label}</div>
                        </button>
                    {/each}
                </div>

                <!-- Hold to start -->
                <div class="hold-container">
                    <button
                        class="hold-btn"
                        onpointerdown={startHold}
                        onpointerup={cancelHold}
                        onpointerleave={cancelHold}
                    >
                        <div
                            class="hold-fill"
                            style="width: {holdProgress}%"
                        ></div>
                        <span class="hold-label"
                            >{holdProgress > 0
                                ? "Keep holding..."
                                : "Hold to Start Fast"}</span
                        >
                    </button>
                </div>
            </div>

            <!-- ════════════════════════════════════════ -->
            <!-- STATE: STARTING (Hero Animation) -->
            <!-- ════════════════════════════════════════ -->
        {:else if $fastingState === "starting"}
            <div class="state-starting">
                <div class="ring-container" bind:this={ringEl}>
                    <svg
                        width={ringSize}
                        height={ringSize}
                        viewBox="0 0 {ringSize} {ringSize}"
                        class="fasting-ring hero-pulse"
                    >
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(255, 179, 71, 0.1)"
                            stroke-width={ringStroke}
                        />
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius}
                            fill="none"
                            stroke="#FFB347"
                            stroke-width={ringStroke}
                            stroke-linecap="round"
                            stroke-dasharray={ringCircumference}
                            stroke-dashoffset={ringCircumference}
                            transform="rotate(-90 {ringCenter} {ringCenter})"
                            class="hero-fill"
                        />
                    </svg>
                    <div class="ring-center-text">
                        <span class="starting-text">Starting...</span>
                    </div>
                </div>
            </div>

            <!-- ════════════════════════════════════════ -->
            <!-- STATE: ACTIVE -->
            <!-- ════════════════════════════════════════ -->
        {:else if $fastingState === "active"}
            <div class="state-active">
                <div class="ring-container" bind:this={ringEl}>
                    <svg
                        width={ringSize}
                        height={ringSize}
                        viewBox="0 0 {ringSize} {ringSize}"
                        class="fasting-ring"
                    >
                        <!-- Background track -->
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(255, 179, 71, 0.1)"
                            stroke-width={ringStroke}
                        />
                        <!-- Progress fill -->
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius}
                            fill="none"
                            stroke={$ringColor}
                            stroke-width={ringStroke}
                            stroke-linecap="round"
                            stroke-dasharray={ringCircumference}
                            stroke-dashoffset={ringCircumference -
                                ringCircumference * $progress}
                            transform="rotate(-90 {ringCenter} {ringCenter})"
                            style="transition: stroke-dashoffset 1s linear, stroke 0.5s ease; filter: drop-shadow(0 0 12px {$ringGlow});"
                        />
                        <!-- Wave effect overlay (liquid edge) -->
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius - 2}
                            fill="none"
                            stroke={$ringColor}
                            stroke-width="3"
                            stroke-dasharray="4 8"
                            stroke-linecap="round"
                            stroke-dashoffset={ringCircumference -
                                ringCircumference * $progress}
                            transform="rotate(-90 {ringCenter} {ringCenter})"
                            class="wave-ring"
                            opacity="0.4"
                        />
                    </svg>
                    <div class="ring-center-text">
                        <span class="countdown mono"
                            >{formatTime($remainingSeconds).display}</span
                        >
                        <span class="countdown-sub">hours remaining</span>
                    </div>
                </div>

                <!-- Time info -->
                <div class="time-info">
                    <div class="time-row">
                        <span class="time-label-sm">Started</span>
                        <span class="time-value">{getStartTimeDisplay()}</span>
                    </div>
                    <div class="time-row">
                        <span class="time-label-sm">Ending</span>
                        <span class="time-value"
                            >{$endTime
                                ? $endTime.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                  })
                                : ""}</span
                        >
                    </div>
                </div>

                <!-- Action buttons -->
                <div class="action-btns">
                    <button
                        class="action-btn stop-btn glass-card"
                        onclick={stopFast}
                    >
                        Stop Fast
                    </button>
                    <button
                        class="action-btn extend-btn glass-card"
                        onclick={() => {
                            showExtendOptions = !showExtendOptions;
                        }}
                    >
                        Extend +
                    </button>
                </div>

                {#if showExtendOptions}
                    <div class="extend-options">
                        {#each [2, 4, 6] as hrs}
                            <button
                                class="extend-option glass-card"
                                onclick={() => {
                                    extendFast(hrs);
                                    showExtendOptions = false;
                                }}
                            >
                                +{hrs}h
                            </button>
                        {/each}
                    </div>
                {/if}

                <!-- Weekly Chart -->
                <div class="weekly-section">
                    <div class="weekly-label">This Week</div>
                    <div class="weekly-chart">
                        {#each $weeklyHistory as day, i}
                            <div class="bar-group">
                                <div class="bar-track">
                                    <div
                                        class="bar-fill"
                                        class:today={day.today}
                                        style="height: {(day.hours / 24) *
                                            100}%"
                                    ></div>
                                </div>
                                <span class="bar-day">{day.day}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- ════════════════════════════════════════ -->
            <!-- STATE: COMPLETE -->
            <!-- ════════════════════════════════════════ -->
        {:else if $fastingState === "complete"}
            <div class="state-complete">
                <div class="ring-container" bind:this={ringEl}>
                    <svg
                        width={ringSize}
                        height={ringSize}
                        viewBox="0 0 {ringSize} {ringSize}"
                        class="fasting-ring complete-ring"
                    >
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(0, 250, 58, 0.15)"
                            stroke-width={ringStroke}
                        />
                        <circle
                            cx={ringCenter}
                            cy={ringCenter}
                            r={ringRadius}
                            fill="none"
                            stroke="#00FA3A"
                            stroke-width={ringStroke}
                            stroke-linecap="round"
                            stroke-dasharray={ringCircumference}
                            stroke-dashoffset="0"
                            transform="rotate(-90 {ringCenter} {ringCenter})"
                            style="filter: drop-shadow(0 0 20px rgba(0, 250, 58, 0.4));"
                        />
                    </svg>
                    <div class="ring-center-text" bind:this={checkmarkEl}>
                        <span class="complete-check">✓</span>
                        <span class="complete-hours mono"
                            >{completedHoursDisplay} Hours</span
                        >
                        <span class="complete-label">Completed</span>
                    </div>
                </div>

                <div class="xp-earned" bind:this={xpTextEl}>
                    +100 XP earned 🎯
                </div>

                <button
                    class="start-another-btn"
                    onclick={() => {
                        resetFast();
                    }}
                >
                    Start Another Fast
                </button>

                <!-- Weekly Chart -->
                <div class="weekly-section">
                    <div class="weekly-label">This Week</div>
                    <div class="weekly-chart">
                        {#each $weeklyHistory as day, i}
                            <div class="bar-group">
                                <div class="bar-track">
                                    <div
                                        class="bar-fill"
                                        class:today={day.today}
                                        style="height: {(day.hours / 24) *
                                            100}%"
                                    ></div>
                                </div>
                                <span class="bar-day">{day.day}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .fasting-overlay {
        position: absolute;
        inset: 0;
        background: var(--color-bg);
        z-index: 200;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .fasting-overlay::-webkit-scrollbar {
        display: none;
    }

    /* ── Header ── */
    .fasting-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        padding-top: calc(var(--safe-area-top, 0px) + 16px);
        flex-shrink: 0;
    }

    .header-title {
        font-size: 17px;
        font-weight: 600;
        color: var(--color-text-primary);
    }

    .header-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        color: var(--color-text-secondary);
        cursor: pointer;
    }

    /* ── Content area ── */
    .fasting-content {
        flex: 1;
        padding: 0 20px 40px;
        display: flex;
        flex-direction: column;
    }

    /* ── Ring container ── */
    .ring-container {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        margin: 24px auto;
    }

    .ring-container.small {
        margin: 8px auto 16px;
    }

    .ring-center-text {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        pointer-events: none;
    }

    .ring-prompt {
        font-size: 16px;
        color: var(--color-text-muted);
        font-weight: 500;
    }

    .ring-duration {
        font-size: 32px;
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .ring-ends {
        font-size: 12px;
        color: var(--color-text-muted);
    }

    /* ── Idle state ── */
    .state-idle {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .question {
        font-size: 20px;
        font-weight: 700;
        color: var(--color-text-primary);
        text-align: center;
        margin-bottom: 20px;
        letter-spacing: -0.3px;
    }

    .time-options {
        display: flex;
        gap: 12px;
        width: 100%;
        margin-bottom: 24px;
    }

    .time-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px 16px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        cursor: pointer;
        transition:
            border-color 0.2s ease,
            background 0.2s ease;
    }

    .time-btn:active {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 179, 71, 0.4);
    }

    .time-icon {
        font-size: 28px;
    }

    .time-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
    }

    /* ── Earlier picker ── */
    .earlier-picker {
        margin-bottom: 24px;
        width: 100%;
    }

    .picker-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
    }

    .picker-time {
        padding: 10px 4px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s ease;
    }

    .picker-time:active {
        background: rgba(255, 179, 71, 0.15);
        border-color: rgba(255, 179, 71, 0.4);
    }

    /* ── Weekly chart ── */
    .weekly-section {
        width: 100%;
        margin-top: auto;
        padding-top: 24px;
    }

    .weekly-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--color-text-muted);
        margin-bottom: 12px;
        text-align: center;
    }

    .weekly-chart {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 12px;
        height: 100px;
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .bar-group {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        flex: 1;
    }

    .bar-track {
        width: 100%;
        max-width: 24px;
        height: 60px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: flex-end;
    }

    .bar-fill {
        width: 100%;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.25);
        min-height: 0;
        transform-origin: bottom;
        transition: height 0.5s ease;
    }

    .bar-fill.today {
        background: linear-gradient(to top, #ffb347, #ffd700);
        box-shadow: 0 0 8px rgba(255, 179, 71, 0.3);
    }

    .bar-day {
        font-size: 10px;
        font-weight: 500;
        color: var(--color-text-muted);
    }

    /* ── Choosing state ── */
    .state-choosing {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .section-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin-bottom: 16px;
        letter-spacing: -0.3px;
    }

    .preset-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        width: 100%;
        margin-bottom: 24px;
    }

    .preset-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 20px 16px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.25s ease;
    }

    .preset-card.selected {
        border-color: rgba(255, 179, 71, 0.5);
        background: rgba(255, 179, 71, 0.08);
        box-shadow: 0 0 20px rgba(255, 179, 71, 0.15);
    }

    .preset-name {
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .preset-hours {
        font-size: 12px;
        font-weight: 500;
        color: var(--color-text-secondary);
    }

    .preset-label {
        font-size: 11px;
        font-weight: 500;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
    }

    /* ── Hold to start button ── */
    .hold-container {
        width: 100%;
        margin-top: auto;
        padding-top: 16px;
    }

    .hold-btn {
        width: 100%;
        height: 56px;
        border: none;
        border-radius: 28px;
        background: linear-gradient(135deg, #ffb347, #ffd700);
        color: #0a0a1a;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
    }

    .hold-fill {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: rgba(0, 250, 58, 0.4);
        transition: width 0.03s linear;
    }

    .hold-label {
        position: relative;
        z-index: 1;
    }

    /* ── Starting hero state ── */
    .state-starting {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
    }

    .hero-pulse {
        animation: heroHeartbeat 0.6s ease-in-out 3;
    }

    @keyframes heroHeartbeat {
        0%,
        100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.08);
        }
    }

    .hero-fill {
        animation: heroFill 2s ease-out forwards;
    }

    @keyframes heroFill {
        0% {
            stroke-dashoffset: var(--ring-circumference, 723);
        }
        100% {
            stroke-dashoffset: 542;
        }
    }

    .starting-text {
        font-size: 18px;
        font-weight: 600;
        color: #ffb347;
        animation: textPulse 0.6s ease-in-out 3;
    }

    @keyframes textPulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    /* ── Active state ── */
    .state-active {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .countdown {
        font-size: 36px;
        font-weight: 700;
        color: var(--color-text-primary);
        letter-spacing: 2px;
    }

    .countdown-sub {
        font-size: 12px;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .wave-ring {
        animation: waveRotate 3s linear infinite;
    }

    @keyframes waveRotate {
        from {
            stroke-dashoffset: 0;
        }
        to {
            stroke-dashoffset: 24;
        }
    }

    .time-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        padding: 16px 0;
    }

    .time-row {
        display: flex;
        justify-content: space-between;
        padding: 0 20px;
    }

    .time-label-sm {
        font-size: 13px;
        color: var(--color-text-muted);
    }

    .time-value {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
    }

    .action-btns {
        display: flex;
        gap: 12px;
        width: 100%;
        margin-top: 16px;
    }

    .action-btn {
        flex: 1;
        padding: 14px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--color-text-primary);
    }

    .stop-btn:active {
        background: rgba(255, 80, 80, 0.15);
        border-color: rgba(255, 80, 80, 0.3);
    }

    .extend-btn:active {
        background: rgba(82, 172, 255, 0.15);
        border-color: rgba(82, 172, 255, 0.3);
    }

    .extend-options {
        display: flex;
        gap: 8px;
        margin-top: 12px;
    }

    .extend-option {
        padding: 10px 20px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
    }

    .extend-option:active {
        background: rgba(82, 172, 255, 0.15);
    }

    /* ── Complete state ── */
    .state-complete {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .complete-ring {
        filter: drop-shadow(0 0 30px rgba(0, 250, 58, 0.2));
    }

    .complete-check {
        font-size: 36px;
        color: #00fa3a;
    }

    .complete-hours {
        font-size: 28px;
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .complete-label {
        font-size: 13px;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .xp-earned {
        font-size: 18px;
        font-weight: 600;
        color: #ffd700;
        margin: 16px 0 24px;
        text-align: center;
    }

    .start-another-btn {
        width: 100%;
        padding: 16px;
        border: none;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: var(--color-text-primary);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 24px;
    }

    .start-another-btn:active {
        background: rgba(255, 255, 255, 0.12);
    }
</style>
