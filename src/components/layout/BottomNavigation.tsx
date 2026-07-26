import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { api } from '@/lib/api';
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

// Active indicators removed

export function BottomNavigation() {
    const { profile, session, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);
    const [feedTapped, setFeedTapped] = useState(false);
    // Initialize from localStorage cache so badge shows immediately on page load
    const [unreadMessages, setUnreadMessages] = useState<number>(() => {
        try { return parseInt(localStorage.getItem('potronet-unread-count') || '0', 10) || 0; }
        catch { return 0; }
    });

    const profilePath = profile ? `/profile/${profile.id}` : '/login';
    const isProfileActive = location.pathname.startsWith('/profile/');

    useBodyScrollLock(showMore);

    // Fetch unread messages count periodically
    useEffect(() => {
        if (!profile || !session?.access_token) return;

        const checkUnread = async () => {
            try {
                const data = await api<{ conversations: Array<{ unread?: number }> }>('/messages', {
                    token: session.access_token,
                });
                const total = data.conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
                setUnreadMessages(total);
                // Persist to localStorage so the badge is visible instantly on next load
                try {
                    if (total > 0) localStorage.setItem('potronet-unread-count', String(total));
                    else localStorage.removeItem('potronet-unread-count');
                } catch { /* storage unavailable */ }
            } catch { /* silent */ }
        };

        checkUnread();
        const interval = setInterval(checkUnread, 15000);
        return () => clearInterval(interval);
    }, [profile, session?.access_token]);

    // Ocultar barra inferior en pantallas públicas o cuando no hay sesión activa (después de todos los Hooks)
    const HIDDEN_ROUTES = ['/', '/login', '/register', '/onboarding', '/forgot-password', '/reset-password', '/verify-email', '/terms', '/privacy', '/guidelines'];
    if (!profile || HIDDEN_ROUTES.includes(location.pathname)) return null;

    const handleSignOut = async () => {
        setShowMore(false);
        await signOut();
        navigate('/');
    };

    return (
        <>
            {/* More drawer */}
            {showMore && (
                <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowMore(false)}>
                    <div className="absolute inset-0 bg-black/30 animate-in fade-in duration-200" />
                    <div
                        className="absolute left-4 right-4 rounded-3xl overflow-hidden border border-white/10 dark:border-white/5 shadow-2xl modal-elastic p-2"
                        style={{
                            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
                            background: 'var(--lg-bg)',
                            backdropFilter: 'blur(32px) saturate(1.6)',
                            WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
                            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 var(--lg-border)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-center pt-2 pb-1">
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
                                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl ${(item as any).highlight
                                            ? 'text-primary-foreground transition-all active:scale-95'
                                            : 'text-muted-foreground hover:text-primary neu-raised-sm neu-pressable'
                                        }`}
                                    style={(item as any).highlight
                                        ? { background: 'oklch(0.68 0.15 237)', boxShadow: '0 6px 16px oklch(0.68 0.15 237 / 0.35)' }
                                        : undefined
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
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground neu-raised-sm neu-pressable"
                            >
                                {theme === 'light' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                                {theme === 'light' ? 'Oscuro' : 'Claro'}
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-destructive neu-raised-sm neu-pressable"
                            >
                                <LogOutIcon className="h-4 w-4" />
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom nav bar — P5: Liquid Glass flotante con blur adaptativo (P2) */}
            <nav
                className="fixed left-4 right-4 z-50 md:hidden max-w-lg mx-auto rounded-full border border-white/8 dark:border-white/6"
                style={{
                    bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)',
                    backdropFilter: 'blur(40px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                    /* iOS 26: sombra suave + borde de luz superior */
                    boxShadow: '0 8px 32px oklch(0.10 0.02 240 / 0.12), 0 2px 8px oklch(0.10 0.02 240 / 0.06), inset 0 1px 0 rgba(255,255,255,0.12)',
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
                                    className="relative flex flex-col items-center justify-center py-2 px-1 text-[10px] font-medium transition-colors"
                                >
                                    {/* Píldora activa animada */}
                                    {isOnThisRoute && (
                                        <motion.span
                                            layoutId="nav-active-pill"
                                            className="absolute inset-x-1 inset-y-1.5 rounded-full"
                                            style={{
                                                background: 'oklch(0.68 0.15 237 / 0.15)',
                                                boxShadow: '0 0 12px oklch(0.68 0.15 237 / 0.20)',
                                            }}
                                            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                                        />
                                    )}
                                    <div className={`relative flex flex-col items-center gap-0.5 z-10 transition-colors duration-200 ${isOnThisRoute ? 'text-primary dark:text-primary' : 'text-muted-foreground'}`}>
                                        <motion.div animate={{ scale: isOnThisRoute ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
                                            <item.icon className={`h-5 w-5 transition-transform duration-150 ${feedTapped ? 'scale-90' : 'scale-100'}`} />
                                        </motion.div>
                                        <span className={`transition-all duration-200 ${isOnThisRoute ? 'font-semibold' : 'font-medium'}`}>Novedades</span>
                                    </div>
                                </button>
                            );
                        }
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setShowMore(false)}
                                className="relative flex flex-col items-center justify-center py-2 px-1 text-[10px] font-medium transition-colors"
                            >
                                {({ isActive }) => (
                                    <>
                                        {isActive && (
                                            <motion.span
                                                layoutId="nav-active-pill"
                                                className="absolute inset-x-1 inset-y-1.5 rounded-full"
                                                style={{
                                                    background: 'oklch(0.68 0.15 237 / 0.15)',
                                                    boxShadow: '0 0 12px oklch(0.68 0.15 237 / 0.20)',
                                                }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                                            />
                                        )}
                                        <div className={`relative flex flex-col items-center gap-0.5 z-10 transition-colors duration-200 ${isActive ? 'text-primary dark:text-primary' : 'text-muted-foreground'}`}>
                                            <motion.div animate={{ scale: isActive ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
                                                <item.icon className="h-5 w-5" />
                                            </motion.div>
                                            <span className={`transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                                        </div>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}

                    {/* Center: + button → opens drawer */}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => setShowMore(!showMore)}
                            aria-label="Más opciones"
                            className="flex items-center justify-center"
                        >
                            <span
                                className={`flex h-[50px] w-[50px] items-center justify-center rounded-full text-white transition-all duration-200 active:scale-90 ${showMore ? 'rotate-45' : ''}`}
                                style={{
                                    background: 'oklch(0.68 0.15 237)',
                                    boxShadow: '0 0 12px oklch(0.68 0.15 237 / 0.35), 0 2px 8px oklch(0 0 0 / 0.15)',
                                    transition: 'transform 0.3s ease',
                                }}
                            >
                                <PlusIcon className="h-5 w-5" strokeWidth={2.5} />
                            </span>
                        </button>
                    </div>

                    {/* Messages */}
                    <NavLink
                        to="/messages"
                        onClick={() => setShowMore(false)}
                        className="relative flex flex-col items-center justify-center py-2 px-1 text-[10px] font-medium transition-colors"
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <motion.span
                                        layoutId="nav-active-pill"
                                        className="absolute inset-x-1 inset-y-1.5 rounded-full"
                                        style={{
                                            background: 'oklch(0.68 0.15 237 / 0.15)',
                                            boxShadow: '0 0 12px oklch(0.68 0.15 237 / 0.20)',
                                        }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                                    />
                                )}
                                <div className={`relative flex flex-col items-center gap-0.5 z-10 transition-colors duration-200 ${isActive ? 'text-primary dark:text-primary' : 'text-muted-foreground'}`}>
                                    <div className="relative">
                                        <motion.div animate={{ scale: isActive ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
                                            <MessageCircleIcon className="h-5 w-5" />
                                        </motion.div>
                                        {unreadMessages > 0 && (
                                            <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-black leading-none">
                                                {unreadMessages}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>Chats</span>
                                </div>
                            </>
                        )}
                    </NavLink>

                    {/* Profile */}
                    <NavLink
                        to={profilePath}
                        onClick={() => setShowMore(false)}
                        className="relative flex flex-col items-center justify-center py-2 px-1 text-[10px] font-medium transition-colors"
                    >
                        {isProfileActive && (
                            <motion.span
                                layoutId="nav-active-pill"
                                className="absolute inset-x-1 inset-y-1.5 rounded-full"
                                style={{
                                    background: 'oklch(0.68 0.15 237 / 0.15)',
                                    boxShadow: '0 0 12px oklch(0.68 0.15 237 / 0.20)',
                                }}
                                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
                            />
                        )}
                        <div className={`relative flex flex-col items-center gap-0.5 z-10 transition-colors duration-200 ${isProfileActive ? 'text-primary dark:text-primary' : 'text-muted-foreground'}`}>
                            <motion.div animate={{ scale: isProfileActive ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
                                <div className={`h-5 w-5 rounded-full overflow-hidden ring-[1.5px] transition-all ${isProfileActive ? 'ring-primary' : 'ring-transparent'}`}>
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                                            <UserIcon className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                            <span className={`transition-all duration-200 ${isProfileActive ? 'font-semibold' : 'font-medium'}`}>Tú</span>
                        </div>
                    </NavLink>
                </div>
            </nav>
        </>
    );
}
