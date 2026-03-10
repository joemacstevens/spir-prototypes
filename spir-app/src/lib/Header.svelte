<script>
    import { activeTab, direction, activeBottomSheet } from "./stores/navigation.js";
    import { user } from "./stores/user.js";
    import gsap from "gsap";

    let xpEl;

    // Header content varies per screen
    const screenConfigs = {
        home: { left: "date", center: "", right: "xp" },
        habits: { left: "date", center: "", right: "xp" },
        routine: { left: "title:Routine", center: "", right: "" },
        profile: { left: "title:Profile", center: "", right: "settings" },
        breathing: { left: "back", center: "title:Breathwork", right: "" },
    };

    function getDateString() {
        const d = new Date();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
    }

    function formatXP(xp) {
        return xp.toLocaleString();
    }

    // Pulse XP counter when XP changes
    export function pulseXP() {
        if (xpEl) {
            // UNITY: DOScale(1.2f, 0.15f).SetLoops(2, LoopType.Yoyo)
            gsap.to(xpEl, {
                scale: 1.15,
                duration: 0.15,
                yoyo: true,
                repeat: 1,
            });
        }
    }
</script>

<header class="header">
    <div class="header-content">
        <!-- Left -->
        <div class="header-left">
            {#if screenConfigs[$activeTab]?.left === "date"}
                <span class="date-text">{getDateString()}</span>
            {:else if screenConfigs[$activeTab]?.left?.startsWith("title:")}
                <span class="header-title"
                    >{screenConfigs[$activeTab].left.replace(
                        "title:",
                        "",
                    )}</span
                >
            {:else if screenConfigs[$activeTab]?.left === "back"}
                <button
                    class="header-btn"
                    onclick={() =>
                        activeTab.set($direction === 1 ? "home" : "habits")}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
            {/if}
        </div>

        <!-- Center -->
        <div class="header-center">
            {#if screenConfigs[$activeTab]?.center?.startsWith("title:")}
                <span class="header-title"
                    >{screenConfigs[$activeTab].center.replace(
                        "title:",
                        "",
                    )}</span
                >
            {/if}
        </div>

        <!-- Right -->
        <div class="header-right">
            {#if screenConfigs[$activeTab]?.right === "xp"}
                <div class="xp-counter header-xp-counter" bind:this={xpEl}>
                    <span class="xp-icon">⚡</span>
                    <span class="xp-value mono"
                        >{formatXP($user.totalXP)} XP</span
                    >
                </div>
            {:else if screenConfigs[$activeTab]?.right === "settings"}
                <button class="header-btn" onclick={() => activeBottomSheet.set('settings')}>
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <circle cx="12" cy="12" r="3" /><path
                            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                        />
                    </svg>
                </button>
            {/if}
        </div>
    </div>
</header>

<style>
    .header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: var(--header-height);
        z-index: 90;
        pointer-events: none;
    }

    .header-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        height: 44px;
        margin-top: var(--safe-area-top);
        pointer-events: auto;
    }

    .header-left,
    .header-right {
        display: flex;
        align-items: center;
        min-width: 80px;
    }

    .header-right {
        justify-content: flex-end;
    }

    .header-center {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
    }

    .date-text {
        font-size: 15px;
        font-weight: 600;
        color: var(--color-text-secondary);
    }

    .header-title {
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.2px;
        color: var(--color-text-primary);
    }

    .xp-counter {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .xp-icon {
        font-size: 14px;
    }

    .xp-value {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-primary);
    }

    .header-btn {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: var(--color-text-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
