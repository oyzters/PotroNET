import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/hooks/useRole';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
    ShieldAlertIcon, UsersIcon, ClockIcon, BarChartIcon,
    ExternalLinkIcon, SearchIcon, BanIcon, ShieldCheckIcon,
    ChevronDownIcon, UserIcon, BellIcon, AlertTriangleIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    role: string;
    is_banned: boolean;
    avatar_url: string;
    reputation: number;
}

interface AuditAction {
    id: string;
    action_type: string;
    category: string;
    reason: string;
    created_at: string;
    target_user: { id: string; full_name: string } | null;
    moderator: { id: string; full_name: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
    delete_publication: '🗑️ Pub. eliminada',
    delete_comment: '🗑️ Com. eliminado',
    warn_user: '⚠️ Advertencia',
    ban_user: '🚫 Ban',
    unban_user: '✅ Desban',
    role_change: '🔄 Rol',
    resolve_report: '✓ Reporte',
    dismiss_report: '✕ Reporte',
};

const ROLE_COLORS = {
    user: 'bg-muted text-muted-foreground',
    admin: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    sudo: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export function SudoToolsPage() {
    const { session } = useAuth();
    const { isSudo } = useRole();

    const [tab, setTab] = useState<'users' | 'audit' | 'notify'>('users');

    // Users management
    const [userSearch, setUserSearch] = useState('');
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Audit log
    const [auditLog, setAuditLog] = useState<AuditAction[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotalPages, setAuditTotalPages] = useState(1);

    // Notifications
    const [notifMessage, setNotifMessage] = useState('');
    const [notifTarget, setNotifTarget] = useState<'global' | 'user'>('global');
    const [notifUserId, setNotifUserId] = useState('');
    const [notifSending, setNotifSending] = useState(false);
    const [notifResult, setNotifResult] = useState<{ sent?: number; error?: string } | null>(null);

    const searchUsers = useCallback(async () => {
        if (!session?.access_token) return;
        setUsersLoading(true);
        try {
            const params = new URLSearchParams({ limit: '10' });
            if (userSearch.trim()) params.set('search', userSearch.trim());
            const data = await api<{ users: UserProfile[] }>(`/admin/users?${params}`, { token: session.access_token });
            setUsers(data.users || []);
        } catch { /* silent */ } finally { setUsersLoading(false); }
    }, [session?.access_token, userSearch]);

    const fetchAudit = useCallback(async () => {
        if (!session?.access_token || tab !== 'audit') return;
        setAuditLoading(true);
        try {
            const data = await api<{ actions: AuditAction[]; pagination: { totalPages: number } }>(
                `/moderation/log?page=${auditPage}&limit=20`,
                { token: session.access_token }
            );
            setAuditLog(data.actions || []);
            setAuditTotalPages(data.pagination.totalPages || 1);
        } catch { /* silent */ } finally { setAuditLoading(false); }
    }, [session?.access_token, tab, auditPage]);

    useEffect(() => { searchUsers(); }, []);
    useEffect(() => { fetchAudit(); }, [fetchAudit]);

    const handleUserAction = async (userId: string, action: 'ban' | 'unban' | string, role?: string) => {
        if (!session?.access_token) return;
        setActionLoading(true);
        try {
            const body: Record<string, string> = { user_id: userId, action };
            if (role) body.role = role;
            await api('/admin/users', {
                method: 'PATCH',
                token: session.access_token,
                body: JSON.stringify(body),
            });
            // Refresh user
            setUsers(prev => prev.map(u => {
                if (u.id !== userId) return u;
                if (action === 'ban') return { ...u, is_banned: true };
                if (action === 'unban') return { ...u, is_banned: false };
                if (action === 'role' && role) return { ...u, role };
                return u;
            }));
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => {
                    if (!prev) return prev;
                    if (action === 'ban') return { ...prev, is_banned: true };
                    if (action === 'unban') return { ...prev, is_banned: false };
                    if (action === 'role' && role) return { ...prev, role };
                    return prev;
                });
            }
        } catch { /* silent */ } finally { setActionLoading(false); }
    };

