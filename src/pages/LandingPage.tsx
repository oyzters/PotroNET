import { useState } from 'react';
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
    MenuIcon,
    XIcon,
} from 'lucide-react';

export function LandingPage() {
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Navbar */}
            <nav className="sticky top-0 left-0 right-0 w-full border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 z-40">
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
                        
                        {/* Desktop buttons */}
                        <div className="hidden md:flex items-center gap-3">
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
                        
                        {/* Mobile menu button */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="md:hidden"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
                
                {/* Mobile Menu - DENTRO del navbar */}
                <div className={`md:hidden absolute top-full left-0 right-0 z-[9999] bg-background border border-border shadow-xl transition-all duration-300 ease-in-out origin-top ${
                    mobileMenuOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
                }`}>
                    <div className="p-4 flex gap-2">
                        <Link 
                            to="/login" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex-1"
                        >
                            <Button variant="ghost" className="w-full h-12 text-base justify-center hover:bg-muted">
                                Iniciar Sesión
                            </Button>
                        </Link>
                        <Link 
                            to="/register" 
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex-1"
                        >
                            <Button className="w-full h-12 text-base justify-center">
                                Registrarse
                                <ArrowRightIcon className="ml-2 h-4 w-4" />
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
                            Únete a la nueva red social
                            <br />
                            <span className="bg-gradient-to-r from-primary to-[oklch(0.75_0.14_233)] bg-clip-text text-transparent">
                                exclusiva para Potros
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

            {/* Why PotroNET */}
            <section className="border-t border-border bg-card/50 py-20 md:py-28">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <div className="mx-auto mb-16 max-w-2xl text-center">
                        <h2 className="mb-4 text-3xl font-black md:text-4xl">
                            ¿Por qué usar PotroNET?
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Una experiencia diseñada específicamente para estudiantes universitarios, superando a las redes sociales tradicionales.
                        </p>
                    </div>
                    
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background to-card p-8 shadow-sm">
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <UsersIcon className="h-7 w-7" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">Comunidad Exclusiva</h3>
                            <p className="text-muted-foreground">Solo usuarios verificados con correo institucional. Sin bots, sin spam, solo estudiantes reales compartiendo sus experiencias.</p>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background to-card p-8 shadow-sm">
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                                <BookOpenIcon className="h-7 w-7" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">Enfoque Académico</h3>
                            <p className="text-muted-foreground">Nuestra interfaz mobile-first similar a Instagram está adaptada para mostrar desde memes hasta tutorías y mapas curriculares.</p>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-background to-card p-8 shadow-sm">
                            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <MessageCircleIcon className="h-7 w-7" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">Comunicación Directa</h3>
                            <p className="text-muted-foreground">Contacta al instante con cualquier estudiante o profesor de la universidad a través de nuestra mensajería en tiempo real.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Security */}
            <section className="py-20 md:py-28">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <div className="mx-auto max-w-4xl rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 md:p-14 shadow-[0_0_40px_-15px_rgba(var(--primary),0.3)]">
                        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary/10 shadow-neon-primary">
                                <ShieldCheckIcon className="h-10 w-10 text-primary" />
                            </div>
                            <div>
                                <h3 className="mb-3 text-2xl font-black md:text-3xl">
                                    Mensajes Cifrados y Privacidad Total
                                </h3>
                                <p className="text-lg text-muted-foreground">
                                    Tus conversaciones en PotroNET son privadas. Utilizamos WebSockets seguros y 
                                    sistemas de cifrado para que tu comunicación estudiantil sea confidencial. 
                                    Además, solo estudiantes con correo <strong>@potros.itson.edu.mx</strong> tienen acceso a la red.
                                </p>
                            </div>
                        </div>
                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {[
                                'Acceso Exclusivo Universitario',
                                'Mensajería Privada Segura',
                                'Evaluaciones 100% Anónimas',
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-3 rounded-xl bg-card/50 p-4 text-sm font-medium border border-border/50">
                                    <CheckIcon className="h-5 w-5 text-primary" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-card/50 py-12 md:py-16">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <div className="grid gap-10 md:grid-cols-4 lg:gap-8">
                        {/* Brand Column */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-neon-primary">
                                    <span className="text-sm font-black text-primary-foreground">P</span>
                                </div>
                                <span className="text-xl font-bold">
                                    Potro<span className="text-primary">NET</span>
                                </span>
                            </div>
                            <p className="max-w-xs text-sm text-muted-foreground">
                                La red social exclusiva diseñada para mejorar la experiencia académica de los estudiantes del ITSON.
                            </p>
                            <div className="mt-6">
                                <p className="text-sm font-semibold text-foreground">
                                    © {new Date().getFullYear()} PotroNET
                                </p>
                                <p className="text-xs text-muted-foreground">Hecho por Potros, para Potros</p>
                            </div>
                        </div>

                        {/* Legal Links */}
                        <div>
                            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Legal</h4>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li>
                                    <Link to="/terms" className="hover:text-primary transition-colors">Términos y Condiciones</Link>
                                </li>
                                <li>
                                    <Link to="/privacy" className="hover:text-primary transition-colors">Política de Privacidad</Link>
                                </li>
                                <li>
                                    <Link to="/guidelines" className="hover:text-primary transition-colors">Normas de la Comunidad</Link>
                                </li>
                            </ul>
                        </div>

                        {/* Resources Links */}
                        <div>
                            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Recursos</h4>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li>
                                    <Link to="/docs" className="hover:text-primary transition-colors">Documentación API</Link>
                                </li>
                                <li>
                                    <a href="mailto:soporte@potronet.com" className="hover:text-primary transition-colors">Soporte Técnico</a>
                                </li>
                                <li>
                                    <a href="https://itson.mx" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Portal ITSON</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
