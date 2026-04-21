import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { UserIcon, TrophyIcon, UsersIcon, StarIcon } from 'lucide-react';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface RankingUser {
    id: string;
    full_name: string;
    avatar_url: string;
    reputation: number;
    friends_count: number;
    followers_count: number;
    following_count: number;
    semester: number;
    career_id: string | null;
    career_name: string | null;
    popularity_score: number;
}

interface RankedProfessor {
    id: string;
    full_name: string;
    avg_rating: number;
    total_reviews: number;
    career?: { id: string; name: string } | null;
}

interface Career { id: string; name: string }

type Tab = 'users' | 'professors';

function AvatarCircle({ url, name, size }: { url: string; name: string; size: string }) {
    return (
        <div className={`rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ${size}`}>
            {url
                ? <img src={url} alt={name} className="h-full w-full object-cover" />
                : <UserIcon className="h-5 w-5 text-primary" />}
        </div>
    );
}

function PodiumCard({ user, rank, isMe }: { user: RankingUser; rank: number; isMe: boolean }) {
    const styles: Record<number, { border: string; bg: string; avatar: string; badge: string; badgeBg: string; label: string }> = {
        1: { border: 'border-amber-400', bg: 'bg-gradient-to-b from-amber-500/10 to-transparent', avatar: 'h-20 w-20', badge: 'text-amber-600', badgeBg: 'bg-amber-100', label: 'Oro' },
        2: { border: 'border-gray-300', bg: 'bg-gradient-to-b from-gray-300/10 to-transparent', avatar: 'h-16 w-16', badge: 'text-gray-500', badgeBg: 'bg-gray-100', label: 'Plata' },
        3: { border: 'border-amber-700/50', bg: 'bg-gradient-to-b from-amber-800/10 to-transparent', avatar: 'h-16 w-16', badge: 'text-amber-700', badgeBg: 'bg-amber-50', label: 'Bronce' },
    };
    const s = styles[rank];

    return (
        <Link
            to={`/profile/${user.id}`}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 ${s.border} ${s.bg} p-3 transition-transform hover:scale-[1.02] ${rank === 1 ? '-mt-4' : 'mt-2'}`}
        >
            {rank === 1 && <span className="text-2xl leading-none">👑</span>}
            <div className={`relative ${rank === 1 ? 'rounded-full p-[2px] bg-gradient-to-br from-amber-300 to-amber-600' : ''}`}>
                <AvatarCircle url={user.avatar_url} name={user.full_name} size={s.avatar} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeBg} ${s.badge}`}>#{rank} {s.label}</span>
            <p className={`text-[12px] font-bold truncate max-w-[90px] text-center ${isMe ? 'text-primary' : ''}`}>
                {user.full_name.split(' ').slice(0, 2).join(' ')}
                {isMe && <span className="text-[10px] text-primary ml-1">(Tú)</span>}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><UsersIcon className="h-3 w-3" />{user.followers_count}</span>
                <span className="flex items-center gap-0.5 text-amber-500"><StarIcon className="h-3 w-3" />{user.reputation}</span>
            </div>
        </Link>
    );
}

