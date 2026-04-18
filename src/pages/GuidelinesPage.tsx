import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, SunIcon, MoonIcon } from 'lucide-react';

export function GuidelinesPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-dvh bg-background text-foreground">
            {/* Top bar */}
            <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-8">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Volver al inicio
                </Link>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                            <span className="text-xs font-black text-primary-foreground">P</span>
                        </div>
                        <span className="font-bold">
                            Potro<span className="text-primary">NET</span>
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={toggleTheme}>
                        {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black">Normas de la Comunidad</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Lineamientos de convivencia para una comunidad universitaria sana y respetuosa
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Versión 1.0 — Marzo 2026
                    </p>
                    <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                        Estas normas aplican a todos los usuarios de PotroNET. Su incumplimiento puede resultar en la suspensión o eliminación de tu cuenta.
                    </p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed">

                    {/* 1 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">1. Principios Fundamentales</h2>
                        <p className="mb-2 text-muted-foreground">PotroNET es una comunidad creada por y para estudiantes universitarios. Nuestra convivencia se basa en:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li><strong className="text-foreground">Respeto mutuo:</strong> Trata a todos los usuarios con dignidad y consideración, independientemente de su carrera, semestre, género, orientación sexual, origen étnico o creencias.</li>
                            <li><strong className="text-foreground">Honestidad académica:</strong> No compartas contenido que fomente la deshonestidad académica como copiar exámenes en curso o trabajos de otros estudiantes.</li>
                            <li><strong className="text-foreground">Responsabilidad:</strong> Eres responsable de todo lo que publicas. Piensa antes de compartir.</li>
                            <li><strong className="text-foreground">Colaboración:</strong> PotroNET existe para ayudarnos entre compañeros. Prioriza la colaboración sobre la confrontación.</li>
                        </ul>
                    </section>

                    {/* 2 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">2. Contenido Prohibido</h2>
                        <p className="mb-2 text-muted-foreground">Está estrictamente prohibido publicar, compartir o difundir:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li><strong className="text-foreground">Acoso y bullying:</strong> Mensajes, publicaciones o comportamientos que intimiden, amenacen, humillen o acosen a cualquier persona.</li>
                            <li><strong className="text-foreground">Discriminación:</strong> Contenido que promueva odio, discriminación o intolerancia por motivos de raza, género, orientación sexual, religión, discapacidad, nacionalidad o cualquier otra condición.</li>
                            <li><strong className="text-foreground">Contenido sexual o explícito:</strong> Material pornográfico, sexualmente explícito o sugestivo de cualquier tipo.</li>
                            <li><strong className="text-foreground">Violencia:</strong> Contenido que promueva, glorifique o incite a la violencia física o psicológica.</li>
                            <li><strong className="text-foreground">Información falsa:</strong> Difusión deliberada de rumores, información falsa o engañosa sobre personas, profesores o la institución.</li>
                            <li><strong className="text-foreground">Spam y publicidad:</strong> Publicaciones comerciales, cadenas, esquemas piramidales o contenido repetitivo no solicitado.</li>
                            <li><strong className="text-foreground">Datos personales de terceros:</strong> Compartir información privada de otras personas sin su consentimiento (doxxing), incluyendo capturas de conversaciones privadas.</li>
                        </ul>
                    </section>

                    {/* 3 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">3. Evaluaciones de Profesores</h2>
                        <p className="mb-2 text-muted-foreground">Las evaluaciones de profesores son una herramienta valiosa para la comunidad. Para mantener su integridad:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li><strong className="text-foreground">Sé constructivo:</strong> Las evaluaciones deben ser honestas, respetuosas y enfocadas en la experiencia académica (metodología de enseñanza, claridad, puntualidad, etc.).</li>
                            <li><strong className="text-foreground">No ataques personales:</strong> Está prohibido realizar comentarios sobre la apariencia física, vida personal o cualquier aspecto no relacionado con el desempeño académico del profesor.</li>
                            <li><strong className="text-foreground">Sé honesto:</strong> Evalúa únicamente a profesores con los que hayas cursado. No infles ni deflaciones calificaciones deliberadamente.</li>
                            <li><strong className="text-foreground">Anonimato responsable:</strong> El anonimato de las evaluaciones es para proteger tu libertad de expresión, no para abusar de ella.</li>
                        </ul>
                    </section>

                    {/* 4 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">4. Tutorías</h2>
                        <p className="mb-2 text-muted-foreground">La sección de tutorías facilita la ayuda entre compañeros. Para un buen funcionamiento:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Ofrece tutorías solo en materias que domines o hayas aprobado.</li>
                            <li>Cumple con los horarios y compromisos que establezcas.</li>
                            <li>Las tutorías gratuitas y de pago son válidas, pero no se permite el fraude ni el cobro por contenido que no te pertenece.</li>
                            <li>No utilices la sección de tutorías para fines distintos al apoyo académico.</li>
                        </ul>
                    </section>

                    {/* 5 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">5. Mensajería Privada</h2>
                        <p className="mb-2 text-muted-foreground">La mensajería de PotroNET es para comunicación respetuosa entre estudiantes:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>No envíes mensajes no solicitados de forma masiva o repetitiva.</li>
                            <li>Respeta cuando alguien no desee mantener una conversación.</li>
                            <li>Está prohibido el acoso a través de mensajes privados, incluyendo mensajes de contenido sexual no solicitado.</li>
                            <li>No compartas capturas de conversaciones privadas sin el consentimiento de la otra persona.</li>
                        </ul>
                    </section>

                    {/* 6 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">6. Identidad y Cuentas</h2>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Cada persona puede tener <strong className="text-foreground">una sola cuenta</strong> en PotroNET.</li>
                            <li>Tu cuenta debe representarte a ti. Está prohibido suplantar la identidad de otra persona.</li>
                            <li>No compartas tus credenciales de acceso con nadie.</li>
                            <li>No utilices tu cuenta para actividades automatizadas (bots) sin autorización.</li>
                        </ul>
                    </section>

                    {/* 7 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">7. Sistema de Reportes</h2>
                        <p className="mb-2 text-muted-foreground">Si encuentras contenido o comportamiento que viole estas normas:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li><strong className="text-foreground">Reporta:</strong> Utiliza el botón de reporte disponible en publicaciones, perfiles y mensajes.</li>
                            <li><strong className="text-foreground">No abuses del sistema:</strong> Los reportes falsos o malintencionados también son una violación de las normas.</li>
                            <li><strong className="text-foreground">Moderación:</strong> Los reportes serán revisados por el equipo de PotroNET. Se tomarán las medidas necesarias según la gravedad de la situación.</li>
                        </ul>
                    </section>

                    {/* 8 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">8. Consecuencias por Incumplimiento</h2>
                        <p className="mb-2 text-muted-foreground">El incumplimiento de estas normas puede resultar en las siguientes acciones, dependiendo de la gravedad:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li><strong className="text-foreground">Advertencia:</strong> Notificación sobre la violación cometida.</li>
                            <li><strong className="text-foreground">Eliminación de contenido:</strong> Remoción del contenido que viole las normas.</li>
                            <li><strong className="text-foreground">Suspensión temporal:</strong> Restricción de acceso a la Plataforma por un periodo determinado.</li>
                            <li><strong className="text-foreground">Suspensión permanente:</strong> Eliminación definitiva de la cuenta sin posibilidad de recuperación.</li>
                        </ul>
                        <p className="mt-3 text-muted-foreground">
                            Los Desarrolladores se reservan el derecho de tomar cualquiera de estas acciones sin previo aviso, según la gravedad de la situación. Las decisiones de moderación son definitivas.
                        </p>
                    </section>

                    {/* 9 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">9. Modificaciones</h2>
                        <p className="text-muted-foreground">
                            Estas Normas de la Comunidad pueden ser actualizadas en cualquier momento. Las modificaciones entrarán en vigor al momento de su publicación en la Plataforma. Es responsabilidad del usuario revisar periódicamente estas normas.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
                    <p className="text-sm font-medium">
                        Recuerda: PotroNET es nuestra comunidad. Mantenerla sana y respetuosa es responsabilidad de todos.
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                        PotroNET © 2026 · Proyecto independiente — Sin afiliación institucional
                    </p>
                    <Link to="/">
                        <Button className="mt-4">
                            Volver al inicio
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
