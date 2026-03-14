import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import {
    SearchIcon, GraduationCapIcon, PlusIcon, XIcon, CheckCircleIcon, AwardIcon
} from 'lucide-react';

interface Career { id: string; name: string }
interface Professor {
    id: string; full_name: string; department: string; avg_rating: number;
    total_reviews: number; career: Career | null; user_id?: string;
}
interface ProfessorsResponse {
    professors: Professor[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

// Function to generate Dicebear avatar
function getAvatarUrl(name: string) {
    return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=f8fafc`;
}

// Function to get score color and neon effect
function getScoreColor(rating: number) {
    if (rating >= 4.5) return 'from-emerald-400 to-emerald-600 shadow-emerald-500/50 shadow-lg shadow-emerald-500/30';
    if (rating >= 3.5) return 'from-blue-400 to-blue-600 shadow-blue-500/50 shadow-lg shadow-blue-500/30';
    if (rating >= 2.5) return 'from-amber-400 to-amber-600 shadow-amber-500/50 shadow-lg shadow-amber-500/30';
    return 'from-red-400 to-red-600 shadow-red-500/50 shadow-lg shadow-red-500/30';
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
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 dark:bg-none dark:bg-background">
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

            {/* Hero Section */}
            <div className="px-4 md:px-8 pt-8 md:pt-12 pb-6">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Directorio de Profesores
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-2xl mx-auto">
                        Evalúa y consulta calificaciones de profesores. Encuentra los mejores docentes para tu aprendizaje.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center gap-3">
                        <Button 
                            onClick={() => setShowRequest(!showRequest)} 
                            variant={showRequest ? 'outline' : 'default'} 
                            className="rounded-full px-6 shadow-lg shadow-primary/25"
                        >
                            {showRequest ? <XIcon className="h-4 w-4 mr-2" /> : <PlusIcon className="h-4 w-4 mr-2" />}
                            {showRequest ? 'Cancelar' : 'Agregar Profesor'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Request Form */}
            {showRequest && (
                <div className="px-4 md:px-8 pb-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
                            <h3 className="font-semibold text-lg mb-6">Solicitar agregar profesor</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input 
                                    placeholder="Nombre del profesor *" 
                                    value={requestName} 
                                    onChange={(e) => setRequestName(e.target.value)} 
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
            <div className="px-4 md:px-8 pb-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                                <div className="relative bg-background border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                                    <div className="flex items-center">
                                        <div className="pl-4 pr-3">
                                            <SearchIcon className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <Input
                                            placeholder="Buscar profesor..."
                                            value={search}
                                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base py-3 pl-2 pr-0 w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Filters */}
                        <div className="flex gap-3">
                            <select 
                                value={careerId} 
                                onChange={(e) => { setCareerId(e.target.value); setPage(1); }} 
                                className="rounded-xl border border-border/50 bg-background px-4 py-2 text-sm w-40"
                            >
                                <option value="">Todas las carreras</option>
                                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select 
                                value={sort} 
                                onChange={(e) => { setSort(e.target.value); setPage(1); }} 
                                className="rounded-xl border border-border/50 bg-background px-4 py-2 text-sm w-40"
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
                        <div className="flex justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
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
                        <div className="space-y-0">
                            {professors.map((prof) => (
                                <Link to={`/professors/${prof.id}`} key={prof.id}>
                                    <div className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-6 hover:bg-card/60 transition-all group mb-4">
                                        {/* Mobile Layout */}
                                        <div className="md:hidden">
                                            <div className="flex items-start gap-3 p-1 rounded-lg">
                                                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                                                    <img src={getAvatarUrl(prof.full_name)} alt={prof.full_name} className="h-full w-full object-cover mix-blend-multiply" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex-1 min-w-0 pr-1">
                                                            <p className="text-base font-semibold text-white truncate">{prof.full_name}</p>
                                                            <Badge variant="secondary" className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300 mt-1 inline-block">
                                                                {prof.career?.name || 'General'}
                                                            </Badge>
                                                        </div>
                                                        <div className={`flex items-center justify-center h-12 w-12 rounded-lg text-sm font-bold shrink-0 bg-gradient-to-br ${getScoreColor(Number(prof.avg_rating || 0))} shadow-md ml-3`}
                                                             style={{
                                                               boxShadow: Number(prof.avg_rating || 0) >= 4.5 ? '0 0 20px rgba(52, 211, 153, 0.5)' :
                                                                           Number(prof.avg_rating || 0) >= 3.5 ? '0 0 20px rgba(59, 130, 246, 0.5)' :
                                                                           Number(prof.avg_rating || 0) >= 2.5 ? '0 0 20px rgba(251, 191, 36, 0.5)' :
                                                                           '0 0 20px rgba(239, 68, 68, 0.5)'
                                                             }}>
                                                            <span className="text-sm font-bold text-white">
                                                                {Number(prof.avg_rating || 0).toFixed(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-zinc-400 truncate mb-1">{prof.department || 'Sin departamento'}</p>
                                                    <div className="flex items-center gap-2">
                                                        <AwardIcon className="h-4 w-4 text-blue-400 fill-blue-400" />
                                                        <p className="text-sm font-bold text-white">{Number(prof.avg_rating || 0).toFixed(1)}</p>
                                                        <p className="text-sm text-zinc-400">({prof.total_reviews} reseñas)</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Desktop Layout */}
                                        <div className="hidden md:flex items-center gap-4">
                                            {/* Avatar - Estilo original */}
                                            <div className="relative">
                                                <div className="h-14 w-14 shrink-0 overflow-hidden items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                                                    <img src={getAvatarUrl(prof.full_name)} alt={prof.full_name} className="h-full w-full object-cover mix-blend-multiply" />
                                                </div>
                                                {prof.user_id && (
                                                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                                                        <CheckCircleIcon className="h-2 w-2 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-lg font-bold">{prof.full_name}</h3>
                                                    <Badge variant="secondary" className="px-2 py-1 text-xs bg-secondary/60">
                                                        {prof.career?.name || 'General'}
                                                    </Badge>
                                                </div>
                                                <p className="text-muted-foreground text-sm mb-2">{prof.department || 'Sin departamento'}</p>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1">
                                                        <AwardIcon className="h-4 w-4 fill-primary text-primary" />
                                                        <span className="font-semibold">{Number(prof.avg_rating || 0).toFixed(1)}</span>
                                                        <span className="text-muted-foreground text-sm">({prof.total_reviews} reseñas)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Rating Badge - Con efecto neón según puntaje */}
                                            <div className="text-right">
                                                <div className={`flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br ${getScoreColor(Number(prof.avg_rating || 0))} shadow-lg transition-all duration-300`}
                                                     style={{
                                                       boxShadow: Number(prof.avg_rating || 0) >= 4.5 ? '0 0 20px rgba(52, 211, 153, 0.5), 0 0 40px rgba(52, 211, 153, 0.3)' :
                                                                 Number(prof.avg_rating || 0) >= 3.5 ? '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)' :
                                                                 Number(prof.avg_rating || 0) >= 2.5 ? '0 0 20px rgba(251, 191, 36, 0.5), 0 0 40px rgba(251, 191, 36, 0.3)' :
                                                                 '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)',
                                                       animation: 'pulse 2s infinite'
                                                     }}>
                                                    <span className="text-sm font-bold text-white">
                                                        {Number(prof.avg_rating || 0).toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-8">
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
