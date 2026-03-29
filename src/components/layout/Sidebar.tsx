import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    HomeIcon,
    UserIcon,
    XIcon,
    SearchIcon,
    GraduationCapIcon,
    BookOpenIcon,
    MessageCircleIcon,
    BellIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

const navItems = [
    { to: '/feed', icon: HomeIcon, label: 'Feed' },
    { to: '/search', icon: SearchIcon, label: 'Explorar' },
    { to: '/professors', icon: GraduationCapIcon, label: 'Profesores' },
    { to: '/tutoring', icon: BookOpenIcon, label: 'Tutorías' },
    { to: '/messages', icon: MessageCircleIcon, label: 'Mensajes' },
    { to: '/notifications', icon: BellIcon, label: 'Notificaciones' },
];

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
    const { profile } = useAuth();

    const profileNav = profile
        ? [{ to: `/profile/${profile.id}`, icon: UserIcon, label: 'Mi Perfil' }]
        : [];

    const allItems = [...navItems, ...profileNav];
    const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] ${sidebarWidth} transform border-r transition-all duration-200 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(24px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                    borderColor: 'var(--glass-border)',
                }}
            >
                <div className="flex h-full flex-col p-2 overflow-hidden">
                    {/* Close button for mobile */}
                    <div className="mb-2 flex justify-end md:hidden">
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <XIcon className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Collapse toggle - desktop only */}
                    <div className={`mb-2 hidden md:flex ${collapsed ? 'justify-center' : 'justify-end'}`}>
                        <button
                            onClick={onToggleCollapse}
                            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                            {collapsed
                                ? <ChevronRightIcon className="h-4 w-4" />
                                : <ChevronLeftIcon className="h-4 w-4" />
                            }
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col gap-1 overflow-y-auto">
                        {allItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={onClose}
                                title={collapsed ? item.label : undefined}
                                className={({ isActive }) =>
                                    `relative flex items-center rounded-xl px-2 py-2.5 text-sm font-medium transition-all duration-200 ${collapsed ? 'justify-center' : 'gap-3 px-3'} ${
                                        isActive
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`
                                }
                                style={({ isActive }) => isActive ? {
                                    background: 'oklch(0.68 0.15 237 / 0.12)',
                                    boxShadow: 'inset 3px 0 0 oklch(0.68 0.15 237)',
                                } : {}}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Career info - only visible when expanded */}
                    {!collapsed && profile?.career && (
                        <div
                            className="mt-auto relative overflow-hidden rounded-2xl p-4 group transition-all cursor-default"
                            style={{
                                background: 'linear-gradient(135deg, oklch(0.68 0.15 237 / 0.15), oklch(0.65 0.22 300 / 0.10))',
                                border: '1px solid oklch(0.68 0.15 237 / 0.25)',
                                boxShadow: '0 0 20px oklch(0.68 0.15 237 / 0.08)',
                            }}
                        >
                            {/* Decorative background icon */}
                            <div className="absolute -right-4 -bottom-4 opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-110 transition-all pointer-events-none">
                                <GraduationCapIcon className="h-24 w-24 text-primary" />
                            </div>

                            <div className="relative z-10">
                                <p className="text-xs font-semibold text-primary/80 uppercase tracking-wider mb-1">Mi Carrera</p>
                                <p className="text-sm font-bold text-foreground leading-tight">
                                    {profile.career.name}
                                </p>
                                <div className="mt-2 inline-flex items-center rounded-full bg-background/30 px-2.5 py-0.5 border border-primary/20 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                                    Semestre {profile.semester}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
