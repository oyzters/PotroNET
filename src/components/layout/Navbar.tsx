import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SunIcon, MoonIcon, LogOutIcon, UserIcon, SearchIcon, MenuIcon } from 'lucide-react';

interface NavbarProps {
    onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
    const { profile, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
            <div className="flex w-full items-center gap-4">
                {/* Mobile menu */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onToggleSidebar}
                >
                    <MenuIcon className="h-5 w-5" />
                </Button>

                {/* Logo */}
                <Link to="/feed" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <span className="text-sm font-bold text-primary-foreground">P</span>
                    </div>
                    <span className="hidden text-lg font-bold text-foreground sm:block">
                        Potro<span className="text-primary">NET</span>
                    </span>
                </Link>

                {/* Search */}
                <div className="mx-auto hidden max-w-md flex-1 md:block">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar estudiantes, carreras, profesores..."
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={toggleTheme}>
                        {theme === 'light' ? (
                            <MoonIcon className="h-5 w-5" />
                        ) : (
                            <SunIcon className="h-5 w-5" />
                        )}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
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
                                <p className="text-xs text-muted-foreground">{profile?.email}</p>
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
        </header>
    );
}
