import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

interface TiltOptions {
    max?: number;
    perspective?: number;
    scale?: number;
    /** For elements that mount conditionally (after data loads): the effect
     *  runs once with ref.current === null and never re-attaches. Pass
     *  `enabled: data.length > 0` so the effect re-runs when the element
     *  actually exists. */
    enabled?: boolean;
}

/**
 * Interactive 3D tilt + specular glare tracking for pointer devices.
 *
 * No-op on touch screens (taps fire emulated mousemove events that would
 * leave the card stuck mid-tilt) and under prefers-reduced-motion.
 *
 * While at rest the inline transform and will-change are cleared: a
 * transformed (or will-change: transform) ancestor becomes the containing
 * block for position:fixed descendants, which would break any fullscreen
 * modal rendered inside the tilted element.
 */
export function use3DTilt(
    ref: RefObject<HTMLElement | null>,
    options: TiltOptions = {}
) {
    const { max = 3.5, perspective = 1200, scale = 1.008, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;
        const el = ref.current;
        if (!el || typeof window === 'undefined') return;

        const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!finePointer.matches || reducedMotion.matches) return;

        const onMouseEnter = () => {
            el.style.willChange = 'transform';
        };

        const onMouseMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const percentX = (x - rect.width / 2) / (rect.width / 2);
            const percentY = (y - rect.height / 2) / (rect.height / 2);

            // Feed the specular glare (.liquid-glass::after) the pointer position
            el.style.setProperty('--glare-x', `${(x / rect.width) * 100}%`);
            el.style.setProperty('--glare-y', `${(y / rect.height) * 100}%`);

            gsap.to(el, {
                rotateX: -(percentY * max),
                rotateY: percentX * max,
                scale,
                transformPerspective: perspective,
                duration: 0.3,
                ease: 'power2.out',
                overwrite: 'auto',
            });
        };

        const onMouseLeave = () => {
            gsap.to(el, {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                transformPerspective: perspective,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: 'auto',
                clearProps: 'transform,willChange',
            });
        };

        el.addEventListener('mouseenter', onMouseEnter);
        el.addEventListener('mousemove', onMouseMove);
        el.addEventListener('mouseleave', onMouseLeave);

        return () => {
            el.removeEventListener('mouseenter', onMouseEnter);
            el.removeEventListener('mousemove', onMouseMove);
            el.removeEventListener('mouseleave', onMouseLeave);
            gsap.killTweensOf(el);
        };
    }, [ref, max, perspective, scale, enabled]);
}
