<script>
    import { onMount } from "svelte";
    import gsap from "gsap";

    let toasts = $state([]);
    let toastId = 0;

    // Global toast API — accessible via window for cross-component use
    onMount(() => {
        window.showToast = showToast;
        return () => {
            delete window.showToast;
        };
    });

    export function showToast(message, icon = "🎯", duration = 2500) {
        const id = ++toastId;
        toasts = [...toasts, { id, message, icon }];

        // Auto-dismiss
        setTimeout(() => {
            dismissToast(id);
        }, duration);

        // Animate entrance after next frame
        requestAnimationFrame(() => {
            const el = document.getElementById(`toast-${id}`);
            if (el) {
                // UNITY: DOAnchorPosY sequence
                gsap.fromTo(
                    el,
                    { y: -80, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.2)" },
                );
            }
        });

        return id;
    }

    function dismissToast(id) {
        const el = document.getElementById(`toast-${id}`);
        if (el) {
            gsap.to(el, {
                y: -80,
                opacity: 0,
                duration: 0.3,
                ease: "power2.in",
                onComplete: () => {
                    toasts = toasts.filter((t) => t.id !== id);
                },
            });
        } else {
            toasts = toasts.filter((t) => t.id !== id);
        }
    }
</script>

<div class="toast-container">
    {#each toasts as toast (toast.id)}
        <div class="toast glass-card-sm" id="toast-{toast.id}">
            <span class="toast-icon">{toast.icon}</span>
            <span class="toast-message">{toast.message}</span>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding-top: calc(var(--safe-area-top) + 8px);
        z-index: 800;
        pointer-events: none;
    }

    .toast {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 20px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        pointer-events: auto;
        opacity: 0;
        transform: translateY(-80px);
    }

    .toast-icon {
        font-size: 16px;
        flex-shrink: 0;
    }

    .toast-message {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-primary);
        white-space: nowrap;
    }
</style>
