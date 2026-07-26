import { useState, type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
/* BottomNavigation se mueve a App.tsx via portal — fuera del wrapper animado */

interface AppLayoutProps {
    children: ReactNode;
    hideRightPanel?: boolean;
    noPaddingMobile?: boolean;
}

export function AppLayout({ children, hideRightPanel = false }: AppLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Sidebar is always hidden on mobile via CSS (hidden md:block).
    const sidebarWidth = sidebarCollapsed ? 'md:ml-[96px]' : 'md:ml-[280px]';

    return (
        <div className="min-h-dvh relative isolate">
            {/* Ambient liquid-glass backdrop — purely decorative.
                `isolate` on the wrapper creates a stacking context so the fixed
                z-[-10] orbs render above the body background but below all app
                content, without changing the z-order of Navbar, modals or portals. */}
            <div className="liquid-orbs liquid-gooey" aria-hidden="true">
                <span className="liquid-orb-1" />
                <span className="liquid-orb-2" />
                <span className="liquid-orb-3" />
            </div>

            {/* SVG Gooey filter for fluid organic fusion (Apple style) */}
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
                <defs>
                    <filter id="liquid-gooey-filter">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="28" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -16" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <Navbar />

            <div className="hidden md:block">
                <Sidebar
                    isOpen={false}
                    onClose={() => {}}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                />
            </div>

            <div
                id="main-scroll-area"
                className={`${sidebarWidth} transition-all duration-200 pt-safe md:pt-0 pb-safe-nav md:pb-0`}
            >
                <div className={`mx-auto max-w-7xl ${hideRightPanel ? 'justify-center' : ''} px-4 py-4 md:px-6 md:py-6`}>
                    <div className={`flex gap-6 ${hideRightPanel ? 'justify-center' : ''}`}>
                        {/* Main content */}
                        <main className={`min-w-0 flex-1 ${hideRightPanel ? 'max-w-5xl' : ''}`}>
                            <div className="w-full">
                                {children}
                            </div>
                        </main>

                        {/* Right panel — visible at xl */}
                        {!hideRightPanel && (
                            <aside className="hidden w-80 shrink-0 xl:block">
                                <RightPanel />
                            </aside>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
