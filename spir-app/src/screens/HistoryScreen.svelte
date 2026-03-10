<script>
    import { onMount } from "svelte";
    import gsap from "gsap";
    import { activeHabits, completedHabits } from "../lib/stores/habits.js";

    let currentMonth = $state(new Date(2026, 2, 1)); // March 2026
    let selectedDay = $state(null);

    // Live sync for today
    let todayCompletion = $derived($activeHabits.length > 0 ? $completedHabits.size / $activeHabits.length : 0);

    // Mock completion data — percentage per day
    let completionData = $derived({
        "2026-03-01": 1.0,
        "2026-03-02": 1.0,
        "2026-03-03": 0.85,
        "2026-03-04": todayCompletion,
        "2026-02-28": 1.0,
        "2026-02-27": 0.7,
        "2026-02-26": 1.0,
        "2026-02-25": 1.0,
        "2026-02-24": 0.9,
        "2026-02-23": 0.5,
        "2026-02-22": 1.0,
        "2026-02-21": 1.0,
        "2026-02-20": 0.8,
        "2026-02-19": 0,
        "2026-02-18": 1.0,
        "2026-02-17": 1.0,
        "2026-02-16": 0.75,
        "2026-02-15": 1.0,
        "2026-02-14": 1.0,
        "2026-02-13": 0.9,
        "2026-02-12": 0,
        "2026-02-11": 1.0,
        "2026-02-10": 1.0,
        "2026-02-09": 0.6,
        "2026-02-08": 1.0,
        "2026-02-07": 1.0,
        "2026-02-06": 0.8,
        "2026-02-05": 1.0,
        "2026-02-04": 1.0,
        "2026-02-03": 0.5,
        "2026-02-02": 1.0,
        "2026-02-01": 1.0,
    });

    // Streak
    const currentStreak = 4;
    const longestStreak = 14;

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    function getMonthDays(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        // Leading blanks
        for (let i = 0; i < firstDay; i++) days.push(null);

        for (let d = 1; d <= daysInMonth; d++) {
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            days.push({ day: d, key, completion: completionData[key] ?? null });
        }
        return days;
    }

    function prevMonth() {
        currentMonth = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() - 1,
            1,
        );
        selectedDay = null;
    }

    function nextMonth() {
        currentMonth = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            1,
        );
        selectedDay = null;
    }

    function getMonthLabel(d) {
        return d.toLocaleString("default", { month: "long", year: "numeric" });
    }

    function getDotColor(completion) {
        if (completion === null) return "transparent";
        if (completion >= 1.0) return "#00FA3A"; // green — all done
        if (completion >= 0.5) return "#FFB347"; // amber — partial
        if (completion > 0) return "#FF6B6B"; // red — minimal
        return "rgba(255,255,255,0.1)"; // empty — missed
    }

    $effect(() => {
        // Animate calendar cells on month change
        const cells = document.querySelectorAll(".cal-day");
        if (cells.length) {
            // UNITY: DOTween Sequence with stagger
            gsap.from(cells, {
                opacity: 0,
                scale: 0.8,
                duration: 0.3,
                stagger: 0.015,
                ease: "power2.out",
            });
        }
    });
</script>

