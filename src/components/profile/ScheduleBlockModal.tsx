import { useEffect, useState } from 'react';
import { XIcon, Trash2Icon, ClockIcon, UserIcon, MapPinIcon, BookOpenIcon, StickyNoteIcon, PaletteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

export type ScheduleColor = 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'pink' | 'cyan' | 'orange';

export interface ScheduleBlock {
    id: string;
    user_id: string;
    day_of_week: number; // 1..5
    start_time: string;  // HH:MM or HH:MM:SS
    end_time: string;
    subject_name: string;
    classroom: string | null;
    professor: string | null;
    color: ScheduleColor;
    notes: string | null;
}

export interface ScheduleDraft {
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject_name: string;
    classroom: string;
    professor: string;
    color: ScheduleColor;
    notes: string;
}

export const COLOR_SWATCH: Record<ScheduleColor, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    violet: 'bg-violet-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
};

const COLORS: ScheduleColor[] = ['blue', 'emerald', 'amber', 'red', 'violet', 'pink', 'cyan', 'orange'];
const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

function normalizeTime(t: string): string {
    const m = t.match(/^(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : t;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (draft: ScheduleDraft) => Promise<void> | void;
    onDelete?: () => Promise<void> | void;
    initial?: ScheduleBlock | null;
    defaultDay?: number;
    defaultStart?: string;
}

export function ScheduleBlockModal({ isOpen, onClose, onSave, onDelete, initial, defaultDay = 1, defaultStart = '07:00' }: Props) {
    const [draft, setDraft] = useState<ScheduleDraft>(() => ({
        day_of_week: initial?.day_of_week ?? defaultDay,
        start_time: normalizeTime(initial?.start_time ?? defaultStart),
        end_time: normalizeTime(initial?.end_time ?? '08:00'),
        subject_name: initial?.subject_name ?? '',
        classroom: initial?.classroom ?? '',
        professor: initial?.professor ?? '',
        color: initial?.color ?? 'blue',
        notes: initial?.notes ?? '',
    }));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Reset state when opening with different initial
    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setDraft({
            day_of_week: initial?.day_of_week ?? defaultDay,
            start_time: normalizeTime(initial?.start_time ?? defaultStart),
            end_time: normalizeTime(initial?.end_time ?? '08:00'),
            subject_name: initial?.subject_name ?? '',
            classroom: initial?.classroom ?? '',
            professor: initial?.professor ?? '',
            color: initial?.color ?? 'blue',
            notes: initial?.notes ?? '',
        });
    }, [isOpen, initial, defaultDay, defaultStart]);

    // Close on ESC
    useEffect(() => {
        if (!isOpen) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [isOpen, onClose]);

    useBodyScrollLock(isOpen);
    if (!isOpen) return null;

    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    const handleSubmit = async () => {
        setError('');
        if (!draft.subject_name.trim()) return setError('El nombre de la materia es requerido');
        if (toMin(draft.start_time) >= toMin(draft.end_time)) return setError('La hora de fin debe ser mayor que la de inicio');
        setSaving(true);
        try {
            await onSave({ ...draft, subject_name: draft.subject_name.trim() });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setDeleting(true);
        try { await onDelete(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Error al eliminar'); }
        finally { setDeleting(false); }
    };

    const isEdit = !!initial;

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border-x border-t sm:border border-border shadow-2xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom sm:slide-in-from-bottom-4 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{isEdit ? 'Editar clase' : 'Nueva clase'}</h3>
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>

                <FieldGroup>
                    <Field>
                        <FieldLabel className="flex items-center gap-1.5 text-xs"><BookOpenIcon className="h-3.5 w-3.5" />Materia</FieldLabel>
                        <Input
                            value={draft.subject_name}
                            onChange={e => setDraft(d => ({ ...d, subject_name: e.target.value }))}
                            placeholder="Ej: Cálculo Diferencial"
                            maxLength={120}
                            autoFocus
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel className="text-xs">Día</FieldLabel>
                            <Select value={String(draft.day_of_week)} onValueChange={v => setDraft(d => ({ ...d, day_of_week: Number(v) }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="z-[200]">
                                    <SelectGroup>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <SelectItem key={n} value={String(n)}>{DAY_NAMES[n]}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel className="flex items-center gap-1.5 text-xs"><ClockIcon className="h-3.5 w-3.5" />Horario</FieldLabel>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="time" step={1800}
                                    value={draft.start_time}
                                    onChange={e => setDraft(d => ({ ...d, start_time: e.target.value }))}
                                    className="text-xs"
                                />
                                <span className="text-xs text-muted-foreground">–</span>
                                <Input
                                    type="time" step={1800}
                                    value={draft.end_time}
                                    onChange={e => setDraft(d => ({ ...d, end_time: e.target.value }))}
                                    className="text-xs"
                                />
                            </div>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field>
                            <FieldLabel className="flex items-center gap-1.5 text-xs"><UserIcon className="h-3.5 w-3.5" />Profesor</FieldLabel>
                            <Input
                                value={draft.professor}
                                onChange={e => setDraft(d => ({ ...d, professor: e.target.value }))}
                                placeholder="Opcional" maxLength={120}
                            />
                        </Field>
                        <Field>
                            <FieldLabel className="flex items-center gap-1.5 text-xs"><MapPinIcon className="h-3.5 w-3.5" />Salón</FieldLabel>
                            <Input
                                value={draft.classroom}
                                onChange={e => setDraft(d => ({ ...d, classroom: e.target.value }))}
                                placeholder="Ej: LC-301" maxLength={60}
                            />
                        </Field>
                    </div>

                    <Field>
                        <FieldLabel className="flex items-center gap-1.5 text-xs"><PaletteIcon className="h-3.5 w-3.5" />Color</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c} type="button"
                                    onClick={() => setDraft(d => ({ ...d, color: c }))}
                                    className={`h-8 w-8 rounded-full ${COLOR_SWATCH[c]} transition-all ${draft.color === c ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110' : 'opacity-70 hover:opacity-100'}`}
                                    aria-label={`Color ${c}`}
                                />
                            ))}
                        </div>
                    </Field>

                    <Field>
                        <FieldLabel className="flex items-center gap-1.5 text-xs"><StickyNoteIcon className="h-3.5 w-3.5" />Notas</FieldLabel>
                        <Textarea
                            value={draft.notes}
                            onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                            placeholder="Opcional (300 caracteres)"
                            maxLength={300}
                            className="resize-none text-sm min-h-[60px]"
                        />
                    </Field>
                </FieldGroup>

                {error && (
                    <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {error}
                    </div>
                )}

                <div className="mt-5 flex gap-2">
                    {isEdit && onDelete && (
                        <Button
                            type="button" variant="outline"
                            className="h-10 px-3 text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={handleDelete} disabled={deleting || saving}
                        >
                            <Trash2Icon className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        type="button" variant="outline" className="flex-1 h-10"
                        onClick={onClose} disabled={saving || deleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button" className="flex-1 h-10 font-semibold"
                        onClick={handleSubmit} disabled={saving || deleting}
                    >
                        {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : (isEdit ? 'Guardar' : 'Agregar')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
