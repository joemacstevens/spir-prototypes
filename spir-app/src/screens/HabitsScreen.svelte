<script>
    import {
        energyWindows,
        loadoutTemplates,
        calendarEvents,
        allHabits,
        activeHabits,
        completedHabits,
        loadoutLocked,
        selectedLoadoutId,
        habitsByWindow,
        eventsByWindow,
        windowCompletion,
        completedSections,
        allSectionsComplete,
        dayLockedIn,
        selectLoadout,
        toggleHabit,
        clearLoadout,
        formatTime,
        getCurrentWindowId,
        timeToMinutes,
    } from "../lib/stores/habits.js";
    import {
        layoutVariant,
        direction,
        activeOverlay,
    } from "../lib/stores/navigation.js";
    import { user, addXP } from "../lib/stores/user.js";
    import { flyXP } from "../lib/utils/animations.js";
    import {
        fastingState,
        progress as fastingProgress,
        ringColor as fastingColor,
    } from "../lib/stores/fasting.js";
    import { onMount, tick } from "svelte";
    import gsap from "gsap";

    let timelineEl = $state();
    let windowRefs = {};
    let expandedWindowId = $state(null);
    let nowLineEl = $state();
    let cascading = $state(false);
    let addHabitWindow = $state(null); // which window's "+" was tapped

    let celebratedSections = $state({});
    let celebrationBanners = $state({}); // 'show' or 'badge'
    let lockInCardVisible = $state(false);
    let lockInCardRef = $state();
    let lockInProgressBar = $state();
    let isHoldingLockIn = false;

    // Fasting mini-ring helper
    function isFastingHabit(habit) {
        return habit.tool === "fasting";
    }

    function openFastingOverlay() {
        activeOverlay.set("fasting");
    }

    // Bottom sheet: available habits for a window not already active
    function getAvailableHabits(windowId) {
        return allHabits.filter(
            (h) =>
                h.window === windowId &&
                !$activeHabits.some((a) => a.id === h.id),
        );
    }

    function addHabitToTimeline(habit) {
        activeHabits.update((list) => [...list, habit]);
        addHabitWindow = null;
    }

    // Determine current window for Variant B auto-expand
    const currentWindowId = getCurrentWindowId();

    onMount(() => {
        // If no loadout, show selection
        if ($activeHabits.length === 0) return;

        // Auto-scroll to "now" indicator
        scrollToNow();

        // In Variant B, auto-expand current window
        if ($layoutVariant === "b") {
            expandedWindowId = currentWindowId;
        }
    });

    $effect(() => {
        // 1.1 Section celebrations
        for (const [windowId, isComplete] of Object.entries($completedSections)) {
            if (isComplete && !celebratedSections[windowId] && windowRefs[windowId]) {
                celebratedSections[windowId] = true;
                triggerSectionCelebration(windowId);
            }
        }

        // 1.2 Lock-in Bridge
        if ($allSectionsComplete && !$dayLockedIn && !lockInCardVisible) {
            lockInCardVisible = true;
            setTimeout(() => {
                if (timelineEl && lockInCardRef) {
                    const scrollTarget = timelineEl.scrollHeight - timelineEl.clientHeight;
                    gsap.to(timelineEl, { scrollTop: scrollTarget, duration: 0.5, ease: 'power2.out' });
                    gsap.from(lockInCardRef, { y: 60, opacity: 0, duration: 0.5, ease: 'back.out(1.2)', delay: 0.3 });
                }
            }, 100);
        }
    });

    function triggerSectionCelebration(windowId) {
        const sectionEl = windowRefs[windowId];
        if (!sectionEl) return;
        
        setTimeout(() => {
            celebrationBanners[windowId] = 'show';
            
            tick().then(() => {
                const bannerEl = sectionEl.querySelector('.section-celebration-banner');
                if (bannerEl) {
                    gsap.from(bannerEl, { y: 30, scale: 0.9, opacity: 0, duration: 0.4, ease: 'back.out(1.4)' });
                    
                    const w = energyWindows.find(wn => wn.id === windowId);
                    gsap.to(sectionEl, { borderColor: w.color, duration: 0.5, ease: 'power2.out' });
                    
                    if (window.spawnConfetti) {
                        const rect = sectionEl.getBoundingClientRect();
                        window.spawnConfetti('achievement', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
                    }
                    
                    setTimeout(() => {
                        gsap.to(bannerEl, { 
                            opacity: 0, 
                            y: -10, 
                            duration: 0.3, 
                            ease: 'power2.in', 
                            onComplete: () => {
                                celebrationBanners[windowId] = 'badge';
                            }
                        });
                    }, 2000);
                    
                    flyXP(bannerEl, 30);
                }
            });
        }, 200);
    }
    
    function startLockInHold() {
        isHoldingLockIn = true;
        gsap.to(lockInProgressBar, { width: '100%', duration: 2, ease: 'none', onComplete: finalizeLockIn });
    }

    function stopLockInHold() {
        if (!isHoldingLockIn) return;
        isHoldingLockIn = false;
        gsap.killTweensOf(lockInProgressBar);
        gsap.to(lockInProgressBar, { width: '0%', duration: 0.3, ease: 'power2.out' });
    }

    function finalizeLockIn() {
        isHoldingLockIn = false;
        const card = lockInCardRef;
        gsap.to(card, { backgroundColor: '#ffffff', duration: 0.1, yoyo: true, repeat: 1 });
        
        if (window.spawnConfetti) window.spawnConfetti('full');
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                flyXP(card, i === 4 ? 250 : 0);
            }, i * 100);
        }
        
        if (window.showToast) window.showToast("Day Locked in! +250 XP", "🔒");
        $dayLockedIn = true;
    }

    function handlePartialLockIn() {
        const done = Object.values($windowCompletion).reduce((sum, w) => sum + w.done, 0);
        const total = Object.values($windowCompletion).reduce((sum, w) => sum + w.total, 0);
        const xpEarned = Math.floor((done / Math.max(total, 1)) * 200);
        
        if (window.spawnConfetti) window.spawnConfetti('achievement');
        flyXP(timelineEl, xpEarned);
        if (window.showToast) window.showToast(`Day Locked in! +${xpEarned} XP`, "🔒");
        
        $dayLockedIn = true;
    }

    async function handleSelectLoadout(templateId) {
        selectLoadout(templateId);
        cascading = true;

        await tick(); // Wait for DOM to update

        // Cascade animation: habits appear top-to-bottom
        // UNITY: DOTween Sequence with .SetDelay() per item
        const cards = timelineEl?.querySelectorAll(".habit-card");
        if (cards) {
            gsap.set(cards, { opacity: 0, y: 20, scale: 0.9 });
            gsap.to(cards, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.5,
                stagger: 0.06,
                ease: "back.out(1.2)",
                onComplete: () => {
                    cascading = false;
                    scrollToNow();
                },
            });
        }

        // In Variant B, auto-expand current window
        if ($layoutVariant === "b") {
            expandedWindowId = currentWindowId;
        }
    }

    function scrollToNow() {
        if (!timelineEl || !nowLineEl) return;
        const containerRect = timelineEl.getBoundingClientRect();
        const nowRect = nowLineEl.getBoundingClientRect();
        const scrollTarget =
            timelineEl.scrollTop +
            (nowRect.top - containerRect.top) -
            containerRect.height / 2;

        // UNITY: ScrollRect.DOVerticalNormalizedPos(pos, 0.5f).SetEase(Ease.OutQuad)
        gsap.to(timelineEl, {
            scrollTop: Math.max(0, scrollTarget),
            duration: 0.5,
            ease: "power2.out",
        });
    }

    function handleToggleHabit(habitId, event) {
        if (!$loadoutLocked) {
            // Edit mode: Remove habit
            activeHabits.update((list) => list.filter((h) => h.id !== habitId));
            completedHabits.update((set) => {
                const next = new Set(set);
                next.delete(habitId);
                return next;
            });
            return;
        }

        const wasCompleted = $completedHabits.has(habitId);
        toggleHabit(habitId);

        if (!wasCompleted) {
            if (window.showToast) window.showToast("+10 XP", "⚡");
            
            if (event && event.currentTarget) {
                flyXP(event.currentTarget, 10);
            } else {
                addXP(10);
            }

            // Check if all active habits complete
            const totalActive = $activeHabits.length;
            const nowDone = $completedHabits.size + 1; // +1 because store hasn't updated yet in this frame
            if (nowDone >= totalActive && totalActive > 0) {
                setTimeout(() => {
                    if (window.spawnConfetti)
                        window.spawnConfetti("achievement");
                    if (window.showToast)
                        window.showToast("All habits complete! 🎉", "🏆");
                    addXP(50);
                }, 300);
            }
        }
    }

    function toggleWindow(windowId) {
        if ($layoutVariant === "a") {
            // Accordion: tap to expand/collapse
            expandedWindowId = expandedWindowId === windowId ? null : windowId;
        } else if ($layoutVariant === "b") {
            // Time-aware: tap to override auto-expand
            expandedWindowId = expandedWindowId === windowId ? null : windowId;
        }
        // Variant C has no expand/collapse
    }

    function isWindowExpanded(windowId) {
        if ($layoutVariant === "c") return true; // always expanded in dual-column
        if (expandedWindowId === windowId) return true;
        if ($layoutVariant === "b" && expandedWindowId === null) {
            return windowId === currentWindowId;
        }
        return false;
    }

    function isWindowPast(windowId) {
        const w = energyWindows.find((w) => w.id === windowId);
        if (!w) return false;
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        return nowMins >= timeToMinutes(w.end);
    }

    function getNowPosition() {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }

    // Reactive: now position for the "now" indicator
    const nowMinutes = getNowPosition();
