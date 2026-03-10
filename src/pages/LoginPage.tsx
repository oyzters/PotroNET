import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SunIcon, MoonIcon, ArrowLeftIcon, LogInIcon } from 'lucide-react';

export function LoginPage() {
    const { signIn, signInWithGoogle } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            navigate('/feed');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Decorative bg */}
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
            </div>

            {/* Top bar */}
            <div className="flex items-center justify-between p-4">
                <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Volver
                </Link>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                </Button>
            </div>

            {/* Login form */}
            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
                            <span className="text-lg font-black text-primary-foreground">P</span>
                        </div>
                        <CardTitle className="text-2xl">Bienvenido de vuelta</CardTitle>
                        <CardDescription>
                            Inicia sesión con tu cuenta PotroNET
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                {error && (
                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                        {error}
                                    </div>
                                )}
                                <Field>
                                    <FieldLabel htmlFor="login-email">Correo institucional</FieldLabel>
                                    <Input
                                        id="login-email"
                                        type="email"
                                        placeholder="tu.nombre@potros.itson.edu.mx"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                                    <Input
                                        id="login-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </Field>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    ) : (
                                        <>
                                            <LogInIcon className="mr-2 h-4 w-4" />
                                            Iniciar Sesión
                                        </>
                                    )}
                                </Button>

                                <div className="relative my-2">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                                    <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">o continúa con</span></div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setError('');
                                        signInWithGoogle().catch(err => setError(err instanceof Error ? err.message : 'Error con Google'));
                                    }}
                                >
                                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Google Institucional
                                </Button>
                            </FieldGroup>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            ¿No tienes cuenta?{' '}
                            <Link to="/register" className="font-medium text-primary hover:underline">
                                Regístrate aquí
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
