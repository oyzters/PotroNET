import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export interface UserSettings {
    dm_privacy: 'everyone' | 'followers' | 'friends';
    theme: 'light' | 'dark' | 'system';
    push_enabled: boolean;
    show_likes_to_owner: boolean;
}

interface SettingsContextType {
    settings: UserSettings | null;
    settingsLoading: boolean;
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [settingsLoading, setSettingsLoading] = useState(false);

    const fetchSettings = useCallback(async (token: string) => {
        setSettingsLoading(true);
        try {
            const data = await api<{ settings: UserSettings }>('/settings', { token });
            setSettings(data.settings);
        } catch {
            // silently fail — keeps previous value
        } finally {
            setSettingsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (session?.access_token) {
            fetchSettings(session.access_token);
        } else {
            setSettings(null);
        }
    }, [session?.access_token, fetchSettings]);

    const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
        if (!session?.access_token || !settings) return;
        const prev = settings;
        setSettings({ ...settings, ...updates });
        try {
            const data = await api<{ settings: UserSettings }>('/settings', {
                method: 'PATCH',
                token: session.access_token,
                body: JSON.stringify(updates),
            });
            setSettings(data.settings);
        } catch {
            setSettings(prev);
        }
    }, [session?.access_token, settings]);

    const refreshSettings = useCallback(async () => {
        if (session?.access_token) await fetchSettings(session.access_token);
    }, [session?.access_token, fetchSettings]);

    return (
        <SettingsContext.Provider value={{ settings, settingsLoading, updateSettings, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}
