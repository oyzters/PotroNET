import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SunIcon, MoonIcon, ArrowLeftIcon, MailIcon, CheckCircleIcon } from 'lucide-react';

const ALLOWED_DOMAIN = '@potros.itson.edu.mx';

export function ForgotPasswordPage() {
    const { forgotPassword } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const email = username.trim().toLowerCase() + ALLOWED_DOMAIN;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await forgotPassword(email);
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al enviar el correo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
            </div>

            <div className="flex items-center justify-between p-4">
                <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Volver
                </Link>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                </Button>
            </div>

            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
                            <span className="text-lg font-black text-primary-foreground">P</span>
                        </div>
                        <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
                        <CardDescription>
                            Te enviaremos un enlace para restablecer tu contraseña
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sent ? (
                            <div className="flex flex-col items-center gap-4 py-4 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground">Correo enviado</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Si <span className="font-medium text-foreground">{email}</span> está registrado,
                                        recibirás instrucciones para recuperar tu contraseña.
                                    </p>
                                </div>
                                <Link to="/login">
                                    <Button variant="outline">Volver al inicio de sesión</Button>
                                </Link>
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
                                        <FieldLabel htmlFor="forgot-email">Correo institucional</FieldLabel>
                                        <div className="flex items-center overflow-hidden rounded-lg border border-input focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                                            <input
                                                id="forgot-email"
                                                type="text"
                                                placeholder="tu.nombreID"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                                                required
                                                className="min-w-0 flex-1 bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                                            />
                                            <span className="shrink-0 select-none border-l border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                                                {ALLOWED_DOMAIN}
                                            </span>
                                        </div>
                                    </Field>
                                    <Button type="submit" className="w-full" disabled={loading || !username.trim()}>
                                        {loading ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                        ) : (
                                            <>
                                                <MailIcon className="mr-2 h-4 w-4" />
                                                Enviar enlace de recuperación
                                            </>
                                        )}
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
