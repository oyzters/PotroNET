import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRole } from '@/hooks/useRole';
import { api } from '@/lib/api';
import {
    isPushSupported,
    getPushPermission,
    getCurrentSubscription,
    subscribeToPush,
    unsubscribeFromPush,
} from '@/lib/push';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    UserIcon, BellIcon, ShieldIcon, PaletteIcon, InfoIcon,
    MailIcon, SunIcon, MoonIcon, MonitorIcon, ChevronRightIcon,
    ShieldAlertIcon, ExternalLinkIcon,
    HeartIcon, MessageCircleIcon, UserPlusIcon, GraduationCapIcon,
    MegaphoneIcon, FlagIcon,
} from 'lucide-react';

interface UserSettings {
    notification_email: boolean;
    dm_privacy: 'everyone' | 'followers' | 'friends';
    theme: 'light' | 'dark' | 'system';
    push_enabled: boolean;
    push_follows: boolean;
    push_messages: boolean;
    push_likes: boolean;
    push_comments: boolean;
    push_tutoring: boolean;
    push_system: boolean;
    push_moderation: boolean;
}

type PushPrefKey = Extract<
    keyof UserSettings,
    'push_follows' | 'push_messages' | 'push_likes' | 'push_comments' |
    'push_tutoring' | 'push_system' | 'push_moderation'
>;

const PUSH_PREFS: ReadonlyArray<{
    key: PushPrefKey;
    label: string;
    description: string;
    icon: typeof HeartIcon;
}> = [
    { key: 'push_follows', label: 'Seguidores y amistades', description: 'Nuevos seguidores y solicitudes', icon: UserPlusIcon },
    { key: 'push_messages', label: 'Mensajes', description: 'Mensajes directos', icon: MessageCircleIcon },
    { key: 'push_likes', label: 'Me gusta', description: 'Likes en tus publicaciones', icon: HeartIcon },
    { key: 'push_comments', label: 'Comentarios', description: 'Comentarios en tus publicaciones', icon: MessageCircleIcon },
    { key: 'push_tutoring', label: 'Tutorías', description: 'Solicitudes y cambios de sesión', icon: GraduationCapIcon },
    { key: 'push_system', label: 'Sistema', description: 'Anuncios de PotroNET', icon: MegaphoneIcon },
    { key: 'push_moderation', label: 'Moderación', description: 'Advertencias y acciones sobre tu contenido', icon: FlagIcon },
];

const DM_LABELS: Record<string, string> = {
    everyone: 'Todos',
    followers: 'Seguidores',
    friends: 'Amigos',
};

const THEME_OPTIONS = [
    { value: 'light', label: 'Claro', icon: SunIcon },
    { value: 'dark', label: 'Oscuro', icon: MoonIcon },
    { value: 'system', label: 'Sistema', icon: MonitorIcon },
] as const;

