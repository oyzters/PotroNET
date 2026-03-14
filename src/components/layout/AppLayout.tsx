import { useState, type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import { BottomNavigation } from './BottomNavigation';

interface AppLayoutProps {
    children: ReactNode;
    hideRightPanel?: boolean;
    noPaddingMobile?: boolean;
}

export function AppLayout({ children, hideRightPanel = false }: AppLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Sidebar is always hidden on mobile via CSS (hidden md:block).
    const sidebarWidth = sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64';

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background dark:bg-none dark:bg-background">
            <Navbar />
            <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] overflow-y-auto pb-16 md:pb-0">
                <div className="hidden md:block">
                    <Sidebar
                        isOpen={false}
                        onClose={() => {}}
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                    />
                </div>

                <div className={`${sidebarWidth} transition-all duration-200`}>
                    <div className={`mx-auto max-w-7xl ${hideRightPanel ? 'justify-center' : ''} px-4 py-4 md:px-6 md:py-6`}>
                        <div className={`flex gap-6 ${hideRightPanel ? 'justify-center' : ''}`}>
                            {/* Main content - Optimizado para máximo espacio */}
                            <main className={`min-w-0 flex-1 ${hideRightPanel ? 'max-w-5xl' : ''}`}>
                                <div className="w-full">
                                    {children}
                                </div>
                            </main>

                            {/* Right panel - Integración mejorada */}
                            {!hideRightPanel && (
                                <aside className="hidden w-80 shrink-0 xl:block">
                                    <RightPanel />
                                </aside>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <BottomNavigation />
        </div>
    );
}
