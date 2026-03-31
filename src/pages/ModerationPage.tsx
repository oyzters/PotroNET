import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
    ShieldIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon,
    XCircleIcon, EyeIcon, FileTextIcon, UserIcon, StarIcon,
    TrendingUpIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const REPORT_TYPE_ICONS: Record<string, typeof FileTextIcon> = {
    publication: FileTextIcon,
    user: UserIcon,
    review: StarIcon,
};

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    reviewed: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    resolved: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    dismissed: 'bg-muted text-muted-foreground',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
    delete_publication: 'Publicación eliminada',
    delete_comment: 'Comentario eliminado',
    warn_user: 'Advertencia enviada',
    ban_user: 'Usuario baneado',
    unban_user: 'Usuario desbaneado',
    role_change: 'Rol cambiado',
    resolve_report: 'Reporte resuelto',
    dismiss_report: 'Reporte descartado',
};

const ACTION_TYPE_COLORS: Record<string, string> = {
    delete_publication: 'text-destructive bg-destructive/10',
    delete_comment: 'text-destructive bg-destructive/10',
    warn_user: 'text-amber-500 bg-amber-500/10',
    ban_user: 'text-red-600 bg-red-500/10',
    unban_user: 'text-emerald-500 bg-emerald-500/10',
    role_change: 'text-blue-500 bg-blue-500/10',
    resolve_report: 'text-emerald-500 bg-emerald-500/10',
    dismiss_report: 'text-muted-foreground bg-muted',
};

interface Stats {
    pendingReports: number;
    actionsToday: number;
    activeWarnings: number;
}

interface Report {
    id: string;
    report_type: string;
    reason: string;
    description: string;
    status: string;
    created_at: string;
    target_id: string;
    reporter: { id: string; full_name: string };
}

interface Action {
    id: string;
    action_type: string;
    category: string;
    reason: string;
    created_at: string;
    target_user: { id: string; full_name: string } | null;
    moderator: { id: string; full_name: string } | null;
}

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
}

export function ModerationPage() {
    const { session } = useAuth();
    const { isModerator } = useRole();

    const [stats, setStats] = useState<Stats | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [recentActions, setRecentActions] = useState<Action[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'reports' | 'activity'>('reports');

    const fetchData = useCallback(async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const [statsRes, reportsRes] = await Promise.all([
                api<{ stats: Stats; recentActions: Action[] }>('/moderation/stats', { token: session.access_token }),
                api<{ reports: Report[] }>('/moderation/reports?status=pending&limit=15', { token: session.access_token }),
            ]);
            setStats(statsRes.stats);
            setRecentActions(statsRes.recentActions || []);
            setReports(reportsRes.reports || []);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [session?.access_token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleResolveReport = async (reportId: string, status: string) => {
        if (!session?.access_token) return;
        try {
            await api(`/moderation/reports/${reportId}`, {
                method: 'PATCH',
                token: session.access_token,
                body: JSON.stringify({ status }),
            });
            setReports(prev => prev.filter(r => r.id !== reportId));
            setStats(prev => prev ? { ...prev, pendingReports: Math.max(0, prev.pendingReports - 1) } : prev);
        } catch { /* silent */ }
    };

    if (!isModerator) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <ShieldIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h2 className="font-bold text-lg">Acceso restringido</h2>
                <p className="text-sm text-muted-foreground mt-1">No tienes permisos para acceder al panel de moderación.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl pb-24 space-y-5">
            <SectionHeader title="Moderación" />

            {/* Stats cards */}
            {loading ? (
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="rounded-2xl border border-border/50 bg-card/50 p-4 animate-pulse h-24" />
                    ))}
                </div>
            ) : stats && (
                <div className="grid grid-cols-3 gap-3">
                    <StatCard
                        icon={AlertTriangleIcon}
                        label="Pendientes"
                        value={stats.pendingReports}
                        color="text-amber-500"
                        bg="bg-amber-500/10"
                    />
                    <StatCard
                        icon={TrendingUpIcon}
                        label="Hoy"
                        value={stats.actionsToday}
                        color="text-primary"
                        bg="bg-primary/10"
                    />
                    <StatCard
                        icon={ShieldIcon}
                        label="Advertencias"
                        value={stats.activeWarnings}
                        color="text-blue-500"
                        bg="bg-blue-500/10"
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-muted/30 p-1">
                <button
                    onClick={() => setTab('reports')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                        tab === 'reports' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Reportes pendientes {stats && stats.pendingReports > 0 && (
                        <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                            {stats.pendingReports}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('activity')}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                        tab === 'activity' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Actividad reciente
                </button>
            </div>

            {/* Reports tab */}
            {tab === 'reports' && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                            <CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-500/30" />
                            <p className="mt-4 text-muted-foreground font-medium">¡Sin reportes pendientes!</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">La comunidad está en orden</p>
                        </div>
                    ) : (
                        reports.map(report => {
                            const Icon = REPORT_TYPE_ICONS[report.report_type] || AlertTriangleIcon;
                            return (
                                <div key={report.id} className="rounded-2xl border border-border/50 bg-card/50 p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                                            <Icon className="h-4 w-4 text-destructive" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold capitalize">{report.report_type}</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium mt-0.5">{report.reason}</p>
                                            {report.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                                                <span>Por: {report.reporter?.full_name}</span>
                                                <span>•</span>
                                                <span>ID: {report.target_id.slice(0, 8)}...</span>
                                                <span>•</span>
                                                <ClockIcon className="h-3 w-3" />
                                                <span>{timeAgo(report.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1 border-t border-border/30">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-8 text-xs"
                                            onClick={() => handleResolveReport(report.id, 'reviewed')}
                                        >
                                            <EyeIcon className="h-3 w-3 mr-1" /> Revisar
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1 h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                                            onClick={() => handleResolveReport(report.id, 'resolved')}
                                        >
                                            <CheckCircleIcon className="h-3 w-3 mr-1" /> Resolver
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-muted-foreground"
                                            onClick={() => handleResolveReport(report.id, 'dismissed')}
                                        >
                                            <XCircleIcon className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Activity tab */}
            {tab === 'activity' && (
                <div className="space-y-2">
                    {recentActions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                            <ClockIcon className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
                        </div>
                    ) : (
                        recentActions.map(action => (
                            <div key={action.id} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/30 p-3">
                                <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0 ${ACTION_TYPE_COLORS[action.action_type] || 'text-muted-foreground bg-muted'}`}>
                                    {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
                                </span>
                                <div className="flex-1 min-w-0">
                                    {action.target_user && (
                                        <p className="text-sm font-medium truncate">{action.target_user.full_name}</p>
                                    )}
                                    {action.reason && (
                                        <p className="text-xs text-muted-foreground line-clamp-1">{action.reason}</p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                                        <span>{action.moderator?.full_name}</span>
                                        <span>•</span>
                                        <span>{timeAgo(action.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

function StatCard({
    icon: Icon, label, value, color, bg,
}: { icon: typeof AlertTriangleIcon; label: string; value: number; color: string; bg: string }) {
    return (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-4 flex flex-col gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-xl font-black">{value}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
    );
}
