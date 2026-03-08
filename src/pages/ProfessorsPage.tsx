import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import {
    SearchIcon, StarIcon, GraduationCapIcon, PlusIcon, XIcon, CheckCircleIcon,
} from 'lucide-react';

interface Career { id: string; name: string }
interface Professor {
    id: string; full_name: string; department: string; avg_rating: number;
    total_reviews: number; career: Career | null;
}
interface ProfessorsResponse {
    professors: Professor[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
    const cls = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    return (
        <div className="flex">
            {[1, 2, 3, 4, 5].map(i => (
                <StarIcon key={i} className={`${cls} ${i <= Math.round(rating) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`} />
            ))}
        </div>
    );
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
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false); // ← confirmation modal

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
                body: JSON.stringify({ professor_name: requestName, department: requestDept, career_id: requestCareer || null }),
            });
            setShowRequest(false);
            setRequestName(''); setRequestDept(''); setRequestCareer('');
            setShowSuccess(true); // Show confirmation modal
        } catch { /* silent */ } finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-6">
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

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Profesores</h1>
                    <p className="text-sm text-muted-foreground">Evalúa y consulta calificaciones de profesores</p>
                </div>
                <Button onClick={() => setShowRequest(!showRequest)} variant={showRequest ? 'secondary' : 'default'}>
                    {showRequest ? <XIcon className="mr-1 h-4 w-4" /> : <PlusIcon className="mr-1 h-4 w-4" />}
                    {showRequest ? 'Cancelar' : 'Solicitar Profesor'}
                </Button>
            </div>

            {showRequest && (
                <div className="rounded-xl border border-border bg-card/50 p-5 space-y-3">
                    <h3 className="font-semibold">Solicitar agregar profesor</h3>
                    <Input placeholder="Nombre del profesor *" value={requestName} onChange={(e) => setRequestName(e.target.value)} />
                    <Input placeholder="Departamento (opcional)" value={requestDept} onChange={(e) => setRequestDept(e.target.value)} />
                    <select value={requestCareer} onChange={(e) => setRequestCareer(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                        <option value="">Seleccionar carrera (opcional)</option>
                        {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleRequest} disabled={submitting || !requestName.trim()}>
                            {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Enviar Solicitud'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowRequest(false)}>Cancelar</Button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar profesor..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
                </div>
                <select value={careerId} onChange={(e) => { setCareerId(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="">Todas las carreras</option>
                    {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <option value="rating">Mejor calificación</option>
                    <option value="reviews">Más evaluaciones</option>
                    <option value="name">Alfabético</option>
                </select>
            </div>

            {/* Full-width professor cards */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : professors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <GraduationCapIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-lg font-medium text-muted-foreground">No se encontraron profesores</p>
                    <p className="mt-1 text-sm text-muted-foreground">Solicita agregar un profesor al sistema</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {professors.map((prof) => (
                        <Link to={`/professors/${prof.id}`} key={prof.id}>
                            <div className="group flex w-full items-center gap-5 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                                {/* Avatar */}
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <GraduationCapIcon className="h-8 w-8 text-primary" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold">{prof.full_name}</h3>
                                        {prof.career && <Badge variant="secondary">{prof.career.name}</Badge>}
                                    </div>
                                    {prof.department && (
                                        <p className="text-sm text-muted-foreground">{prof.department}</p>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <StarRating rating={prof.avg_rating} size="lg" />
                                        <span className="text-lg font-bold">{Number(prof.avg_rating || 0).toFixed(1)}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {prof.total_reviews} {prof.total_reviews === 1 ? 'evaluación' : 'evaluaciones'}
                                        </span>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className="shrink-0">
                                    <span className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        Ver Perfil →
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                    <span className="flex items-center text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
            )}
        </div>
    );
}
