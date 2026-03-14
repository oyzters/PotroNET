import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { UserIcon, TrendingUpIcon, UsersIcon, ZapIcon } from 'lucide-react';

interface SuggestedUser {
    id: string;
    full_name: string;
    avatar_url: string;
    career?: { name: string } | null;
}

const FEATURES = [
    {text: 'Mapa curricular interactivo' },
    {text: 'Evaluaciones anónimas de profesores' },
    {text: 'Tutorías entre alumnos' },
    {text: 'Mensajes directos' },
];

const NEWS = [
    { text: 'Nuevas carreras disponibles próximamente', date: 'Mar 2026' },
    { text: 'Sistema de tutorías actualizado', date: 'Feb 2026' },
    { text: 'PotroNET v2 con nuevas funciones', date: 'Ene 2026' },
];

export function RightPanel() {
    const { session, profile } = useAuth();
    const [suggested, setSuggested] = useState<SuggestedUser[]>([]);

    useEffect(() => {
        const fetchSuggested = async () => {
            if (!session?.access_token) return;
            try {
                const data = await api<{ profiles: SuggestedUser[] }>(
                    '/profiles?limit=5',
                    { token: session.access_token }
                );
                // Filter out current user
                setSuggested((data.profiles || []).filter(p => p.id !== profile?.id).slice(0, 4));
            } catch { /* silent */ }
        };
        fetchSuggested();
    }, [session?.access_token, profile?.id]);

    return (
        <div className="sticky top-20 space-y-4">
            {/* Suggested people */}
            {suggested.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Personas sugeridas</span>
                    </div>
                    <div className="space-y-3">
                        {suggested.map(u => (
                            <Link key={u.id} to={`/profile/${u.id}`}
                                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                    <Link to="/friends" className="mt-2 block text-center text-xs text-primary hover:underline">
                        Ver más →
                    </Link>
                </div>
            )}

            {/* Features */}
            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4">
                <div className="mb-3 flex items-center gap-2">
                    <ZapIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Funciones PotroNET</span>
                </div>
                <div className="space-y-2">
                    {FEATURES.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{f.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* News */}
            <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4">
                <div className="mb-3 flex items-center gap-2">
                    <TrendingUpIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Novedades</span>
                </div>
                <div className="space-y-3">
                    {NEWS.map((n, i) => (
                        <div key={i} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                            <p className="text-xs font-medium leading-tight">{n.text}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{n.date}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <p className="px-1 text-xs text-muted-foreground/60">
                PotroNET © 2026 · ITSON
            </p>
        </div>
    );
}
