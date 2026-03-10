<script>
    import TabBar from "./TabBar.svelte";
    import FAB from "./FAB.svelte";
    import Header from "./Header.svelte";
    import Toast from "./Toast.svelte";
    import Confetti from "./Confetti.svelte";
    import FastingTool from "../tools/FastingTool.svelte";
    import HomeScreen from "../screens/HomeScreen.svelte";
    import HabitsScreen from "../screens/HabitsScreen.svelte";
    import HistoryScreen from "../screens/HistoryScreen.svelte";
    import ProfileScreen from "../screens/ProfileScreen.svelte";
    import BreathingScreen from "../screens/BreathingScreen.svelte";
    import SettingsSheet from "./SettingsSheet.svelte";
    import FocusTimer from "../tools/FocusTimer.svelte";
    import {
        activeTab,
        activeOverlay,
        activeBottomSheet,
        direction,
    } from "./stores/navigation.js";
    import { onMount } from "svelte";
    import gsap from "gsap";

    let screenContainer;
    let prevTab = $activeTab;

    // Screen crossfade on tab change
    $effect(() => {
        const current = $activeTab;
        if (current !== prevTab && screenContainer) {
            // UNITY: CanvasGroup.DOFade() on both panels
            gsap.fromTo(
                screenContainer,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: "power2.out" },
            );
            prevTab = current;
        }
    });

    // Ambient background glow
    onMount(() => {
        // Subtle living background
    });
</script>

<div class="shell">
    <!-- Ambient background -->
    <div class="ambient-bg">
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>
    </div>

    <!-- Header (hidden when breathing screen uses its own) -->
    {#if $activeTab !== "breathing"}
        <Header />
    {/if}

    <!-- Screen Area -->
    <div class="screen-area" bind:this={screenContainer}>
        {#if $activeTab === "home" && $direction === 1}
            <HomeScreen />
        {:else if $activeTab === "habits"}
            <HabitsScreen />
        {:else if $activeTab === "history"}
            <HistoryScreen />
        {:else if $activeTab === "profile"}
            <ProfileScreen />
        {:else if $activeTab === "breathing"}
            <BreathingScreen />
        {:else}
            <HabitsScreen />
        {/if}
    </div>

    <!-- FAB -->
    <FAB />

    <!-- Tab Bar -->
    <TabBar />

    <!-- Toast System -->
    <Toast />

    <!-- Confetti System -->
    <Confetti />

    <!-- Fasting Tool Overlay -->
    {#if $activeOverlay === "fasting"}
        <FastingTool />
    {/if}

    <!-- Focus Timer Overlay -->
    {#if $activeOverlay === "focus"}
        <FocusTimer />
    {/if}

    <!-- Bottom Sheets -->
    {#if $activeBottomSheet === "settings"}
        <SettingsSheet />
    {/if}
</div>

<style>
    .shell {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: var(--color-bg);
    }

    .ambient-bg {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
    }

    .glow {
        position: absolute;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.08;
    }

    .glow-1 {
        width: 300px;
        height: 300px;
        background: var(--color-accent);
        top: -100px;
        right: -100px;
        animation: glow-drift-1 20s ease-in-out infinite;
    }

    .glow-2 {
        width: 250px;
        height: 250px;
        background: var(--color-midday);
        bottom: 20%;
        left: -80px;
        animation: glow-drift-2 25s ease-in-out infinite;
    }

    @keyframes glow-drift-1 {
        0%,
        100% {
            transform: translate(0, 0);
        }
        50% {
            transform: translate(-30px, 40px);
        }
    }

    @keyframes glow-drift-2 {
        0%,
        100% {
            transform: translate(0, 0);
        }
        50% {
            transform: translate(20px, -30px);
        }
    }

    .screen-area {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: var(--tab-bar-height);
        overflow-y: auto;
        overflow-x: hidden;
        z-index: 1;
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .screen-area::-webkit-scrollbar {
        display: none;
    }
</style>
