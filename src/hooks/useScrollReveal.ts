import { useEffect, useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';

/**
 * 3D entry animation: the element rises from the glass depth (translate +
 * rotateX + scale) the first time it scrolls into the viewport.
 *
 * Implemented with IntersectionObserver + a GSAP tween instead of
 * ScrollTrigger: IO fires deterministically for elements already in view at
 * mount, adds no per-card scroll listeners (cheaper on phones), and is
 * immune to the stale-module states HMR can leave in ScrollTrigger.
 *
 * Transform/opacity only — no filters — so it stays smooth on phone GPUs,
 * and clearProps removes the inline transform at rest so the element never
 * becomes a containing block for position:fixed descendants.
 */
export function useScrollReveal(ref: RefObject<HTMLElement | null>) {
    // 1. Set initial hidden state inside useLayoutEffect to prevent FOUC (flash of unstyled content)
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || typeof window === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (typeof IntersectionObserver === 'undefined') return;

        gsap.set(el, {
            opacity: 0,
            y: 36,
            z: -60,
            rotateX: 7,
            scale: 0.97,
            transformPerspective: 900,
            transformOrigin: 'center 80%',
        });
    }, [ref]);

    // 2. Set up IntersectionObserver and initial visibility check inside useEffect
    // to ensure layout has settled and avoids race conditions with dynamic rendering.
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof window === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (typeof IntersectionObserver === 'undefined') return;

        let played = false;

        const reveal = () => {
            if (played) return;
            played = true;
            io.disconnect();
            gsap.to(el, {
                opacity: 1,
                y: 0,
                z: 0,
                rotateX: 0,
                scale: 1,
                duration: 0.7,
                ease: 'power3.out',
                clearProps: 'transform,opacity,transformOrigin',
            });
        };

        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    reveal();
                }
            },
            // Equivalent to ScrollTrigger's start: 'top 92%'
            { rootMargin: '0px 0px -8% 0px' }
        );

        io.observe(el);

        // Failsafe: Perform a manual visibility check after a short timeout (150ms).
        // This handles cases where layout shifts (like skeleton removal or sibling widgets mounting)
        // or CSS transform/compositor animations prevent the IntersectionObserver from firing initially.
        const checkVisibility = () => {
            if (played) return;
            const rect = el.getBoundingClientRect();
            const threshold = window.innerHeight * 0.92;
            if (rect.top < threshold && rect.bottom > 0) {
                reveal();
            }
        };

        const timeoutId = setTimeout(checkVisibility, 150);

        return () => {
            clearTimeout(timeoutId);
            io.disconnect();
            gsap.killTweensOf(el);
            // If component unmounts before animation played, clean up styles
            gsap.set(el, { clearProps: 'transform,opacity,transformOrigin' });
        };
    }, [ref]);
}
