<script>
    /**
     * BreathingScreen.svelte — Ported from standalone breathing-module/index.html
     * Full-featured breathing session: selection → countdown → animation → summary
     *
     * UNITY: Maps to BreathworkPanel.cs (CanvasGroup, DOTween, AudioSource)
     */
    import { onMount, onDestroy, tick } from "svelte";
    import gsap from "gsap";
    import { MotionPathPlugin } from "gsap/MotionPathPlugin";
    import { activeTab } from "../lib/stores/navigation.js";
    import { addXP } from "../lib/stores/user.js";

    gsap.registerPlugin(MotionPathPlugin);

    // ── SCREEN STATE ──
    let currentScreen = $state("selection"); // 'selection' | 'animation' | 'summary'
    let currentModeIndex = $state(0);

    // ── ANIMATION STATE ──
    let isPlaying = $state(false);
    let phase = $state("READY");
    let cycleCount = $state(0);
    let xpProgress = $state(0); // 0-5 cycles toward next XP set
    let sessionStartTime = $state(null);
    let sessionTotalXP = $state(0);
    let phaseTimer = $state("");

    // ── REFS ──
    let containerEl;
    let circleEl;
    let glowEl;
    let particleCanvas;
    let countdownEl;
    let countdownNumEl;
    let countdownLabelEl;
    let selectionEl;
    let animationEl;
    let summaryEl;
    let carouselTrackEl;
    let carouselContainerEl;
    let cardEls = [];
    let patternVizTweens = {};
    let carouselDragStart = 0;
    let carouselDragOffset = 0;
    let isDraggingCarousel = false;

    // ── ABORT ──
    let breathingAbortController = null;
    let timerInterval = null;
    let particleCtx = null;
    let particleAnimFrame = null;
    let particles = [];
    let currentPhaseForParticles = "IDLE";

    // ── DATA ──
    const BREATHING_MODES = [
        {
            name: "4-7-8 Breathing",
            timings: [4, 7, 8, 0],
            phases: ["INHALE", "HOLD", "EXHALE", "HOLD"],
            ringsUsed: [true, true, true, false],
            isHuberman: false,
            isPremium: true,
            color: "#52ACFF",
            timing: "4s · 7s · 8s",
            desc: "Inhale 4s, hold 7s, exhale 8s. Calms the nervous system and promotes sleep.",
        },
        {
            name: "Box Breathing",
            timings: [4, 4, 4, 4],
            phases: ["INHALE", "HOLD", "EXHALE", "HOLD"],
            ringsUsed: [true, true, true, true],
            isHuberman: false,
            isPremium: true,
            color: "#7C6FFF",
            timing: "4s · 4s · 4s · 4s",
            desc: "Equal inhale, hold, exhale, hold. Used by Navy SEALs for calm focus.",
        },
        {
            name: "Huberman Sigh",
            timings: [1, 1, 3, 7],
            phases: ["INHALE", "HOLD", "INHALE", "EXHALE"],
            ringsUsed: [true, true, true, true],
            isHuberman: true,
            isPremium: true,
            color: "#FF6B6B",
            timing: "1s · 1s · 3s · 7s",
            desc: "Double inhale + long exhale. Fastest known way to reduce stress in real-time.",
        },
        {
            name: "Resonant Breathing",
            timings: [5, 0, 5, 0],
            phases: ["INHALE", "HOLD", "EXHALE", "HOLD"],
            ringsUsed: [true, false, true, false],
            isHuberman: false,
            isPremium: false,
            color: "#00FA3A",
            timing: "5s · 5s",
            desc: "Equal inhale and exhale at ~5.5 breaths/min. Optimizes heart rate variability.",
        },
    ];

    const PHASE_COLORS = {
        INHALE: "#52ACFF",
        HOLD: "#EFF7FF",
        EXHALE: "#00FA3A",
    };

    const RING_CIRCUMFERENCES = [
        2 * Math.PI * 105,
        2 * Math.PI * 95,
        2 * Math.PI * 85,
        2 * Math.PI * 75,
    ];

    // ── SOUND ENGINE (Web Audio API) ──
    let audioCtx = null;
    let masterGain = null;
    let soundInitialized = false;

    function initSound() {
        if (soundInitialized) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.6;
            masterGain.connect(audioCtx.destination);
            soundInitialized = true;
        } catch (e) {
            /* Web Audio not available */
        }
    }

    function playBell(freq = 528, duration = 0.8, volume = 0.3) {
        if (!soundInitialized) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + duration);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    function playHarmonicBell(baseFreq = 528, duration = 1.2, volume = 0.25) {
        [1, 2, 3, 5.04].forEach((h, i) => {
            playBell(
                baseFreq * h,
                duration * (1 - i * 0.15),
                volume * [1, 0.3, 0.15, 0.08][i],
            );
        });
    }

    function playWhoosh(rising = true, duration = 2, volume = 0.12) {
        if (!soundInitialized) return;
        const now = audioCtx.currentTime;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(
            1,
            bufferSize,
            audioCtx.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++)
            data[i] = (Math.random() * 2 - 1) * 0.5;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 2;
        if (rising) {
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(800, now + duration);
        } else {
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + duration);
        }
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + duration * 0.3);
        gain.gain.linearRampToValueAtTime(0, now + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        noise.stop(now + duration);
    }

    function playClick(pitch = 1) {
        if (!soundInitialized) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(800 * pitch, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    function playPhaseSound(phaseName, duration) {
        if (phaseName === "INHALE") {
            playWhoosh(true, Math.min(duration, 3), 0.1);
            playBell(396, 0.6, 0.15);
        } else if (phaseName === "EXHALE") {
            playWhoosh(false, Math.min(duration, 3), 0.08);
            playBell(264, 0.6, 0.12);
        } else if (phaseName === "HOLD") {
            playBell(528, 0.4, 0.08);
        }
    }

    // ── HAPTIC ──
    function triggerHaptic(type) {
        if (!navigator.vibrate) return;
        switch (type) {
            case "INHALE":
            case "EXHALE":
                navigator.vibrate(50);
                break;
            case "COUNTDOWN":
                navigator.vibrate(30);
                break;
            case "CYCLE_COMPLETE":
                navigator.vibrate([50, 50, 50]);
                break;
        }
    }

    // ── PHASE TIMER ──
    function startPhaseTimer(duration) {
        clearInterval(timerInterval);
        if (duration <= 0) {
            phaseTimer = "";
            return;
        }
        let remaining = duration;
        phaseTimer = String(remaining);
        timerInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(timerInterval);
                phaseTimer = "";
            } else {
                phaseTimer = String(remaining);
            }
        }, 1000);
    }

    function stopPhaseTimer() {
        clearInterval(timerInterval);
        phaseTimer = "";
    }

    // ── UTILITY ──
    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    // ── CAROUSEL ──
    const CARD_WIDTH = 280;
    const CARD_GAP = 16;
    const CARD_TOTAL = CARD_WIDTH + CARD_GAP;

    function selectMode(index) {
        initSound();
        playClick();
        currentModeIndex = index;
        updateCarousel(true);
    }

    function updateCarousel(animate = true) {
        if (!carouselTrackEl) return;
        const offset = -currentModeIndex * CARD_TOTAL;
        if (animate) {
            gsap.to(carouselTrackEl, {
                x: offset,
                duration: 0.4,
                ease: "power2.out",
            });
        } else {
            gsap.set(carouselTrackEl, { x: offset });
        }

        cardEls.forEach((card, i) => {
            if (!card) return;
            if (i === currentModeIndex) {
                gsap.to(card, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.4,
                    ease: "power2.out",
                });
                if (patternVizTweens[i]) {
                    patternVizTweens[i].dotTl.play();
                    patternVizTweens[i].maskTl.play();
                }
            } else {
                gsap.to(card, {
                    scale: 0.88,
                    opacity: 0.4,
                    duration: 0.4,
                    ease: "power2.out",
                });
                if (patternVizTweens[i]) {
                    patternVizTweens[i].dotTl.pause();
                    patternVizTweens[i].maskTl.pause();
                }
            }
        });
    }

    function handleCarouselPointerDown(e) {
        initSound();
        isDraggingCarousel = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        carouselDragStart = clientX;
        carouselDragOffset = -currentModeIndex * CARD_TOTAL;
        if (!e.touches) e.preventDefault();
    }

    function handleCarouselPointerMove(e) {
        if (!isDraggingCarousel || !carouselTrackEl) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const diff = clientX - carouselDragStart;
        gsap.set(carouselTrackEl, { x: carouselDragOffset + diff });
    }

    function handleCarouselPointerUp(e) {
        if (!isDraggingCarousel) return;
        isDraggingCarousel = false;
        const clientX = e.changedTouches
            ? e.changedTouches[0].clientX
            : e.clientX;
        const diff = clientX - carouselDragStart;
        if (Math.abs(diff) > 60) {
            if (diff < 0 && currentModeIndex < BREATHING_MODES.length - 1)
                currentModeIndex++;
            if (diff > 0 && currentModeIndex > 0) currentModeIndex--;
        }
        updateCarousel(true);
    }

    // ── PATTERN WAVE VISUALIZERS ──
    async function initPatternVisualizers() {
        await tick();
        const vizEls = document.querySelectorAll(".pattern-viz");
        vizEls.forEach((viz, i) => {
            const mode = BREATHING_MODES[i];
            if (!mode) return;

            const svg = viz.querySelector(".wave-svg");
            const pathLine = viz.querySelector(".wave-path");
            const pathFill = viz.querySelector(".wave-path-fill");
            const dot = viz.querySelector(".glow-dot");
            if (!svg || !pathLine || !dot) return;

            const w = 260,
                h = 80;
            svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

            const padding = 4;
            const bottomY = h * 0.85;
            const topY = h * 0.15;
            const accentColor = mode.color;
            const totalDuration = mode.timings.reduce((a, b) => a + b, 0);

            pathLine.style.stroke = accentColor;
            if (pathFill) {
                pathFill.style.stroke = accentColor;
                pathFill.style.fill = accentColor;
                pathFill.style.fillOpacity = "0.15";
            }
            dot.style.boxShadow = `0 0 10px 2px ${accentColor}80`;

            const PREVIEW_DURATION = 4.0;
            const tl = gsap.timeline({ repeat: -1 });
            const maskTl = gsap.timeline({ repeat: -1 });

            // Clip-path for progressive fill reveal
            const defs = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "defs",
            );
            const clipPath = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "clipPath",
            );
            clipPath.setAttribute("id", `reveal-mask-${i}`);
            const clipRect = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "rect",
            );
            clipRect.setAttribute("x", "0");
            clipRect.setAttribute("y", "0");
            clipRect.setAttribute("width", "0");
            clipRect.setAttribute("height", String(h));
            clipPath.appendChild(clipRect);
            defs.appendChild(clipPath);
            svg.prepend(defs);
            if (pathFill)
                pathFill.setAttribute("clip-path", `url(#reveal-mask-${i})`);

            // Generate SVG path — 2 full cycles
            let d = `M ${padding} ${bottomY} `;
            let fillD = `M ${padding} ${bottomY} `;
            let cumX = padding;
            const cycleWidth = (w - padding * 2) / 2;
            let cumMaskW = padding;

            for (let cycle = 0; cycle < 2; cycle++) {
                for (let s = 0; s < 4; s++) {
                    const phaseDur = mode.timings[s];
                    if (phaseDur <= 0) continue;
                    const phaseType = mode.phases[s];
                    const phaseFrac = phaseDur / totalDuration;
                    const segW = phaseFrac * cycleWidth;
                    const endX = cumX + segW;

                    let startY, endY;
                    if (phaseType === "INHALE") {
                        startY = bottomY;
                        endY = topY;
                    } else if (phaseType === "EXHALE") {
                        startY = topY;
                        endY = bottomY;
                    } else {
                        const prevType =
                            s > 0 ? mode.phases[s - 1] : mode.phases[3];
                        startY = prevType === "INHALE" ? topY : bottomY;
                        endY = startY;
                    }

                    if (phaseType === "HOLD") {
                        d += `L ${endX} ${endY} `;
                        fillD += `L ${endX} ${endY} `;
                    } else {
                        const cp = segW * 0.4;
                        d += `C ${cumX + cp} ${startY}, ${endX - cp} ${endY}, ${endX} ${endY} `;
                        fillD += `C ${cumX + cp} ${startY}, ${endX - cp} ${endY}, ${endX} ${endY} `;
                    }

                    const previewPhaseDur = phaseFrac * (PREVIEW_DURATION / 2);
                    cumMaskW += segW;
                    maskTl.to(clipRect, {
                        attr: { width: cumMaskW },
                        duration: previewPhaseDur,
                        ease: phaseType === "HOLD" ? "none" : "power2.inOut",
                    });
                    cumX = endX;
                }
            }

            pathLine.setAttribute("d", d);
            fillD += `L ${cumX} ${bottomY} Z`;
            if (pathFill) pathFill.setAttribute("d", fillD);

            const pathId = `wave-line-${i}`;
            pathLine.setAttribute("id", pathId);

            gsap.set(dot, { x: 0, y: 0 });
            tl.to(
                dot,
                {
                    duration: PREVIEW_DURATION,
                    ease: "none",
                    motionPath: {
                        path: `#${pathId}`,
                        align: `#${pathId}`,
                        alignOrigin: [0.5, 0.5],
                    },
                },
                0,
            );

            patternVizTweens[i] = { dotTl: tl, maskTl: maskTl };

            // Only play the active card's animation
            if (i !== currentModeIndex) {
                tl.pause();
                maskTl.pause();
            }
        });

        // Entrance animation
        playSelectionEntrance();
    }

    function playSelectionEntrance() {
        cardEls.forEach((card, i) => {
            if (!card) return;
            gsap.fromTo(
                card,
                { opacity: 0, y: 30, scale: 0.92 },
                {
                    opacity: i === currentModeIndex ? 1 : 0.4,
                    y: 0,
                    scale: i === currentModeIndex ? 1 : 0.88,
                    duration: 0.5,
                    delay: 0.15 + i * 0.08,
                    ease: "back.out(1.2)",
                },
            );
        });
    }

    function cleanupVizTweens() {
        Object.values(patternVizTweens).forEach((t) => {
            t.dotTl.kill();
            t.maskTl.kill();
        });
        patternVizTweens = {};
    }

    // Re-init visualizers when selection screen is shown
    $effect(() => {
        if (currentScreen === "selection") {
            initPatternVisualizers();
        }
    });

    // ── COUNTDOWN ──
    async function runCountdown() {
        if (!countdownEl) return;
        countdownEl.style.display = "flex";
        gsap.set(countdownEl, { opacity: 1 });
        gsap.to(countdownLabelEl, { opacity: 1, duration: 0.3 });

        for (let n = 3; n >= 1; n--) {
            if (countdownNumEl) countdownNumEl.textContent = n;
            playHarmonicBell({ 3: 440, 2: 523, 1: 659 }[n] || 440, 0.8, 0.2);
            triggerHaptic("COUNTDOWN");

            gsap.fromTo(
                countdownNumEl,
                { opacity: 0, scale: 0.5 },
                { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.5)" },
            );
            await sleep(700);

            gsap.to(countdownNumEl, {
                opacity: 0,
                scale: 1.5,
                duration: 0.25,
                ease: "power2.in",
            });
            await sleep(300);
        }

        gsap.to(countdownLabelEl, { opacity: 0, duration: 0.2 });
        gsap.to(countdownEl, {
            opacity: 0,
            duration: 0.4,
            onComplete: () => {
                if (countdownEl) countdownEl.style.display = "none";
            },
        });
    }

    // ── PARTICLE SYSTEM ──
    function initParticles() {
        if (!particleCanvas) return;
        const container = particleCanvas.parentElement;
        particleCanvas.width = container.offsetWidth;
        particleCanvas.height = container.offsetHeight;
        particleCtx = particleCanvas.getContext("2d");
        particles = [];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: particleCanvas.width / 2 + (Math.random() - 0.5) * 80,
                y: particleCanvas.height / 2 + (Math.random() - 0.5) * 80,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.4 + 0.1,
                baseAlpha: Math.random() * 0.4 + 0.1,
            });
        }
    }

    function updateParticles() {
        if (!particleCtx) return;
        particleCtx.clearRect(
            0,
            0,
            particleCanvas.width,
            particleCanvas.height,
        );
        const cx = particleCanvas.width / 2;
        const cy = particleCanvas.height / 2;

        particles.forEach((p) => {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            if (currentPhaseForParticles === "INHALE") {
                p.vx += -Math.cos(angle) * 0.02;
                p.vy += -Math.sin(angle) * 0.02;
                p.alpha = Math.min(p.baseAlpha + 0.2, 0.7);
            } else if (currentPhaseForParticles === "EXHALE") {
                p.vx += Math.cos(angle) * 0.03;
                p.vy += Math.sin(angle) * 0.03;
                p.alpha = p.baseAlpha;
            } else {
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.alpha += (p.baseAlpha - p.alpha) * 0.05;
            }

            p.vx *= 0.97;
            p.vy *= 0.97;
            p.x += p.vx;
            p.y += p.vy;
            if (dist > 140) {
                p.vx -= Math.cos(angle) * 0.05;
                p.vy -= Math.sin(angle) * 0.05;
            }
            if (dist < 30) {
                p.vx += Math.cos(angle) * 0.03;
                p.vy += Math.sin(angle) * 0.03;
            }

            let color = "255, 255, 255";
            if (currentPhaseForParticles === "INHALE") color = "82, 172, 255";
            else if (currentPhaseForParticles === "EXHALE")
                color = "0, 250, 58";
            else if (currentPhaseForParticles === "HOLD")
                color = "200, 220, 255";

            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            particleCtx.fillStyle = `rgba(${color}, ${p.alpha})`;
            particleCtx.fill();
        });

        particleAnimFrame = requestAnimationFrame(updateParticles);
    }

    function startParticles() {
        if (!particleCtx) initParticles();
        updateParticles();
    }

    function stopParticles() {
        if (particleAnimFrame) cancelAnimationFrame(particleAnimFrame);
        currentPhaseForParticles = "IDLE";
        if (particleCtx)
            particleCtx.clearRect(
                0,
                0,
                particleCanvas.width,
                particleCanvas.height,
            );
    }

    // ── BREATHING ENGINE ──
    function animatePhase(
        phaseName,
        duration,
        ringIndex,
        color,
        scaleUp,
        signal,
    ) {
        return new Promise((resolve, reject) => {
            if (signal.aborted) {
                reject(new Error("aborted"));
                return;
            }
            if (duration <= 0) {
                resolve();
                return;
            }

            phase = phaseName;
            currentPhaseForParticles = phaseName;
            triggerHaptic(phaseName);
            playPhaseSound(phaseName, duration);
            startPhaseTimer(duration);

            const tl = gsap.timeline({
                onComplete: () => {
                    if (!signal.aborted) resolve();
                },
            });

            if (circleEl) {
                if (
                    scaleUp &&
                    (phaseName === "INHALE" || phaseName === "EXHALE")
                ) {
                    const scaleTarget = phaseName === "INHALE" ? 2.2 : 1;
                    tl.to(
                        circleEl,
                        { scale: scaleTarget, duration, ease: "sine.inOut" },
                        0,
                    );
                    if (glowEl) {
                        tl.to(
                            glowEl,
                            {
                                scale: scaleTarget * 1.6,
                                opacity: phaseName === "INHALE" ? 0.6 : 0.15,
                                duration,
                                ease: "sine.inOut",
                            },
                            0,
                        );
                    }
                }
                tl.to(
                    circleEl,
                    {
                        backgroundColor: color,
                        duration: 1,
                        ease: "power1.inOut",
                    },
                    0,
                );
            }

            // Progress ring
            const ringEl = document.querySelector(
                `#ring-${ringIndex} .ring-progress`,
            );
            if (ringEl) {
                const circ = RING_CIRCUMFERENCES[ringIndex];
                tl.fromTo(
                    ringEl,
                    { strokeDashoffset: circ },
                    { strokeDashoffset: 0, duration, ease: "none" },
                    0,
                );
            }

            const onAbort = () => {
                tl.kill();
                reject(new Error("aborted"));
            };
            signal.addEventListener("abort", onAbort, { once: true });
            tl.eventCallback("onComplete", () => {
                signal.removeEventListener("abort", onAbort);
                if (!signal.aborted) resolve();
            });
        });
    }

    async function runBreathingCycle(mode, signal) {
        const [inhale, hold1, exhale, hold2] = mode.timings;
        const colors = [
            PHASE_COLORS.INHALE,
            PHASE_COLORS.HOLD,
            PHASE_COLORS.EXHALE,
            PHASE_COLORS.HOLD,
        ];
        resetProgress();
        await animatePhase("INHALE", inhale, 0, colors[0], true, signal);
        if (hold1 > 0)
            await animatePhase("HOLD", hold1, 1, colors[1], false, signal);
        await animatePhase("EXHALE", exhale, 2, colors[2], true, signal);
        if (hold2 > 0)
            await animatePhase("HOLD", hold2, 3, colors[3], false, signal);
    }

    async function runHubermanCycle(mode, signal) {
        const [inhale1, hold, inhale2, exhale] = mode.timings;
        resetProgress();
        await animatePhase(
            "INHALE",
            inhale1,
            0,
            PHASE_COLORS.INHALE,
            true,
            signal,
        );
        await animatePhase("HOLD", hold, 1, PHASE_COLORS.HOLD, false, signal);
        await animatePhase(
            "INHALE",
            inhale2,
            2,
            PHASE_COLORS.INHALE,
            true,
            signal,
        );
        await animatePhase(
            "EXHALE",
            exhale,
            3,
            PHASE_COLORS.EXHALE,
            true,
            signal,
        );
    }

    async function startBreathingLoop() {
        const mode = BREATHING_MODES[currentModeIndex];
        const controller = new AbortController();
        breathingAbortController = controller;

        try {
            while (!controller.signal.aborted) {
                if (mode.isHuberman) {
                    await runHubermanCycle(mode, controller.signal);
                } else {
                    await runBreathingCycle(mode, controller.signal);
                }

                cycleCount++;
                playHarmonicBell(528, 1.5, 0.2);
                triggerHaptic("CYCLE_COMPLETE");

                const progressStep = ((cycleCount - 1) % 5) + 1;
                xpProgress = progressStep;

                if (progressStep >= 5) {
                    sessionTotalXP += 5;
                    playBell(880, 0.3, 0.15);
                    setTimeout(() => playBell(1100, 0.3, 0.12), 100);
                    await sleep(600);
                    if (controller.signal.aborted) break;
                    xpProgress = 0;
                }
            }
        } catch (e) {
            if (e.message !== "aborted") console.error(e);
        }
    }

    function resetProgress() {
        const ringEls = document.querySelectorAll(".ring-progress");
        ringEls.forEach((ring, i) => {
            gsap.killTweensOf(ring);
            gsap.set(ring, { strokeDashoffset: RING_CIRCUMFERENCES[i] });
        });
    }

    // ── CONTROLS ──
    async function togglePlay() {
        initSound();

        if (!isPlaying) {
            isPlaying = true;
            if (!sessionStartTime) sessionStartTime = Date.now();

            await runCountdown();
            if (!isPlaying) return;

            // Session start arpeggio
            [264, 330, 396, 528].forEach((freq, i) => {
                setTimeout(() => playBell(freq, 1.0 - i * 0.15, 0.18), i * 120);
            });

            startParticles();
            startBreathingLoop();
        } else {
            stopBreathing();
            playClick(0.7);
        }
    }

    function stopBreathing() {
        isPlaying = false;

        if (breathingAbortController) {
            breathingAbortController.abort();
            breathingAbortController = null;
        }

        if (circleEl) {
            gsap.killTweensOf(circleEl);
            gsap.to(circleEl, { scale: 1, duration: 0.5, ease: "power2.out" });
            gsap.to(circleEl, { backgroundColor: "#FFFFFF", duration: 0.5 });
        }
        if (glowEl) gsap.to(glowEl, { scale: 1, opacity: 0.3, duration: 0.5 });

        stopParticles();
        stopPhaseTimer();
        resetProgress();
        phase = "READY";
    }

    // ── SCREEN TRANSITIONS ──
    function goToAnimation() {
        initSound();
        playClick(1.2);
        cleanupVizTweens();
        cycleCount = 0;
        xpProgress = 0;
        sessionStartTime = null;
        sessionTotalXP = 0;
        phase = "READY";
        currentScreen = "animation";
    }

    function goToSelection() {
        const completed = cycleCount;
        stopBreathing();

        if (completed > 0) {
            goToSummary(completed);
            return;
        }

        cycleCount = 0;
        xpProgress = 0;
        sessionStartTime = null;
        sessionTotalXP = 0;
        currentScreen = "selection";
        playClick(0.8);
    }

    function goToSummary(completed) {
        // Session end sound
        playHarmonicBell(396, 2.0, 0.25);
        setTimeout(() => playBell(528, 1.5, 0.15), 400);

        // Award XP to global store
        if (sessionTotalXP > 0) addXP(sessionTotalXP);

        currentScreen = "summary";

        // Animate summary elements after mount
        setTimeout(() => {
            const tl = gsap.timeline({ delay: 0.2 });
            tl.to(
                ".summary-emoji",
                { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" },
                0,
            );
            tl.to(
                ".summary-title",
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
                0.15,
            );
            tl.to(
                ".summary-subtitle",
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
                0.25,
            );
            tl.to(
                ".stat-card",
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    ease: "power2.out",
                    stagger: 0.1,
                },
                0.35,
            );
            tl.to(
                ".xp-celebration",
                { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" },
                0.8,
            );
            tl.to(
                ".summary-btn",
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.4,
                    ease: "power2.out",
                    stagger: 0.08,
                },
                1.2,
            );
        }, 50);
    }

    function returnToSelection() {
        cycleCount = 0;
        xpProgress = 0;
        sessionStartTime = null;
        sessionTotalXP = 0;
        currentScreen = "selection";
        playClick(0.8);
    }

    function restartSession() {
        cycleCount = 0;
        xpProgress = 0;
        sessionStartTime = null;
        sessionTotalXP = 0;
        phase = "READY";
        currentScreen = "animation";
        playClick(1.2);
    }

    function goBack() {
        if (currentScreen === "animation") {
            goToSelection();
        } else if (currentScreen === "summary") {
            returnToSelection();
        } else {
            // Back to previous tab (home)
            activeTab.set("home");
        }
    }

    // ── COMPUTED ──
    let currentMode = $derived(BREATHING_MODES[currentModeIndex]);

    let sessionDuration = $derived(() => {
        if (!sessionStartTime) return "0:00";
        const s = Math.round((Date.now() - sessionStartTime) / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    });

    let summaryData = $derived(() => {
        const s = sessionStartTime
            ? Math.round((Date.now() - sessionStartTime) / 1000)
            : 0;
        const min = Math.floor(s / 60);
        const sec = s % 60;
        const avg = cycleCount > 0 ? Math.round(s / cycleCount) : 0;
        let emoji, title, subtitle;
        if (cycleCount >= 10) {
            emoji = "✨";
            title = "Amazing Session";
            subtitle = "You're mastering your breath";
        } else if (cycleCount >= 5) {
            emoji = "🌟";
            title = "Great Work";
            subtitle = "A solid breathing session";
        } else if (cycleCount >= 3) {
            emoji = "🌿";
            title = "Well Done";
            subtitle = "Every breath counts";
        } else {
            emoji = "🙏";
            title = "Good Start";
            subtitle = "Keep building the habit";
        }
        return {
            emoji,
            title,
            subtitle,
            time: `${min}:${String(sec).padStart(2, "0")}`,
            avg: avg + "s",
            cycles: cycleCount,
            xp: sessionTotalXP,
        };
    });

    // ── LIFECYCLE ──
    onDestroy(() => {
        stopBreathing();
        stopParticles();
        stopPhaseTimer();
    });
</script>

<div class="screen breathing-screen" bind:this={containerEl}>
    <!-- ═══════════════════════════════════════════
         SELECTION SCREEN
         ═══════════════════════════════════════════ -->
    {#if currentScreen === "selection"}
        <div class="br-screen" bind:this={selectionEl}>
            <div class="br-header">
                <button class="br-back-btn" onclick={goBack}>
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <span class="br-header-title">Breathwork</span>
            </div>

            <div class="selection-content">
                <div class="selection-hero">
                    <h1>Choose Your Breath</h1>
                    <p>Select a breathing pattern to begin your session</p>
                </div>

                <!-- Carousel -->
                <div
                    class="carousel-container"
                    bind:this={carouselContainerEl}
                    onmousedown={handleCarouselPointerDown}
                    onmousemove={handleCarouselPointerMove}
                    onmouseup={handleCarouselPointerUp}
                    onmouseleave={handleCarouselPointerUp}
                    ontouchstart={handleCarouselPointerDown}
                    ontouchmove={handleCarouselPointerMove}
                    ontouchend={handleCarouselPointerUp}
                >
                    <div class="carousel-track" bind:this={carouselTrackEl}>
                        {#each BREATHING_MODES as mode, i}
                            <div
                                class="mode-card"
                                class:active={currentModeIndex === i}
                                bind:this={cardEls[i]}
                                onclick={() => selectMode(i)}
                            >
                                <div class="pattern-viz" data-mode={i}>
                                    <svg
                                        class="wave-svg"
                                        preserveAspectRatio="none"
                                    >
                                        <path class="wave-path" />
                                        <path class="wave-path-fill" />
                                    </svg>
                                    <div class="glow-dot"></div>
                                </div>
                                <h2>{mode.name}</h2>
                                <div class="timing-label">{mode.timing}</div>
                                <p class="mode-description">{mode.desc}</p>
                                {#if mode.isPremium}
                                    <span class="mode-tag premium">Premium</span
                                    >
                                {:else}
                                    <span class="mode-tag free">Free</span>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Dot indicators -->
                <div class="dots-container">
                    {#each BREATHING_MODES as _, i}
                        <button
                            class="dot"
                            class:active={currentModeIndex === i}
                            onclick={() => selectMode(i)}
                        ></button>
                    {/each}
                </div>

                <div class="start-section">
                    <button class="start-btn" onclick={goToAnimation}>
                        Start Session
                    </button>
                </div>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════
         ANIMATION SCREEN
         ═══════════════════════════════════════════ -->
    {:else if currentScreen === "animation"}
        <div class="br-screen" bind:this={animationEl}>
            <div class="br-header">
                <button class="br-back-btn" onclick={goBack}>
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <span class="br-header-title">{currentMode.name}</span>
            </div>

            <!-- Countdown Overlay -->
            <div
                class="countdown-overlay"
                bind:this={countdownEl}
                style="display: none;"
            >
                <div class="countdown-number" bind:this={countdownNumEl}>3</div>
                <div class="countdown-label" bind:this={countdownLabelEl}>
                    Get ready
                </div>
            </div>

            <div class="breathing-visual">
                <div class="circle-container">
                    <!-- Progress Rings -->
                    {#each [105, 95, 85, 75] as r, i}
                        {#if currentMode.ringsUsed[i]}
                            <svg
                                class="progress-ring-svg ring-{i}"
                                viewBox="0 0 240 240"
                                id="ring-{i}"
                            >
                                <circle
                                    class="ring-track"
                                    cx="120"
                                    cy="120"
                                    {r}
                                    stroke-width="3"
                                />
                                <circle
                                    class="ring-progress"
                                    cx="120"
                                    cy="120"
                                    {r}
                                    stroke-width="3"
                                    stroke-dasharray={2 * Math.PI * r}
                                    stroke-dashoffset={2 * Math.PI * r}
                                />
                            </svg>
                        {/if}
                    {/each}

                    <div class="glow-layer" bind:this={glowEl}></div>
                    <div class="breathing-circle" bind:this={circleEl}>
                        <span class="circle-timer">{phaseTimer}</span>
                    </div>
                    <canvas class="particle-canvas" bind:this={particleCanvas}
                    ></canvas>
                </div>

                <div class="status-text">{phase}</div>
                {#if cycleCount > 0}
                    <div class="cycle-counter">x{cycleCount}</div>
                {/if}
            </div>

            <!-- XP Progress -->
            <div class="xp-section">
                <div class="xp-bar-container">
                    <div
                        class="xp-bar-fill"
                        style="width: {(xpProgress / 5) * 100}%"
                    ></div>
                </div>
                <div class="xp-label-row">
                    <span class="xp-text">+5xp</span>
                    <span class="xp-set-label">{xpProgress} / 5 cycles</span>
                </div>
            </div>

            <!-- Controls -->
            <div class="controls-section">
                <button
                    class="play-btn"
                    class:playing={isPlaying}
                    onclick={togglePlay}
                >
                    {#if isPlaying}
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <rect x="5" y="3" width="5" height="18" rx="1" />
                            <rect x="14" y="3" width="5" height="18" rx="1" />
                        </svg>
                    {:else}
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <polygon points="6,3 20,12 6,21" />
                        </svg>
                    {/if}
                </button>
                <button class="control-btn end-btn" onclick={goToSelection}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════
         SUMMARY SCREEN
         ═══════════════════════════════════════════ -->
    {:else if currentScreen === "summary"}
        <div class="br-screen">
            <div class="br-header">
                <button class="br-back-btn" onclick={returnToSelection}>
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <span class="br-header-title">Session Complete</span>
            </div>

            <div class="summary-content">
                <div
                    class="summary-emoji"
                    style="opacity:0; transform: scale(0.5)"
                >
                    {summaryData().emoji}
                </div>
                <div
                    class="summary-title"
                    style="opacity:0; transform: translateY(10px)"
                >
                    {summaryData().title}
                </div>
                <div
                    class="summary-subtitle"
                    style="opacity:0; transform: translateY(10px)"
                >
                    {summaryData().subtitle}
                </div>

                <div class="summary-stats">
                    <div
                        class="stat-card"
                        style="opacity:0; transform: translateY(16px)"
                    >
                        <div class="stat-icon">🔄</div>
                        <div class="stat-value accent">
                            {summaryData().cycles}
                        </div>
                        <div class="stat-label">Cycles</div>
                    </div>
                    <div
                        class="stat-card"
                        style="opacity:0; transform: translateY(16px)"
                    >
                        <div class="stat-icon">⏱️</div>
                        <div class="stat-value">{summaryData().time}</div>
                        <div class="stat-label">Duration</div>
                    </div>
                    <div
                        class="stat-card"
                        style="opacity:0; transform: translateY(16px)"
                    >
                        <div class="stat-icon">💫</div>
                        <div class="stat-value" style="font-size: 18px;">
                            {currentMode.name}
                        </div>
                        <div class="stat-label">Pattern</div>
                    </div>
                    <div
                        class="stat-card"
                        style="opacity:0; transform: translateY(16px)"
                    >
                        <div class="stat-icon">🎯</div>
                        <div class="stat-value green">{summaryData().avg}</div>
                        <div class="stat-label">Per Cycle</div>
                    </div>
                </div>

                <!-- XP Celebration -->
                <div
                    class="xp-celebration"
                    style="opacity:0; transform: scale(0.6)"
                >
                    <div class="xp-label-earned">XP EARNED</div>
                    <div class="xp-count-number">
                        <span class="xp-plus">+</span>{summaryData().xp ||
                            summaryData().cycles}<span class="xp-suffix"
                            >XP</span
                        >
                    </div>
                    <div class="xp-session-label">
                        {summaryData().xp > 0
                            ? "earned this session"
                            : "progress toward next reward"}
                    </div>
                </div>
            </div>

            <div class="summary-actions">
                <button
                    class="summary-btn primary"
                    style="opacity:0; transform: translateY(10px)"
                    onclick={restartSession}>Breathe Again</button
                >
                <button
                    class="summary-btn secondary"
                    style="opacity:0; transform: translateY(10px)"
                    onclick={returnToSelection}>Done</button
                >
            </div>
        </div>
    {/if}
</div>

<style>
    .screen {
        height: 100%;
        overflow-y: auto;
        position: relative;
    }

    .br-screen {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    /* ── HEADER ── */
    .br-header {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: var(--header-height);
        padding-top: var(--safe-area-top, 0px);
        display: flex;
        align-items: center;
        padding-left: 16px;
        padding-right: 16px;
        z-index: 100;
    }

    .br-back-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.2s;
    }

    .br-back-btn:active {
        transform: scale(0.92);
    }

    .br-header-title {
        flex: 1;
        text-align: center;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 0.5px;
        margin-right: 36px;
    }

    /* ── SELECTION ── */
    .selection-content {
        padding: calc(var(--header-height) + 8px) 0
            calc(var(--tab-bar-height) + 12px);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        height: 100%;
    }

    .selection-hero {
        text-align: center;
        padding: 0 20px 4px;
    }
    .selection-hero h1 {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
        margin-bottom: 4px;
    }
    .selection-hero p {
        font-size: 13px;
        color: var(--color-text-secondary);
    }

    /* Carousel */
    .carousel-container {
        display: flex;
        align-items: center;
        overflow: hidden;
        position: relative;
        width: 100%;
        flex: 1;
        min-height: 0;
    }

    .carousel-track {
        display: flex;
        gap: 16px;
        padding: 0 calc((100% - 280px) / 2);
        touch-action: pan-y;
        will-change: transform;
    }

    .mode-card {
        flex-shrink: 0;
        width: 280px;
        background: var(--color-card-bg, rgba(255, 255, 255, 0.06));
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 20px 24px 20px;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        cursor: pointer;
        user-select: none;
        opacity: 0;
        transform: translateY(30px) scale(0.92);
        font-family: var(--font-family);
        color: var(--color-text-primary);
        border: none;
    }

    .mode-card.active {
        border-color: rgba(82, 172, 255, 0.3);
        transform: scale(1);
        opacity: 1;
    }

    .mode-card:not(.active) {
        transform: scale(0.88);
        opacity: 0.4;
    }

    /* Pattern visualizer */
    .pattern-viz {
        width: 100%;
        height: 80px;
        border-radius: 14px;
        background: rgba(0, 0, 0, 0.2);
        margin-bottom: 14px;
        overflow: hidden;
        position: relative;
    }

    .pattern-viz :global(.wave-svg) {
        width: 100%;
        height: 100%;
        display: block;
        position: absolute;
        top: 0;
        left: 0;
    }

    .pattern-viz :global(.wave-path) {
        fill: none;
        stroke-width: 2;
        stroke-opacity: 0.4;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .pattern-viz :global(.wave-path-fill) {
        fill: none;
        stroke-width: 2;
        stroke-opacity: 0.4;
    }

    .pattern-viz :global(.glow-dot) {
        position: absolute;
        top: 85%;
        left: 0;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ffffff;
        transform: translate(-50%, -50%);
        pointer-events: none;
    }

    .mode-card h2 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 3px;
        letter-spacing: -0.2px;
    }

    .timing-label {
        font-size: 13px;
        color: var(--color-accent);
        font-weight: 500;
        margin-bottom: 8px;
        letter-spacing: 1px;
    }

    .mode-description {
        font-size: 12px;
        color: var(--color-text-secondary);
        line-height: 1.5;
    }

    .mode-tag {
        display: inline-block;
        margin-top: 10px;
        padding: 3px 10px;
        border-radius: 100px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .mode-tag.free {
        background: rgba(0, 250, 58, 0.1);
        color: #00fa3a;
    }
    .mode-tag.premium {
        background: rgba(82, 172, 255, 0.1);
        color: #52acff;
    }

    /* Dot indicators */
    .dots-container {
        display: flex;
        justify-content: center;
        gap: 8px;
        padding: 10px 0;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        padding: 0;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .dot.active {
        background: rgba(255, 255, 255, 0.8);
        width: 24px;
        border-radius: 4px;
    }

    /* Start section */
    .start-section {
        padding: 4px 32px 0;
        width: 100%;
    }

    .start-btn {
        width: 100%;
        height: 52px;
        border-radius: 16px;
        border: none;
        background: linear-gradient(135deg, #52acff, #3d8be0);
        color: white;
        font-family: var(--font-family);
        font-size: 17px;
        font-weight: 600;
        letter-spacing: 0.5px;
        cursor: pointer;
        box-shadow: 0 4px 24px rgba(82, 172, 255, 0.25);
        transition: transform 0.15s ease;
        position: relative;
        overflow: hidden;
    }

    .start-btn:active {
        transform: scale(0.97);
    }

    .start-btn::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%
        );
        pointer-events: none;
    }

    /* ── COUNTDOWN ── */
    .countdown-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 200;
        background: var(--color-bg, #0a0a1a);
    }

    .countdown-number {
        font-size: 120px;
        font-weight: 200;
        color: var(--color-accent);
        opacity: 0;
        text-shadow: 0 0 60px rgba(82, 172, 255, 0.4);
    }

    .countdown-label {
        position: absolute;
        bottom: 200px;
        font-size: 15px;
        font-weight: 500;
        color: var(--color-text-secondary);
        letter-spacing: 2px;
        text-transform: uppercase;
        opacity: 0;
    }

    /* ── BREATHING VISUAL ── */
    .breathing-visual {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        padding-top: calc(var(--header-height) + 16px);
    }

    .circle-container {
        position: relative;
        width: 240px;
        height: 240px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .glow-layer {
        position: absolute;
        width: 240px;
        height: 240px;
        border-radius: 50%;
        background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(255, 255, 255, 0.05) 40%,
            transparent 70%
        );
        opacity: 0.3;
        pointer-events: none;
    }

    .breathing-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: #ffffff;
        position: absolute;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 40px rgba(255, 255, 255, 0.2);
        transition: box-shadow 0.8s ease;
    }

    .circle-timer {
        font-size: 20px;
        font-weight: 300;
        color: rgba(0, 0, 0, 0.5);
        font-variant-numeric: tabular-nums;
    }

    .particle-canvas {
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    }

    .progress-ring-svg {
        position: absolute;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
    }

    .ring-track {
        fill: none;
        stroke: rgba(255, 255, 255, 0.06);
    }
    .ring-progress {
        fill: none;
        stroke-linecap: round;
    }

    :global(.ring-0 .ring-progress) {
        stroke: #52acff;
    }
    :global(.ring-1 .ring-progress) {
        stroke: #eff7ff;
    }
    :global(.ring-2 .ring-progress) {
        stroke: #00fa3a;
    }
    :global(.ring-3 .ring-progress) {
        stroke: #eff7ff;
    }

    .status-text {
        margin-top: 40px;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 6px;
        text-transform: uppercase;
        min-height: 30px;
    }

    .cycle-counter {
        font-size: 15px;
        font-weight: 500;
        color: var(--color-text-secondary);
        margin-top: 8px;
    }

    /* ── XP Section ── */
    .xp-section {
        width: 100%;
        padding: 0 40px;
        margin-bottom: 20px;
    }

    .xp-bar-container {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 3px;
        overflow: hidden;
    }

    .xp-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--color-accent), #7dd3fc);
        border-radius: 3px;
        transition: width 0.5s ease;
    }

    .xp-label-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
    }

    .xp-text {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-accent);
    }
    .xp-set-label {
        font-size: 11px;
        color: var(--color-text-muted);
    }

    /* ── Controls ── */
    .controls-section {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 28px;
        padding-bottom: calc(var(--tab-bar-height) + 16px);
    }

    .play-btn {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #52acff, #3d8be0);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 30px rgba(82, 172, 255, 0.3);
        transition: transform 0.15s ease;
    }

    .play-btn:active {
        transform: scale(0.93);
    }

    .play-btn.playing {
        background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.12),
            rgba(255, 255, 255, 0.06)
        );
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .control-btn {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.06);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .control-btn:active {
        transform: scale(0.9);
    }

    /* ── SUMMARY ── */
    .summary-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: calc(var(--header-height) + 16px) 24px 0;
        width: 100%;
    }

    .summary-emoji {
        font-size: 36px;
        margin-bottom: 6px;
    }
    .summary-title {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
        margin-bottom: 2px;
    }
    .summary-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-bottom: 20px;
    }

    .summary-stats {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 16px;
    }

    .stat-card {
        background: var(--color-card-bg, rgba(255, 255, 255, 0.06));
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 14px 12px;
        text-align: center;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    }

    .stat-icon {
        font-size: 18px;
        margin-bottom: 4px;
    }
    .stat-value {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
        margin-bottom: 2px;
    }
    .stat-value.accent {
        color: var(--color-accent);
    }
    .stat-value.green {
        color: #00fa3a;
    }
    .stat-label {
        font-size: 12px;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 500;
    }

    .xp-celebration {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 0 12px;
        margin-bottom: 8px;
    }

    .xp-label-earned {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 3px;
        color: var(--color-accent);
        margin-bottom: 4px;
    }

    .xp-count-number {
        font-size: 56px;
        font-weight: 700;
        color: white;
        letter-spacing: -2px;
        line-height: 1;
        text-shadow: 0 0 30px rgba(82, 172, 255, 0.4);
    }

    .xp-plus {
        font-weight: 400;
        color: var(--color-accent);
        font-size: 40px;
    }
    .xp-suffix {
        font-size: 28px;
        font-weight: 600;
        color: var(--color-accent);
        margin-left: 4px;
        letter-spacing: 2px;
    }
    .xp-session-label {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
    }

    .summary-actions {
        width: 100%;
        padding: 0 24px calc(var(--tab-bar-height) + 12px);
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .summary-btn {
        width: 100%;
        border-radius: 14px;
        border: none;
        font-family: var(--font-family);
        cursor: pointer;
        transition: transform 0.15s ease;
    }

    .summary-btn:active {
        transform: scale(0.97);
    }

    .summary-btn.primary {
        height: 50px;
        background: linear-gradient(135deg, #52acff, #3d8be0);
        color: white;
        font-size: 17px;
        font-weight: 600;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 24px rgba(82, 172, 255, 0.25);
    }

    .summary-btn.secondary {
        height: 44px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--color-text-secondary);
        font-size: 15px;
        font-weight: 500;
    }
</style>
