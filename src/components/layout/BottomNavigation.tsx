import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
    HomeIcon,
    SearchIcon,
    PlusIcon,
    MessageCircleIcon,
    BellIcon,
    GraduationCapIcon,
    BookOpenIcon,
    UsersIcon,
    TrophyIcon,
    UserIcon,
    SunIcon,
    MoonIcon,
    LogOutIcon,
    SettingsIcon,
    FileTextIcon,
    PenSquareIcon,
} from 'lucide-react';

const moreItems = [
    { to: '/feed#create', icon: PenSquareIcon, label: 'Publicar', highlight: true, isCreatePost: true },
    { to: '/professors', icon: GraduationCapIcon, label: 'Profesores' },
    { to: '/tutoring', icon: BookOpenIcon, label: 'Tutorías' },
    { to: '/friends', icon: UsersIcon, label: 'Mi Red' },
    { to: '/resources', icon: FileTextIcon, label: 'Recursos' },
    { to: '/rankings', icon: TrophyIcon, label: 'Ranking' },
    { to: '/notifications', icon: BellIcon, label: 'Alertas' },
    { to: '/settings', icon: SettingsIcon, label: 'Ajustes' },
];

const leftItems = [
    { to: '/feed', icon: HomeIcon, label: 'Feed' },
    { to: '/search', icon: SearchIcon, label: 'Explorar' },
];

export function BottomNavigation() {
    const { profile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);
    const [feedTapped, setFeedTapped] = useState(false);

    const profilePath = profile ? `/profile/${profile.id}` : '/login';
    const isProfileActive = location.pathname.startsWith('/profile/');

    useBodyScrollLock(showMore);

    const handleSignOut = async () => {
        setShowMore(false);
        await signOut();
        navigate('/');
    };

    return (
        <>
            {/* More drawer */}
            {showMore && (
                <div className="fixed inset-0 z-50 md:hidden" onClick={() => setShowMore(false)}>
                    <div className="absolute inset-0 bg-black/30" />
                    <div
                        className="absolute bottom-[4rem] left-0 right-0 rounded-t-3xl overflow-hidden bg-background border-t border-border shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-border/60" />
                        </div>

                        <div className="grid grid-cols-4 gap-2 px-4 pb-3 pt-1">
                            {moreItems.map(item => (
                                <button
                                    key={item.to}
                                    onClick={() => {
                                        setShowMore(false);
                                        if ((item as any).isCreatePost) {
                                            if (location.pathname !== '/feed') {
                                                navigate('/feed');
                                                setTimeout(() => window.dispatchEvent(new Event('open-create-post')), 150);
                                            } else {
                                                window.dispatchEvent(new Event('open-create-post'));
                                            }
                                        } else {
                                            navigate(item.to);
                                        }
                                    }}
                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95 ${
                                        (item as any).highlight
                                            ? 'text-primary-foreground'
                                            : 'text-muted-foreground hover:text-primary'
                                    }`}
                                    style={(item as any).highlight
                                        ? { background: 'oklch(0.68 0.15 237)', border: 'none' }
                                        : { background: 'oklch(0.68 0.15 237 / 0.06)', border: '1px solid oklch(0.68 0.15 237 / 0.12)' }
                                    }
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Bottom row: theme + logout */}
                        <div className="flex gap-2 px-4 pb-5 pt-1">
                            <button
                                onClick={() => { toggleTheme(); setShowMore(false); }}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                style={{ background: 'oklch(0.68 0.15 237 / 0.06)', border: '1px solid oklch(0.68 0.15 237 / 0.12)' }}
                            >
                                {theme === 'light' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                                {theme === 'light' ? 'Oscuro' : 'Claro'}
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                                style={{ border: '1px solid oklch(0.58 0.22 27 / 0.2)' }}
                            >
                                <LogOutIcon className="h-4 w-4" />
                                Salir
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
                    backdropFilter: 'blur(20px) saturate(1.2)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
                    borderTop: '1px solid var(--glass-border)',
                    boxShadow: '0 -2px 20px oklch(0.68 0.15 237 / 0.1)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }}
            >
                <div className="grid h-[60px]" style={{ gridTemplateColumns: '1fr 1fr 56px 1fr 1fr' }}>
                    {/* Feed */}
                    {leftItems.map(item => {
                        const isOnThisRoute = location.pathname === item.to;
                        if (item.to === '/feed') {
                            return (
                                <button
                                    key={item.to}
                                    onClick={() => {
                                        setShowMore(false);
                                        if (isOnThisRoute) {
                                            if (feedTapped) return;
                                            setFeedTapped(true);
                                            window.dispatchEvent(new Event('feed-tab-press'));
                                            setTimeout(() => setFeedTapped(false), 2000);
                                        } else {
                                            navigate('/feed');
                                        }
                                    }}
                                    className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${isOnThisRoute ? 'text-primary' : 'text-muted-foreground'}`}
                                >
                                    <div className="relative flex items-center justify-center">
                                        {isOnThisRoute && <span className="absolute rounded-full" style={{ inset: '-6px', background: 'oklch(0.68 0.15 237 / 0.15)', filter: 'blur(4px)' }} />}
                                        <item.icon className={`relative h-5 w-5 transition-transform duration-150 ${feedTapped ? 'scale-90' : 'scale-100'}`} />
                                    </div>
                                    <span>{item.label}</span>
                                </button>
                            );
                        }
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setShowMore(false)}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className="relative flex items-center justify-center">
                                            {isActive && <span className="absolute rounded-full" style={{ inset: '-6px', background: 'oklch(0.68 0.15 237 / 0.15)', filter: 'blur(4px)' }} />}
                                            <item.icon className="relative h-5 w-5" />
                                        </div>
                                        <span>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}

                    {/* Center: + button → opens drawer */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMore(!showMore)}
                            aria-label="Más opciones"
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ top: '-14px' }}
                        >
                            <span
                                className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-white transition-all duration-200 active:scale-90 ${showMore ? 'rotate-45' : ''}`}
                                style={{
                                    background: 'oklch(0.68 0.15 237)',
                                    boxShadow: '0 0 16px oklch(0.68 0.15 237 / 0.4), 0 4px 12px oklch(0 0 0 / 0.2)',
                                    transition: 'transform 0.3s ease',
                                }}
                            >
                                <PlusIcon className="h-6 w-6" strokeWidth={2.5} />
                            </span>
                        </button>
                    </div>

                    {/* Messages */}
                    <NavLink
                        to="/messages"
                        onClick={() => setShowMore(false)}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className="relative flex items-center justify-center">
                                    {isActive && <span className="absolute rounded-full" style={{ inset: '-6px', background: 'oklch(0.68 0.15 237 / 0.15)', filter: 'blur(4px)' }} />}
                                    <MessageCircleIcon className="relative h-5 w-5" />
                                </div>
                                <span>Mensajes</span>
                            </>
                        )}
                    </NavLink>

                    {/* Profile */}
                    <NavLink
                        to={profilePath}
                        onClick={() => setShowMore(false)}
                        className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${isProfileActive ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                        <div className="relative flex items-center justify-center">
                            {isProfileActive && <span className="absolute rounded-full" style={{ inset: '-6px', background: 'oklch(0.68 0.15 237 / 0.15)', filter: 'blur(4px)' }} />}
                            <div className={`relative h-6 w-6 rounded-full overflow-hidden ring-[1.5px] transition-all ${isProfileActive ? 'ring-primary' : 'ring-transparent'}`}>
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                                        <UserIcon className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <span>Perfil</span>
                    </NavLink>
                </div>
            </nav>
        </>
    );
}
