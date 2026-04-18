import { useEffect, useRef, useState } from 'react';

interface Options {
    /** CSS margin string passed to IntersectionObserver. Expand to pre-trigger. */
    rootMargin?: string;
    /** If true, stops observing once the element has been seen. Default: false. */
    once?: boolean;
    /** Threshold for intersection. Default: 0 (any part visible). */
    threshold?: number | number[];
}

/**
 * Returns a ref + boolean indicating whether the element is in the viewport.
 * Polished: single observer per element, auto-disconnect on unmount,
 * optional "trigger once" mode for cheap lazy-load checks.
 */
export function useInView<T extends Element = HTMLElement>(
    { rootMargin = '0px', once = false, threshold = 0 }: Options = {}
): [React.RefObject<T | null>, boolean] {
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (typeof IntersectionObserver === 'undefined') {
            // SSR / very old browsers: fall back to visible=true so UI still works
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                const visible = entry.isIntersecting;
                setInView(visible);
                if (visible && once) {
                    observer.disconnect();
                }
            },
            { rootMargin, threshold }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [rootMargin, once, threshold]);

    return [ref, inView];
}
