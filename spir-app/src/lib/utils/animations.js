import { addXP } from "../stores/user.js";
import gsap from "gsap";

// Spawn XP orb at source, fly to header counter
export function flyXP(sourceEl, amount, onCompleteCb = null) {
    if (!sourceEl) {
        addXP(amount);
        if (onCompleteCb) onCompleteCb();
        return;
    }

    const orb = document.createElement('div');
    orb.className = 'xp-orb-flyer';
    orb.innerHTML = '⚡';
    Object.assign(orb.style, {
        position: 'fixed',
        width: '24px',
        height: '24px',
        background: 'rgba(255, 215, 0, 0.2)',
        border: '1px solid #FFD700',
        borderRadius: '50%',
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 140, 0, 0.5)',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#FFD700',
        textShadow: '0 0 4px #000'
    });
    
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetEl = document.querySelector('.header-xp-counter');
    
    orb.style.left = (sourceRect.x + sourceRect.width / 2 - 12) + 'px';
    orb.style.top = (sourceRect.y + sourceRect.height / 2 - 12) + 'px';
    document.body.appendChild(orb);

    if (targetEl) {
        const targetRect = targetEl.getBoundingClientRect();
        
        // Define path using bezier if motion path plugin is available, or just straight/arc
        const dx = targetRect.x + targetRect.width / 2 - (sourceRect.x + sourceRect.width / 2);
        const dy = targetRect.y + targetRect.height / 2 - (sourceRect.y + sourceRect.height / 2);
        
        gsap.to(orb, {
            x: dx,
            y: dy,
            scale: 0.5,
            duration: 0.6 + Math.random() * 0.2,
            ease: 'power2.in',
            onComplete: () => {
                orb.remove();
                addXP(amount);
                // Pulse header counter
                gsap.killTweensOf(targetEl);
                gsap.to(targetEl, { scale: 1.2, duration: 0.15, yoyo: true, repeat: 1 });
                if (onCompleteCb) onCompleteCb();
            }
        });
    } else {
        // Fallback if header not found
        gsap.to(orb, {
            y: -50,
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                orb.remove();
                addXP(amount);
                if (onCompleteCb) onCompleteCb();
            }
        });
    }
}
