import { useEffect } from 'react';

/**
 * Lock body scroll while `locked` is true. Fixes the iOS Safari bug where
 * opening a modal still lets the background scroll underneath.
 *
 * Uses the "fix body in place + restore scroll" technique, which is the
 * only pattern that reliably stops background scroll on iOS.
 */
export function useBodyScrollLock(locked: boolean) {
    useEffect(() => {
        if (!locked) return;

        const scrollY = window.scrollY;
        const body = document.body;
        const html = document.documentElement;

        const prev = {
            bodyOverflow: body.style.overflow,
            bodyPosition: body.style.position,
            bodyTop: body.style.top,
            bodyWidth: body.style.width,
            htmlOverflow: html.style.overflow,
        };

        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.width = '100%';
        html.style.overflow = 'hidden';

        return () => {
            body.style.overflow = prev.bodyOverflow;
            body.style.position = prev.bodyPosition;
            body.style.top = prev.bodyTop;
            body.style.width = prev.bodyWidth;
            html.style.overflow = prev.htmlOverflow;
            window.scrollTo(0, scrollY);
        };
    }, [locked]);
}