    const handleSendNotification = async () => {
        if (!session?.access_token || !notifMessage.trim()) return;
        if (notifTarget === 'user' && !notifUserId.trim()) {
            setNotifResult({ error: 'Ingresa el User ID' });
            return;
        }
        setNotifSending(true);
        setNotifResult(null);
        try {
            const body: Record<string, string> = { message: notifMessage.trim(), target_type: notifTarget };
            if (notifTarget === 'user') body.user_id = notifUserId.trim();
            const data = await api<{ sent: number }>('/admin/notifications', {
                method: 'POST',
                token: session.access_token,
                body: JSON.stringify(body),
            });
            setNotifResult({ sent: data.sent });
            setNotifMessage('');
        } catch (e: unknown) {
            setNotifResult({ error: (e as Error).message || 'Error al enviar' });
        } finally { setNotifSending(false); }
    };

    if (!isSudo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <ShieldAlertIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h2 className="font-bold text-lg">Solo Sudo</h2>
                <p className="text-sm text-muted-foreground">Esta sección es exclusiva para usuarios con rol Sudo.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl pb-24 space-y-5">
            <SectionHeader title="Sudo Tools" />

            {/* PotroNET Admin badge */}
            <a
                href="https://admin.potronet.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
                        <ShieldAlertIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">PotroNET Admin Panel</p>
                        <p className="text-xs text-muted-foreground">Panel de administración completo</p>
                    </div>
                </div>
                <ExternalLinkIcon className="h-4 w-4 text-primary" />
            </a>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-muted/30 p-1 overflow-x-auto">
                {[
                    { key: 'users' as const, label: 'Usuarios', icon: UsersIcon },
                    { key: 'audit' as const, label: 'Audit Log', icon: ClockIcon },
                    { key: 'notify' as const, label: 'Notificar', icon: BellIcon },
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 flex-1 justify-center rounded-lg py-2 text-xs font-medium transition-all whitespace-nowrap ${
                            tab === key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Users tab */}
            {tab === 'users' && (
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            value={userSearch}
                            onChange={e => setUserSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && searchUsers()}
                            placeholder="Buscar por nombre o email..."
                            className="w-full rounded-xl border border-border bg-card/50 px-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <Button
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs px-3"
                            onClick={searchUsers}
                        >
                            Buscar
                        </Button>
                    </div>

                    {/* Users list */}
                    {usersLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {users.map(u => (
                                <div key={u.id} className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
                                    <button
                                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/20 transition-colors"
                                        onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                            {u.avatar_url
                                                ? <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                                                : <UserIcon className="h-5 w-5 text-primary" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold truncate">{u.full_name}</p>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[u.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.user}`}>
                                                    {u.role}
                                                </span>
                                                {u.is_banned && (
                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500 shrink-0">
                                                        baneado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                        <ChevronDownIcon className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${selectedUser?.id === u.id ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Expanded panel */}
                                    {selectedUser?.id === u.id && (
                                        <div className="border-t border-border/40 bg-muted/10 p-3 space-y-3">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <BarChartIcon className="h-3 w-3" />
                                                <span>Reputación: {u.reputation}</span>
                                                <span className="mx-1">•</span>
                                                <span className="font-mono text-[10px] select-all">{u.id}</span>
                                            </div>

                                            {/* Role selector */}
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Cambiar rol:</p>
                                                <div className="flex gap-2">
                                                    {(['user', 'admin', 'sudo'] as const).map(role => (
                                                        <button
                                                            key={role}
                                                            disabled={u.role === role || actionLoading}
                                                            onClick={() => handleUserAction(u.id, 'role', role)}
                                                            className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                                                                u.role === role
                                                                    ? 'border-primary bg-primary/10 text-primary'
                                                                    : 'border-border hover:border-primary/40'
                                                            }`}
                                                        >
                                                            {role}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Ban/Unban */}
                                            <div className="flex gap-2">
                                                {u.is_banned ? (
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                                                        disabled={actionLoading}
                                                        onClick={() => handleUserAction(u.id, 'unban')}
                                                    >
                                                        <ShieldCheckIcon className="h-3.5 w-3.5 mr-1" /> Desbanear
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs"
                                                        disabled={actionLoading || u.role === 'sudo'}
                                                        onClick={() => {
                                                            if (confirm(`¿Banear a ${u.full_name}?`)) handleUserAction(u.id, 'ban');
                                                        }}
                                                    >
                                                        <BanIcon className="h-3.5 w-3.5 mr-1" /> Banear
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {users.length === 0 && !usersLoading && (
                                <div className="rounded-2xl border border-dashed border-border py-10 text-center">
                                    <UsersIcon className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                                    <p className="text-sm text-muted-foreground">Busca un usuario para gestionar</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Audit Log tab */}
            {tab === 'audit' && (
                <div className="space-y-3">
                    {auditLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : auditLog.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
                            <ClockIcon className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">Sin actividad registrada</p>
                        </div>
                    ) : (
                        <>
                            {auditLog.map(action => (
                                <div key={action.id} className="rounded-xl border border-border/40 bg-card/30 p-3 flex items-start gap-3">
                                    <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
                                        {ACTION_LABELS[action.action_type] || action.action_type}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        {action.target_user && (
                                            <p className="text-sm font-medium truncate">{action.target_user.full_name}</p>
                                        )}
                                        {action.reason && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">{action.reason}</p>
                                        )}
                                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                                            <span>{action.moderator?.full_name || 'Sistema'}</span>
                                            <span>•</span>
                                            <span>{new Date(action.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {auditTotalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-2">
                                    <Button variant="outline" size="sm" disabled={auditPage === 1} onClick={() => setAuditPage(p => p - 1)}>
                                        Anterior
                                    </Button>
                                    <span className="flex items-center text-sm text-muted-foreground">{auditPage}/{auditTotalPages}</span>
                                    <Button variant="outline" size="sm" disabled={auditPage === auditTotalPages} onClick={() => setAuditPage(p => p + 1)}>
                                        Siguiente
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Notifications tab */}
            {tab === 'notify' && (
                <div className="space-y-4 rounded-2xl border border-border/50 bg-card/50 p-5">
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Mensaje</label>
                        <textarea
                            value={notifMessage}
                            onChange={e => setNotifMessage(e.target.value)}
                            placeholder="Escribe el mensaje para los usuarios..."
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right mt-0.5">{notifMessage.length}/500</p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Destinatarios</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setNotifTarget('global')}
                                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                    notifTarget === 'global' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/30'
                                }`}
                            >
                                <UsersIcon className="h-4 w-4" /> Global
                            </button>
                            <button
                                onClick={() => setNotifTarget('user')}
                                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                                    notifTarget === 'user' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/30'
                                }`}
                            >
                                <UserIcon className="h-4 w-4" /> Usuario
                            </button>
                        </div>
                    </div>

                    {notifTarget === 'user' && (
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">User ID</label>
                            <input
                                type="text"
                                value={notifUserId}
                                onChange={e => setNotifUserId(e.target.value)}
                                placeholder="UUID del usuario..."
                                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    )}

                    {notifResult && (
                        <div className={`rounded-xl p-3 text-sm ${notifResult.error ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                            {notifResult.error ? `Error: ${notifResult.error}` : `✓ Enviado a ${notifResult.sent} usuario(s)`}
                        </div>
                    )}

                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                        <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Las notificaciones globales se envían a <strong>todos los usuarios activos</strong>.
                        </p>
                    </div>

                    <Button
                        className="w-full"
                        disabled={notifSending || !notifMessage.trim()}
                        onClick={handleSendNotification}
                    >
                        {notifSending ? (
                            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" /> Enviando...</>
                        ) : (
                            <><BellIcon className="mr-2 h-4 w-4" /> Enviar Notificación</>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