export function RankingPage() {
    const { session, user } = useAuth();
    const [tab, setTab] = useState<Tab>('users');

    // Users tab state
    const [rankings, setRankings] = useState<RankingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [careers, setCareers] = useState<Career[]>([]);
    const [selectedCareer, setSelectedCareer] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Professors tab state
    const [professors, setProfessors] = useState<RankedProfessor[]>([]);
    const [loadingProfs, setLoadingProfs] = useState(false);

    useEffect(() => {
        if (!session?.access_token) return;
        api<{ careers: Career[] }>('/careers', { token: session.access_token })
            .then(d => setCareers(d.careers))
            .catch(() => {});
    }, [session?.access_token]);

    useEffect(() => {
        if (!session?.access_token || tab !== 'users') return;
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (selectedCareer !== 'all') params.set('career_id', selectedCareer);

        api<{ rankings: RankingUser[]; pagination: { totalPages: number } }>(
            `/rankings?${params}`, { token: session.access_token }
        )
            .then(d => {
                setRankings(d.rankings);
                setTotalPages(d.pagination.totalPages);
            })
            .catch(e => { if (import.meta.env.DEV) console.error('Rankings fetch error:', e); })
            .finally(() => setLoading(false));
    }, [session?.access_token, page, selectedCareer, tab]);

    useEffect(() => {
        if (!session?.access_token || tab !== 'professors') return;
        setLoadingProfs(true);
        api<{ professors: RankedProfessor[] }>('/professors?sort=rating&limit=20', { token: session.access_token })
            .then(d => setProfessors(d.professors))
            .catch(e => { if (import.meta.env.DEV) console.error('Professors fetch error:', e); })
            .finally(() => setLoadingProfs(false));
    }, [session?.access_token, tab]);

    const handleCareerChange = (value: string) => {
        setSelectedCareer(value);
        setPage(1);
    };

    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    return (
        <div className="space-y-4 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black flex items-center gap-2">
                        <TrophyIcon className="h-5 w-5 text-amber-500" />
                        Ranking
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Los más populares de PotroNET</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
                <button
                    onClick={() => setTab('users')}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${tab === 'users' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Usuarios
                </button>
                <button
                    onClick={() => setTab('professors')}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${tab === 'professors' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Mejores Profesores
                </button>
            </div>

            {tab === 'users' && (
                <>
                    {/* Career filter */}
                    <Select value={selectedCareer} onValueChange={handleCareerChange}>
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Todas las carreras" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las carreras</SelectItem>
                            {careers.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {loading ? (
                        <ListSkeleton count={8} />
                    ) : rankings.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">No hay usuarios en este ranking.</div>
                    ) : (
                        <>
                            {/* Podium — top 3 */}
                            {page === 1 && top3.length > 0 && (
                                <div className="flex items-end justify-center gap-2 pt-4 pb-2">
                                    {/* #2 left */}
                                    {top3[1] && <PodiumCard user={top3[1]} rank={2} isMe={top3[1].id === user?.id} />}
                                    {/* #1 center */}
                                    {top3[0] && <PodiumCard user={top3[0]} rank={1} isMe={top3[0].id === user?.id} />}
                                    {/* #3 right */}
                                    {top3[2] && <PodiumCard user={top3[2]} rank={3} isMe={top3[2].id === user?.id} />}
                                </div>
                            )}

                            {/* Rest of list */}
                            <div className="space-y-2">
                                {(page === 1 ? rest : rankings).map((u, idx) => {
                                    const rank = page === 1 ? idx + 4 : (page - 1) * 20 + idx + 1;
                                    const isMe = u.id === user?.id;

                                    return (
                                        <Link
                                            key={u.id}
                                            to={`/profile/${u.id}`}
                                            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 ${isMe ? 'border-primary/30 bg-primary/5' : 'border-border'}`}
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-muted-foreground">
                                                {rank}
                                            </div>
                                            <AvatarCircle url={u.avatar_url} name={u.full_name} size="h-10 w-10" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold truncate">
                                                    {u.full_name}
                                                    {isMe && <span className="ml-1.5 text-[10px] text-primary font-bold">(Tú)</span>}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate">{u.career_name || 'Sin carrera'}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
                                                <span className="flex items-center gap-0.5" title="Seguidores">
                                                    <UsersIcon className="h-3 w-3" />
                                                    {u.followers_count}
                                                </span>
                                                <span className="flex items-center gap-0.5 text-amber-500" title="Reputación">
                                                    <StarIcon className="h-3 w-3" />
                                                    {u.reputation}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-4">
                            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                        </div>
                    )}
                </>
            )}

            {tab === 'professors' && (
                <>
                    {loadingProfs ? (
                        <ListSkeleton count={8} />
                    ) : professors.length === 0 ? (
                        <div className="py-16 text-center text-sm text-muted-foreground">No hay profesores calificados aún.</div>
                    ) : (
                        <div className="space-y-2">
                            {professors.map((p, idx) => (
                                <Link
                                    key={p.id}
                                    to={`/professors/${p.id}`}
                                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                                >
                                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                                        {idx < 3 ? <TrophyIcon className="h-5 w-5" /> : idx + 1}
                                    </div>
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                                        {p.avg_rating > 0 ? p.avg_rating.toFixed(1) : '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{p.full_name}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {p.total_reviews > 0 ? `${p.total_reviews} reseñas` : 'Sin reseñas'}
                                            {p.career && ` · ${p.career.name}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <StarIcon key={i} className={`h-3.5 w-3.5 ${i < Math.round(p.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
                                        ))}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
