import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Link } from 'react-router-dom';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
    SearchIcon, GraduationCapIcon, PlusIcon, XIcon, CheckCircleIcon
} from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface Career { id: string; name: string }
interface Professor {
    id: string; full_name: string; department: string; avg_rating: number;
    total_reviews: number; career: Career | null; user_id?: string;
    nickname?: string | null;
}
interface ProfessorsResponse {
    professors: Professor[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

function getAvatarUrl(name: string) {
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=f8fafc`;
}

function getRatingColor(rating: number) {
    if (rating >= 4.5) return 'bg-emerald-500';
    if (rating >= 3.5) return 'bg-blue-500';
    if (rating >= 2.5) return 'bg-amber-500';
    return 'bg-red-500';
}

export function ProfessorsPage() {
    const { session } = useAuth();
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [careerId, setCareerId] = useState('');
    const [sort, setSort] = useState('rating');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Request form state
    const [showRequest, setShowRequest] = useState(false);
    const [requestName, setRequestName] = useState('');
    const [requestDept, setRequestDept] = useState('');
    const [requestCareer, setRequestCareer] = useState('');
    const [requestNickname, setRequestNickname] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    useBodyScrollLock(showSuccess);

    const fetchProfessors = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '15', sort });
            if (search) params.set('search', search);
            if (careerId) params.set('career_id', careerId);
            const data = await api<ProfessorsResponse>(`/professors?${params}`, { token: session.access_token });
            setProfessors(data.professors);
            setTotalPages(data.pagination.totalPages);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token, page, search, careerId, sort]);

    useEffect(() => {
        const fetchCareers = async () => {
            if (!session?.access_token) return;
            try {
                const data = await api<{ careers: Career[] }>('/careers', { token: session.access_token });
                setCareers(data.careers);
            } catch { /* silent */ }
        };
        fetchCareers();
    }, [session?.access_token]);

    useEffect(() => { fetchProfessors(); }, [fetchProfessors]);

    const handleRequest = async () => {
        if (!session?.access_token || !requestName.trim()) return;
        setSubmitting(true);
        try {
            await api('/professors/requests', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ professor_name: requestName, department: requestDept, career_id: requestCareer || null, nickname: requestNickname }),
            });
            setShowRequest(false);
            setRequestName(''); setRequestDept(''); setRequestCareer(''); setRequestNickname('');
            setShowSuccess(true);
        } catch { /* silent */ } finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-dvh pb-24 md:pb-6">
            {/* Confirmation modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSuccess(false)}>
                    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircleIcon className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold">¡Solicitud enviada!</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Tu solicitud para agregar al profesor fue enviada. El equipo de PotroNET la revisará pronto.
                        </p>
                        <Button className="mt-6 w-full" onClick={() => setShowSuccess(false)}>
                            Aceptar
                        </Button>
                    </div>
                </div>
            )}

            <div className="px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    <SectionHeader
                        title="Profesores"
                        subtitle="Evalúa y consulta calificaciones de profesores."
                    >
                        <Button
                            onClick={() => setShowRequest(!showRequest)}
                            variant={showRequest ? 'outline' : 'default'}
                            size="sm"
                            className="rounded-full px-4"
                        >
                            {showRequest ? <XIcon className="h-4 w-4 mr-1" /> : <PlusIcon className="h-4 w-4 mr-1" />}
                            {showRequest ? 'Cancelar' : 'Agregar'}
                        </Button>
                    </SectionHeader>
                </div>
            </div>

            {/* Request Form */}
            {showRequest && (
                <div className="px-4 md:px-8 pb-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
                            <h3 className="font-semibold text-lg mb-6">Solicitar agregar profesor</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    placeholder="Nombre del profesor *"
                                    value={requestName}
                                    onChange={(e) => setRequestName(e.target.value)}
                                    className="rounded-xl bg-background border-border/50"
                                />
                                <Input
                                    placeholder="Apodo (opcional, ej: El Terminator)"
                                    value={requestNickname}
                                    maxLength={40}
                                    onChange={(e) => setRequestNickname(e.target.value)}
                                    className="rounded-xl bg-background border-border/50"
                                />
                                <Input
                                    placeholder="Departamento (opcional)"
                                    value={requestDept}
                                    onChange={(e) => setRequestDept(e.target.value)}
                                    className="rounded-xl bg-background border-border/50"
                                />
                                <select
                                    value={requestCareer}
                                    onChange={(e) => setRequestCareer(e.target.value)}
                                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm"
                                >
                                    <option value="">Seleccionar carrera (opcional)</option>
                                    {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 mt-4">
                                <Button
                                    className="flex-1 rounded-xl"
                                    onClick={handleRequest}
                                    disabled={submitting || !requestName.trim()}
                                >
                                    {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Enviar Solicitud'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="rounded-xl border-border/50"
                                    onClick={() => setShowRequest(false)}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="px-4 md:px-8 pb-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <div className="relative bg-background border border-border/50 rounded-xl">
                                <div className="flex items-center">
                                    <div className="pl-3 pr-2">
                                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <Input
                                        placeholder="Buscar profesor..."
                                        value={search}
                                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-2 pl-1 pr-0 w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={careerId}
                                onChange={(e) => { setCareerId(e.target.value); setPage(1); }}
                                className="flex-1 min-w-0 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Todas las carreras</option>
                                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select
                                value={sort}
                                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                                className="flex-1 min-w-0 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm"
                            >
                                <option value="rating">Mejor calificación</option>
                                <option value="reviews">Más evaluaciones</option>
                                <option value="name">Alfabético</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Professors List */}
            <div className="px-4 md:px-8 pb-8">
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <ListSkeleton count={8} />
                    ) : professors.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-6">
                                <GraduationCapIcon className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No se encontraron profesores</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Solicita agregar un profesor al sistema para que otros puedan evaluarlo.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {professors.map((prof) => (
                                <Link to={`/professors/${prof.id}`} key={prof.id} className="block">
                                    <div className="flex items-center gap-3 py-4 px-1 border-b border-border/50 hover:bg-muted/50 transition-colors">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 overflow-hidden shrink-0">
                                            <img src={getAvatarUrl(prof.full_name)} alt={prof.full_name} className="h-full w-full object-cover mix-blend-multiply" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-semibold text-sm truncate">{prof.full_name}</p>
                                                {prof.nickname && (
                                                    <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                                        {prof.nickname}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {prof.career?.name || 'General'} · {prof.department || 'Sin departamento'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{prof.total_reviews} reseñas</p>
                                        </div>
                                        <div className={`flex items-center justify-center h-10 w-10 rounded-full text-xs font-bold text-white shrink-0 ${getRatingColor(Number(prof.avg_rating || 0))}`}>
                                            {Number(prof.avg_rating || 0).toFixed(1)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="rounded-full border-border/50"
                            >
                                Anterior
                            </Button>
                            <span className="flex items-center text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                                className="rounded-full border-border/50"
                            >
                                Siguiente
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
