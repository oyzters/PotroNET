import { memo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * NeonBackground — Responsive background lighting.
 * On the landing page (/), it uses the classic, large, moving, bright blurred orbs.
 * Inside the app, it uses highly subtle, smaller, pulsating radial-gradients.
 */
export const NeonBackground = memo(function NeonBackground() {
    const location = useLocation();
    const isLanding = location.pathname === '/';

    if (isLanding) {
        // Classic Landing Page Orbs: Large, bright, using raw Tailwind classes + heavy blur
        return (
            <div
                aria-hidden="true"
                className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
            >
                {/* Orb 1 — Top Left */}
                <div 
                    className="absolute -left-[10%] -top-[10%] h-[600px] w-[600px] rounded-full bg-primary/20 dark:bg-primary/10 blur-3xl opacity-80"
                    style={{ animation: 'orb-float-1 28s ease-in-out infinite' }}
                />
                
                {/* Orb 2 — Bottom Right */}
                <div 
                    className="absolute -right-[10%] -bottom-[10%] h-[600px] w-[600px] rounded-full bg-[oklch(0.65_0.22_300)]/20 dark:bg-[oklch(0.65_0.22_300)]/10 blur-3xl opacity-80"
                    style={{ animation: 'orb-float-2 36s ease-in-out infinite' }}
                />
                
                {/* Orb 3 — Right Side */}
                <div 
                    className="absolute right-[10%] top-[30%] h-[400px] w-[400px] rounded-full bg-[oklch(0.70_0.22_0)]/10 dark:bg-[oklch(0.70_0.22_0)]/10 blur-3xl opacity-70"
                    style={{ animation: 'orb-float-3 44s ease-in-out infinite' }}
                />
                
                {/* Orb 4 — Bottom Left */}
                <div 
                    className="absolute -left-[5%] bottom-[10%] h-[300px] w-[300px] rounded-full bg-[oklch(0.72_0.18_200)]/15 dark:bg-[oklch(0.72_0.18_200)]/10 blur-3xl opacity-60"
                    style={{ animation: 'orb-float-1 52s ease-in-out infinite reverse' }}
                />
            </div>
        );
    }

    // Inside App Orbs: Subtle, small, soft radial gradients preventing banding & full-screen coloring
    return (
        <div
            aria-hidden="true"
            className="fixed inset-0 z-0 pointer-events-none overflow-hidden object-contain opacity-60 dark:opacity-30"
        >
            {/* Orb 1 — Top Left */}
            <div 
                className="absolute left-[0%] top-[5%] h-64 w-64 md:h-96 md:w-96"
                style={{ 
                    background: 'radial-gradient(circle at center, oklch(0.68 0.15 237 / 0.08) 0%, transparent 50%)',
                    animation: 'orb-float-1 28s ease-in-out infinite' 
                }}
            />
            
            {/* Orb 2 — Bottom Right */}
            <div 
                className="absolute right-[0%] bottom-[5%] h-72 w-72 md:h-[400px] md:w-[400px]"
                style={{ 
                    background: 'radial-gradient(circle at center, oklch(0.65 0.22 300 / 0.06) 0%, transparent 50%)',
                    animation: 'orb-float-2 36s ease-in-out infinite' 
                }}
            />
            
            {/* Orb 3 — Right Side (Subtle) */}
            <div 
                className="absolute right-[15%] top-[35%] h-48 w-48 md:h-80 md:w-80"
                style={{ 
                    background: 'radial-gradient(circle at center, oklch(0.70 0.22 0 / 0.05) 0%, transparent 50%)',
                    animation: 'orb-float-3 44s ease-in-out infinite' 
                }}
            />
            
            {/* Orb 4 — Bottom Left (Subtle) */}
            <div 
                className="absolute left-[10%] bottom-[20%] h-56 w-56 md:h-[350px] md:w-[350px]"
                style={{ 
                    background: 'radial-gradient(circle at center, oklch(0.72 0.18 200 / 0.05) 0%, transparent 50%)',
                    animation: 'orb-float-1 52s ease-in-out infinite reverse' 
                }}
            />
        </div>
    );
});


