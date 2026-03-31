import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon, XIcon, TrashIcon, LoaderIcon } from 'lucide-react';

export const MODERATION_CATEGORIES = [
    { value: 'spam', label: '🚫 Spam', description: 'Contenido repetitivo o publicitario' },
    { value: 'acoso', label: '😤 Acoso', description: 'Bullying o acoso hacia personas' },
    { value: 'contenido_sexual', label: '🔞 Contenido sexual', description: 'Material inapropiado o explícito' },
    { value: 'violencia', label: '⚡ Violencia', description: 'Amenazas o contenido violento' },
    { value: 'informacion_falsa', label: '❌ Info. falsa', description: 'Desinformación o noticias falsas' },
    { value: 'odio', label: '🛑 Discurso de odio', description: 'Discriminación o lenguaje de odio' },
    { value: 'otro', label: '⚠️ Otro', description: 'Otra violación a las normas' },
] as const;

export type ModerationCategory = typeof MODERATION_CATEGORIES[number]['value'];

interface ModerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (category: ModerationCategory, reason: string) => Promise<void>;
    contentPreview: string;
    authorName: string;
    title?: string;
}

export function ModerationModal({ isOpen, onClose, onConfirm, contentPreview, authorName, title = 'Eliminar publicación' }: ModerationModalProps) {
    const [category, setCategory] = useState<ModerationCategory | ''>('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!category) return;
        setLoading(true);
        try {
            await onConfirm(category as ModerationCategory, reason);
            setCategory('');
            setReason('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative w-full md:max-w-md md:rounded-2xl rounded-t-3xl bg-background border border-border overflow-hidden animate-in slide-in-from-bottom duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                            <TrashIcon className="h-4 w-4 text-destructive" />
                        </div>
                        <h3 className="text-sm font-bold">{title}</h3>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Content preview */}
                    <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Por {authorName}</p>
                        <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed">{contentPreview}</p>
                    </div>

                    {/* Category selector */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Categoría de infracción *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {MODERATION_CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setCategory(cat.value)}
                                    className={`text-left rounded-xl border p-2.5 transition-all text-xs ${
                                        category === cat.value
                                            ? 'border-destructive bg-destructive/10 text-destructive'
                                            : 'border-border hover:border-primary/40 hover:bg-muted/30'
                                    }`}
                                >
                                    <div className="font-semibold">{cat.label}</div>
                                    <div className="text-muted-foreground mt-0.5 leading-snug">{cat.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason field */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Nota adicional (opcional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Añade contexto para el usuario afectado..."
                            rows={2}
                            maxLength={300}
                            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right mt-1">{reason.length}/300</p>
                    </div>

                    {/* Warning notice */}
                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                        <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                            El usuario recibirá una notificación explicando la razón de la eliminación.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            disabled={!category || loading}
                            onClick={handleConfirm}
                        >
                            {loading ? (
                                <LoaderIcon className="h-4 w-4 animate-spin mr-1.5" />
                            ) : (
                                <TrashIcon className="h-4 w-4 mr-1.5" />
                            )}
                            {loading ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
