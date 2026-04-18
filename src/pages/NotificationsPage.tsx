import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
    BellIcon, UserPlusIcon, MessageCircleIcon, StarIcon,
    TrophyIcon, AlertCircleIcon, BookOpenIcon, CheckCheckIcon
} from 'lucide-react';
import { ListSkeleton } from '@/components/ui/Skeleton';

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
    follow: UserPlusIcon,
    friend_request: UserPlusIcon,
    friend_accepted: UserPlusIcon,
    message: MessageCircleIcon,
    professor_review: StarIcon,
    tutoring: BookOpenIcon,
    achievement: TrophyIcon,
    system: AlertCircleIcon,
    publication_reply: MessageCircleIcon,
};

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `hace ${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `hace ${diffDays}d`;
    return new Date(dateStr).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

export function NotificationsPage() {
    const { session, user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [followingBack, setFollowingBack] = useState<Set<string>>(new Set());

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

    const handleNotificationClick = async (n: Notification) => {
        if (!n.is_read) await markAsRead(n.id);

        switch (n.type) {
            case 'follow':
                navigate('/friends?tab=followers');
                break;
            case 'friend_accepted':
                navigate(`/profile/${n.reference_id}`);
                break;
            case 'message':
                navigate(`/messages/${n.reference_id}`);
                break;
            case 'publication_reply':
                navigate('/feed');
                break;
            case 'achievement':
                if (user?.id) navigate(`/profile/${user.id}`);
                break;
            default:
                break;
        }
    };

    const handleFollowBack = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        if (!session?.access_token) return;
        try {
            await api('/follows', {
                method: 'POST',
                token: session.access_token,
                body: JSON.stringify({ following_id: notificationId }),
            });
            setFollowingBack(prev => new Set(prev).add(notificationId));
        } catch { /* silent */ }
    };

    return (
        <div className="min-h-dvh">
            {/* Hero Section */}
            <SectionHeader
                title="Notificaciones"
                subtitle="Manténte al día con todas las actualizaciones de tu comunidad académica."
            >
                {unread > 0 && (
                    <Button
                        variant="outline"
                        onClick={markAllRead}
                        className="rounded-full px-6 border-primary/30 hover:border-primary"
                    >
                        <CheckCheckIcon className="mr-2 h-4 w-4" />
                        Marcar todas ({unread})
                    </Button>
                )}
            </SectionHeader>

            {/* Notifications List */}
            <div className="px-4 md:px-8 pb-8">
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <ListSkeleton count={6} />
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
                                        onClick={() => handleNotificationClick(n)}
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
                                                <div className="flex items-start gap-2 mb-1">
                                                    <h3 className={`flex-1 min-w-0 text-sm leading-snug [overflow-wrap:anywhere] ${!n.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'}`}>
                                                        {n.title}
                                                    </h3>
                                                    {!n.is_read && (
                                                        <Badge className="shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground">
                                                            Nuevo
                                                        </Badge>
                                                    )}
                                                </div>
                                                {n.body && (
                                                    <p className="text-muted-foreground text-xs leading-relaxed [overflow-wrap:anywhere]">{n.body}</p>
                                                )}

                                                {n.type === 'follow' && (
                                                    <div className="mt-2">
                                                        {!followingBack.has(n.reference_id) ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="rounded-full text-xs px-3 h-7"
                                                                onClick={(e) => handleFollowBack(e, n.reference_id)}
                                                            >
                                                                Seguir de vuelta
                                                            </Button>
                                                        ) : (
                                                            <Badge className="rounded-full px-2 py-0.5 text-xs bg-green-500/20 text-green-600 border-green-500/30">
                                                                Siguiendo
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                                                    <BellIcon className="h-3 w-3" />
                                                    <span>{timeAgo(n.created_at)}</span>
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
