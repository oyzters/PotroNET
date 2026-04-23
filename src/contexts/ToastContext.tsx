import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircleIcon, XCircleIcon, InfoIcon, AlertTriangleIcon, XIcon } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    kind: ToastKind;
    message: string;
}

interface ToastContextType {
    show: (message: string, kind?: ToastKind) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastKind, typeof CheckCircleIcon> = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: InfoIcon,
    warning: AlertTriangleIcon,
};

const COLORS: Record<ToastKind, string> = {
    success: 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400',
    error: 'border-destructive/30 bg-destructive/10 text-destructive',
    info: 'border-primary/30 bg-primary/10 text-primary',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counter = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const show = useCallback((message: string, kind: ToastKind = 'info') => {
        counter.current += 1;
        const id = counter.current;
        setToasts((prev) => [...prev, { id, kind, message }]);
        window.setTimeout(() => dismiss(id), 4500);
    }, [dismiss]);

    const value = useMemo<ToastContextType>(() => ({
        show,
        success: (m) => show(m, 'success'),
        error: (m) => show(m, 'error'),
        info: (m) => show(m, 'info'),
        warning: (m) => show(m, 'warning'),
    }), [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 md:bottom-6">
                {toasts.map((t) => {
                    const Icon = ICONS[t.kind];
                    return (
                        <ToastItem key={t.id} toast={t} Icon={Icon} onDismiss={() => dismiss(t.id)} />
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, Icon, onDismiss }: { toast: Toast; Icon: typeof CheckCircleIcon; onDismiss: () => void }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = window.setTimeout(() => setVisible(true), 10);
        return () => window.clearTimeout(t);
    }, []);

    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-200 ${
                COLORS[toast.kind]
            } ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="min-w-0 flex-1 text-sm leading-relaxed">{toast.message}</p>
            <button
                onClick={onDismiss}
                className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
            >
                <XIcon className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
