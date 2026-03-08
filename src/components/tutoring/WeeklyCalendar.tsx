import { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SelectedSlot {
    date: string; // ISO "YYYY-MM-DD"
    time: string; // "HH:MM"
    label: string; // human-readable
}

interface WeeklyCalendarProps {
    selectedSlots: SelectedSlot[];
    onChange: (slots: SelectedSlot[]) => void;
    minDate?: string; // ISO date, default today
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Time slots: 7:00 → 21:00, every 30 min
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 21) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day);
    return d;
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function toISO(date: Date): string {
    return date.toISOString().split('T')[0];
}

function formatDayHeader(date: Date): { day: string; num: number; month: string } {
    return {
        day: DAYS[date.getDay()],
        num: date.getDate(),
        month: MONTHS[date.getMonth()],
    };
}

export function WeeklyCalendar({ selectedSlots, onChange, minDate }: WeeklyCalendarProps) {
    const today = new Date();
    const [weekStart, setWeekStart] = useState(() => getWeekStart(today));

    const minISO = minDate || toISO(today);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const selectedSet = useMemo(() => {
        return new Set(selectedSlots.map(s => `${s.date}-${s.time}`));
    }, [selectedSlots]);

    const weekLabel = useMemo(() => {
        const start = weekDays[0];
        const end = weekDays[6];
        if (start.getMonth() === end.getMonth()) {
            return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
        }
        return `${MONTHS[start.getMonth()]} – ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
    }, [weekDays]);

    const toggleSlot = (dateISO: string, time: string) => {
        const key = `${dateISO}-${time}`;
        const date = weekDays.find(d => toISO(d) === dateISO)!;
        const label = `${DAY_FULL[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} · ${time}`;

        if (selectedSet.has(key)) {
            onChange(selectedSlots.filter(s => `${s.date}-${s.time}` !== key));
        } else {
            onChange([...selectedSlots, { date: dateISO, time, label }]);
        }
    };

    const removeSlot = (slot: SelectedSlot) => {
        onChange(selectedSlots.filter(s => !(s.date === slot.date && s.time === slot.time)));
    };

    const prevWeek = () => setWeekStart(w => addDays(w, -7));
    const nextWeek = () => setWeekStart(w => addDays(w, 7));
    const goToday = () => setWeekStart(getWeekStart(today));

    const isPastDate = (dateISO: string) => dateISO < minISO;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={prevWeek}>
                        <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[140px] text-center text-sm font-semibold">{weekLabel}</span>
                    <Button variant="outline" size="sm" onClick={nextWeek}>
                        <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">Hoy</Button>
            </div>

            {/* Calendar grid */}
            <div className="rounded-xl border border-border overflow-hidden">
                {/* Day headers */}
                <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                    <div className="border-r border-border" /> {/* time gutter */}
                    {weekDays.map((day, i) => {
                        const iso = toISO(day);
                        const isToday = iso === toISO(today);
                        const past = isPastDate(iso);
                        const header = formatDayHeader(day);
                        return (
                            <div key={i} className={`flex flex-col items-center py-2 text-center border-r border-border last:border-r-0 ${past ? 'opacity-40' : ''}`}>
                                <span className="text-xs font-medium text-muted-foreground">{header.day}</span>
                                <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                                    {header.num}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Time slots - scrollable */}
                <div className="max-h-64 overflow-y-auto">
                    {TIME_SLOTS.map(time => (
                        <div key={time} className="grid border-b border-border/50 last:border-b-0" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                            {/* Time label */}
                            <div className="flex items-center justify-end border-r border-border pr-2 py-0.5">
                                <span className="text-[10px] text-muted-foreground">{time}</span>
                            </div>
                            {/* Day cells */}
                            {weekDays.map((day, di) => {
                                const iso = toISO(day);
                                const key = `${iso}-${time}`;
                                const selected = selectedSet.has(key);
                                const past = isPastDate(iso);
                                return (
                                    <button
                                        key={di}
                                        disabled={past}
                                        onClick={() => !past && toggleSlot(iso, time)}
                                        className={`h-8 border-r border-border/30 last:border-r-0 transition-colors ${past
                                            ? 'cursor-not-allowed bg-muted/20'
                                            : selected
                                                ? 'bg-primary hover:bg-primary/80'
                                                : 'hover:bg-primary/15 hover:text-primary'
                                            }`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-primary" />
                    <span>Seleccionado</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-primary/15 border border-border" />
                    <span>Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-muted/20" />
                    <span>No disponible</span>
                </div>
            </div>

            {/* Selected slots tags */}
            {selectedSlots.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                        {selectedSlots.length} sesión{selectedSlots.length !== 1 ? 'es' : ''} seleccionada{selectedSlots.length !== 1 ? 's' : ''}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {selectedSlots
                            .slice()
                            .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
                            .map((slot, i) => (
                                <div key={i} className="flex items-center gap-1.5 rounded-full bg-primary/10 pl-3 pr-1.5 py-1">
                                    <span className="text-xs font-medium text-primary">{slot.label}</span>
                                    <button
                                        onClick={() => removeSlot(slot)}
                                        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20 text-primary"
                                    >
                                        <XIcon className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
