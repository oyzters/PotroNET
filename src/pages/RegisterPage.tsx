import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SunIcon, MoonIcon, ArrowLeftIcon, UserPlusIcon, CheckCircleIcon } from 'lucide-react';

const ALLOWED_DOMAIN = '@potros.itson.edu.mx';

export function RegisterPage() {
    const { signUp } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const emailValid = email.toLowerCase().endsWith(ALLOWED_DOMAIN);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!emailValid) {
            setError(`Solo se permiten correos con dominio ${ALLOWED_DOMAIN}`);
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (!acceptedTerms) {
            setError('Debes aceptar los Términos y Condiciones para continuar');
            return;
        }

        setLoading(true);
        try {
            const message = await signUp(email, password, fullName);
            setSuccess(message);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* Decorative bg */}
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute right-1/4 top-0 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
                <div className="absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
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

            {/* Register form */}
            <div className="flex flex-1 items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
                            <span className="text-lg font-black text-primary-foreground">P</span>
                        </div>
                        <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
                        <CardDescription>
                            Únete a la comunidad de Potros del ITSON
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="flex flex-col items-center gap-4 py-4 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                                </div>
                                <p className="text-sm text-foreground">{success}</p>
                                <Link to="/login">
                                    <Button>Ir a Iniciar Sesión</Button>
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
                                        <FieldLabel htmlFor="reg-name">Nombre completo</FieldLabel>
                                        <Input
                                            id="reg-name"
                                            placeholder="Juan Pérez García"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="reg-email">Correo institucional</FieldLabel>
                                        <Input
                                            id="reg-email"
                                            type="email"
                                            placeholder="tu.nombre@potros.itson.edu.mx"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        {email && !emailValid && (
                                            <p className="mt-1 text-xs text-destructive">
                                                Solo se permiten correos {ALLOWED_DOMAIN}
                                            </p>
                                        )}
                                        {email && emailValid && (
                                            <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                                                <CheckCircleIcon className="h-3 w-3" />
                                                Correo institucional válido
                                            </p>
                                        )}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="reg-password">Contraseña</FieldLabel>
                                        <Input
                                            id="reg-password"
                                            type="password"
                                            placeholder="Mínimo 6 caracteres"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="reg-confirm">Confirmar contraseña</FieldLabel>
                                        <Input
                                            id="reg-confirm"
                                            type="password"
                                            placeholder="Repite tu contraseña"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </Field>
                                    {/* T&C Checkbox */}
                                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                                        <input
                                            id="reg-terms"
                                            type="checkbox"
                                            checked={acceptedTerms}
                                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                                        />
                                        <label htmlFor="reg-terms" className="cursor-pointer text-xs leading-relaxed text-muted-foreground">
                                            He leído y acepto los{' '}
                                            <Link
                                                to="/terms"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                                            >
                                                Términos y Condiciones
                                            </Link>
                                            {' '}y el Aviso de Privacidad de PotroNET.
                                        </label>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={loading || !emailValid || !acceptedTerms}>
                                        {loading ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                        ) : (
                                            <>
                                                <UserPlusIcon className="mr-2 h-4 w-4" />
                                                Crear cuenta
                                            </>
                                        )}
                                    </Button>
                                </FieldGroup>
                            </form>
                        )}
                    </CardContent>
                    {!success && (
                        <CardFooter className="justify-center">
                            <p className="text-sm text-muted-foreground">
                                ¿Ya tienes cuenta?{' '}
                                <Link to="/login" className="font-medium text-primary hover:underline">
                                    Inicia sesión
                                </Link>
                            </p>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}
