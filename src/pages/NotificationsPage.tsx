import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    BellIcon, UserPlusIcon, MessageCircleIcon, StarIcon,
    TrophyIcon, AlertCircleIcon, BookOpenIcon, CheckCheckIcon
} from 'lucide-react';

interface Notification {
    id: string; type: string; title: string; body: string;
    reference_id: string; is_read: boolean; created_at: string;
}
interface NotificationsResponse {
    notifications: Notification[];
    unread: number;
    pagination: { page: number; total: number; totalPages: number };
}

const TYPE_ICONS: Record<string, typeof BellIcon> = {
    friend_request: UserPlusIcon,
    friend_accepted: UserPlusIcon,
    message: MessageCircleIcon,
    professor_review: StarIcon,
    tutoring: BookOpenIcon,
    achievement: TrophyIcon,
    system: AlertCircleIcon,
    publication_reply: MessageCircleIcon,
};

export function NotificationsPage() {
    const { session } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchNotifications = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const data = await api<NotificationsResponse>(`/notifications?page=${page}&limit=20`, { token: session.access_token });
            setNotifications(data.notifications);
            setUnread(data.unread);
            setTotalPages(data.pagination.totalPages);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token, page]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    const markAsRead = async (id: string) => {
        if (!session?.access_token) return;
        try {
            await api('/notifications', { method: 'PATCH', token: session.access_token, body: JSON.stringify({ notification_id: id }) });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnread(prev => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        if (!session?.access_token) return;
        try {
            await api('/notifications', { method: 'PATCH', token: session.access_token, body: JSON.stringify({ mark_all_read: true }) });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnread(0);
        } catch { /* silent */ }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 dark:bg-none dark:bg-background">
            {/* Hero Section */}
            <div className="px-4 md:px-8 pt-8 md:pt-12 pb-6">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Centro de Notificaciones
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-2xl mx-auto">
                        Mantente al día con todas las actualizaciones importantes de tu comunidad académica.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center gap-3">
                        {unread > 0 && (
                            <Button 
                                variant="outline" 
                                onClick={markAllRead}
                                className="rounded-full px-6 border-border/50"
                            >
                                <CheckCheckIcon className="mr-2 h-4 w-4" />
                                Marcar todas como leídas ({unread})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Notifications List */}
            <div className="px-4 md:px-8 pb-8">
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/20 rounded-full mb-6">
                                <BellIcon className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No tienes notificaciones</h3>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Te notificaremos cuando haya actualizaciones importantes para ti.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map(n => {
                                const Icon = TYPE_ICONS[n.type] || BellIcon;
                                return (
                                    <div 
                                        key={n.id} 
                                        className={`bg-card/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 hover:bg-card/60 transition-all cursor-pointer ${
                                            !n.is_read ? 'ring-2 ring-primary/20 border-primary/30' : ''
                                        }`}
                                        onClick={() => !n.is_read && markAsRead(n.id)}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Icon */}
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                                !n.is_read 
                                                    ? 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30' 
                                                    : 'bg-muted/50 border border-border/50'
                                            }`}>
                                                <Icon className={`h-5 w-5 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h3 className={`text-sm mb-1 ${!n.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'}`}>
                                                            {n.title}
                                                        </h3>
                                                        {n.body && (
                                                            <p className="text-muted-foreground text-xs leading-relaxed">{n.body}</p>
                                                        )}
                                                    </div>
                                                    {!n.is_read && (
                                                        <Badge className="shrink-0 ml-2 px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground">
                                                            Nuevo
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <BellIcon className="h-3 w-3" />
                                                    <span>{new Date(n.created_at).toLocaleDateString('es-MX', { 
                                                        day: 'numeric', 
                                                        month: 'short', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-8">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={page === 1} 
                                onClick={() => setPage(page - 1)}
                                className="rounded-full border-border/50"
                            >
                                Anterior
                            </Button>
                            <span className="flex items-center text-sm text-muted-foreground px-3">{page} / {totalPages}</span>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={page === totalPages} 
                                onClick={() => setPage(page + 1)}
                                className="rounded-full border-border/50"
                            >
                                Siguiente
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
