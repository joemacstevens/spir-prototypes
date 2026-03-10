<script context="module">
    // 8-axis octagonal grid points
    function getOctPoints(cx, cy, r) {
        return Array.from({ length: 8 }, (_, i) => {
            const angle = (Math.PI / 4) * i - Math.PI / 2;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(" ");
    }

    // 8-axis data polygon from values (0-100 scale)
    function getOctDataPoints(cx, cy, maxR, values) {
        return values
            .map((v, i) => {
                const angle = (Math.PI / 4) * i - Math.PI / 2;
                const r = (v / 100) * maxR;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            })
            .join(" ");
    }

    // 8-axis label positions
    function getOctLabels(cx, cy, r, labels) {
        return labels.map((text, i) => {
            const angle = (Math.PI / 4) * i - Math.PI / 2;
            const offsetY = i === 0 ? -8 : i === 4 ? 14 : 0;
            return {
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle) + offsetY,
                text,
            };
        });
    }

    // 6-axis hexagonal grid points
    function getHexPoints(cx, cy, r) {
        return Array.from({ length: 6 }, (_, i) => {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(" ");
    }

    function getHexDataPoints(cx, cy, maxR, values) {
        return values
            .map((v, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const r = (v / 100) * maxR;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
            })
            .join(" ");
    }

    function getHexLabels(cx, cy, r) {
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
        streaks,
        lifetimeStats,
        radarData,
        flowState,
        selfAssessment,
    } from "../lib/stores/metrics.js";
    import { direction } from "../lib/stores/navigation.js";
    import { addXP } from "../lib/stores/user.js";
    import { onMount } from "svelte";
    import gsap from "gsap";

    let statEls = [];
    let streakEls = [];

    onMount(() => {
        // Count-up animation on stats
        // UNITY: DOTween.To(() => 0, x => text.text = x.ToString(), targetValue, 1f)
        statEls.forEach((el, i) => {
            if (el) {
                const val = $lifetimeStats[i].value;
                const counter = { value: 0 };
                gsap.to(counter, {
                    value: val,
                    duration: 1,
                    delay: i * 0.05,
                    ease: "power2.out",
                    onUpdate: () => {
                        el.textContent = Math.floor(counter.value);
                    },
                });
            }
        });

        // Streak card entrance
        // UNITY: DOAnchorPosY + CanvasGroup.DOFade per card
        streakEls.forEach((el, i) => {
            if (el) {
                gsap.fromTo(
                    el,
                    { y: 30, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.5,
                        delay: i * 0.08,
                        ease: "back.out(1.2)",
                    },
                );
            }
        });
    });

    function claimStreak(key) {
        streaks.update((s) => {
            const streak = { ...s[key] };
            if (streak.status === "claimable") {
                streak.claimedCount += 1;
                streak.currentRun = 0;
                streak.status = "active";
                addXP(streak.xpReward);

                if (window.showToast) {
                    window.showToast(
                        `+${streak.xpReward} XP — ${streak.label} claimed!`,
                        "🎯",
                    );
                }
                if (window.spawnConfetti) {
                    window.spawnConfetti("streak");
                }
            }
            return { ...s, [key]: streak };
        });
    }

    const streakKeys = ["sleep", "hydration", "loadout"];

    // Self-assessment: convert 0-7 to 0-100 for display
    function toPercent(val, max) {
        return (val / max) * 100;
    }

    // Derived values for 8-axis chart
    $: saCurrentValues = $selfAssessment.axes.map((a) =>
        toPercent(a.current, a.max),
    );
    $: saBaselineValues = $selfAssessment.axes.map((a) =>
        toPercent(a.baseline, a.max),
    );
    $: saLabels = $selfAssessment.axes.map((a) => a.label);

    // Find biggest growth for callout
    $: bestGrowth = (() => {
        let best = { label: "", pct: 0 };
        $selfAssessment.axes.forEach((a) => {
            const growth = a.current - a.baseline;
            if (growth > best.pct)
                best = {
                    label: a.label,
                    pct: Math.round((growth / a.max) * 100),
                };
        });
        return best;
    })();

    // 6-axis data for Gold Standard (D2 only)
    $: goldValues = [
        $radarData.sleep,
        $radarData.lockIns,
        $radarData.loadouts,
        $radarData.habits,
        $radarData.brainFog,
        $radarData.rested,
    ];
</script>

<div class="screen profile-screen">
    <div class="screen-content">
        <!-- Section 1: Identity Card -->
        <div class="identity-card glass-card">
            <div class="avatar-ring">
                <div class="avatar">
                    <span class="avatar-text">{$user.name.charAt(0)}</span>
                </div>
            </div>
            <h2 class="user-name">{$user.name.toUpperCase()}</h2>
            <div class="user-meta">
                <span
                    class="level-badge"
                    style="background: rgba(167,139,250,0.2); color: #A78BFA;"
                    >Level {$level}</span
                >
                <span class="tier-badge">{$user.subscription}</span>
            </div>
            <!-- UNITY: Image.DOFillAmount(progress, 0.5f).SetEase(Ease.OutQuad) -->
            <div class="xp-bar-container">
                <div class="xp-bar-track">
                    <div
                        class="xp-bar-fill"
                        style="width: {$levelProgress.percent}%"
                    ></div>
                </div>
                <div class="xp-bar-labels">
                    <span class="mono">{$user.totalXP.toLocaleString()} XP</span
                    >
                    <span>{$levelProgress.remaining} to Level {$level + 1}</span
                    >
                </div>
            </div>
            <!-- Stats Row: Streak & PC -->
            <div class="identity-stats-row">
                <div class="login-streak">
                    <span class="stat-icon">🔥</span>
                    <span>{$user.loginStreak} Day Streak</span>
                </div>
                <div class="protocol-credits">
                    <span class="stat-icon pc-icon">⬡</span>
                    <span class="mono">{($user.protocolCredits || 0).toLocaleString()} PC</span>
                </div>
            </div>
        </div>

        <!-- Section 2: Streaks -->
        <div class="section-header">
            <span class="label">Streaks & Achievements</span>
        </div>
        <div class="streaks-list">
            {#each streakKeys as key, i}
                {@const streak = $streaks[key]}
                <div
                    class="streak-card glass-card"
                    class:claimable={streak.status === "claimable"}
                    class:locked={streak.status === "locked"}
                    bind:this={streakEls[i]}
                    style="--streak-color: {streak.color};"
                >
                    <div class="streak-header">
                        <span class="streak-icon"
                            >{streak.status === "locked"
                                ? "🔒"
                                : streak.icon}</span
                        >
                        <span class="streak-label">{streak.label}</span>
                        {#if streak.claimedCount > 0}
                            <span class="claim-badge"
                                >×{streak.claimedCount}</span
                            >
                        {/if}
                    </div>

                    {#if streak.status !== "locked"}
                        <div class="streak-progress">
                            <div class="streak-track">
                                <div
                                    class="streak-fill"
                                    style="width: {(streak.currentRun /
                                        streak.required) *
                                        100}%; background: {streak.color};"
                                ></div>
                            </div>
                            <span class="streak-count"
                                >{streak.currentRun} of {streak.required} days</span
                            >
                        </div>
                    {:else}
                        <p class="streak-locked-text">
                            Complete your first {key} streak to unlock
                        </p>
                    {/if}

                    {#if streak.status === "claimable"}
                        <button
                            class="btn-primary claim-btn"
                            onclick={() => claimStreak(key)}
                        >
                            Claim +{streak.xpReward} XP
                        </button>
                    {/if}
                </div>
            {/each}
        </div>

        <!-- Section 3: Analytics -->
        <div class="section-header">
            <span class="label">Lifetime Stats</span>
        </div>
        <div class="stat-grid">
            {#each $lifetimeStats as stat, i}
                <div class="stat-card glass-card-sm">
                    <span class="stat-value mono" bind:this={statEls[i]}>0</span
                    >
                    <span class="stat-label">{stat.label}</span>
                </div>
            {/each}
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- Chart A: Self-Assessment Radar (8-axis)    -->
        <!-- ALWAYS visible — both D1 and D2            -->
        <!-- UNITY: RateMyRoutineSpiderGraph.cs          -->
        <!-- ═══════════════════════════════════════════ -->
        <div class="section-header" style="margin-top: 8px;">
            <span class="label">Self-Assessment</span>
        </div>
        <div class="radar-card glass-card">
            <svg viewBox="0 0 280 260" class="radar-chart">
                <!-- Octagonal grid rings at 25%, 50%, 75%, 100% -->
                {#each [0.25, 0.5, 0.75, 1] as scale}
                    <polygon
                        points={getOctPoints(140, 130, 95 * scale)}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        stroke-width="1"
                    />
                {/each}
                <!-- Axis lines -->
                {#each Array(8) as _, i}
                    {@const angle = (Math.PI / 4) * i - Math.PI / 2}
                    <line
                        x1="140"
                        y1="130"
                        x2={140 + 95 * Math.cos(angle)}
                        y2={130 + 95 * Math.sin(angle)}
                        stroke="rgba(255,255,255,0.06)"
                        stroke-width="1"
                    />
                {/each}
                <!-- Baseline polygon (onboarding — faded) -->
                <polygon
                    points={getOctDataPoints(140, 130, 95, saBaselineValues)}
                    fill="rgba(255,255,255,0.06)"
                    stroke="rgba(255,255,255,0.15)"
                    stroke-width="1.5"
                    stroke-dasharray="4 3"
                />
                <!-- Current polygon (bright) -->
                <polygon
                    points={getOctDataPoints(140, 130, 95, saCurrentValues)}
                    fill="rgba(82,172,255,0.12)"
                    stroke="rgba(82,172,255,0.5)"
                    stroke-width="2"
                />
                <!-- Data dots on current polygon -->
                {#each saCurrentValues as val, i}
                    {@const angle = (Math.PI / 4) * i - Math.PI / 2}
                    {@const r = (val / 100) * 95}
                    <circle
                        cx={140 + r * Math.cos(angle)}
                        cy={130 + r * Math.sin(angle)}
                        r="3"
                        fill="rgba(82,172,255,0.8)"
                    />
                {/each}
                <!-- Axis labels -->
                {#each getOctLabels(140, 130, 112, saLabels) as label}
                    <text
                        x={label.x}
                        y={label.y}
                        text-anchor="middle"
                        fill="rgba(255,255,255,0.5)"
                        font-size="9"
                        font-family="Inter">{label.text}</text
                    >
                {/each}
            </svg>
            <!-- Growth callout -->
            {#if bestGrowth.pct > 0}
                <div class="growth-callout">
                    Since you started, <strong>{bestGrowth.label}</strong> is up
                    <strong>{bestGrowth.pct}%</strong>
                </div>
            {/if}
            <!-- Legend -->
            <div class="radar-legend">
                <span class="legend-item">
                    <span class="legend-line legend-baseline"></span> Baseline
                </span>
                <span class="legend-item">
                    <span class="legend-line legend-current"></span> Current
                </span>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- Chart B: Gold Standard Radar (6-axis)      -->
        <!-- ONLY in Direction 2 (moved from Home)      -->
        <!-- UNITY: RadarChartFeed.cs                    -->
        <!-- ═══════════════════════════════════════════ -->
        {#if $direction === 2}
            <div class="section-header" style="margin-top: 8px;">
                <span class="label">Gold Standard Performance</span>
                <div class="date-nav">
                    <button class="nav-arrow">‹</button>
                    <span class="date-range">This Week</span>
                    <button class="nav-arrow">›</button>
                </div>
            </div>
            <div class="radar-card glass-card">
                <svg viewBox="0 0 280 240" class="radar-chart">
                    <!-- Hexagonal grid rings -->
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
                        points={getHexDataPoints(140, 120, 90, goldValues)}
                        fill="rgba(82,172,255,0.12)"
                        stroke="rgba(82,172,255,0.5)"
                        stroke-width="2"
                    />
                    <!-- Axis labels with values -->
                    {#each getHexLabels(140, 120, 105) as label, i}
                        <text
                            x={label.x}
                            y={label.y}
                            text-anchor="middle"
                            fill="rgba(255,255,255,0.5)"
                            font-size="10"
                            font-family="Inter"
                            >{label.text} {goldValues[i]}%</text
                        >
                    {/each}
                </svg>
            </div>

            <!-- Flow State Gauge (D2 only) -->
            <div class="section-header" style="margin-top: 8px;">
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
                        <!-- UNITY: RectTransform.DOAnchorPos(target, 1f).SetEase(Ease.Linear) -->
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
        {/if}
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
        gap: 16px;
    }

    .section-header {
        margin-top: 8px;
        margin-bottom: -4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    /* ── Identity Card ── */
    .identity-card {
        padding: 28px 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .avatar-ring {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: linear-gradient(
            135deg,
            var(--color-accent),
            var(--color-sleep)
        );
        padding: 3px;
        margin-bottom: 12px;
    }

    .avatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: var(--color-bg);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .avatar-text {
        font-size: 28px;
        font-weight: 700;
        color: var(--color-accent);
    }

    .user-name {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 1.5px;
        margin-bottom: 8px;
    }

    .user-meta {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
    }

    .level-badge,
    .tier-badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }

    .tier-badge {
        background: rgba(255, 255, 255, 0.08);
        color: var(--color-text-secondary);
    }

    .xp-bar-container {
        width: 100%;
        margin-bottom: 12px;
    }

    .xp-bar-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 6px;
    }

    .xp-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-accent), #3d8be0);
        border-radius: 3px;
        transition: width 0.5s ease-out;
    }

    .xp-bar-labels {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--color-text-muted);
    }

    .identity-stats-row {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-top: 8px;
    }

    .login-streak, .protocol-credits {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
        padding: 6px 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .login-streak {
        color: var(--color-fasting);
        box-shadow: 0 0 10px rgba(255, 179, 71, 0.1);
    }

    .protocol-credits {
        color: #52ACFF;
        box-shadow: 0 0 10px rgba(82, 172, 255, 0.1);
    }

    .stat-icon {
        font-size: 16px;
    }

    .pc-icon {
        color: #52ACFF;
    }

    /* ── Streaks ── */
    .streaks-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .streak-card {
        padding: 16px 20px;
        transition: box-shadow 0.3s ease;
    }

    .streak-card.claimable {
        box-shadow: 0 0 20px
            color-mix(in srgb, var(--streak-color) 30%, transparent);
        border-color: color-mix(in srgb, var(--streak-color) 40%, transparent);
    }

    .streak-card.locked {
        opacity: 0.5;
    }

    .streak-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
    }

    .streak-icon {
        font-size: 20px;
    }

    .streak-label {
        font-size: 15px;
        font-weight: 600;
        flex: 1;
    }

    .claim-badge {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-muted);
        padding: 2px 8px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 8px;
    }

    .streak-progress {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .streak-track {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
    }

    .streak-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease-out;
    }

    .streak-count {
        font-size: 12px;
        color: var(--color-text-secondary);
        white-space: nowrap;
    }

    .streak-locked-text {
        font-size: 13px;
        color: var(--color-text-muted);
    }

    .claim-btn {
        width: 100%;
        margin-top: 4px;
    }

    /* ── Stats ── */
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
    }

    .stat-card {
        padding: 14px 10px;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .stat-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .stat-label {
        font-size: 10px;
        font-weight: 500;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* ── Radar Charts ── */
    .radar-card {
        padding: 20px;
    }

    .radar-chart {
        width: 100%;
        max-width: 280px;
        margin: 0 auto;
        display: block;
    }

    .growth-callout {
        text-align: center;
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-top: 12px;
        padding: 8px 12px;
        background: rgba(82, 172, 255, 0.06);
        border-radius: 10px;
        border: 1px solid rgba(82, 172, 255, 0.1);
    }

    .growth-callout strong {
        color: var(--color-accent);
    }

    .radar-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 12px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--color-text-muted);
    }

    .legend-line {
        display: inline-block;
        width: 16px;
        height: 2px;
        border-radius: 1px;
    }

    .legend-baseline {
        background: rgba(255, 255, 255, 0.15);
        border-top: 1px dashed rgba(255, 255, 255, 0.3);
    }

    .legend-current {
        background: rgba(82, 172, 255, 0.5);
    }

    /* ── Date Nav (for Gold Standard) ── */
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
