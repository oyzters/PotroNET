import { useEffect, useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Subject { id: string; name: string; semester: number; credits: number; career_id: string }

interface Props {
    open: boolean;
    onClose: () => void;
    subjects: Subject[];
    initialStatuses: Record<string, string>;
    onSave: (statuses: Record<string, string>) => Promise<void>;
}

export function CurriculumMapModal({ open, onClose, subjects, initialStatuses, onSave }: Props) {
    const [statuses, setStatuses] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const backdropRef = useRef<HTMLDivElement>(null);

    // Re-initialize local state each time modal opens
    useEffect(() => {
        if (open) setStatuses({ ...initialStatuses });
    }, [open, initialStatuses]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    // Group subjects by semester
    const semesters: Record<number, Subject[]> = {};
    subjects.forEach(s => {
        if (!semesters[s.semester]) semesters[s.semester] = [];
        semesters[s.semester].push(s);
    });
    const semesterNumbers = Object.keys(semesters).map(Number).sort((a, b) => a - b);

    const toggle = (subjectId: string) => {
        setStatuses(prev => {
            const current = prev[subjectId] || 'NO_CURSADA';
            if (current === 'APROBADA') {
                const next = { ...prev };
                delete next[subjectId];
                return next;
            }
            return { ...prev, [subjectId]: 'APROBADA' };
        });
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === backdropRef.current) onClose();
    };

    const handleSave = async () => {
        setSaving(true);
        try { await onSave(statuses); } finally { setSaving(false); }
    };

    const approvedCount = Object.values(statuses).filter(s => s === 'APROBADA').length;

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
            <div className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-border bg-background shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold">Editar Mapa Curricular</h2>
                        <p className="text-sm text-muted-foreground">Haz clic en una materia para marcarla como aprobada o desmarcarla</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <XIcon className="size-5" />
                    </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 border-b border-border px-6 py-2 text-xs">
                    <span className="font-medium text-muted-foreground">Leyenda:</span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-sm border-b-2 border-b-emerald-500 bg-emerald-500/15" />
                        Aprobada
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-sm border border-border bg-muted/40" />
                        No cursada
                    </span>
                </div>

                {/* Grid — scrollable both ways */}
                <div className="flex-1 overflow-auto p-6">
                    <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: `repeat(${semesterNumbers.length}, minmax(140px, 1fr))` }}
                    >
                        {/* Semester headers */}
                        {semesterNumbers.map(sem => (
                            <div key={`h-${sem}`} className="rounded-lg bg-muted/50 px-3 py-2 text-center text-xs font-semibold text-muted-foreground">
                                Sem {sem}
                            </div>
                        ))}

                        {/* Subject cells — render row by row up to max subjects in any semester */}
                        {Array.from({ length: Math.max(...semesterNumbers.map(s => semesters[s].length)) }).map((_, rowIdx) =>
                            semesterNumbers.map(sem => {
                                const subject = semesters[sem][rowIdx];
                                if (!subject) {
                                    return <div key={`empty-${sem}-${rowIdx}`} />;
                                }
                                const isApproved = statuses[subject.id] === 'APROBADA';
                                return (
                                    <button
                                        key={subject.id}
                                        onClick={() => toggle(subject.id)}
                                        className={[
                                            'rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all',
                                            isApproved
                                                ? 'border-emerald-500/40 border-b-[3px] border-b-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                                : 'border-border bg-muted/40 text-foreground hover:bg-muted',
                                        ].join(' ')}
                                    >
                                        {subject.name}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                        <span className="font-semibold text-emerald-500">{approvedCount}</span> materia{approvedCount !== 1 ? 's' : ''} aprobada{approvedCount !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando…' : 'Guardar'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
