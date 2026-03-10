import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    career_id: string | null;
    semester: number;
    role: 'user' | 'admin' | 'sudo';
    reputation: number;
    is_banned: boolean;
    interests: string[];
    career?: { id: string; name: string } | null;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signUp: (email: string, password: string, fullName: string) => Promise<string>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (accessToken: string) => {
        try {
            const data = await api<{ user: Profile }>('/auth/me', {
                token: accessToken,
            });
            setProfile(data.user);
        } catch {
            setProfile(null);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.access_token) {
                fetchProfile(session.access_token);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.access_token) {
                    fetchProfile(session.access_token);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        if (!email.endsWith('@potros.itson.edu.mx')) {
            throw new Error('Solo se permiten correos @potros.itson.edu.mx');
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: { hd: 'potros.itson.edu.mx' },
                redirectTo: window.location.origin + '/feed',
            },
        });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string, fullName: string): Promise<string> => {
        const data = await api<{ message: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name: fullName }),
        });
        return data.message;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const refreshProfile = async () => {
        if (session?.access_token) {
            await fetchProfile(session.access_token);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, signIn, signInWithGoogle, signUp, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
