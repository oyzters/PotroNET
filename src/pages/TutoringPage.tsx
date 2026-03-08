import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    BookOpenIcon, SearchIcon, PlusIcon, UserIcon, StarIcon, CalendarIcon, XIcon,
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Tutorías</h1>
                    <p className="text-sm text-muted-foreground">Encuentra y ofrece tutorías académicas</p>
                </div>
                <Button onClick={() => { setShowCreate(!showCreate); }}
                    variant={showCreate ? 'secondary' : 'default'}>
                    {showCreate
                        ? <><XIcon className="mr-1 h-4 w-4" /> Cancelar</>
                        : <><PlusIcon className="mr-1 h-4 w-4" /> Ofrecer Tutoría</>
                    }
                </Button>
            </div>

            {/* Create offer form */}
            {showCreate && (
                <div className="rounded-xl border border-primary/30 bg-card/50 p-5 space-y-4">
                    <h3 className="font-semibold">Nueva tutoría</h3>

                    <Input
                        placeholder="Materia *"
                        value={newSubject}
                        onChange={e => setNewSubject(e.target.value)}
                    />
                    <Textarea
                        placeholder="Descripción de la tutoría (opcional)"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                        maxLength={300}
                        className="resize-none"
                    />

                    {/* Weekly Calendar */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-sm font-medium">
                            <CalendarIcon className="h-4 w-4" />
                            Horario de sesiones *
                        </label>
                        <WeeklyCalendar
                            blocks={timeBlocks}
                            onChange={blocks => { setTimeBlocks(blocks); setBlockError(''); }}
                        />
                        {blockError && <p className="text-xs text-destructive">{blockError}</p>}
                    </div>

                    <Button className="w-full" onClick={handleCreateOffer}
                        disabled={submitting || !newSubject.trim()}>
                        {submitting
                            ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                            : 'Publicar Tutoría'
                        }
                    </Button>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Buscar por materia..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10"
                />
            </div>

            {/* Offers list */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : offers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">No hay tutorías disponibles</p>
                    <p className="mt-1 text-sm text-muted-foreground">Sé el primero en ofrecer una</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {offers.map(offer => (
                        <div key={offer.id}
                            className="group flex w-full items-start gap-5 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">

                            {/* Tutor avatar */}
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
                                {offer.tutor.avatar_url
                                    ? <img src={offer.tutor.avatar_url} alt={offer.tutor.full_name} className="h-full w-full object-cover" />
                                    : <UserIcon className="h-7 w-7 text-primary" />
                                }
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="default" className="text-sm px-3 py-0.5">{offer.subject_name}</Badge>
                                    {offer.tutor.career && <Badge variant="secondary">{offer.tutor.career.name}</Badge>}
                                </div>

                                {offer.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">{offer.description}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-4 pt-1">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                            {offer.tutor.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium">{offer.tutor.full_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-amber-500">
                                        <StarIcon className="h-4 w-4 fill-amber-500" />
                                        <span className="font-medium">{offer.tutor.reputation}</span>
                                        <span className="text-muted-foreground">reputación</span>
                                    </div>
                                </div>
                            </div>

                            {/* Schedule badge */}
                            {offer.schedule && (
                                <div className="shrink-0">
                                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <CalendarIcon className="h-3 w-3" />
                                            <span>Sesión</span>
                                        </div>
                                        <p className="mt-1 font-medium text-foreground text-sm">
                                            {formatSchedule(offer.schedule)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                    <span className="flex items-center text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                </div>
            )}
        </div>
    );
}
