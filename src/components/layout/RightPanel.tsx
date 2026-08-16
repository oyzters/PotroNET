import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { use3DTilt } from '@/hooks/use3DTilt';
import { api } from '@/lib/api';
import { UserIcon, TrendingUpIcon, UsersIcon, ZapIcon, MapIcon, StarIcon, MessageCircleIcon } from 'lucide-react';

interface SuggestedUser {
    id: string;
    full_name: string;
    avatar_url: string;
    career?: { name: string } | null;
}

const FEATURES = [
    { icon: MapIcon, text: 'Mapa curricular interactivo' },
    { icon: StarIcon, text: 'Evaluaciones de profesores' },
    { icon: ZapIcon, text: 'Tutorías entre alumnos' },
    { icon: MessageCircleIcon, text: 'Mensajes directos' },
];

const NEWS = [
    { text: 'Nuevas carreras disponibles próximamente', date: 'Mar 2026' },
    { text: 'Sistema de tutorías actualizado', date: 'Feb 2026' },
    { text: 'PotroNET v2 con nuevas funciones', date: 'Ene 2026' },
];

export function RightPanel() {
    const { session, profile } = useAuth();
    const [suggested, setSuggested] = useState<SuggestedUser[]>([]);

    const panelRef = useRef<HTMLDivElement>(null);
    use3DTilt(panelRef);

    useEffect(() => {
        const fetchSuggested = async () => {
            if (!session?.access_token) return;
            try {
                const [profilesData, friendsData] = await Promise.allSettled([
                    api<{ profiles: SuggestedUser[] }>('/profiles?limit=10', { token: session.access_token }),
                    api<{ friends: { id: string }[] }>('/friends', { token: session.access_token }),
                ]);
                const friendIds = new Set(
                    friendsData.status === 'fulfilled'
                        ? (friendsData.value.friends || []).map(f => f.id)
                        : []
                );
                if (profilesData.status === 'fulfilled') {
                    setSuggested(
                        (profilesData.value.profiles || [])
                            .filter(p => p.id !== profile?.id && !friendIds.has(p.id))
                            .slice(0, 4)
                    );
                }
            } catch { /* silent */ }
        };
        fetchSuggested();
    }, [session?.access_token, profile?.id]);

    return (
        <div className="sticky top-20">
            {/* Unified Neumorphic Right Panel Card (iOS 2026) */}
            <div
                ref={panelRef}
                className="relative overflow-hidden rounded-3xl bg-card/75 dark:bg-card/45 backdrop-blur-xl border border-border/60 dark:border-white/10 p-5 shadow-sm shadow-black/5 space-y-5 transition-all duration-300"
            >
                {/* Suggested people */}
                {suggested.length > 0 && (
                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                                <UsersIcon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-semibold">Personas sugeridas</span>
                        </div>
                        <div className="space-y-2.5">
                            {suggested.map(u => (
                                <Link key={u.id} to={`/profile/${u.id}`}
                                    className="flex items-center gap-3 rounded-2xl p-2 transition-all duration-200 hover:bg-primary/8 group">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-transparent group-hover:ring-primary/30 transition-all">
                                        {u.avatar_url
                                            ? <img src={u.avatar_url} alt={u.full_name} className="h-8 w-8 rounded-full object-cover" />
                                            : <UserIcon className="h-4 w-4" />
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-medium">{u.full_name}</p>
                                        {u.career && <p className="truncate text-xs text-muted-foreground">{u.career.name}</p>}
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <Link to="/friends" className="mt-2.5 block text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            Ver más →
                        </Link>
                    </div>
                )}

                {/* Features section */}
                <div className={suggested.length > 0 ? "pt-4 border-t border-border/40" : ""}>
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                            <ZapIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-semibold">Funciones PotroNET</span>
                    </div>
                    <div className="space-y-2.5">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <f.icon className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* News section */}
                <div className="pt-4 border-t border-border/40">
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                            <TrendingUpIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-semibold">Novedades</span>
                    </div>
                    <div className="space-y-3">
                        {NEWS.map((n, i) => (
                            <div key={i} className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
                                <p className="text-xs font-medium leading-tight">{n.text}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{n.date}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <p className="mt-3 text-center text-xs text-muted-foreground/50">
                PotroNET © 2026 · ITSON
            </p>
        </div>
    );
}
