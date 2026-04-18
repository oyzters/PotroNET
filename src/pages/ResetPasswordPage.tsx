import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SunIcon, MoonIcon, CheckCircleIcon, ShieldIcon } from 'lucide-react';

export function ResetPasswordPage() {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState('');

    useEffect(() => {
        // Supabase recovery links redirect with tokens in the URL hash
        const hash = window.location.hash;
        if (!hash) {
            setSessionError('Enlace inválido o expirado. Solicita uno nuevo.');
            return;
        }

        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (type !== 'recovery' || !accessToken || !refreshToken) {
            setSessionError('Enlace inválido o expirado. Solicita uno nuevo.');
            return;
        }

        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ error }) => {
                if (error) {
                    setSessionError('El enlace expiró o ya fue utilizado. Solicita uno nuevo.');
                } else {
                    setSessionReady(true);
                    // Clean hash from URL
                    window.history.replaceState(null, '', window.location.pathname);
                }
            });
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (updateError) {
            setError(updateError.message);
            return;
        }

        await supabase.auth.signOut();
        setDone(true);
    };

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
            </div>

            <div className="flex items-center justify-end p-4">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                </Button>
            </div>

            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
                            <ShieldIcon className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
                        <CardDescription>Elige una contraseña segura para tu cuenta</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sessionError ? (
                            <div className="flex flex-col items-center gap-4 py-4 text-center">
                                <p className="text-sm text-destructive">{sessionError}</p>
                                <Link to="/forgot-password">
                                    <Button variant="outline">Solicitar nuevo enlace</Button>
                                </Link>
                            </div>
                        ) : done ? (
                            <div className="flex flex-col items-center gap-4 py-4 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">Contraseña actualizada</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Ya puedes iniciar sesión con tu nueva contraseña.</p>
                                </div>
                                <Button onClick={() => navigate('/login')}>Iniciar Sesión</Button>
                            </div>
                        ) : !sessionReady ? (
                            <div className="flex justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <FieldGroup>
                                    {error && (
                                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                            {error}
                                        </div>
                                    )}
                                    <Field>
                                        <FieldLabel htmlFor="new-password">Nueva contraseña</FieldLabel>
                                        <Input
                                            id="new-password"
                                            type="password"
                                            placeholder="Mínimo 6 caracteres"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="confirm-password">Confirmar contraseña</FieldLabel>
                                        <Input
                                            id="confirm-password"
                                            type="password"
                                            placeholder="Repite tu contraseña"
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            required
                                        />
                                    </Field>
                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                        ) : 'Guardar nueva contraseña'}
                                    </Button>
                                </FieldGroup>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
