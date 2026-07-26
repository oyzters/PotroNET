import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CalendarIcon, PlusIcon, LockIcon, UsersIcon, GlobeIcon,
    ClockIcon, MapPinIcon, UserIcon, StickyNoteIcon,
    LayoutGridIcon, ListIcon, MinusIcon, PlusSquareIcon, SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ScheduleBlockModal, type ScheduleBlock, type ScheduleColor, type ScheduleDraft, COLOR_SWATCH } from './ScheduleBlockModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

// ─── Constants ───
const DAYS_FULL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const DAYS_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const PREF_KEY = 'potronet:schedule-prefs';

// ─── Helpers ───
function normalizeTime(t: string): string {
    const m = t.match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : t;
}
function timeToMin(t: string): number {
    const [h, m] = normalizeTime(t).split(':').map(Number);
    return h * 60 + m;
}
function formatTime(t: string): string {
    return normalizeTime(t);
}

// Background class map per color (safe: literal strings so Tailwind keeps them)
const COLOR_BG: Record<ScheduleColor, string> = {
    blue: 'bg-blue-500/90 text-white border-blue-600/40',
    emerald: 'bg-emerald-500/90 text-white border-emerald-600/40',
    amber: 'bg-amber-500/90 text-white border-amber-600/40',
    red: 'bg-red-500/90 text-white border-red-600/40',
    violet: 'bg-violet-500/90 text-white border-violet-600/40',
    pink: 'bg-pink-500/90 text-white border-pink-600/40',
    cyan: 'bg-cyan-500/90 text-white border-cyan-600/40',
    orange: 'bg-orange-500/90 text-white border-orange-600/40',
};
const COLOR_SOFT: Record<ScheduleColor, string> = {
    blue: 'bg-blue-500/10 border-l-blue-500 text-blue-700 dark:text-blue-300',
    emerald: 'bg-emerald-500/10 border-l-emerald-500 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 border-l-amber-500 text-amber-700 dark:text-amber-300',
    red: 'bg-red-500/10 border-l-red-500 text-red-700 dark:text-red-300',
    violet: 'bg-violet-500/10 border-l-violet-500 text-violet-700 dark:text-violet-300',
    pink: 'bg-pink-500/10 border-l-pink-500 text-pink-700 dark:text-pink-300',
    cyan: 'bg-cyan-500/10 border-l-cyan-500 text-cyan-700 dark:text-cyan-300',
    orange: 'bg-orange-500/10 border-l-orange-500 text-orange-700 dark:text-orange-300',
};

// ─── Prefs (localStorage) ───
interface Prefs { startHour: number; endHour: number; compact: boolean; view: 'auto' | 'grid' | 'list' }
const DEFAULT_PREFS: Prefs = { startHour: 7, endHour: 21, compact: false, view: 'auto' };

function loadPrefs(): Prefs {
    try {
        const raw = localStorage.getItem(PREF_KEY);
        if (!raw) return DEFAULT_PREFS;
        const p = JSON.parse(raw);
        return {
            startHour: Math.max(0, Math.min(23, Number(p.startHour ?? 7))),
            endHour: Math.max(1, Math.min(24, Number(p.endHour ?? 21))),
            compact: !!p.compact,
            view: ['auto', 'grid', 'list'].includes(p.view) ? p.view : 'auto',
        };
    } catch { return DEFAULT_PREFS; }
}

// ─── Visibility pill ───
function VisibilityPill({ v }: { v: 'public' | 'followers' | 'private' }) {
    if (v === 'public') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><GlobeIcon className="h-3 w-3" />Público</span>;
    if (v === 'followers') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><UsersIcon className="h-3 w-3" />Seguidores</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><LockIcon className="h-3 w-3" />Privado</span>;
}

interface Props {
    userId: string;
    isOwnProfile: boolean;
    token: string;
}

