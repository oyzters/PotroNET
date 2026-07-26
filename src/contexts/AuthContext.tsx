import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
    forgotPassword: (email: string, redirectTo?: string) => Promise<string>;
    resendVerification: (email: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Supabase repite eventos de auth (INITIAL_SESSION, SIGNED_IN al enfocar
    // la ventana, TOKEN_REFRESHED); sin dedupe cada evento golpea /auth/me y
    // dispara el rate limit del API (429).
    const profileUserIdRef = useRef<string | null>(null);
    const fetchInFlightRef = useRef(false);

    const fetchProfile = async (accessToken: string, userId?: string, force = false) => {
        if (fetchInFlightRef.current) return;
        if (!force && userId && profileUserIdRef.current === userId) return;
        fetchInFlightRef.current = true;
        try {
            const data = await api<{ user: Profile }>('/auth/me', {
                token: accessToken,
            });
            setProfile(data.user);
            profileUserIdRef.current = data.user.id;
        } catch (err) {
            if (import.meta.env.DEV) console.error('[AuthContext] fetchProfile failed:', err);
            // Error transitorio (rate limit, sin red): conservar el perfil ya
            // cargado; solo el cierre de sesión lo limpia.
        } finally {
            fetchInFlightRef.current = false;
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.access_token) {
                await fetchProfile(session.access_token, session.user?.id);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.access_token) {
                    fetchProfile(session.access_token, session.user?.id);
                } else {
                    setProfile(null);
                    profileUserIdRef.current = null;
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        if (!email.endsWith('@potros.itson.edu.mx')) {
            throw new Error('Solo se permiten correos @potros.itson.edu.mx');
        }
        const data = await api<{
            user: { id: string; email: string };
            session: { access_token: string; refresh_token: string; expires_at: number };
        }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });
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
        profileUserIdRef.current = null;
    };

    const refreshProfile = async () => {
        if (session?.access_token) {
            await fetchProfile(session.access_token, session.user?.id, true);
        }
    };

    const forgotPassword = async (email: string, redirectTo?: string): Promise<string> => {
        const data = await api<{ message: string }>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email, redirect_to: redirectTo }),
        });
        return data.message;
    };

    const resendVerification = async (email: string): Promise<string> => {
        const data = await api<{ message: string }>('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
        return data.message;
    };

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, signIn, signInWithGoogle, signUp, signOut, refreshProfile, forgotPassword, resendVerification }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
