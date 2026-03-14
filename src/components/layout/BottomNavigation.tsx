import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { HomeIcon, SearchIcon, PlusIcon, MessageCircleIcon, UserIcon } from 'lucide-react';

export function BottomNavigation() {
    const { profile } = useAuth();

    const navItems = [
        { to: '/feed', icon: HomeIcon, label: 'Feed' },
        { to: '/search', icon: SearchIcon, label: 'Explore' },
        // The Create Post button is handled specially below
        { isCreateButton: true },
        { to: '/messages', icon: MessageCircleIcon, label: 'Mensajes' },
        { to: profile ? `/profile/${profile.id}` : '/login', icon: UserIcon, label: 'Perfil' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/90 px-2 pb-safe backdrop-blur-xl md:hidden">
            {navItems.map((item) => {
                if (item.isCreateButton) {
                    return (
                        <div key="create" className="flex items-center justify-center">
                            <NavLink
                                to="/feed#create"
                                className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-neon-primary transition-transform active:scale-95"
                                aria-label="Crear publicación"
                            >
                                <PlusIcon className="h-6 w-6" />
                            </NavLink>
                        </div>
                    );
                }

                if (!item.to || !item.icon) return null;
                const Icon = item.icon;

                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                            }`
                        }
                    >
                        <Icon className="h-6 w-6" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </NavLink>
                );
            })}
        </div>
    );
}
