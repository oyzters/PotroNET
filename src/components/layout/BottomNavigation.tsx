import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    HomeIcon,
    SearchIcon,
    PlusIcon,
    MessageCircleIcon,
    BellIcon,
    GraduationCapIcon,
    BookOpenIcon,
    UsersIcon,
} from 'lucide-react';

const moreItems = [
    { to: '/professors', icon: GraduationCapIcon, label: 'Profesores' },
    { to: '/tutoring', icon: BookOpenIcon, label: 'Tutorías' },
    { to: '/friends', icon: UsersIcon, label: 'Amigos' },
];

// 5-slot grid: [Feed] [Buscar] [+] [Mensajes] [Alertas/Más]
const leftItems = [
    { to: '/feed', icon: HomeIcon, label: 'Feed' },
    { to: '/search', icon: SearchIcon, label: 'Buscar' },
];
const rightItems = [
    { to: '/messages', icon: MessageCircleIcon, label: 'Mensajes' },
    { to: '/notifications', icon: BellIcon, label: 'Alertas' },
];

export function BottomNavigation() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [showMore, setShowMore] = useState(false);

    const profilePath = profile ? `/profile/${profile.id}` : '/login';

    return (
        <>
            {/* More drawer */}
            {showMore && (
                <div
                    className="fixed inset-0 z-50 md:hidden"
                    onClick={() => setShowMore(false)}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        className="absolute bottom-[4rem] left-0 right-0 rounded-t-3xl overflow-hidden"
                        style={{
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(24px) saturate(1.8)',
                            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                            borderTop: '1px solid var(--glass-border)',
                            boxShadow: '0 -4px 40px oklch(0.68 0.15 237 / 0.15)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-border/60" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-5 pb-3">
                            Más secciones
                        </p>
                        <div className="grid grid-cols-3 gap-2 px-4 pb-6">
                            {moreItems.map((item) => (
                                <button
                                    key={item.to}
                                    onClick={() => { setShowMore(false); navigate(item.to); }}
                                    className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all text-muted-foreground hover:text-primary active:scale-95"
                                    style={{
                                        background: 'oklch(0.68 0.15 237 / 0.06)',
                                        border: '1px solid oklch(0.68 0.15 237 / 0.12)',
                                    }}
                                >
                                    <item.icon className="h-6 w-6" />
                                    <span className="text-[11px] font-medium">{item.label}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => { setShowMore(false); navigate(profilePath); }}
                                className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all text-muted-foreground hover:text-primary active:scale-95"
                                style={{
                                    background: 'oklch(0.68 0.15 237 / 0.06)',
                                    border: '1px solid oklch(0.68 0.15 237 / 0.12)',
                                }}
                            >
                                <UsersIcon className="h-6 w-6" />
                                <span className="text-[11px] font-medium">Mi Perfil</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom nav bar */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
                style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(24px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                    borderTop: '1px solid var(--glass-border)',
                    boxShadow: '0 -2px 20px oklch(0.68 0.15 237 / 0.1)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                {/*
                  5-column grid. Center column holds the + button placeholder space.
                  The + button floats above, absolutely positioned at 50% from left.
                */}
                <div
                    className="grid h-[60px]"
                    style={{ gridTemplateColumns: '1fr 1fr 56px 1fr 1fr' }}
                >
                    {/* Left items */}
                    {leftItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setShowMore(false)}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative flex items-center justify-center">
                                        {isActive && (
                                            <span
                                                className="absolute rounded-full"
                                                style={{
                                                    inset: '-6px',
                                                    background: 'oklch(0.68 0.15 237 / 0.15)',
                                                    filter: 'blur(4px)',
                                                }}
                                            />
                                        )}
                                        <item.icon className="relative h-5 w-5" />
                                    </div>
                                    <span>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}

                    {/* Center cell — space for the floating + button */}
                    <div className="relative">
                        {/* The + button is absolutely centered here */}
                        <NavLink
                            to="/feed#create"
                            onClick={() => setShowMore(false)}
                            aria-label="Crear publicación"
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ top: '-14px' }}
                        >
                            <span
                                className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-white transition-all duration-200 active:scale-90"
                                style={{
                                    background: 'linear-gradient(135deg, oklch(0.68 0.15 237), oklch(0.65 0.22 300))',
                                    boxShadow: '0 0 20px oklch(0.68 0.15 237 / 0.5), 0 4px 16px oklch(0 0 0 / 0.3)',
                                }}
                            >
                                <PlusIcon className="h-6 w-6" strokeWidth={2.5} />
                            </span>
                        </NavLink>
                    </div>

                    {/* Right items */}
                    {rightItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setShowMore(false)}
                            className={({ isActive }) =>
                                `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="relative flex items-center justify-center">
                                        {isActive && (
                                            <span
                                                className="absolute rounded-full"
                                                style={{
                                                    inset: '-6px',
                                                    background: 'oklch(0.68 0.15 237 / 0.15)',
                                                    filter: 'blur(4px)',
                                                }}
                                            />
                                        )}
                                        <item.icon className="relative h-5 w-5" />
                                    </div>
                                    <span>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </>
    );
}