<div class="screen history-screen">
    <!-- Month Navigator -->
    <div class="month-nav">
        <button class="nav-btn" onclick={prevMonth}>‹</button>
        <span class="month-label">{getMonthLabel(currentMonth)}</span>
        <button class="nav-btn" onclick={nextMonth}>›</button>
    </div>

    <!-- Streak Summary -->
    <div class="streak-row">
        <div class="streak-badge">
            <span class="streak-icon">🔥</span>
            <span class="streak-val">{currentStreak}</span>
            <span class="streak-label">Current</span>
        </div>
        <div class="streak-badge">
            <span class="streak-icon">🏆</span>
            <span class="streak-val">{longestStreak}</span>
            <span class="streak-label">Longest</span>
        </div>
    </div>

    <!-- Calendar Grid -->
    <div class="calendar-grid">
        <!-- Weekday headers -->
        {#each weekdays as day}
            <div class="cal-header">{day}</div>
        {/each}

        <!-- Day cells -->
        {#each getMonthDays(currentMonth) as cell}
            {#if cell === null}
                <div class="cal-day empty"></div>
            {:else}
                <button
                    class="cal-day"
                    class:selected={selectedDay === cell.key}
                    class:today={cell.key === "2026-03-04"}
                    onclick={() =>
                        (selectedDay =
                            selectedDay === cell.key ? null : cell.key)}
                >
                    <span class="day-num">{cell.day}</span>
                    <div
                        class="dot"
                        style="background: {getDotColor(cell.completion)}"
                    ></div>
                </button>
            {/if}
        {/each}
    </div>

    <!-- Legend -->
    <div class="legend">
        <div class="legend-item">
            <div class="legend-dot" style="background: #00FA3A"></div>
             All done
        </div>
        <div class="legend-item">
            <div class="legend-dot" style="background: #FFB347"></div>
             Partial
        </div>
        <div class="legend-item">
            <div
                class="legend-dot"
                style="background: rgba(255,255,255,0.1)"
            ></div>
             Missed
        </div>
    </div>

    <!-- Selected Day Detail -->
    {#if selectedDay}
        {@const comp = completionData[selectedDay]}
        <div class="day-detail glass-card">
            <div class="detail-header">
                <span class="detail-date">{selectedDay}</span>
                <span class="detail-pct"
                    >{comp !== null && comp !== undefined
                        ? Math.round(comp * 100) + "%"
                        : "No data"}</span
                >
            </div>
            {#if comp !== null && comp !== undefined}
                <div class="detail-bar-track">
                    <div
                        class="detail-bar-fill"
                        style="width: {comp * 100}%; background: {getDotColor(
                            comp,
                        )}"
                    ></div>
                </div>
                <div class="detail-summary">
                    {comp >= 1
                        ? "✅ All habits completed"
                        : comp > 0
                          ? "🟡 Partially completed"
                          : "❌ No habits logged"}
                </div>
            {:else}
                <div class="detail-summary">No tracking data for this day</div>
            {/if}
        </div>
    {/if}

    <!-- Weekly Stats -->
    <div class="weekly-stats glass-card">
        <div class="stat-title">THIS WEEK</div>
        <div class="stat-bars">
            {#each ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as day, i}
                {@const pct = [1.0, 1.0, todayCompletion, 0, 0, 0, 0][i]}
                <div class="stat-bar-col">
                    <div class="stat-bar-track">
                        <div
                            class="stat-bar-fill"
                            style="height: {pct *
                                100}%; background: {getDotColor(pct || 0.01)}"
                        ></div>
                    </div>
                    <span class="stat-bar-label">{day.charAt(0)}</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .screen {
        height: 100%;
        padding-top: var(--header-height);
        overflow-y: auto;
        padding-bottom: calc(var(--tab-bar-height) + 20px);
    }

    /* Month Nav */
    .month-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 24px;
        padding: 12px 20px 8px;
    }

    .nav-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--color-text-secondary);
        cursor: pointer;
        padding: 4px 12px;
        -webkit-tap-highlight-color: transparent;
    }

    .month-label {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-text-primary);
        min-width: 160px;
        text-align: center;
    }

    /* Streak */
    .streak-row {
        display: flex;
        justify-content: center;
        gap: 32px;
        padding: 4px 20px 16px;
    }

    .streak-badge {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    .streak-icon {
        font-size: 18px;
    }
    .streak-val {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-text-primary);
    }
    .streak-label {
        font-size: 10px;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Calendar Grid */
    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        padding: 0 16px 16px;
    }

    .cal-header {
        text-align: center;
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-muted);
        padding: 4px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .cal-day {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px 4px;
        border-radius: 12px;
        background: none;
        border: 1px solid transparent;
        cursor: pointer;
        font-family: var(--font-family);
        color: var(--color-text-primary);
        -webkit-tap-highlight-color: transparent;
        transition:
            background 0.2s ease,
            border-color 0.2s ease;
    }

    .cal-day.empty {
        pointer-events: none;
    }

    .cal-day:hover,
    .cal-day.selected {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
    }

    .cal-day.today {
        border-color: var(--color-accent);
    }

    .day-num {
        font-size: 13px;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
    }

    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
    }

    /* Legend */
    .legend {
        display: flex;
        justify-content: center;
        gap: 16px;
        padding: 0 20px 16px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--color-text-muted);
    }

    .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    /* Day Detail */
    .day-detail {
        margin: 0 16px 16px;
        padding: 16px;
    }

    .detail-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .detail-date {
        font-size: 14px;
        font-weight: 600;
    }
    .detail-pct {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-accent);
    }

    .detail-bar-track {
        height: 4px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 4px;
        margin-bottom: 8px;
    }

    .detail-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s ease;
    }

    .detail-summary {
        font-size: 13px;
        color: var(--color-text-secondary);
    }

    /* Weekly Stats */
    .weekly-stats {
        margin: 0 16px 16px;
        padding: 16px;
    }

    .stat-title {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 1px;
        color: var(--color-text-muted);
        margin-bottom: 12px;
    }

    .stat-bars {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        height: 80px;
    }

    .stat-bar-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        flex: 1;
    }

    .stat-bar-track {
        width: 16px;
        height: 60px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        display: flex;
        align-items: flex-end;
        overflow: hidden;
    }

    .stat-bar-fill {
        width: 100%;
        border-radius: 8px;
        transition: height 0.5s ease;
    }

    .stat-bar-label {
        font-size: 10px;
        color: var(--color-text-muted);
        font-weight: 500;
    }
</style>