function Toggle({ active, onClick, disabled = false }: { active: boolean; onClick: () => void; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                active ? 'bg-primary' : 'bg-muted'
            }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                    active ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

export function SettingsPage() {
    const { session, profile } = useAuth();
    const { toggleTheme, theme: currentTheme } = useTheme();
    const { isModerator, isSudo } = useRole();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
    const [pushSubscribed, setPushSubscribed] = useState(false);
    const [pushBusy, setPushBusy] = useState(false);
    const [pushError, setPushError] = useState<string | null>(null);
    const pushSupported = isPushSupported();

    const token = session?.access_token;

    const fetchSettings = useCallback(async () => {
        if (!token) return;
        try {
            const data = await api<{ settings: UserSettings }>('/settings', { token });
            setSettings(data.settings);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    useEffect(() => {
        if (!pushSupported) return;
        setPushPermission(getPushPermission());
        getCurrentSubscription().then((sub) => setPushSubscribed(!!sub));
    }, [pushSupported]);

    const patchSettings = useCallback(async (updates: Partial<UserSettings>) => {
        if (!token || !settings) return;
        const optimistic = { ...settings, ...updates };
        setSettings(optimistic);
        try {
            await api('/settings', {
                method: 'PATCH',
                token,
                body: JSON.stringify(updates),
            });
        } catch {
            setSettings(settings); // revert
        }
    }, [token, settings]);

    const handleThemeChange = (value: string) => {
        patchSettings({ theme: value as UserSettings['theme'] });
        // Sync with local ThemeContext
        const target = value === 'system' ? 'light' : value;
        if (target !== currentTheme) {
            toggleTheme();
        }
    };

    const handleTogglePushMaster = async () => {
        if (!token || pushBusy) return;
        setPushError(null);
        setPushBusy(true);
        try {
            if (settings?.push_enabled && pushSubscribed) {
                await unsubscribeFromPush(token);
                setPushSubscribed(false);
                await patchSettings({ push_enabled: false });
            } else {
                await subscribeToPush(token);
                setPushSubscribed(true);
                setPushPermission(getPushPermission());
                await patchSettings({ push_enabled: true });
            }
        } catch (err) {
            setPushError(err instanceof Error ? err.message : 'Error al activar notificaciones');
        } finally {
            setPushBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg space-y-6 pb-24">
            <SectionHeader title="Configuracion" />

            {/* Cuenta */}
            <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    <UserIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-semibold">Cuenta</h2>
                </div>
                <div className="divide-y divide-border/30">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm truncate max-w-[200px]">{profile?.email}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-muted-foreground">Nombre</span>
                        <span className="text-sm truncate max-w-[200px]">{profile?.full_name}</span>
                    </div>
                </div>
            </section>

            {/* Notificaciones */}
            <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    <BellIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-semibold">Notificaciones</h2>
                </div>

                <div className="divide-y divide-border/30">
                    {/* Email */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <MailIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Notificaciones por email</span>
                        </div>
                        <Toggle
                            active={!!settings?.notification_email}
                            onClick={() => patchSettings({ notification_email: !settings?.notification_email })}
                        />
                    </div>

                    {/* Push master */}
                    {pushSupported ? (
                        <div className="px-4 py-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <BellIcon className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm">Notificaciones push</p>
                                        <p className="text-xs text-muted-foreground">
                                            {pushPermission === 'denied'
                                                ? 'Bloqueadas en el navegador — actívalas en ajustes del sitio'
                                                : settings?.push_enabled && pushSubscribed
                                                    ? 'Activadas en este dispositivo'
                                                    : 'Desactivadas'}
                                        </p>
                                    </div>
                                </div>
                                <Toggle
                                    active={!!settings?.push_enabled && pushSubscribed}
                                    disabled={pushBusy || pushPermission === 'denied'}
                                    onClick={handleTogglePushMaster}
                                />
                            </div>
                            {pushError && <p className="text-xs text-destructive">{pushError}</p>}
                        </div>
                    ) : (
                        <div className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                Este navegador no soporta notificaciones push. En iOS instala la app desde el ícono "Compartir → Añadir a inicio".
                            </p>
                        </div>
                    )}

                    {/* Per-type toggles (only visible if push enabled) */}
                    {pushSupported && settings?.push_enabled && pushSubscribed && (
                        <div className="px-4 py-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">¿Qué quieres recibir?</p>
                            {PUSH_PREFS.map((pref) => {
                                const Icon = pref.icon;
                                const value = !!settings?.[pref.key];
                                return (
                                    <div key={pref.key} className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-sm truncate">{pref.label}</p>
                                                <p className="text-xs text-muted-foreground truncate">{pref.description}</p>
                                            </div>
                                        </div>
                                        <Toggle
                                            active={value}
                                            onClick={() => patchSettings({ [pref.key]: !value } as Partial<UserSettings>)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Privacidad */}
            <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    <ShieldIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-semibold">Privacidad</h2>
                </div>
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Quien puede enviarme mensajes</span>
                        <Select
                            value={settings?.dm_privacy || 'everyone'}
                            onValueChange={(v) => patchSettings({ dm_privacy: v as UserSettings['dm_privacy'] })}
                        >
                            <SelectTrigger className="w-auto">
                                <SelectValue>{DM_LABELS[settings?.dm_privacy || 'everyone']}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="everyone">Todos</SelectItem>
                                <SelectItem value="followers">Seguidores</SelectItem>
                                <SelectItem value="friends">Amigos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </section>

            {/* Apariencia */}
            <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    <PaletteIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-semibold">Apariencia</h2>
                </div>
                <div className="px-4 py-3">
                    <div className="grid grid-cols-3 gap-2">
                        {THEME_OPTIONS.map((opt) => {
                            const active = (settings?.theme || 'system') === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => handleThemeChange(opt.value)}
                                    className={`flex flex-col items-center gap-2 rounded-xl py-3 text-sm transition-all ${
                                        active
                                            ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                                            : 'text-muted-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    <opt.icon className="h-5 w-5" />
                                    <span className="text-xs font-medium">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Herramientas (admin/sudo) */}
            {isModerator && (
                <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                        <ShieldIcon className="h-5 w-5 text-primary" />
                        <h2 className="text-sm font-semibold">Herramientas</h2>
                        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {isSudo ? 'Sudo' : 'Admin'}
                        </span>
                    </div>
                    <div className="divide-y divide-border/30">
                        <Link to="/moderation" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <ShieldIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Panel de Moderación</span>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        {isSudo && (
                            <>
                                <Link to="/sudo-tools" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <ShieldAlertIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Sudo Tools</span>
                                    </div>
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                                </Link>
                                <a
                                    href="https://potronet-admin.vercel.app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">PotroNET Admin</span>
                                    </div>
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                                </a>
                            </>
                        )}
                    </div>
                </section>
            )}

            {/* Sobre */}
            <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    <InfoIcon className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-semibold">Sobre</h2>
                </div>
                <div className="divide-y divide-border/30">
                    <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-muted-foreground">Version</span>
                        <span className="text-sm">1.0.0</span>
                    </div>
                    <Link to="/terms" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                        <span className="text-sm">Terminos de servicio</span>
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link to="/privacy" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                        <span className="text-sm">Politica de privacidad</span>
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    <Link to="/guidelines" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                        <span className="text-sm">Normas de la comunidad</span>
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
