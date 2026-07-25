import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon, XIcon, LoaderIcon } from 'lucide-react';
import { MODERATION_CATEGORIES, type ModerationCategory } from './ModerationModal';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface WarnUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (category: ModerationCategory, message: string) => Promise<void>;
    userName: string;
}

export function WarnUserModal({ isOpen, onClose, onConfirm, userName }: WarnUserModalProps) {
    const [category, setCategory] = useState<ModerationCategory | ''>('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useBodyScrollLock(isOpen);
    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!category || !message.trim()) return;
        setLoading(true);
        try {
            await onConfirm(category as ModerationCategory, message.trim());
            setCategory('');
            setMessage('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" />
            <div
                className="relative w-full md:max-w-md md:rounded-2xl rounded-t-3xl bg-background border border-border overflow-hidden modal-elastic"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                            <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold">Advertir usuario</h3>
                            <p className="text-xs text-muted-foreground">{userName}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                        <XIcon className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Category selector */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Motivo de la advertencia *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {MODERATION_CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    onClick={() => setCategory(cat.value)}
                                    className={`text-left rounded-xl border p-2.5 transition-all text-xs ${
                                        category === cat.value
                                            ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            : 'border-border hover:border-amber-500/40 hover:bg-muted/30'
                                    }`}
                                >
                                    <div className="font-semibold">{cat.label}</div>
                                    <div className="text-muted-foreground mt-0.5 leading-snug">{cat.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message field */}
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Mensaje al usuario *
                        </label>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Explica al usuario por qué recibe esta advertencia..."
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right mt-1">{message.length}/500</p>
                    </div>

                    {/* Warning notice */}
                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                        <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                            <strong>{userName}</strong> recibirá una notificación in-app y un correo electrónico con tu advertencia.
                            Las advertencias quedan registradas en el historial del usuario.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                            disabled={!category || !message.trim() || loading}
                            onClick={handleConfirm}
                        >
                            {loading ? (
                                <LoaderIcon className="h-4 w-4 animate-spin mr-1.5" />
                            ) : (
                                <AlertTriangleIcon className="h-4 w-4 mr-1.5" />
                            )}
                            {loading ? 'Enviando...' : 'Enviar advertencia'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
