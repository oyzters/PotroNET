import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    UserIcon, BellIcon, ShieldIcon, PaletteIcon, InfoIcon,
    MailIcon, SunIcon, MoonIcon, MonitorIcon, ChevronRightIcon,
} from 'lucide-react';

interface UserSettings {
    notification_email: boolean;
    dm_privacy: 'everyone' | 'followers' | 'friends';
    theme: 'light' | 'dark' | 'system';
}

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

export function SettingsPage() {
    const { session, profile } = useAuth();
    const { toggleTheme, theme: currentTheme } = useTheme();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);

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
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <MailIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Notificaciones por email</span>
                        </div>
                        <button
                            onClick={() => patchSettings({ notification_email: !settings?.notification_email })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                settings?.notification_email ? 'bg-primary' : 'bg-muted'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
                                    settings?.notification_email ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
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
