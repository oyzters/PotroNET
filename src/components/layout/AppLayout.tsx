import { useState, type ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';

interface AppLayoutProps {
    children: ReactNode;
    hideRightPanel?: boolean;
}

export function AppLayout({ children, hideRightPanel = false }: AppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const sidebarWidth = sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64';

    return (
        <div className="min-h-screen bg-background">
            <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(c => !c)}
            />

            <div className={`${sidebarWidth} transition-all duration-200`}>
                <div className="mx-auto max-w-7xl px-4 py-6">
                    <div className={`flex gap-6 ${hideRightPanel ? 'justify-center' : ''}`}>
                        {/* Center content with border */}
                        <main className={`min-w-0 flex-1 ${hideRightPanel ? 'max-w-3xl' : ''}`}>
                            <div className="rounded-xl border border-border/60 bg-card/30 p-4 md:p-6 shadow-sm">
                                {children}
                            </div>
                        </main>

                        {/* Right panel */}
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
