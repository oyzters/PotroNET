import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SunIcon, MoonIcon, LogOutIcon, UserIcon } from 'lucide-react';

export function Navbar() {
    const { profile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    // Hide avatar on mobile when viewing own profile (redundant with profile page avatar)
    const isOwnProfile = profile && location.pathname === `/profile/${profile.id}`;

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <header className="sticky top-0 z-50 hidden md:flex h-16 w-full items-center border-b px-4 md:px-6 transition-shadow duration-300"
            style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(1.2)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
                borderColor: 'var(--glass-border)',
                boxShadow: '0 1px 0 var(--glass-border), 0 4px 24px oklch(0.68 0.15 237 / 0.06)',
            }}
        >
            <div className="flex w-full items-center justify-between">
                {/* Left: logo */}
                <div className="flex items-center gap-2">
                    <Link to="/feed" className="flex items-center gap-2 group">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 transition-all duration-300 group-hover:shadow-primary/40">
                            <span className="text-base font-black text-primary-foreground">P</span>
                        </div>
                        <span className="hidden text-lg font-bold sm:block">
                            Potro<span className="text-primary">NET</span>
                        </span>
                    </Link>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 transition-all duration-300">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="rounded-full transition-all duration-300 hover:bg-primary/10 hover:text-primary"
                    >
                        <span className="inline-flex transition-transform duration-300 hover:rotate-12">
                            {theme === 'light' ? (
                                <MoonIcon className="h-5 w-5" />
                            ) : (
                                <SunIcon className="h-5 w-5" />
                            )}
                        </span>
                    </Button>

                    <div className={`transition-all duration-300 origin-right ${isOwnProfile ? 'md:scale-100 md:opacity-100 md:w-auto scale-0 opacity-0 w-0 overflow-hidden' : 'scale-100 opacity-100 w-auto'}`}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative rounded-full">
                                    <div
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-2 ring-transparent transition-all duration-200 hover:ring-primary/40"
                                        style={{ boxShadow: 'none' }}
                                    >
                                        {profile?.avatar_url ? (
                                            <img
                                                src={profile.avatar_url}
                                                alt={profile.full_name}
                                                className="h-8 w-8 rounded-full object-cover"
                                            />
                                        ) : (
                                            <UserIcon className="h-4 w-4 text-primary" />
                                        )}
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="px-3 py-2">
                                    <p className="text-sm font-medium">{profile?.full_name || 'Usuario'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/profile/${profile?.id}`)}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    Mi Perfil
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                                    <LogOutIcon className="mr-2 h-4 w-4" />
                                    Cerrar Sesión
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </header>
    );
}