</script>

<div class="screen habits-screen">
    {#if $activeHabits.length === 0}
        <!-- ── Loadout Selection ── -->
        <div class="loadout-selection">
            <h2 class="greeting">Good morning 🌤️</h2>
            <p class="subtitle">Pick a loadout to start your day</p>

            <div class="loadout-grid">
                {#each loadoutTemplates as template}
                    <button
                        class="loadout-card glass-card"
                        onclick={() => handleSelectLoadout(template.id)}
                    >
                        <div class="loadout-name">{template.name}</div>
                        <div class="loadout-desc">{template.description}</div>
                        <div class="loadout-count">
                            {template.habits.length} HABITS
                        </div>
                        <!-- Mini timeline preview -->
                        <div class="mini-timeline">
                            <svg viewBox="0 0 120 40" class="mini-curve">
                                <path
                                    d="M 0,35 Q 15,35 25,20 T 50,8 T 75,25 T 100,10 T 120,30"
                                    fill="none"
                                    stroke="rgba(82,172,255,0.3)"
                                    stroke-width="1.5"
                                />
                                {#each template.habits as hId, i}
                                    <circle
                                        cx={10 +
                                            (i * 110) /
                                                Math.max(
                                                    template.habits.length - 1,
                                                    1,
                                                )}
                                        cy={25 - Math.sin(i * 0.8) * 12}
                                        r="3"
                                        fill="#52ACFF"
                                        opacity="0.7"
                                    />
                                {/each}
                            </svg>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    {:else}
        <!-- ── Vertical Scrollable Timeline ── -->
        <div
            class="timeline"
            class:variant-c={$layoutVariant === "c"}
            bind:this={timelineEl}
        >
            <div class="loadout-controls">
                <button
                    class="lock-loadout-btn"
                    class:locked={$loadoutLocked}
                    onclick={() => loadoutLocked.set(!$loadoutLocked)}
                >
                    <span class="lock-icon">{$loadoutLocked ? "🔒" : "🔓"}</span>
                    <span>{$loadoutLocked ? "Loadout Locked" : "Lock Loadout"}</span>
                </button>
                {#if !$loadoutLocked}
                    <button class="clear-loadout-btn" onclick={clearLoadout}>
                        Change
                    </button>
                {/if}
            </div>
            {#each energyWindows as window}
                {@const wHabits = $habitsByWindow[window.id] || []}
                {@const wEvents =
                    $eventsByWindow?.[window.id] ||
                    calendarEvents.filter((e) => e.window === window.id)}
                {@const wCombined = [...wHabits.map(h => ({type: 'habit', item: h, time: timeToMinutes(h.time)})), ...wEvents.map(e => ({type: 'event', item: e, time: timeToMinutes(e.time)}))].sort((a,b) => a.time - b.time)}
                {@const stats = $windowCompletion[window.id] || {
                    total: 0,
                    done: 0,
                    percent: 0,
                }}
                {@const expanded = isWindowExpanded(window.id)}
                {@const past = isWindowPast(window.id)}

                <div
                    class="window-section"
                    class:expanded
                    class:past
                    style="--window-color: {window.borderColor}; --window-bg: {window.bgTint};"
                    bind:this={windowRefs[window.id]}
                >
                    <!-- Window Header -->
                    <button
                        class="window-header"
                        onclick={() => toggleWindow(window.id)}
                    >
                        <div class="window-time">
                            {formatTime(window.start)}
                        </div>
                        <div class="window-label">
                            <span class="window-name">{window.label}</span>
                            <span class="window-emoji">{window.emoji}</span>
                        </div>
                        {#if celebrationBanners[window.id] === 'badge'}
                            <div class="window-celebration-badge">
                                {stats.done}/{stats.total} ✓
                            </div>
                        {:else if stats.total > 0}
                            <div class="window-progress">
                                <span class="progress-text"
                                    >{stats.done}/{stats.total}</span
                                >
                            </div>
                        {/if}
                        {#if $layoutVariant !== "c"}
                            <span class="expand-icon" class:rotated={expanded}
                                >›</span
                            >
                        {/if}
                    </button>

                    {#if expanded && celebrationBanners[window.id] === 'show'}
                        <div class="section-celebration-banner">
                            <div class="banner-title">✨ {window.label} Complete</div>
                            <div class="banner-subtitle">{stats.total}/{stats.total} · +30 XP</div>
                        </div>
                    {/if}

                    {#if $layoutVariant === "c"}
                        <!-- ── Variant C: Dual Column ── -->
                        <div class="dual-columns">
                            <div class="col-habits">
                                {#each wHabits as habit}
                                    <button
                                        class="habit-card"
                                        class:completed={$completedHabits.has(
                                            habit.id,
                                        )}
                                        onclick={(e) =>
                                            handleToggleHabit(habit.id, e)}
                                    >
                                        <span class="habit-icon"
                                            >{habit.icon}</span
                                        >
                                        <span class="habit-name"
                                            >{habit.name}</span
                                        >
                                        <span class="habit-check"
                                            >{$completedHabits.has(habit.id)
                                                ? "✓"
                                                : ""}</span
                                        >
                                    </button>
                                {/each}
                            </div>
                            <div class="col-events">
                                {#each wEvents as evt}
                                    <div class="calendar-event">
                                        <div class="event-time">
                                            {formatTime(evt.time)}
                                        </div>
                                        <div class="event-title">
                                            {evt.title}
                                        </div>
                                        <div class="event-duration">
                                            {evt.duration} min
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {:else if expanded}
                        <!-- ── Variants A & B: Expanded ── -->
                        <div class="window-content expanded-content">
                            {#each wCombined as timelineItem}
                                {#if timelineItem.type === 'habit'}
                                    {@const habit = timelineItem.item}
                                    {#if isFastingHabit(habit) && ($fastingState === "active" || $fastingState === "starting")}
                                        <!-- Fasting habit with mini ring -->
                                        <button
                                            class="habit-card fasting-active"
                                            onclick={openFastingOverlay}
                                        >
                                            <span class="habit-time mono"
                                                >{formatTime(habit.time)}</span
                                            >
                                            <span class="fasting-mini-ring">
                                                <svg
                                                    width="28"
                                                    height="28"
                                                    viewBox="0 0 28 28"
                                                >
                                                    <circle
                                                        cx="14"
                                                        cy="14"
                                                        r="11"
                                                        fill="none"
                                                        stroke="rgba(255,179,71,0.15)"
                                                        stroke-width="2.5"
                                                    />
                                                    <circle
                                                        cx="14"
                                                        cy="14"
                                                        r="11"
                                                        fill="none"
                                                        stroke={$fastingColor}
                                                        stroke-width="2.5"
                                                        stroke-linecap="round"
                                                        stroke-dasharray={2 *
                                                            Math.PI *
                                                            11}
                                                        stroke-dashoffset={2 *
                                                            Math.PI *
                                                            11 *
                                                            (1 - $fastingProgress)}
                                                        transform="rotate(-90 14 14)"
                                                        style="transition: stroke-dashoffset 1s linear;"
                                                    />
                                                </svg>
                                            </span>
                                            <span class="habit-name"
                                                >{habit.name}</span
                                            >
                                            <span class="fasting-view-label"
                                                >View Timer ▶</span
                                            >
                                        </button>
                                    {:else}
                                        <button
                                            class="habit-card"
                                            class:completed={$completedHabits.has(
                                                habit.id,
                                            )}
                                            onclick={(e) =>
                                                handleToggleHabit(habit.id, e)}
                                        >
                                            <span class="habit-time mono"
                                                >{formatTime(habit.time)}</span
                                            >
                                            <span class="habit-icon"
                                                >{habit.icon}</span
                                            >
                                            <span class="habit-name"
                                                >{habit.name}</span
                                            >
                                            <span class="habit-check"
                                                >{!$loadoutLocked 
                                                    ? "✕" 
                                                    : $completedHabits.has(habit.id) ? "✓" : ""}</span
                                            >
                                        </button>
                                    {/if}
                                {:else if timelineItem.type === 'event'}
                                    {@const evt = timelineItem.item}
                                    <div class="calendar-event">
                                        <div class="event-left-strip"></div>
                                        <div class="event-body">
                                            <div class="event-title">
                                                {evt.title}
                                            </div>
                                            <div class="event-meta">
                                                {formatTime(evt.time)} · {evt.duration} min
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            {/each}

                            {#if !$loadoutLocked}
                                <!-- Add habit button -->
                                <button
                                    class="add-habit-btn"
                                    onclick={() => {
                                        addHabitWindow = window.id;
                                    }}
                                >
                                    <span>+</span> Add habit
                                </button>
                            {/if}
                        </div>
                    {:else}
                        <!-- ── Variants A & B: Compressed ── -->
                        <div class="window-content compressed-content">
                            {#if $layoutVariant === "b" && past}
                                <!-- Past: show icons with checkmarks -->
                                <div class="compact-row">
                                    {#each wHabits as habit}
                                        <span
                                            class="compact-icon"
                                            class:done={$completedHabits.has(
                                                habit.id,
                                            )}
                                        >
                                            {habit.icon}{#if $completedHabits.has(habit.id)}<span
                                                    class="mini-check">✓</span
                                                >{/if}
                                        </span>
                                    {/each}
                                    {#if stats.total > 0}
                                        <span class="compact-summary"
                                            >{stats.done}/{stats.total}</span
                                        >
                                    {/if}
                                </div>
                            {:else}
                                <!-- Future or Variant A: show icon preview -->
                                <div class="compact-row">
                                    {#each wHabits as habit}
                                        <span class="compact-icon"
                                            >{habit.icon}</span
                                        >
                                    {/each}
                                    {#each wEvents as evt}
                                        <span class="compact-event"
                                            >📅{evt.title.split(" ")[0]}</span
                                        >
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}

                    <!-- ── NOW indicator (if current time is in this window) ── -->
                    {#if !isWindowPast(window.id) && timeToMinutes(window.start) <= nowMinutes && nowMinutes < timeToMinutes(window.end)}
                        <div class="now-indicator" bind:this={nowLineEl}>
                            <div class="now-dot"></div>
                            <div class="now-line"></div>
                            <span class="now-label">NOW</span>
                        </div>
                    {/if}
                </div>
            {/each}

            <!-- End of day -->
            <div class="end-of-day">
                <span class="eod-time">{formatTime("22:30")}</span>
                <span class="eod-label">End of day</span>
            </div>

            <!-- Lock-in Card Bridge -->
            {#if lockInCardVisible && !$dayLockedIn}
                {@const wVals = Object.values($windowCompletion)}
                {@const tDone = wVals.reduce((sum, w) => sum + w.done, 0)}
                {@const tTotal = wVals.reduce((sum, w) => sum + w.total, 0)}
                <div class="lock-in-card" bind:this={lockInCardRef}>
                    <h3>🔒 You crushed it.</h3>
                    <p class="lock-info">
                        {tDone}/{tTotal} habits done · 🔥 Day {$user.loginStreak} streak
                    </p>
                    <button class="lock-in-btn" 
                        onpointerdown={startLockInHold} 
                        onpointerup={stopLockInHold} 
                        onpointerleave={stopLockInHold}
                    >
                        <div class="lock-progress" bind:this={lockInProgressBar}></div>
                        <span class="lock-text">Hold to Lock In (+250 XP)</span>
                    </button>
                </div>
            {:else if $dayLockedIn}
                <div class="day-complete-summary">
                    <h3>Day Locked In 🔒</h3>
                    <p>Great job! Rest and recover for tomorrow.</p>
                </div>
            {:else if nowMinutes >= timeToMinutes('22:30')}
                <div class="lock-in-card partial">
                    <h3>Ready to wrap up?</h3>
                    <p class="lock-info">Still a solid day.</p>
                    <button class="lock-in-btn manual" onclick={handlePartialLockIn}>
                        Lock in what I've done
                    </button>
                </div>
            {/if}
        </div>
    {/if}

    <!-- ── Add Habit Bottom Sheet ── -->
    {#if addHabitWindow}
        {@const availableHabits = getAvailableHabits(addHabitWindow)}
        {@const windowLabel =
            energyWindows.find((w) => w.id === addHabitWindow)?.label || ""}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="bottom-sheet-backdrop"
            onclick={() => {
                addHabitWindow = null;
            }}
        >
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="bottom-sheet" onclick={(e) => e.stopPropagation()}>
                <div class="sheet-handle"></div>
                <h3 class="sheet-title">Add to {windowLabel}</h3>
                {#if availableHabits.length === 0}
                    <p class="sheet-empty">
                        All habits for this window are already on your timeline.
                    </p>
                {:else}
                    <div class="sheet-habits">
                        {#each availableHabits as habit}
                            <button
                                class="sheet-habit-card glass-card"
                                onclick={() => addHabitToTimeline(habit)}
                            >
                                <span class="habit-icon">{habit.icon}</span>
                                <span class="habit-name">{habit.name}</span>
                                <span class="sheet-add">+</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .screen {
        height: 100%;
        padding-top: var(--header-height);
    }

    /* ── Loadout Selection ── */
    .loadout-selection {
        padding: 8px 20px 40px;
        overflow-y: auto;
        height: 100%;
    }

    .greeting {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.3px;
        margin-bottom: 4px;
    }

    .subtitle {
        font-size: 15px;
        color: var(--color-text-secondary);
        margin-bottom: 20px;
    }

    .loadout-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .loadout-card {
        padding: 16px;
        text-align: left;
        cursor: pointer;
        font-family: var(--font-family);
        color: var(--color-text-primary);
        transition:
            border-color 0.2s ease,
            transform 0.15s ease;
    }

    .loadout-card:active {
        transform: scale(0.97);
    }

    .loadout-name {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 4px;
    }

    .loadout-desc {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin-bottom: 6px;
    }

    .loadout-count {
        font-size: 10px;
        font-weight: 600;
        color: var(--color-text-muted);
        letter-spacing: 1px;
        margin-bottom: 8px;
    }

    .mini-timeline {
        height: 40px;
    }

    .mini-curve {
        width: 100%;
        height: 100%;
    }

    /* ── Vertical Timeline ── */
    .timeline {
        height: 100%;
        overflow-y: auto;
        padding-bottom: calc(var(--tab-bar-height) + 20px);
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    .timeline::-webkit-scrollbar {
        display: none;
    }

    .loadout-controls {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 20px 20px;
    }

    .lock-loadout-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        color: var(--color-text-primary);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .lock-loadout-btn.locked {
        background: rgba(82, 172, 255, 0.15);
        border-color: rgba(82, 172, 255, 0.4);
        color: #52ACFF;
    }

    .clear-loadout-btn {
        padding: 10px 16px;
        background: none;
        border: 1px solid rgba(255, 107, 107, 0.3);
        color: #ff6b6b;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
    }

    /* ── Window Section ── */
    .window-section {
        position: relative;
        border-left: 3px solid var(--window-color);
        background: var(--window-bg);
        margin-left: 16px;
        padding: 0 16px 0 20px;
        transition:
            background 0.3s ease,
            border-color 0.3s ease;
    }

    .window-section.past {
        opacity: 0.6;
    }

    .window-section.expanded {
        opacity: 1;
    }

    /* ── Window Header (tap target) ── */
    .window-header {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 14px 0;
        background: none;
        border: none;
        cursor: pointer;
        font-family: var(--font-family);
        color: var(--color-text-primary);
        -webkit-tap-highlight-color: transparent;
    }

    .window-time {
        font-size: 11px;
        font-weight: 500;
        color: var(--color-text-muted);
        font-variant-numeric: tabular-nums;
        min-width: 60px;
    }

    .window-label {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
    }

    .window-name {
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .window-emoji {
        font-size: 14px;
    }

    .window-progress {
        padding: 2px 8px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 8px;
    }

    .progress-text {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-secondary);
        font-variant-numeric: tabular-nums;
    }

    .expand-icon {
        font-size: 18px;
        color: var(--color-text-muted);
        transition: transform 0.25s ease;
        transform: rotate(0deg);
    }

    .expand-icon.rotated {
        transform: rotate(90deg);
    }

    /* ── Expanded Content ── */
    .expanded-content {
        padding-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    /* ── Habit Card ── */
    .habit-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        cursor: pointer;
        font-family: var(--font-family);
        color: var(--color-text-primary);
        transition:
            background 0.2s ease,
            border-color 0.2s ease,
            transform 0.15s ease;
        -webkit-tap-highlight-color: transparent;
        width: 100%;
        text-align: left;
    }

    .habit-card:active {
        transform: scale(0.98);
    }

    .habit-card.completed {
        background: rgba(82, 172, 255, 0.08);
        border-color: rgba(82, 172, 255, 0.2);
    }

    .habit-time {
        font-size: 11px;
        color: var(--color-text-muted);
        min-width: 52px;
    }

    .habit-icon {
        font-size: 18px;
    }

    .habit-name {
        font-size: 14px;
        font-weight: 500;
        flex: 1;
    }

    .habit-check {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-accent);
        min-width: 20px;
        text-align: center;
    }

    /* ── Calendar Event ── */
    .calendar-event {
        display: flex;
        align-items: stretch;
        gap: 0;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        overflow: hidden;
    }

    .event-left-strip {
        width: 3px;
        background: var(--color-accent);
        flex-shrink: 0;
    }

    .event-body {
        padding: 10px 14px;
    }

    .event-title {
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 2px;
    }

    .event-meta,
    .event-time,
    .event-duration {
        font-size: 11px;
        color: var(--color-text-muted);
    }

    /* ── Compressed Content ── */
    .compressed-content {
        padding-bottom: 10px;
    }

    .compact-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .compact-icon {
        font-size: 16px;
        position: relative;
        opacity: 0.7;
    }

    .compact-icon.done {
        opacity: 1;
    }

    .mini-check {
        position: absolute;
        bottom: -4px;
        right: -6px;
        font-size: 10px;
        color: var(--color-accent);
    }

    .compact-summary {
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-muted);
        margin-left: auto;
    }

    .compact-event {
        font-size: 11px;
        color: var(--color-text-muted);
        padding: 2px 6px;
        background: rgba(82, 172, 255, 0.08);
        border-radius: 6px;
    }

    /* ── NOW Indicator ── */
    .now-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 12px 0 12px -24px;
        position: relative;
    }

    .now-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-accent);
        box-shadow: 0 0 10px var(--color-accent-glow);
        animation: nowPulse 2s ease-in-out infinite;
        flex-shrink: 0;
    }

    .now-line {
        flex: 1;
        height: 2px;
        background: linear-gradient(90deg, var(--color-accent), transparent);
    }

    .now-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: var(--color-accent);
    }

    @keyframes nowPulse {
        0%,
        100% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.4);
            opacity: 0.6;
        }
    }

    /* ── End of Day ── */
    .end-of-day {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 0 14px 36px;
        color: var(--color-text-muted);
        font-size: 12px;
    }

    .eod-time {
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        min-width: 60px;
    }

    .eod-label {
        font-size: 13px;
        font-weight: 500;
    }

    /* ── Variant C: Dual Column ── */
    .variant-c .window-section {
        margin-left: 0;
        border-left: none;
    }

    .dual-columns {
        display: grid;
        grid-template-columns: 1fr 120px;
        gap: 8px;
        padding-bottom: 12px;
    }

    .col-habits {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .col-events {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .col-events .calendar-event {
        flex-direction: column;
        padding: 8px 10px;
    }

    .col-events .event-left-strip {
        display: none;
    }

    .variant-c .habit-card .habit-time {
        display: none;
    }

    .variant-c .now-indicator {
        margin-left: 0;
    }

    /* ── Fasting Mini Ring ── */
    .habit-card.fasting-active {
        background: rgba(255, 179, 71, 0.08);
        border-color: rgba(255, 179, 71, 0.25);
    }

    .fasting-mini-ring {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .fasting-view-label {
        font-size: 11px;
        font-weight: 600;
        color: #ffb347;
        white-space: nowrap;
    }

    /* ── Add Habit Button ── */
    .add-habit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px;
        background: none;
        border: 1px dashed rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        color: var(--color-text-muted);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        font-family: var(--font-family);
        transition: all 0.2s ease;
    }

    .add-habit-btn:active {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(82, 172, 255, 0.3);
        color: var(--color-accent);
    }

    .add-habit-btn span {
        font-size: 16px;
        font-weight: 600;
    }

    /* ── Bottom Sheet ── */
    .bottom-sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 300;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .bottom-sheet {
        width: 100%;
        max-width: 500px;
        background: var(--color-surface, #1a1a2e);
        border-radius: 20px 20px 0 0;
        padding: 12px 20px calc(var(--tab-bar-height, 72px) + 24px);
        max-height: 60vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
        from {
            transform: translateY(100%);
        }
        to {
            transform: translateY(0);
        }
    }

    .sheet-handle {
        width: 36px;
        height: 4px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
        margin: 0 auto 16px;
    }

    .sheet-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin-bottom: 16px;
    }

    .sheet-empty {
        font-size: 14px;
        color: var(--color-text-muted);
        text-align: center;
        padding: 20px 0;
    }

    .sheet-habits {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .sheet-habit-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        cursor: pointer;
        font-family: var(--font-family);
        color: var(--color-text-primary);
        transition: all 0.2s ease;
    }

    .sheet-habit-card:active {
        background: rgba(82, 172, 255, 0.1);
    }

    .sheet-add {
        margin-left: auto;
        font-size: 18px;
        font-weight: 600;
        color: var(--color-accent);
    }

    /* ── Section Celebrations ── */
    .section-celebration-banner {
        background: rgba(255, 215, 0, 0.15);
        border: 1px solid rgba(255, 215, 0, 0.4);
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 12px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(255, 215, 0, 0.1);
    }
    .banner-title {
        font-size: 15px;
        font-weight: 700;
        color: #FFD700;
        margin-bottom: 2px;
    }
    .banner-subtitle {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
    }
    .window-celebration-badge {
        background: rgba(255, 215, 0, 0.2);
        color: #FFD700;
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        margin-left: 8px;
    }

    /* ── Lock-In Bridge ── */
    .lock-in-card {
        margin: 20px 16px 40px;
        background: linear-gradient(145deg, rgba(82, 172, 255, 0.1) 0%, rgba(82, 172, 255, 0.02) 100%);
        border: 1px solid rgba(82, 172, 255, 0.3);
        border-radius: 24px;
        padding: 24px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .lock-in-card.partial {
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.1);
    }
    .lock-in-card h3 {
        font-size: 22px;
        font-weight: 700;
        margin: 0 0 8px;
        color: var(--color-text-primary);
    }
    .lock-info {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin: 0 0 24px;
    }
    .lock-in-btn {
        position: relative;
        width: 100%;
        height: 56px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 28px;
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-primary);
        font-family: var(--font-family);
        transition: transform 0.1s ease;
    }
    .lock-in-btn:active {
        transform: scale(0.98);
    }
    .lock-in-btn.manual:active {
        background: rgba(255, 255, 255, 0.15);
    }
    .lock-progress {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 0%;
        background: linear-gradient(90deg, #52ACFF, #0077FF);
        z-index: 1;
    }
    .lock-text {
        position: relative;
        z-index: 2;
        font-size: 16px;
        font-weight: 600;
    }
    .day-complete-summary {
        margin: 20px 16px 40px;
        padding: 24px;
        text-align: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .day-complete-summary h3 {
        font-size: 20px;
        margin: 0 0 8px;
    }
    .day-complete-summary p {
        font-size: 14px;
        color: var(--color-text-muted);
        margin: 0;
    }
</style>
