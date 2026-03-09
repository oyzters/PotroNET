import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, RepeatIcon, XIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─────────────────────────── Types ───────────────────────────
export interface TimeBlock {
    id: string;
    date: string;      // YYYY-MM-DD
    startTime: string; // HH:MM  (start of first slot)
    endTime: string;   // HH:MM  (start of slot AFTER last selected → exclusive end)
}

interface WeeklyCalendarProps {
    blocks: TimeBlock[];
    onChange: (blocks: TimeBlock[]) => void;
    minDate?: string;
}

interface DragState {
    dayISO: string;
    startIdx: number;
    currentIdx: number;
}

// ─────────────────────────── Constants ───────────────────────────
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const SLOT_H = 32; // px per 30-min slot
const SEMESTER_END = '2026-07-04';

const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}
// 29 slots total: indices 0 (07:00) → 28 (21:00)
const NUM_SLOTS = TIME_SLOTS.length; // 29
const GRID_H = NUM_SLOTS * SLOT_H;  // 928px

// ─────────────────────────── Date helpers ───────────────────────────
function getWeekStart(d: Date): Date {
    const r = new Date(d); r.setHours(0, 0, 0, 0); r.setDate(r.getDate() - r.getDay()); return r;
}
function addDays(d: Date, n: number): Date {
    const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function toISO(d: Date): string { return d.toISOString().split('T')[0]; }

// ─────────────────────────── Block geometry ───────────────────────────
function slotIdx(time: string) { return TIME_SLOTS.indexOf(time); }
function endTimeAfterSlot(idx: number): string {
    return idx + 1 < NUM_SLOTS ? TIME_SLOTS[idx + 1] : '21:30';
}
function blockTop(b: TimeBlock) { return slotIdx(b.startTime) * SLOT_H; }
function blockHeight(b: TimeBlock) {
    const si = slotIdx(b.startTime);
    const ei = slotIdx(b.endTime);       // -1 if "21:30"
    return ei === -1 ? SLOT_H : (ei - si) * SLOT_H;
}
function blockLabel(b: TimeBlock) {
    return `${b.startTime}–${b.endTime}`;
}

// ─────────────────────────── Component ───────────────────────────
export function WeeklyCalendar({ blocks, onChange, minDate }: WeeklyCalendarProps) {
    const today = new Date();
    const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
    const dragRef = useRef<DragState | null>(null);
    const blocksRef = useRef<TimeBlock[]>(blocks);
    const [dragVis, setDragVis] = useState<DragState | null>(null);

    // keep blocksRef in sync so commitDrag always sees latest blocks
    useEffect(() => { blocksRef.current = blocks; }, [blocks]);

    const minISO = minDate ?? toISO(today);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

    const weekLabel = useMemo(() => {
        const s = weekDays[0], e = weekDays[6];
        return s.getMonth() === e.getMonth()
            ? `${MONTHS[s.getMonth()]} ${s.getFullYear()}`
            : `${MONTHS[s.getMonth()]} – ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
    }, [weekDays]);

    const byDate = useMemo(() => {
        const m: Record<string, TimeBlock[]> = {};
        for (const b of blocks) { (m[b.date] ??= []).push(b); }
        return m;
    }, [blocks]);

    const isPast = (iso: string) => iso < minISO;

    // ── Drag commit ──
    const commitDrag = useCallback(() => {
        const ds = dragRef.current;
        if (!ds) return;
        const minIdx = Math.min(ds.startIdx, ds.currentIdx);
        const maxIdx = Math.max(ds.startIdx, ds.currentIdx);
        const newBlock: TimeBlock = {
            id: `${ds.dayISO}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: ds.dayISO,
            startTime: TIME_SLOTS[minIdx],
            endTime: endTimeAfterSlot(maxIdx),
        };
        onChange([...blocksRef.current, newBlock]);
        dragRef.current = null;
        setDragVis(null);
    }, [onChange]);

    // Global mouseup so drag commits even when cursor leaves component
    useEffect(() => {
        const up = () => { if (dragRef.current) commitDrag(); };
        document.addEventListener('mouseup', up);
        return () => document.removeEventListener('mouseup', up);
    }, [commitDrag]);

    // ── Mouse handlers ──
    const onCellDown = (iso: string, idx: number) => (e: React.MouseEvent) => {
        if (isPast(iso)) return;
        e.preventDefault();
        const ds = { dayISO: iso, startIdx: idx, currentIdx: idx };
        dragRef.current = ds;
        setDragVis({ ...ds });
    };

    const onCellEnter = (iso: string, idx: number) => () => {
        if (!dragRef.current || dragRef.current.dayISO !== iso) return;
        // only drag downward
        const next = Math.max(dragRef.current.startIdx, idx);
        const ds = { ...dragRef.current, currentIdx: next };
        dragRef.current = ds;
        setDragVis({ ...ds });
    };

    const removeBlock = (id: string) => onChange(blocks.filter(b => b.id !== id));
    const clearAll = () => onChange([]);

    // ── Repeat until semester end ──
    const handleRepeat = () => {
        if (blocks.length === 0) return;
        const semEnd = new Date(SEMESTER_END + 'T00:00:00');
        const result = [...blocks];
        const keys = new Set(blocks.map(b => `${b.date}|${b.startTime}|${b.endTime}`));

        for (const b of blocks) {
            let cur = new Date(b.date + 'T00:00:00');
            cur.setDate(cur.getDate() + 7);
            while (cur <= semEnd) {
                const iso = toISO(cur);
                const k = `${iso}|${b.startTime}|${b.endTime}`;
                if (!keys.has(k)) {
                    result.push({ id: `${iso}-${Date.now()}-${Math.random().toString(36).slice(2)}`, date: iso, startTime: b.startTime, endTime: b.endTime });
                    keys.add(k);
                }
                cur.setDate(cur.getDate() + 7);
            }
        }
        onChange(result);
    };

    const repeatCount = useMemo(() => {
        if (!blocks.length) return 0;
        const semEnd = new Date(SEMESTER_END + 'T00:00:00');
        const keys = new Set(blocks.map(b => `${b.date}|${b.startTime}|${b.endTime}`));
        let count = 0;
        for (const b of blocks) {
            let cur = new Date(b.date + 'T00:00:00');
            cur.setDate(cur.getDate() + 7);
            while (cur <= semEnd) {
                const k = `${toISO(cur)}|${b.startTime}|${b.endTime}`;
                if (!keys.has(k)) count++;
                cur.setDate(cur.getDate() + 7);
            }
        }
        return count;
    }, [blocks]);

    return (
        <div className="select-none space-y-3">
            {/* ── Week navigation ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setWeekStart(w => addDays(w, -7))}>
                        <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[140px] text-center text-sm font-semibold">{weekLabel}</span>
                    <Button variant="outline" size="sm" onClick={() => setWeekStart(w => addDays(w, 7))}>
                        <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setWeekStart(getWeekStart(today))} className="text-xs">
                    Hoy
                </Button>
            </div>

            {/* ── Calendar grid ── */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <div className="min-w-[560px]">
                {/* Day headers */}
                <div className="flex border-b border-border bg-muted/30">
                    <div className="w-14 shrink-0 border-r border-border" />
                    {weekDays.map((day, di) => {
                        const iso = toISO(day);
                        const isToday = iso === toISO(today);
                        const past = isPast(iso);
                        return (
                            <div key={di} className={`flex-1 flex flex-col items-center py-2 border-r border-border last:border-r-0 ${past ? 'opacity-40' : ''}`}>
                                <span className="text-[11px] font-medium text-muted-foreground uppercase">{DAYS_SHORT[day.getDay()]}</span>
                                <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Scrollable time body */}
                <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                    <div className="flex">
                        {/* Time gutter */}
                        <div className="w-14 shrink-0 border-r border-border relative" style={{ height: GRID_H }}>
                            {TIME_SLOTS.map((t, i) => (
                                <div key={t} className="absolute right-0 w-full flex items-start justify-end pr-2"
                                    style={{ top: i * SLOT_H, height: SLOT_H }}>
                                    {t.endsWith(':00') && (
                                        <span className="text-[10px] text-muted-foreground leading-none pt-0.5">{t}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {weekDays.map((day, di) => {
                            const iso = toISO(day);
                            const past = isPast(iso);
                            const dayBlocks = byDate[iso] ?? [];
                            const draggingHere = dragVis?.dayISO === iso && !past;

                            // Drag preview geometry
                            let prevTop = 0, prevH = 0;
                            if (draggingHere && dragVis) {
                                const lo = Math.min(dragVis.startIdx, dragVis.currentIdx);
                                const hi = Math.max(dragVis.startIdx, dragVis.currentIdx);
                                prevTop = lo * SLOT_H;
                                prevH = (hi - lo + 1) * SLOT_H;
                            }

                            return (
                                <div key={di} className={`flex-1 relative border-r border-border last:border-r-0 ${past ? 'opacity-40' : ''}`}
                                    style={{ height: GRID_H }}>

                                    {/* Slot rows (invisible, for mouse detection) */}
                                    {TIME_SLOTS.map((_, idx) => (
                                        <div key={idx}
                                            className={`absolute w-full border-b border-border/20 ${!past ? 'cursor-crosshair' : ''}`}
                                            style={{ top: idx * SLOT_H, height: SLOT_H }}
                                            onMouseDown={onCellDown(iso, idx)}
                                            onMouseEnter={onCellEnter(iso, idx)}
                                        />
                                    ))}

                                    {/* Hour separator lines */}
                                    {TIME_SLOTS.map((t, i) => t.endsWith(':00') && (
                                        <div key={`hr-${i}`}
                                            className="absolute w-full border-t border-border/40 pointer-events-none"
                                            style={{ top: i * SLOT_H }} />
                                    ))}

                                    {/* Drag preview */}
                                    {draggingHere && prevH > 0 && (
                                        <div className="absolute inset-x-0.5 rounded bg-primary/25 border border-primary/50 pointer-events-none z-10"
                                            style={{ top: prevTop, height: prevH }}>
                                            <p className="px-1.5 pt-0.5 text-[10px] font-semibold text-primary leading-tight">
                                                {TIME_SLOTS[Math.min(dragVis!.startIdx, dragVis!.currentIdx)]}–
                                                {endTimeAfterSlot(Math.max(dragVis!.startIdx, dragVis!.currentIdx))}
                                            </p>
                                        </div>
                                    )}

                                    {/* Committed blocks */}
                                    {dayBlocks.map(b => (
                                        <div key={b.id}
                                            className="absolute inset-x-0.5 z-20 overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm cursor-pointer hover:brightness-110 active:brightness-95 transition-all group"
                                            style={{ top: blockTop(b), height: Math.max(blockHeight(b), SLOT_H) }}
                                            onClick={() => removeBlock(b.id)}>
                                            <div className="flex items-start justify-between px-1.5 pt-0.5">
                                                <p className="text-[10px] font-semibold leading-tight">{blockLabel(b)}</p>
                                                <XIcon className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
                </div>{/* min-w wrapper */}
            </div>

            {/* ── Hint ── */}
            <p className="text-xs text-muted-foreground">
                💡 <strong>Clic y arrastra</strong> hacia abajo en el calendario para crear un bloque horario. Clic en un bloque azul para eliminarlo.
            </p>

            {/* ── Blocks panel ── */}
            {blocks.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                            {blocks.length} bloque{blocks.length !== 1 ? 's' : ''} creado{blocks.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2">
                            {repeatCount > 0 && (
                                <Button variant="outline" size="sm" onClick={handleRepeat} className="gap-1.5">
                                    <RepeatIcon className="h-4 w-4" />
                                    Repetir hasta fin de semestre
                                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                                        +{repeatCount}
                                    </span>
                                </Button>
                            )}
                            {repeatCount === 0 && blocks.length > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <RepeatIcon className="h-3 w-3" /> Repetición al máximo
                                </span>
                            )}
                            <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive gap-1">
                                <Trash2Icon className="h-4 w-4" /> Limpiar
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {blocks
                            .slice()
                            .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
                            .slice(0, 12)
                            .map(b => (
                                <div key={b.id} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-3 pr-1.5 py-1">
                                    <span className="text-xs font-medium text-primary">
                                        {DAYS_SHORT[new Date(b.date + 'T12:00:00').getDay()]} {new Date(b.date + 'T12:00:00').getDate()} {MONTHS[new Date(b.date + 'T12:00:00').getMonth()]} · {b.startTime}–{b.endTime}
                                    </span>
                                    <button onClick={() => removeBlock(b.id)}
                                        className="flex h-4 w-4 items-center justify-center rounded-full text-primary hover:bg-primary/20">
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        {blocks.length > 12 && (
                            <div className="flex items-center rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                +{blocks.length - 12} más
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
