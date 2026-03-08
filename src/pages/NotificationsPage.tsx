import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    BellIcon, UserPlusIcon, MessageCircleIcon, StarIcon,
    TrophyIcon, AlertCircleIcon, CheckIcon, BookOpenIcon,
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Notificaciones</h1>
                    {unread > 0 && <p className="text-sm text-muted-foreground">{unread} notificaciones sin leer</p>}
                </div>
                {unread > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllRead}><CheckIcon className="mr-1 h-4 w-4" /> Marcar todas como leídas</Button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : notifications.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                    <BellIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-muted-foreground">No tienes notificaciones</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map(n => {
                        const Icon = TYPE_ICONS[n.type] || BellIcon;
                        return (
                            <Card key={n.id} className={`transition-all ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`} onClick={() => !n.is_read && markAsRead(n.id)}>
                                <CardContent className="flex items-start gap-4 py-4 cursor-pointer">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${!n.is_read ? 'bg-primary/10' : 'bg-muted'}`}>
                                        <Icon className={`h-5 w-5 ${!n.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                                        <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    {!n.is_read && <Badge className="shrink-0">Nuevo</Badge>}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                    <span className="flex items-center text-sm text-muted-foreground">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
            )}
        </div>
    );
}
