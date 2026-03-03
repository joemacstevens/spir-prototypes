# Breathing Module — Web Prototype

## What This Is
A web-based prototype of the SPiR Health breathing module. The real app is built in Unity 6 — this HTML/CSS/JS version is for rapid design iteration and serves as a living spec for the dev team.

## Critical Constraint: Unity-Translatable
Every animation and visual decision must be implementable in Unity using DOTween. This means:
- Use **GSAP** for all animations (closest web equivalent to DOTween)
- Comment every animation with its Unity/DOTween equivalent
- Use **CSS variables** for all design tokens (colors, sizes, durations) — devs extract these into Unity serialized fields
- Keep the visual hierarchy flat and component-based (matches Unity's prefab structure)
- No CSS-only animations that can't be replicated programmatically
- No WebGL/Canvas — use DOM elements (maps to Unity UI Image/Text components)

## Animation Mapping
| Web (GSAP) | Unity (DOTween) |
|------------|----------------|
| `gsap.to(el, { scale: 4, duration: 4 })` | `transform.DOScale(4, 4f)` |
| `gsap.to(el, { backgroundColor: color, duration: 1 })` | `image.DOColor(color, 1f)` |
| `gsap.to(ring, { strokeDashoffset: 0, duration: 4 })` | `image.DOFillAmount(1, 4f)` |
| `gsap.to(el, { opacity: 0, duration: 0.5 })` | `canvasGroup.DOFade(0f, 0.5f)` |
| `ease: "back.out(1.7)"` | `Ease.OutBack` |
| `ease: "sine.inOut"` | `Ease.InOutSine` |
| `gsap.killTweensOf(el)` | `DOKill()` |

## Exact Values from Unity Codebase
These are the real values from BreathworkPanel.cs — match them exactly in the base prototype:

### Colors
- INHALE: `#52ACFF` (light blue)
- HOLD: `#EFF7FF` (off-white)
- EXHALE: `#00FA3A` (bright green)
- Circle default: `#FFFFFF` (white)

### Circle Scale
- Base: 1×
- Inhale target: 4×
- Color transition duration: always 1 second regardless of phase duration

### Breathing Patterns
| Pattern | Inhale | Hold 1 | Exhale | Hold 2 | Rings |
|---------|--------|--------|--------|--------|-------|
| 4-7-8 | 4s | 7s | 8s | 0s | 3 |
| Box | 4s | 4s | 4s | 4s | 4 |
| Huberman | 1s (inhale) → 1s (hold) → 3s (inhale₂) → 7s (exhale) | | | | 4 |
| Resonant | 5s | 0s | 5s | 0s | 2 |

### Transitions
- Screen crossfade: 0.5 seconds
- Play/pause: button icon opacity toggle (instant)

### XP
- Bar fills 20% per cycle, resets every 5 cycles
- Free: +5 XP per 5-cycle set
- Pro: +20 XP per 5-cycle set

## Tech Stack
- Single HTML file (no build step)
- GSAP via CDN
- Mobile-first: 390×844 viewport
- Touch/swipe for mode selection

## File Structure
```
index.html              ← The prototype (single file)
IMPLEMENTATION_PLAN.md  ← Full implementation details + Unity mapping
CLAUDE.md              ← This file
assets/                ← Images, icons, sounds as needed
```

## The Goal
1. First: replicate the current app experience exactly
2. Then: explore visual enhancements (richer circle, particles, diagrams, themes)
3. Reference apps for inspiration: **Open** (cool diagrams) and **Five Point Five** (premium feel)

## Parent Project
This prototype lives inside the SPiR Health Unity project at `prototypes/breathing-module/`. The full codebase context is in the parent CLAUDE.md at the project root.
