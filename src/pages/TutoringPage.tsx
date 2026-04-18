import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Link } from 'react-router-dom';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
    BookOpenIcon, SearchIcon, PlusIcon, UserIcon, CalendarIcon, XIcon, ClockIcon, CheckIcon, XCircleIcon
} from 'lucide-react';
import { WeeklyCalendar, type TimeBlock } from '@/components/tutoring/WeeklyCalendar';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface Tutor { id: string; full_name: string; avatar_url: string; email: string; reputation: number; career: { id: string; name: string } | null }
interface Offer {
    id: string; subject_name: string; description: string; schedule: string;
    max_students: number; tutor: Tutor; created_at: string;
}
interface OffersResponse {
    offers: Offer[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}
interface Session {
    id: string; offer_id: string; student_id: string; tutor_id: string;
    session_date: string; time_start: string; time_end: string;
    status: string; location: string; notes: string;
    student: { id: string; full_name: string; avatar_url: string };
    tutor: { id: string; full_name: string; avatar_url: string };
    offer: { id: string; subject_name: string };
}

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

const statusConfig: Record<string, { label: string; class: string }> = {
    pending: { label: 'Pendiente', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    confirmed: { label: 'Confirmada', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    completed: { label: 'Completada', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    cancelled: { label: 'Cancelada', class: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export function TutoringPage() {
    const { session, user } = useAuth();
    const [tab, setTab] = useState<'offers' | 'sessions'>('offers');

    // Offers state
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loadingOffers, setLoadingOffers] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreate, setShowCreate] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [blockError, setBlockError] = useState('');

    // Session request modal
    const [requestOffer, setRequestOffer] = useState<Offer | null>(null);
    useBodyScrollLock(!!requestOffer);
    const [reqDate, setReqDate] = useState('');
    const [reqStart, setReqStart] = useState('');
    const [reqEnd, setReqEnd] = useState('');
    const [reqLocation, setReqLocation] = useState('');
    const [reqNotes, setReqNotes] = useState('');
    const [reqSubmitting, setReqSubmitting] = useState(false);

    // Sessions state
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [updatingSession, setUpdatingSession] = useState<string | null>(null);

    const fetchOffers = useCallback(async () => {
        if (!session?.access_token) return;
        setLoadingOffers(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '12' });
            if (search) params.set('subject', search);
            const data = await api<OffersResponse>(`/tutoring?${params}`, { token: session.access_token });
            setOffers(data.offers);
            setTotalPages(data.pagination.totalPages);
        } catch { /* silent */ } finally { setLoadingOffers(false); }
    }, [session?.access_token, page, search]);

    const fetchSessions = useCallback(async () => {
        if (!session?.access_token) return;
        setLoadingSessions(true);
        try {
            const data = await api<{ sessions: Session[] }>('/tutoring/sessions', { token: session.access_token });
            setSessions(data.sessions);
        } catch { /* silent */ } finally { setLoadingSessions(false); }
    }, [session?.access_token]);

    useEffect(() => { fetchOffers(); }, [fetchOffers]);
    useEffect(() => { if (tab === 'sessions') fetchSessions(); }, [tab, fetchSessions]);

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

    const handleRequestSession = async () => {
        if (!session?.access_token || !requestOffer || !reqDate || !reqStart || !reqEnd) return;
        setReqSubmitting(true);
        try {
            await api('/tutoring/sessions', {
                method: 'POST', token: session.access_token,
                body: JSON.stringify({
                    offer_id: requestOffer.id,
                    session_date: reqDate, time_start: reqStart, time_end: reqEnd,
                    location: reqLocation, notes: reqNotes,
                }),
            });
            setRequestOffer(null);
            setReqDate(''); setReqStart(''); setReqEnd(''); setReqLocation(''); setReqNotes('');
            setTab('sessions');
            fetchSessions();
        } catch { /* silent */ } finally { setReqSubmitting(false); }
    };

    const handleUpdateSession = async (sessionId: string, status: string) => {
        if (!session?.access_token) return;
        setUpdatingSession(sessionId);
        try {
            await api(`/tutoring/sessions/${sessionId}`, {
                method: 'PATCH', token: session.access_token,
                body: JSON.stringify({ status }),
            });
            fetchSessions();
        } catch { /* silent */ } finally { setUpdatingSession(null); }
    };

    const pendingSessions = sessions.filter(s => s.status === 'pending');
    const confirmedSessions = sessions.filter(s => s.status === 'confirmed');
    const completedSessions = sessions.filter(s => s.status === 'completed');

    return (
        <div className="min-h-dvh">
            <div className="px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    <SectionHeader
                        title="Tutorias"
                        subtitle="Encuentra ayuda academica u ofrece tus conocimientos."
                    >
                        {tab === 'offers' && (
                            <Button
                                onClick={() => setShowCreate(!showCreate)}
                                variant={showCreate ? 'outline' : 'default'}
                                size="sm"
                                className="rounded-full px-4"
                            >
                                {showCreate ? <XIcon className="mr-1 h-4 w-4" /> : <PlusIcon className="mr-1 h-4 w-4" />}
                                {showCreate ? 'Cancelar' : 'Ofrecer'}
                            </Button>
                        )}
                    </SectionHeader>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 md:px-8 pb-4">
                <div className="max-w-4xl mx-auto flex gap-2">
                    <Button
                        variant={tab === 'offers' ? 'default' : 'outline'}
                        onClick={() => setTab('offers')}
                        className="rounded-full"
                        size="sm"
                    >
                        <BookOpenIcon className="mr-2 h-4 w-4" />
                        Ofertas
                    </Button>
                    <Button
                        variant={tab === 'sessions' ? 'default' : 'outline'}
                        onClick={() => setTab('sessions')}
                        className="rounded-full"
                        size="sm"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Mis Sesiones
                    </Button>
                </div>
            </div>

            {tab === 'offers' && (
                <>
                    {/* Create Offer Form */}
                    {showCreate && (
                        <div className="px-4 md:px-8 pb-6">
                            <div className="max-w-4xl mx-auto">
                                <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
                                    <h3 className="font-semibold text-lg mb-6">Nueva tutoria</h3>
                                    <div className="space-y-4">
                                        <Input placeholder="Materia *" value={newSubject} onChange={e => setNewSubject(e.target.value)}
                                            className="rounded-xl bg-background border-border/50 h-12" />
                                        <Textarea placeholder="Describe que temas cubriras, tu metodologia, etc. (opcional)"
                                            value={newDescription} onChange={e => setNewDescription(e.target.value)}
                                            maxLength={300} className="resize-none rounded-xl bg-background border-border/50 min-h-[100px]" />
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 text-sm font-medium">
                                                <CalendarIcon className="h-4 w-4" /> Horario de sesiones *
                                            </label>
                                            <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                                                <WeeklyCalendar blocks={timeBlocks} onChange={blocks => { setTimeBlocks(blocks); setBlockError(''); }} />
                                            </div>
                                            {blockError && <p className="text-xs text-destructive">{blockError}</p>}
                                        </div>
                                        <Button className="w-full rounded-xl h-12 text-base" onClick={handleCreateOffer}
                                            disabled={submitting || !newSubject.trim()}>
                                            {submitting
                                                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                                : 'Publicar Tutoria'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="px-4 md:px-8 pb-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="relative bg-background border border-border/50 rounded-xl">
                                <div className="flex items-center">
                                    <div className="pl-3 pr-2"><SearchIcon className="h-4 w-4 text-muted-foreground" /></div>
                                    <Input placeholder="Buscar por materia..." value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-2 pl-1 pr-0 w-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Offers List */}
                    <div className="px-4 md:px-8 pb-8">
                        <div className="max-w-4xl mx-auto">
                            {loadingOffers ? (
                                <ListSkeleton count={6} />
                            ) : offers.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-6">
                                        <BookOpenIcon className="h-10 w-10 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">No hay tutorias disponibles</h3>
                                    <p className="text-muted-foreground max-w-md mx-auto">Se el primero en ofrecer ayuda academica.</p>
                                </div>
                            ) : (
                                <div>
                                    {offers.map(offer => (
                                        <div key={offer.id} className="flex items-center gap-3 py-4 px-1 border-b border-border/50 hover:bg-muted/50 transition-colors">
                                            <Link to={`/profile/${offer.tutor.id}`} className="shrink-0">
                                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden">
                                                    {offer.tutor.avatar_url
                                                        ? <img src={offer.tutor.avatar_url} alt={offer.tutor.full_name} className="h-full w-full object-cover" />
                                                        : <UserIcon className="h-6 w-6 text-white" />}
                                                </div>
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm">{offer.subject_name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {offer.tutor.full_name}
                                                    {offer.tutor.career && ` · ${offer.tutor.career.name}`}
                                                </p>
                                                {offer.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{offer.description}</p>}
                                                {offer.schedule && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        {formatSchedule(offer.schedule)}
                                                    </p>
                                                )}
                                            </div>
                                            {user?.id !== offer.tutor.id && (
                                                <Button size="sm" className="rounded-full shrink-0 text-xs h-8 px-3" onClick={() => setRequestOffer(offer)}>
                                                    Solicitar
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-6">
                                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-full">Anterior</Button>
                                    <span className="flex items-center text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
                                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded-full">Siguiente</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {tab === 'sessions' && (
                <div className="px-4 md:px-8 pb-8">
                    <div className="max-w-4xl mx-auto">
                        {loadingSessions ? (
                            <ListSkeleton count={4} />
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-6">
                                    <CalendarIcon className="h-10 w-10 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">No tienes sesiones</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Solicita una sesion desde la pestaña de Ofertas.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {pendingSessions.length > 0 && (
                                    <SessionGroup title="Pendientes" sessions={pendingSessions} userId={user?.id}
                                        onUpdate={handleUpdateSession} updatingId={updatingSession} />
                                )}
                                {confirmedSessions.length > 0 && (
                                    <SessionGroup title="Confirmadas" sessions={confirmedSessions} userId={user?.id}
                                        onUpdate={handleUpdateSession} updatingId={updatingSession} />
                                )}
                                {completedSessions.length > 0 && (
                                    <SessionGroup title="Completadas" sessions={completedSessions} userId={user?.id}
                                        onUpdate={handleUpdateSession} updatingId={updatingSession} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Request Session Modal */}
            {requestOffer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setRequestOffer(null)}>
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">Solicitar sesion</h3>
                            <button onClick={() => setRequestOffer(null)} className="text-muted-foreground hover:text-foreground">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            <span className="font-medium text-foreground">{requestOffer.subject_name}</span> con {requestOffer.tutor.full_name}
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha *</label>
                                <Input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)}
                                    className="rounded-xl bg-background border-border/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora inicio *</label>
                                    <Input type="time" value={reqStart} onChange={e => setReqStart(e.target.value)}
                                        className="rounded-xl bg-background border-border/50" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Hora fin *</label>
                                    <Input type="time" value={reqEnd} onChange={e => setReqEnd(e.target.value)}
                                        className="rounded-xl bg-background border-border/50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Lugar</label>
                                <Input placeholder="Ej: Biblioteca, Salon 204..." value={reqLocation}
                                    onChange={e => setReqLocation(e.target.value)}
                                    className="rounded-xl bg-background border-border/50" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notas</label>
                                <Textarea placeholder="Temas especificos, dudas, etc." value={reqNotes}
                                    onChange={e => setReqNotes(e.target.value)} maxLength={300}
                                    className="resize-none rounded-xl bg-background border-border/50 min-h-[80px]" />
                            </div>
                            <Button className="w-full rounded-xl h-11" onClick={handleRequestSession}
                                disabled={reqSubmitting || !reqDate || !reqStart || !reqEnd}>
                                {reqSubmitting
                                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    : 'Enviar solicitud'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SessionGroup({ title, sessions, userId, onUpdate, updatingId }: {
    title: string; sessions: Session[]; userId?: string;
    onUpdate: (id: string, status: string) => void; updatingId: string | null;
}) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title} ({sessions.length})</h3>
            <div className="space-y-3">
                {sessions.map(s => {
                    const isTutor = userId === s.tutor_id;
                    const otherPerson = isTutor ? s.student : s.tutor;
                    const role = isTutor ? 'Estudiante' : 'Tutor';
                    const cfg = statusConfig[s.status] || statusConfig.pending;
                    const isUpdating = updatingId === s.id;

                    return (
                        <div key={s.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-all">
                            <div className="flex items-start gap-3">
                                <Link to={`/profile/${otherPerson.id}`}>
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden shrink-0">
                                        {otherPerson.avatar_url
                                            ? <img src={otherPerson.avatar_url} alt={otherPerson.full_name} className="h-full w-full object-cover" />
                                            : <UserIcon className="h-5 w-5 text-white" />}
                                    </div>
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm">{s.offer.subject_name}</span>
                                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${cfg.class}`}>{cfg.label}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{role}: {otherPerson.full_name}</p>
                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon className="h-3 w-3" />
                                            {new Date(s.session_date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ClockIcon className="h-3 w-3" />
                                            {s.time_start.slice(0, 5)}–{s.time_end.slice(0, 5)}
                                        </span>
                                        {s.location && <span>{s.location}</span>}
                                    </div>
                                    {s.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{s.notes}"</p>}
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    {isTutor && s.status === 'pending' && (
                                        <>
                                            <Button size="sm" variant="default" className="rounded-full text-xs h-7 px-3"
                                                disabled={isUpdating} onClick={() => onUpdate(s.id, 'confirmed')}>
                                                <CheckIcon className="h-3 w-3 mr-1" /> Confirmar
                                            </Button>
                                            <Button size="sm" variant="destructive" className="rounded-full text-xs h-7 px-3"
                                                disabled={isUpdating} onClick={() => onUpdate(s.id, 'cancelled')}>
                                                <XCircleIcon className="h-3 w-3 mr-1" /> Rechazar
                                            </Button>
                                        </>
                                    )}
                                    {isTutor && s.status === 'confirmed' && (
                                        <>
                                            <Button size="sm" variant="default" className="rounded-full text-xs h-7 px-3"
                                                disabled={isUpdating} onClick={() => onUpdate(s.id, 'completed')}>
                                                <CheckIcon className="h-3 w-3 mr-1" /> Completar
                                            </Button>
                                            <Button size="sm" variant="outline" className="rounded-full text-xs h-7 px-3"
                                                disabled={isUpdating} onClick={() => onUpdate(s.id, 'cancelled')}>
                                                Cancelar
                                            </Button>
                                        </>
                                    )}
                                    {!isTutor && (s.status === 'pending' || s.status === 'confirmed') && (
                                        <Button size="sm" variant="outline" className="rounded-full text-xs h-7 px-3"
                                            disabled={isUpdating} onClick={() => onUpdate(s.id, 'cancelled')}>
                                            Cancelar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
