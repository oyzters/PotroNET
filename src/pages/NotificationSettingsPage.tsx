import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { isPushSupported, getCurrentSubscription } from '@/lib/push';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
    ChevronLeftIcon,
    HeartIcon, MessageCircleIcon, UserPlusIcon, GraduationCapIcon,
    MegaphoneIcon, FlagIcon,
} from 'lucide-react';

interface UserSettings {
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

export function NotificationSettingsPage() {
    const { session } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [pushSubscribed, setPushSubscribed] = useState(false);
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

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    const masterActive = !!settings?.push_enabled && pushSubscribed;

    return (
        <div className="mx-auto max-w-lg space-y-4 pb-24">
            <Link
                to="/settings"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeftIcon className="h-4 w-4" />
                Configuración
            </Link>

            <SectionHeader
                title="Tipos de notificaciones"
                subtitle="Elige qué quieres recibir"
            />

            {!masterActive && (
                <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3">
                    <p className="text-sm">Las notificaciones push están desactivadas.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Actívalas desde <Link to="/settings" className="underline text-primary">Configuración</Link> para personalizar los tipos.
                    </p>
                </div>
            )}

            <section className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="divide-y divide-border/30">
                    {PUSH_PREFS.map((pref) => {
                        const Icon = pref.icon;
                        const value = !!settings?.[pref.key];
                        return (
                            <div key={pref.key} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm">{pref.label}</p>
                                        <p className="text-xs text-muted-foreground">{pref.description}</p>
                                    </div>
                                </div>
                                <Toggle
                                    active={value}
                                    disabled={!masterActive}
                                    onClick={() => patchSettings({ [pref.key]: !value } as Partial<UserSettings>)}
                                />
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
