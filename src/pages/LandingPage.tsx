import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
    GraduationCapIcon,
    UsersIcon,
    BookOpenIcon,
    StarIcon,
    MapIcon,
    MessageCircleIcon,
    SunIcon,
    MoonIcon,
    ArrowRightIcon,
    CheckIcon,
    SparklesIcon,
    ShieldCheckIcon,
} from 'lucide-react';

export function LandingPage() {
    const { theme, toggleTheme } = useTheme();

    const features = [
        {
            icon: UsersIcon,
            title: 'Red Social Académica',
            description:
                'Conecta con estudiantes de tu carrera, comparte publicaciones y construye tu red de contactos universitarios.',
        },
        {
            icon: StarIcon,
            title: 'Califica Profesores',
            description:
                'Evalúa a tus profesores de forma anónima. Consulta calificaciones antes de inscribirte a una materia.',
        },
        {
            icon: BookOpenIcon,
            title: 'Tutorías entre Estudiantes',
            description:
                'Ofrece o solicita tutorías académicas. Encuentra compañeros que ya aprobaron las materias que más se te dificultan.',
        },
        {
            icon: MapIcon,
            title: 'Mapa Curricular Interactivo',
            description:
                'Visualiza tu progreso académico con un mapa curricular digital. Marca las materias que ya aprobaste.',
        },
        {
            icon: MessageCircleIcon,
            title: 'Chat por Carrera',
            description:
                'Cada carrera tiene su propio chat grupal. Comunícate y colabora con estudiantes de tu programa.',
        },
        {
            icon: GraduationCapIcon,
            title: 'Recursos Académicos',
            description:
                'Comparte y descarga resúmenes, guías de estudio, presentaciones y exámenes anteriores.',
        },
    ];

    const steps = [
        'Regístrate con tu correo @potros.itson.edu.mx',
        'Verifica tu cuenta por correo electrónico',
        'Completa tu perfil académico',
        'Explora y conecta con otros Potros',
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
                            <span className="text-sm font-black text-primary-foreground">P</span>
                        </div>
                        <span className="text-xl font-bold">
                            Potro<span className="text-primary">NET</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={toggleTheme}>
                            {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                        </Button>
                        <Link to="/login">
                            <Button variant="ghost">Iniciar Sesión</Button>
                        </Link>
                        <Link to="/register">
                            <Button>
                                Registrarse
                                <ArrowRightIcon className="ml-1 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
                </div>
                <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-32">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                            <SparklesIcon className="h-4 w-4" />
                            Exclusivo para estudiantes ITSON
                        </div>
                        <h1 className="mb-6 text-4xl font-black leading-tight tracking-tight md:text-6xl">
                            La red social
                            <br />
                            <span className="bg-gradient-to-r from-primary to-[oklch(0.75_0.14_233)] bg-clip-text text-transparent">
                                académica del Potro
                            </span>
                        </h1>
                        <p className="mb-10 text-lg text-muted-foreground md:text-xl">
                            Conecta con compañeros, califica profesores, comparte recursos y
                            visualiza tu progreso académico. Todo en una sola plataforma
                            diseñada para ti.
                        </p>
                        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                            <Link to="/register">
                                <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                                    Únete a PotroNET
                                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <a href="#features">
                                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                                    Ver funcionalidades
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="border-y border-border bg-card/50">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:px-8">
                    {[
                        { value: '37', label: 'Carreras' },
                        { value: '100%', label: 'Gratuito' },
                        { value: '∞', label: 'Recursos' },
                        { value: '24/7', label: 'Acceso' },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-3xl font-black text-primary md:text-4xl">{stat.value}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20 md:py-28">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <div className="mx-auto mb-16 max-w-2xl text-center">
                        <h2 className="mb-4 text-3xl font-black md:text-4xl">
                            Todo lo que necesitas
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            PotroNET centraliza tu vida académica en una sola plataforma
                            intuitiva y poderosa.
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                            >
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                    <feature.icon className="h-6 w-6" />
                                </div>
                                <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="border-t border-border bg-card/50 py-20 md:py-28">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <div className="mx-auto mb-16 max-w-2xl text-center">
                        <h2 className="mb-4 text-3xl font-black md:text-4xl">
                            Empieza en minutos
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Registrarte es rápido y solo necesitas tu correo institucional.
                        </p>
                    </div>
                    <div className="mx-auto max-w-lg">
                        {steps.map((step, i) => (
                            <div key={i} className="flex gap-4 pb-8 last:pb-0">
                                <div className="flex flex-col items-center">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                        {i + 1}
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className="mt-2 h-full w-px bg-border" />
                                    )}
                                </div>
                                <div className="pt-2">
                                    <p className="font-medium">{step}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-12 text-center">
                        <Link to="/register">
                            <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                                Crear mi cuenta
                                <ArrowRightIcon className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Security */}
            <section className="py-20 md:py-28">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 md:p-12">
                        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                                <ShieldCheckIcon className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="mb-2 text-xl font-bold">
                                    Privacidad y seguridad garantizadas
                                </h3>
                                <p className="text-muted-foreground">
                                    Solo estudiantes con correo @potros.itson.edu.mx pueden
                                    registrarse. Las evaluaciones de profesores son completamente
                                    anónimas. Tu información está protegida.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            {[
                                'Verificación de correo institucional',
                                'Evaluaciones anónimas',
                                'Conexiones seguras HTTPS',
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-2 text-sm">
                                    <CheckIcon className="h-4 w-4 text-primary" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-card/50 py-8">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                                <span className="text-xs font-black text-primary-foreground">P</span>
                            </div>
                            <span className="font-bold">
                                Potro<span className="text-primary">NET</span>
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © {new Date().getFullYear()} PotroNET – Hecho por Potros, para Potros 🐴
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