export function ScheduleView({ userId, isOwnProfile, token }: Props) {
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
    const [blocked, setBlocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
    const [showPrefs, setShowPrefs] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
    const [defaultDay, setDefaultDay] = useState(1);
    const [defaultStart, setDefaultStart] = useState('07:00');
    const [viewerBlock, setViewerBlock] = useState<ScheduleBlock | null>(null);

    // Persist prefs
    useEffect(() => {
        try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* */ }
    }, [prefs]);

    // Fetch
    const fetchSchedule = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api<{ schedules: ScheduleBlock[]; visibility: 'public' | 'followers' | 'private'; blocked: boolean }>(
                `/schedules?user_id=${userId}`, { token }
            );
            setBlocks(data.schedules || []);
            setVisibility(data.visibility);
            setBlocked(!!data.blocked);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al cargar el horario');
        } finally {
            setLoading(false);
        }
    }, [userId, token]);

    useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

    // Auto-fit hour range to blocks when viewing someone else (don't persist)
    const displayRange = useMemo(() => {
        if (blocks.length === 0) return { start: prefs.startHour, end: prefs.endHour };
        const minStart = Math.min(...blocks.map(b => Math.floor(timeToMin(b.start_time) / 60)));
        const maxEnd = Math.max(...blocks.map(b => Math.ceil(timeToMin(b.end_time) / 60)));
        const start = Math.min(prefs.startHour, minStart);
        const end = Math.max(prefs.endHour, maxEnd);
        return { start, end: Math.max(end, start + 1) };
    }, [blocks, prefs.startHour, prefs.endHour]);

    // ── CRUD ──
    const onCreate = async (draft: ScheduleDraft) => {
        const saved = await api<{ schedule: ScheduleBlock }>('/schedules', {
            method: 'POST', token, body: JSON.stringify(draft),
        });
        setBlocks(prev => [...prev, saved.schedule].sort((a, b) =>
            a.day_of_week - b.day_of_week || timeToMin(a.start_time) - timeToMin(b.start_time)
        ));
        setModalOpen(false);
        setEditingBlock(null);
    };

    const onUpdate = async (draft: ScheduleDraft) => {
        if (!editingBlock) return;
        const saved = await api<{ schedule: ScheduleBlock }>(`/schedules/${editingBlock.id}`, {
            method: 'PATCH', token, body: JSON.stringify(draft),
        });
        setBlocks(prev => prev.map(b => b.id === saved.schedule.id ? saved.schedule : b).sort((a, b) =>
            a.day_of_week - b.day_of_week || timeToMin(a.start_time) - timeToMin(b.start_time)
        ));
        setModalOpen(false);
        setEditingBlock(null);
    };

    const onDelete = async () => {
        if (!editingBlock) return;
        await api(`/schedules/${editingBlock.id}`, { method: 'DELETE', token });
        setBlocks(prev => prev.filter(b => b.id !== editingBlock.id));
        setModalOpen(false);
        setEditingBlock(null);
    };

    const openCreateModal = (day = 1, start = '07:00') => {
        setEditingBlock(null);
        setDefaultDay(day);
        setDefaultStart(start);
        setModalOpen(true);
    };

    const openEditModal = (block: ScheduleBlock) => {
        setEditingBlock(block);
        setModalOpen(true);
    };

    // ── Render states ──
    if (loading) {
        return (
            <div className="bg-background p-4 min-h-[50vh] flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-background p-8 min-h-[50vh] text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchSchedule}>Reintentar</Button>
            </div>
        );
    }

    if (blocked) {
        return (
            <div className="bg-background p-8 min-h-[50vh] flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                    {visibility === 'private' ? <LockIcon className="h-7 w-7 text-muted-foreground" /> : <UsersIcon className="h-7 w-7 text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-bold mb-1">
                    {visibility === 'private' ? 'Este horario es privado' : 'Solo para seguidores'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                    {visibility === 'private'
                        ? 'El usuario ha elegido no compartir su horario.'
                        : 'Sigue a este usuario para poder ver su horario de clases.'}
                </p>
            </div>
        );
    }

    const effectiveView: 'grid' | 'list' =
        prefs.view === 'grid' ? 'grid'
        : prefs.view === 'list' ? 'list'
        : 'grid'; // auto: grid en desktop, list en mobile se maneja con CSS (ver más abajo)

    return (
        <div className="bg-background min-h-[50vh] pb-24">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
                <div className="flex items-center gap-2 min-w-0">
                    <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-sm font-bold truncate">Horario semanal</h3>
                    <VisibilityPill v={visibility} />
                </div>
                <div className="flex items-center gap-1">
                    {/* View toggle — solo visible en sm+ si está en modo auto */}
                    <div className="hidden sm:flex items-center rounded-md border border-border bg-muted/30 p-0.5">
                        <button
                            onClick={() => setPrefs(p => ({ ...p, view: 'grid' }))}
                            className={`p-1.5 rounded ${prefs.view !== 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                            title="Vista cuadrícula"
                        ><LayoutGridIcon className="h-3.5 w-3.5" /></button>
                        <button
                            onClick={() => setPrefs(p => ({ ...p, view: 'list' }))}
                            className={`p-1.5 rounded ${prefs.view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                            title="Vista lista"
                        ><ListIcon className="h-3.5 w-3.5" /></button>
                    </div>

                    {isOwnProfile && (
                        <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPrefs(true)} title="Ajustes">
                                <SettingsIcon className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="h-8 gap-1 text-xs font-semibold" onClick={() => openCreateModal()}>
                                <PlusIcon className="h-4 w-4" />
                                <span className="hidden xs:inline">Agregar</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Empty state ── */}
            {blocks.length === 0 ? (
                <div className="px-6 py-16 flex flex-col items-center text-center">
                    <div className="h-16 w-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <CalendarIcon className="h-7 w-7 text-primary" />
                    </div>
                    <h4 className="text-lg font-bold mb-1">
                        {isOwnProfile ? 'Aún no tienes horario' : 'Sin horario publicado'}
                    </h4>
                    <p className="text-sm text-muted-foreground max-w-xs mb-4">
                        {isOwnProfile
                            ? 'Agrega tus clases para que aparezcan aquí y tus amigos las puedan ver.'
                            : 'Este usuario aún no ha registrado sus clases.'}
                    </p>
                    {isOwnProfile && (
                        <Button size="sm" className="gap-1.5" onClick={() => openCreateModal()}>
                            <PlusIcon className="h-4 w-4" />
                            Agregar primera clase
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    {/* ── GRID VIEW (responsive: list on mobile via sm:block) ── */}
                    {effectiveView === 'grid' && (
                        <div className="hidden sm:block">
                            <ScheduleGrid
                                blocks={blocks}
                                startHour={displayRange.start}
                                endHour={displayRange.end}
                                slotHeight={prefs.compact ? 24 : 32}
                                isOwnProfile={isOwnProfile}
                                onBlockClick={isOwnProfile ? openEditModal : setViewerBlock}
                                onEmptyCellClick={isOwnProfile ? (d, t) => openCreateModal(d, t) : undefined}
                            />
                        </div>
                    )}
                    {/* ── LIST VIEW (always on mobile, or forced) ── */}
                    <div className={effectiveView === 'grid' ? 'sm:hidden' : ''}>
                        <ScheduleList
                            blocks={blocks}
                            isOwnProfile={isOwnProfile}
                            onBlockClick={isOwnProfile ? openEditModal : setViewerBlock}
                        />
                    </div>
                </>
            )}

            {/* ── Modal ── */}
            <ScheduleBlockModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingBlock(null); }}
                onSave={editingBlock ? onUpdate : onCreate}
                onDelete={editingBlock ? onDelete : undefined}
                initial={editingBlock}
                defaultDay={defaultDay}
                defaultStart={defaultStart}
            />

            {/* ── Viewer (read-only detail) ── */}
            {viewerBlock && (
                <BlockViewer block={viewerBlock} onClose={() => setViewerBlock(null)} />
            )}

            {/* ── Prefs modal ── */}
            {showPrefs && (
                <PrefsModal
                    prefs={prefs}
                    onChange={setPrefs}
                    onClose={() => setShowPrefs(false)}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// GRID VIEW
// ═══════════════════════════════════════════════════════════════
interface GridProps {
    blocks: ScheduleBlock[];
    startHour: number;
    endHour: number;
    slotHeight: number;
    isOwnProfile: boolean;
    onBlockClick: (b: ScheduleBlock) => void;
    onEmptyCellClick?: (day: number, time: string) => void;
}

function ScheduleGrid({ blocks, startHour, endHour, slotHeight, onBlockClick, onEmptyCellClick }: GridProps) {
    const totalMinutes = (endHour - startHour) * 60;
    const gridHeight = (totalMinutes / 30) * slotHeight;
    const hours: number[] = [];
    for (let h = startHour; h <= endHour; h++) hours.push(h);

    const blockStyle = (b: ScheduleBlock) => {
        const startOffset = timeToMin(b.start_time) - startHour * 60;
        const duration = timeToMin(b.end_time) - timeToMin(b.start_time);
        return {
            top: (startOffset / 30) * slotHeight,
            height: Math.max((duration / 30) * slotHeight, 20),
        };
    };

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[560px]">
                {/* Header row */}
                <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
                    <div className="w-14 shrink-0 border-r border-border" />
                    {[1, 2, 3, 4, 5].map(d => (
                        <div key={d} className="flex-1 py-2 text-center border-r border-border last:border-r-0">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{DAYS_SHORT[d]}</p>
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="flex">
                    {/* Hour gutter */}
                    <div className="w-14 shrink-0 border-r border-border relative" style={{ height: gridHeight }}>
                        {hours.map((h, i) => (
                            <div key={h} className="absolute right-0 w-full flex items-start justify-end pr-2"
                                style={{ top: i * slotHeight * 2, height: slotHeight * 2 }}
                            >
                                <span className="text-[10px] text-muted-foreground leading-none pt-0.5">
                                    {String(h).padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {[1, 2, 3, 4, 5].map(day => {
                        const dayBlocks = blocks.filter(b => b.day_of_week === day);
                        return (
                            <div key={day} className="flex-1 relative border-r border-border last:border-r-0" style={{ height: gridHeight }}>
                                {/* Hour grid lines (every hour) */}
                                {hours.slice(0, -1).map((_, i) => (
                                    <div key={i}
                                        className="absolute inset-x-0 border-t border-border/40 pointer-events-none"
                                        style={{ top: (i + 1) * slotHeight * 2 }} />
                                ))}
                                {/* Half-hour lines (lighter) */}
                                {hours.slice(0, -1).map((_, i) => (
                                    <div key={`half-${i}`}
                                        className="absolute inset-x-0 border-t border-border/15 pointer-events-none"
                                        style={{ top: (i + 1) * slotHeight * 2 - slotHeight }} />
                                ))}
                                {/* Empty cell click zones (per hour) */}
                                {onEmptyCellClick && hours.slice(0, -1).map((h, i) => (
                                    <button
                                        key={`cell-${h}`}
                                        type="button"
                                        onClick={() => onEmptyCellClick(day, `${String(h).padStart(2, '0')}:00`)}
                                        className="absolute inset-x-0 hover:bg-primary/5 transition-colors cursor-pointer"
                                        style={{ top: i * slotHeight * 2, height: slotHeight * 2 }}
                                        aria-label={`Agregar clase el ${DAYS_FULL[day]} a las ${h}:00`}
                                    />
                                ))}
                                {/* Blocks */}
                                {dayBlocks.map(b => {
                                    const { top, height } = blockStyle(b);
                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => onBlockClick(b)}
                                            className={`absolute inset-x-0.5 rounded-md border-l-2 ${COLOR_BG[b.color] || COLOR_BG.blue} px-1.5 py-1 text-left shadow-sm hover:brightness-110 active:brightness-95 transition-all overflow-hidden z-10`}
                                            style={{ top, height }}
                                            aria-label={`Clase ${b.subject_name} a las ${formatTime(b.start_time)}`}
                                        >
                                            <p className="text-[10px] font-bold leading-tight truncate">{b.subject_name}</p>
                                            <p className="text-[9px] opacity-90 leading-tight">{formatTime(b.start_time)}–{formatTime(b.end_time)}</p>
                                            {height > slotHeight * 2 && b.classroom && (
                                                <p className="text-[9px] opacity-80 leading-tight truncate">{b.classroom}</p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// LIST VIEW (mobile first)
// ═══════════════════════════════════════════════════════════════
interface ListProps {
    blocks: ScheduleBlock[];
    isOwnProfile: boolean;
    onBlockClick: (b: ScheduleBlock) => void;
}

function ScheduleList({ blocks, onBlockClick }: ListProps) {
    const byDay = useMemo(() => {
        const map: Record<number, ScheduleBlock[]> = {};
        for (const b of blocks) (map[b.day_of_week] ??= []).push(b);
        for (const k of Object.keys(map)) map[Number(k)].sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time));
        return map;
    }, [blocks]);

    return (
        <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map(day => {
                const items = byDay[day] ?? [];
                return (
                    <div key={day} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{DAYS_FULL[day]}</h4>
                            <span className="text-[10px] text-muted-foreground">{items.length} clase{items.length !== 1 ? 's' : ''}</span>
                        </div>
                        {items.length === 0 ? (
                            <p className="text-xs text-muted-foreground/70 italic">Sin clases</p>
                        ) : (
                            <div className="space-y-2">
                                {items.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => onBlockClick(b)}
                                        className={`w-full text-left rounded-lg border-l-4 px-3 py-2 ${COLOR_SOFT[b.color] || COLOR_SOFT.blue} hover:brightness-95 transition-all`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-foreground truncate">{b.subject_name}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1"><ClockIcon className="h-3 w-3" />{formatTime(b.start_time)}–{formatTime(b.end_time)}</span>
                                                    {b.classroom && <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3 w-3" />{b.classroom}</span>}
                                                    {b.professor && <span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" />{b.professor}</span>}
                                                </div>
                                            </div>
                                            <span className={`h-3 w-3 rounded-full shrink-0 mt-1 ${COLOR_SWATCH[b.color]}`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Read-only viewer (visitors)
// ═══════════════════════════════════════════════════════════════
function BlockViewer({ block, onClose }: { block: ScheduleBlock; onClose: () => void }) {
    useBodyScrollLock(true);
    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border-x border-t sm:border border-border shadow-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className={`mb-3 h-1.5 w-10 rounded-full mx-auto sm:hidden ${COLOR_SWATCH[block.color]}`} />
                <div className="flex items-center gap-2 mb-3">
                    <span className={`h-3 w-3 rounded-full ${COLOR_SWATCH[block.color]}`} />
                    <h3 className="text-lg font-bold flex-1 truncate">{block.subject_name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground"><CalendarIcon className="h-4 w-4" />{DAYS_FULL[block.day_of_week]}</p>
                    <p className="flex items-center gap-2 text-muted-foreground"><ClockIcon className="h-4 w-4" />{formatTime(block.start_time)} – {formatTime(block.end_time)}</p>
                    {block.classroom && <p className="flex items-center gap-2 text-muted-foreground"><MapPinIcon className="h-4 w-4" />{block.classroom}</p>}
                    {block.professor && <p className="flex items-center gap-2 text-muted-foreground"><UserIcon className="h-4 w-4" />{block.professor}</p>}
                    {block.notes && (
                        <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3 mt-2">
                            <StickyNoteIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-xs whitespace-pre-wrap">{block.notes}</p>
                        </div>
                    )}
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={onClose}>Cerrar</Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Prefs modal
// ═══════════════════════════════════════════════════════════════
function PrefsModal({ prefs, onChange, onClose }: { prefs: Prefs; onChange: (p: Prefs) => void; onClose: () => void }) {
    useBodyScrollLock(true);
    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border-x border-t sm:border border-border shadow-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200 space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold">Ajustes del horario</h3>

                <div className="space-y-3">
                    <div>
                        <p className="text-xs font-semibold mb-1.5">Rango de horas</p>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-md border border-border">
                                <button onClick={() => onChange({ ...prefs, startHour: Math.max(0, prefs.startHour - 1) })} className="p-2 hover:bg-muted">
                                    <MinusIcon className="h-3.5 w-3.5" />
                                </button>
                                <span className="px-2 text-sm font-mono">{String(prefs.startHour).padStart(2, '0')}:00</span>
                                <button onClick={() => onChange({ ...prefs, startHour: Math.min(prefs.endHour - 1, prefs.startHour + 1) })} className="p-2 hover:bg-muted">
                                    <PlusSquareIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <span className="text-xs text-muted-foreground">–</span>
                            <div className="flex items-center rounded-md border border-border">
                                <button onClick={() => onChange({ ...prefs, endHour: Math.max(prefs.startHour + 1, prefs.endHour - 1) })} className="p-2 hover:bg-muted">
                                    <MinusIcon className="h-3.5 w-3.5" />
                                </button>
                                <span className="px-2 text-sm font-mono">{String(prefs.endHour).padStart(2, '0')}:00</span>
                                <button onClick={() => onChange({ ...prefs, endHour: Math.min(24, prefs.endHour + 1) })} className="p-2 hover:bg-muted">
                                    <PlusSquareIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox" checked={prefs.compact}
                            onChange={e => onChange({ ...prefs, compact: e.target.checked })}
                            className="h-4 w-4 rounded"
                        />
                        <span className="text-sm">Modo compacto</span>
                    </label>
                </div>

                <Button className="w-full" onClick={onClose}>Listo</Button>
            </div>
        </div>
    );
}
