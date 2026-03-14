import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { RefreshCwIcon } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const isPulling = useRef(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            // Only allow pull-to-refresh if we are at the very top of the page
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY;
                isPulling.current = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPulling.current || isRefreshing) return;
            
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                // Add resistance to the pull
                const distance = Math.min(diff * 0.4, 80);
                setPullDistance(distance);
                if (distance > 0) {
                    e.preventDefault(); // Prevent native scroll while pulling
                }
            }
        };

        const handleTouchEnd = async () => {
            if (!isPulling.current) return;
            isPulling.current = false;

            if (pullDistance >= 60 && !isRefreshing) {
                setIsRefreshing(true);
                setPullDistance(60); // Keep it open while refreshing
                
                try {
                    await onRefresh();
                } finally {
                    setIsRefreshing(false);
                    setPullDistance(0);
                }
            } else {
                // Not pulled enough, animate back
                setPullDistance(0);
            }
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pullDistance, isRefreshing, onRefresh]);

    return (
        <div ref={containerRef} className="relative w-full">
            <div 
                className="absolute left-0 right-0 top-0 flex justify-center transition-all duration-200"
                style={{
                    height: pullDistance > 0 ? "60px" : "0px",
                    opacity: pullDistance > 0 ? pullDistance / 60 : 0
                }}
            >
                <div 
                    className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border/50 text-foreground shadow-sm"
                    style={{
                        transform: `rotate(${pullDistance * 3}deg)`
                    }}
                >
                    <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
            </div>
            
            <div 
                className="transition-transform duration-200"
                style={{ transform: `translateY(${pullDistance}px)` }}
            >
                {children}
            </div>
        </div>
    );
}
