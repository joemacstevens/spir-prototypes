<script>
    import { onMount } from "svelte";

    let canvas;
    let ctx;
    let particles = [];
    let animating = false;

    onMount(() => {
        window.spawnConfetti = spawnConfetti;
        return () => {
            delete window.spawnConfetti;
        };
    });

    const colorSets = {
        default: ["#52ACFF", "#FFFFFF", "#3d8be0", "#87CEFA"],
        achievement: [
            "#FF6B6B",
            "#FFB347",
            "#00FA3A",
            "#52ACFF",
            "#A78BFA",
            "#FFD700",
        ],
        streak: ["#FFD700", "#FFB347", "#FFA500", "#FFFFFF"],
    };

    export function spawnConfetti(type = "default") {
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        ctx = canvas.getContext("2d");

        const colors = colorSets[type] || colorSets.default;

        // UNITY: GameManager.SpawnEffect(confettiBlue, 1, 2)
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -10 - Math.random() * 40,
                vx: (Math.random() - 0.5) * 6,
                vy: Math.random() * 3 + 2,
                w: Math.random() * 8 + 3,
                h: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                life: 1,
                decay: 0.005 + Math.random() * 0.008,
            });
        }

        if (!animating) {
            animating = true;
            animateConfetti();
        }
    }

    function animateConfetti() {
        if (!ctx || particles.length === 0) {
            animating = false;
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles = particles.filter((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.rotation += p.rotSpeed;
            p.life -= p.decay;

            if (p.life <= 0) return false;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();

            return p.y < canvas.height + 20;
        });

        requestAnimationFrame(animateConfetti);
    }
</script>

<canvas class="confetti-canvas" bind:this={canvas}></canvas>

<style>
    .confetti-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 900;
    }
</style>
