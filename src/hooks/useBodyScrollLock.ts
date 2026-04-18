import { useEffect } from 'react';

/**
 * Lock scroll on the app's main scroll container while `locked` is true.
 * Fixes the iOS Safari bug where opening a modal still lets the background
 * scroll underneath. Targets both `body` and the in-app `#main-scroll-area`
 * container used by AppLayout.
 */
export function useBodyScrollLock(locked: boolean) {
    useEffect(() => {
        if (!locked) return;

        const body = document.body;
        const scrollArea = document.getElementById('main-scroll-area');

        const prevBodyOverflow = body.style.overflow;
        const prevAreaOverflow = scrollArea?.style.overflow || '';
        const prevAreaTouch = scrollArea?.style.touchAction || '';

        body.style.overflow = 'hidden';
        if (scrollArea) {
            scrollArea.style.overflow = 'hidden';
            scrollArea.style.touchAction = 'none';
        }

        return () => {
            body.style.overflow = prevBodyOverflow;
            if (scrollArea) {
                scrollArea.style.overflow = prevAreaOverflow;
                scrollArea.style.touchAction = prevAreaTouch;
            }
        };
    }, [locked]);
}
