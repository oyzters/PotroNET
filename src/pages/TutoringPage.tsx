import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import {
    BookOpenIcon, SearchIcon, PlusIcon, UserIcon, CalendarIcon, XIcon, AwardIcon
} from 'lucide-react';
import { WeeklyCalendar, type TimeBlock } from '@/components/tutoring/WeeklyCalendar';

interface Tutor { id: string; full_name: string; avatar_url: string; email: string; reputation: number; career: { id: string; name: string } | null }
interface Offer {
    id: string; subject_name: string; description: string; schedule: string;
    max_students: number; tutor: Tutor; created_at: string;
}
interface OffersResponse {
    offers: Offer[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Display a stored schedule string (legacy or JSON) */
function formatSchedule(schedule: string): string {
    if (!schedule) return '';
    try {
        const arr = JSON.parse(schedule);
        if (Array.isArray(arr) && arr.length > 0) {
            if (typeof arr[0] === 'object' && arr[0].start) {
                if (arr.length === 1) {
                    const d = new Date(arr[0].date + 'T12:00:00');
                    return `${d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · ${arr[0].start}–${arr[0].end}`;
                }
                return `${arr.length} sesiones`;
            }
            if (typeof arr[0] === 'string') {
                return arr.length === 1 ? arr[0] : `${arr.length} sesiones`;
            }
        }
    } catch { /* not JSON */ }
    const m = schedule.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
    if (m) {
        const d = new Date(`${m[1]}T${m[2]}`);
        return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + m[2];
    }
    return schedule;
}

export function TutoringPage() {
    const { session } = useAuth();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreate, setShowCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Create offer form
    const [newSubject, setNewSubject] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [blockError, setBlockError] = useState('');

    const fetchOffers = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '12' });
            if (search) params.set('subject', search);
            const data = await api<OffersResponse>(`/tutoring?${params}`, { token: session.access_token });
            setOffers(data.offers);
            setTotalPages(data.pagination.totalPages);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token, page, search]);

    useEffect(() => { fetchOffers(); }, [fetchOffers]);

    const handleCreateOffer = async () => {
        if (!session?.access_token || !newSubject.trim()) return;
        if (timeBlocks.length === 0) {
            setBlockError('Crea al menos un bloque horario en el calendario.');
            return;
        }
        setBlockError('');
        const schedule = JSON.stringify(
            timeBlocks.map(b => ({ date: b.date, start: b.startTime, end: b.endTime }))
        );
        setSubmitting(true);
        try {
            await api('/tutoring', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({ subject_name: newSubject, description: newDescription, schedule }),
            });
            setShowCreate(false);
            setNewSubject(''); setNewDescription(''); setTimeBlocks([]);
            fetchOffers();
        } catch { /* silent */ } finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 dark:bg-none dark:bg-background">
            {/* Hero Section */}
            <div className="px-4 md:px-8 pt-8 md:pt-12 pb-6">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Centro de Tutorías
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-2xl mx-auto">
                        Encuentra ayuda académica u ofrece tus conocimientos. Conecta con tutores y estudiantes para potenciar tu aprendizaje.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center gap-3">
                        <Button 
                            onClick={() => { setShowCreate(!showCreate); }}
                            variant={showCreate ? 'outline' : 'default'} 
                            className="rounded-full px-6 shadow-lg shadow-primary/25"
                        >
                            {showCreate ? <XIcon className="mr-2 h-4 w-4" /> : <PlusIcon className="mr-2 h-4 w-4" />}
                            {showCreate ? 'Cancelar' : 'Ofrecer Tutoría'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Create Offer Form */}
            {showCreate && (
                <div className="px-4 md:px-8 pb-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
                            <h3 className="font-semibold text-lg mb-6">Nueva tutoría</h3>
                            
                            <div className="space-y-4">
                                <Input
                                    placeholder="Materia *"
                                    value={newSubject}
                                    onChange={e => setNewSubject(e.target.value)}
                                    className="rounded-xl bg-background border-border/50 h-12"
                                />
                                <Textarea
                                    placeholder="Describe qué temas cubrirás, tu metodología, etc. (opcional)"
                                    value={newDescription}
                                    onChange={e => setNewDescription(e.target.value)}
                                    maxLength={300}
                                    className="resize-none rounded-xl bg-background border-border/50 min-h-[100px]"
                                />

                                {/* Weekly Calendar */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-medium">
                                        <CalendarIcon className="h-4 w-4" />
                                        Horario de sesiones *
                                    </label>
                                    <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                                        <WeeklyCalendar
                                            blocks={timeBlocks}
                                            onChange={blocks => { setTimeBlocks(blocks); setBlockError(''); }}
                                        />
                                    </div>
                                    {blockError && <p className="text-xs text-destructive">{blockError}</p>}
                                </div>

                                <Button className="w-full rounded-xl h-12 text-base" onClick={handleCreateOffer}
                                    disabled={submitting || !newSubject.trim()}>
                                    {submitting
                                        ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                        : 'Publicar Tutoría'
                                    }
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Section */}
            <div className="px-4 md:px-8 pb-6">
                <div className="max-w-4xl mx-auto">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                        <div className="relative bg-background border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                            <div className="flex items-center">
                                <div className="pl-4 pr-3">
                                    <SearchIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <Input
                                    placeholder="Buscar por materia..."
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base py-3 pl-2 pr-0 w-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Offers List */}
            <div className="px-4 md:px-8 pb-8">
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : offers.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-6">
                                <BookOpenIcon className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No hay tutorías disponibles</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Sé el primero en ofrecer ayuda académica a otros estudiantes.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {offers.map(offer => (
                                <div key={offer.id} className="bg-card/40 backdrop-blur-sm border border-border/30 rounded-2xl p-6 hover:bg-card/60 hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                                    {/* Mobile Layout */}
                                    <div className="md:hidden">
                                        <Link to={`/profile/${offer.tutor.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden">
                                                {offer.tutor.avatar_url
                                                    ? <img src={offer.tutor.avatar_url} alt={offer.tutor.full_name} className="h-full w-full object-cover" />
                                                    : <UserIcon className="h-5 w-5 text-white" />
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-white">{offer.tutor.full_name}</p>
                                                {offer.tutor.career && (
                                                    <p className="text-xs text-zinc-400">{offer.tutor.career.name}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                <AwardIcon className="h-4 w-4 fill-yellow-500" />
                                                <span className="text-sm font-bold">{offer.tutor.reputation}</span>
                                            </div>
                                        </Link>
                                        <div className="mt-3 px-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="default" className="px-3 py-1 text-xs font-medium">
                                                    {offer.subject_name}
                                                </Badge>
                                                <Badge variant="secondary" className="px-2 py-1 text-xs bg-zinc-700 text-zinc-300">
                                                    {offer.tutor.career?.name || 'General'}
                                                </Badge>
                                            </div>
                                            {offer.description && (
                                                <p className="text-xs text-zinc-400 mb-2">{offer.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <CalendarIcon className="h-3 w-3" />
                                                <span>{formatSchedule(offer.schedule)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Desktop Layout */}
                                    <div className="hidden md:flex gap-6">
                                        {/* Tutor Avatar */}
                                        <div className="relative">
                                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105">
                                                {offer.tutor.avatar_url
                                                    ? <img src={offer.tutor.avatar_url} alt={offer.tutor.full_name} className="h-full w-full object-cover" />
                                                    : <UserIcon className="h-8 w-8 text-white" />
                                                }
                                            </div>
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <Badge variant="default" className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-105">
                                                            {offer.subject_name}
                                                        </Badge>
                                                        {offer.tutor.career && (
                                                            <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-secondary/60 border border-border/30 transition-all duration-300 group-hover:bg-secondary/80">
                                                                {offer.tutor.career.name}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Tutor Info Simplificada */}
                                                    <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                                                        <div className="text-sm">
                                                            <span className="font-medium text-foreground">{offer.tutor.full_name}</span>
                                                            <span className="text-muted-foreground ml-2">· {offer.tutor.reputation} pts</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {offer.description && (
                                                        <p className="text-muted-foreground leading-relaxed text-sm transition-all duration-300 group-hover:text-foreground/80 mt-4">{offer.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Schedule Badge - Nuevo Diseño */}
                                        {offer.schedule && (
                                            <div className="shrink-0">
                                                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:border-primary/30 group-hover:from-primary/15 group-hover:to-primary/10">
                                                    <div className="flex items-center gap-3 text-primary mb-3">
                                                        <CalendarIcon className="h-5 w-5" />
                                                        <span className="text-sm font-semibold">Horario</span>
                                                    </div>
                                                    <div className="bg-background/60 rounded-xl px-3 py-2 border border-border/30">
                                                        <p className="text-sm font-medium text-foreground leading-relaxed">
                                                            {formatSchedule(offer.schedule)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                                onClick={() => setPage(p => p - 1)}
                                className="rounded-full border-border/50"
                            >
                                Anterior
                            </Button>
                            <span className="flex items-center text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={page === totalPages} 
                                onClick={() => setPage(p => p + 1)}
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
