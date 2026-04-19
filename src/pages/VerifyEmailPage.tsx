import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            return;
        }

        supabase.auth.verifyOtp({ token_hash: token, type: 'signup' })
            .then(({ error }) => {
                if (error) {
                    setStatus('error');
                } else {
                    setStatus('success');
                    // Sign out — user should log in fresh after verification
                    supabase.auth.signOut();
                    setTimeout(() => navigate('/login?verified=true'), 2500);
                }
            });
    }, [searchParams, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
            </div>

            <div className="flex flex-col items-center gap-6 text-center">
                {status === 'loading' && (
                    <>
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground">Verificando tu correo...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                            <CheckCircleIcon className="h-10 w-10 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground">Correo verificado</p>
                            <p className="mt-1 text-sm text-muted-foreground">Redirigiendo al inicio de sesión...</p>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                            <XCircleIcon className="h-10 w-10 text-destructive" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground">Enlace inválido o expirado</p>
                            <p className="mt-1 text-sm text-muted-foreground">Solicita un nuevo correo de verificación.</p>
                        </div>
                        <Link to="/login">
                            <Button variant="outline">Ir al inicio de sesión</Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
