import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    HomeIcon,
    UserIcon,
    XIcon,
    SearchIcon,
    GraduationCapIcon,
    BookOpenIcon,
    MapIcon,
    UsersIcon,
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
    { to: '/search', icon: SearchIcon, label: 'Buscar' },
    { to: '/professors', icon: GraduationCapIcon, label: 'Profesores' },
    { to: '/tutoring', icon: BookOpenIcon, label: 'Tutorías' },
    { to: '/roadmap', icon: MapIcon, label: 'Mapa Curricular' },
    { to: '/friends', icon: UsersIcon, label: 'Amigos' },
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
                className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] ${sidebarWidth} transform border-r border-border bg-background transition-all duration-200 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex h-full flex-col p-2">
                    {/* Close button for mobile */}
                    <div className="mb-2 flex justify-end md:hidden">
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <XIcon className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Collapse toggle - desktop only */}
                    <div className="mb-2 hidden justify-end md:flex">
                        <button
                            onClick={onToggleCollapse}
                            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
                                    `flex items-center rounded-lg px-2 py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : 'gap-3 px-3'} ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    }`
                                }
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Career info - only visible when expanded */}
                    {!collapsed && profile?.career && (
                        <div className="mt-auto rounded-lg border border-border bg-card p-4">
                            <p className="text-xs font-medium text-muted-foreground">Mi Carrera</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                                {profile.career.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Semestre {profile.semester}
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
