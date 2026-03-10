<script context="module">
    function getHexPoints(cx, cy, r) {
        return Array.from({ length: 6 }, (_, i) => {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(" ");
    }

    function getDataPoints(cx, cy, maxR, values) {
        return values
            .map((v, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const r = (v / 100) * maxR;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            })
            .join(" ");
    }

    function getAxisLabels(cx, cy, r) {
        const labels = [
            "Sleep",
            "Lock-ins",
            "Loadouts",
            "Habits",
            "Brain Fog",
            "Rested",
        ];
        return labels.map((text, i) => {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            return {
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle) + (i === 0 ? -6 : i === 3 ? 12 : 0),
                text,
            };
        });
    }
</script>

<script>
    import {
        user,
        level,
        levelProgress,
        levelTitle,
    } from "../lib/stores/user.js";
    import {
        dailyMetrics,
        radarData,
        flowState,
    } from "../lib/stores/metrics.js";
    import { direction, activeTab } from "../lib/stores/navigation.js";
    import { onMount } from "svelte";
    import gsap from "gsap";

    let ringEls = [];
    let mounted = false;

    const rings = [
        {
            key: "steps",
            label: "Steps",
            color: "var(--color-steps)",
            glowColor: "rgba(0,250,58,0.3)",
        },
        {
            key: "checkIns",
            label: "Check-ins",
            color: "var(--color-checkins)",
            glowColor: "rgba(82,172,255,0.3)",
        },
        {
            key: "fasting",
            label: "Fasting",
            color: "var(--color-fasting)",
            glowColor: "rgba(255,179,71,0.3)",
        },
        {
            key: "sleepCycles",
            label: "Sleep",
            color: "var(--color-sleep)",
            glowColor: "rgba(167,139,250,0.3)",
        },
    ];

    onMount(() => {
        mounted = true;
        // Animate rings on entrance
        ringEls.forEach((el, i) => {
            if (el) {
                // UNITY: CanvasGroup.DOFade + DOScale entrance
                gsap.fromTo(
                    el,
                    { scale: 0.8, opacity: 0 },
                    {
                        scale: 1,
                        opacity: 1,
                        duration: 0.5,
                        delay: i * 0.08,
                        ease: "back.out(1.2)",
                    },
                );
            }
        });
    });

    function getMetricValue(key) {
        const m = $dailyMetrics[key];
        if (key === "steps") return m.current.toLocaleString();
        if (key === "fasting") return `${m.current}h`;
        return `${m.current}/${m.target}`;
    }

    function getMetricPercent(key) {
        const m = $dailyMetrics[key];
        return Math.min((m.current / m.target) * 100, 100);
    }

    $: goldValues = [
        $radarData.sleep,
        $radarData.lockIns,
        $radarData.loadouts,
        $radarData.habits,
        $radarData.brainFog,
        $radarData.rested,
    ];

    // SVG ring math
    const ringRadius = 42;
    const ringCircumference = 2 * Math.PI * ringRadius;
</script>

<div class="screen home-screen">
    <div class="screen-content">
        <!-- Hero Progress Rings -->
        <section class="rings-section">
            <div class="rings-grid">
                {#each rings as ring, i}
                    <div class="ring-card" bind:this={ringEls[i]}>
                        <svg
                            class="progress-ring"
                            width="100"
                            height="100"
                            viewBox="0 0 100 100"
                        >
                            <!-- Background track -->
                            <circle
                                cx="50"
                                cy="50"
                                r={ringRadius}
                                fill="none"
                                stroke="rgba(255,255,255,0.08)"
                                stroke-width="6"
                            />
                            <!-- Progress fill -->
                            <circle
                                cx="50"
                                cy="50"
                                r={ringRadius}
                                fill="none"
                                stroke={ring.color}
                                stroke-width="6"
                                stroke-linecap="round"
                                stroke-dasharray={ringCircumference}
                                stroke-dashoffset={ringCircumference -
                                    (ringCircumference *
                                        getMetricPercent(ring.key)) /
                                        100}
                                transform="rotate(-90 50 50)"
                                style="filter: drop-shadow(0 0 8px {ring.glowColor}); transition: stroke-dashoffset 0.8s ease-out;"
                            />
                        </svg>
                        <div class="ring-value">
                            <span class="ring-number mono"
                                >{getMetricValue(ring.key)}</span
                            >
                            <span class="ring-label">{ring.label}</span>
                        </div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- Energy Position Mini-Indicator (tappable → Habits) -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <section
            class="energy-mini"
            onclick={() => activeTab.set("habits")}
            style="cursor: pointer;"
        >
            <div class="energy-bar">
                <div
                    class="energy-segment"
                    style="flex: 1.5; background: rgba(255,255,255,0.08);"
                ></div>
                <div
                    class="energy-segment"
                    style="flex: 4; background: rgba(181,140,31,0.25);"
                ></div>
                <div
                    class="energy-segment"
                    style="flex: 2; background: rgba(255,255,255,0.06);"
                ></div>
                <div
                    class="energy-segment"
                    style="flex: 4; background: rgba(221,52,147,0.25);"
                ></div>
                <div
                    class="energy-segment"
                    style="flex: 4.5; background: rgba(51,153,230,0.25);"
                ></div>
                <div class="now-dot" style="left: 45%;"></div>
            </div>
            <div class="energy-times">
                <span>6:30 AM</span>
                <span>10:30 PM</span>
            </div>
            <div class="energy-tap-hint">Tap to view timeline →</div>
        </section>

        <!-- Weekly Radar Chart -->
        <section class="radar-section">
            <div class="section-header">
                <span class="label">Gold Standard Performance</span>
                <div class="date-nav">
                    <button class="nav-arrow">‹</button>
                    <span class="date-range">This Week</span>
                    <button class="nav-arrow">›</button>
                </div>
            </div>
            <div class="radar-card glass-card">
                <svg viewBox="0 0 280 240" class="radar-chart">
                    {#each [0.25, 0.5, 0.75, 1] as scale}
                        <polygon
                            points={getHexPoints(140, 120, 90 * scale)}
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            stroke-width="1"
                        />
                    {/each}
                    <!-- Data polygon -->
                    <polygon
                        points={getDataPoints(140, 120, 90, goldValues)}
                        fill="rgba(82,172,255,0.12)"
                        stroke="rgba(82,172,255,0.5)"
                        stroke-width="2"
                    />
                    <!-- Axis labels with values -->
                    {#each getAxisLabels(140, 120, 105) as label, i}
                        <text
                            x={label.x}
                            y={label.y}
                            text-anchor="middle"
                            fill="rgba(255,255,255,0.5)"
                            font-size="10"
                            font-family="Inter">{label.text} {goldValues[i]}%</text
                        >
                    {/each}
                </svg>
            </div>
        </section>

        <!-- Flow State Readiness -->
        <section class="flow-section">
            <div class="section-header">
                <span class="label">Flow State Readiness</span>
            </div>
            <div class="flow-card glass-card">
                <div class="flow-gauge">
                    <div class="flow-track">
                        <div
                            class="flow-fill"
                            style="width: {($flowState.value / $flowState.max) *
                                100}%"
                        ></div>
                        <div
                            class="flow-pointer"
                            style="left: {($flowState.value / $flowState.max) *
                                100}%"
                        >
                            <span class="flow-value mono"
                                >{$flowState.value}</span
                            >
                        </div>
                    </div>
                    <div class="flow-labels">
                        <span>0</span>
                        <span>{$flowState.max}</span>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>

<style>
    .screen {
        height: 100%;
        padding-top: var(--header-height);
        overflow-y: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .screen::-webkit-scrollbar {
        display: none;
    }

    .screen-content {
        padding: 8px 20px 40px;
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    /* ── Rings ── */
    .rings-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .ring-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        background: var(--color-card-bg);
        border: 1px solid var(--color-card-border);
        border-radius: var(--radius-lg);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        position: relative;
    }

    .progress-ring {
        display: block;
    }

    .ring-value {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -55%);
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
    }

    .ring-number {
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .ring-label {
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--color-text-muted);
        margin-top: 2px;
    }

    /* ── Energy Mini ── */
    .energy-mini {
        padding: 0 4px;
    }

    .energy-bar {
        display: flex;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        position: relative;
        gap: 2px;
    }

    .energy-segment {
        border-radius: 4px;
    }

    .now-dot {
        position: absolute;
        top: 50%;
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        animation: now-pulse 2s ease-in-out infinite;
    }

    @keyframes now-pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    .energy-times {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 10px;
        color: var(--color-text-muted);
    }

    .energy-tap-hint {
        text-align: center;
        font-size: 10px;
        color: var(--color-text-muted);
        margin-top: 4px;
        opacity: 0.6;
    }

    .energy-mini:active {
        opacity: 0.8;
        transform: scale(0.99);
    }

    /* ── Sections ── */
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }

    .date-nav {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .nav-arrow {
        background: none;
        border: none;
        color: var(--color-text-secondary);
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
    }

    .date-range {
        font-size: 13px;
        color: var(--color-text-secondary);
        font-weight: 500;
    }

    /* ── Radar ── */
    .radar-card {
        padding: 20px;
    }

    .radar-chart {
        width: 100%;
        max-width: 280px;
        margin: 0 auto;
        display: block;
    }

    /* ── Flow Gauge ── */
    .flow-card {
        padding: 20px;
    }

    .flow-track {
        position: relative;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
    }

    .flow-fill {
        height: 100%;
        border-radius: 2px;
        background: linear-gradient(90deg, var(--color-accent), #3d8be0);
        transition: width 1s linear;
    }

    .flow-pointer {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        transition: left 1s linear;
    }

    .flow-pointer::before {
        content: "";
        display: block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--color-accent);
        box-shadow: 0 0 12px var(--color-accent-glow);
        margin: 0 auto;
    }

    .flow-value {
        display: block;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-accent);
        margin-top: 6px;
    }

    .flow-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        font-size: 11px;
        color: var(--color-text-muted);
    }
</style>
