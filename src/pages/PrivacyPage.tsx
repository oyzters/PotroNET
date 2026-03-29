import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, SunIcon, MoonIcon } from 'lucide-react';

export function PrivacyPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-background text-foreground">
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
                    <h1 className="text-3xl font-black">Política de Privacidad</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Aviso de Privacidad y Protección de Datos Personales
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Versión 1.0 — Marzo 2026 · Ciudad Obregón, Sonora, México
                    </p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed">

                    {/* 1 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">1. Responsable del Tratamiento de Datos</h2>
                        <p className="text-muted-foreground">
                            PotroNET es un proyecto independiente desarrollado por estudiantes, sin afiliación institucional alguna. Los Desarrolladores de PotroNET son los responsables del tratamiento de los datos personales recabados a través de la Plataforma, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.
                        </p>
                    </section>

                    {/* 2 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">2. Datos Personales Recabados</h2>
                        <p className="mb-2 text-muted-foreground">PotroNET recaba las siguientes categorías de datos personales:</p>
                        <h3 className="mb-2 font-semibold">2.1. Datos de Identificación</h3>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Nombre completo y nombre de usuario.</li>
                            <li>Dirección de correo electrónico institucional (@potros.itson.edu.mx).</li>
                            <li>Fotografía de perfil (opcional).</li>
                        </ul>
                        <h3 className="mb-2 mt-4 font-semibold">2.2. Datos Académicos</h3>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Carrera universitaria.</li>
                            <li>Semestre actual.</li>
                            <li>Materias cursadas y progreso académico registrado voluntariamente.</li>
                        </ul>
                        <h3 className="mb-2 mt-4 font-semibold">2.3. Datos de Uso</h3>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Contenido publicado en la Plataforma (publicaciones, comentarios, evaluaciones).</li>
                            <li>Mensajes enviados a otros usuarios.</li>
                            <li>Datos de navegación: dirección IP, tipo de dispositivo, navegador y sistema operativo.</li>
                            <li>Cookies estrictamente necesarias para el funcionamiento de la sesión.</li>
                        </ul>
                    </section>

                    {/* 3 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">3. Finalidad del Tratamiento</h2>
                        <p className="mb-2 text-muted-foreground">Los datos personales recabados serán utilizados para las siguientes finalidades:</p>
                        <h3 className="mb-2 font-semibold">3.1. Finalidades Primarias (necesarias)</h3>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Crear, administrar y autenticar la cuenta del usuario.</li>
                            <li>Verificar que el usuario es estudiante del ITSON mediante su correo institucional.</li>
                            <li>Proveer las funcionalidades de la Plataforma: red social, mensajería, evaluaciones de profesores, tutorías y mapa curricular.</li>
                            <li>Enviar notificaciones relacionadas con la actividad del usuario en la Plataforma.</li>
                        </ul>
                        <h3 className="mb-2 mt-4 font-semibold">3.2. Finalidades Secundarias (opcionales)</h3>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Generar estadísticas anónimas de uso para mejorar la Plataforma.</li>
                            <li>Enviar comunicaciones sobre actualizaciones o nuevas funcionalidades.</li>
                        </ul>
                    </section>

                    {/* 4 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">4. Protección de los Datos</h2>
                        <p className="mb-2 text-muted-foreground">PotroNET implementa las siguientes medidas de seguridad para proteger los datos personales:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li><strong className="text-foreground">Cifrado en tránsito:</strong> Todas las comunicaciones entre el usuario y la Plataforma se realizan mediante conexiones HTTPS cifradas.</li>
                            <li><strong className="text-foreground">Mensajería privada:</strong> Los mensajes entre usuarios son privados y solo accesibles por los participantes de la conversación.</li>
                            <li><strong className="text-foreground">Evaluaciones anónimas:</strong> Las calificaciones y reseñas de profesores se realizan de forma anónima, sin revelar la identidad del evaluador.</li>
                            <li><strong className="text-foreground">Acceso restringido:</strong> Solo usuarios verificados con correo institucional pueden acceder a la Plataforma.</li>
                            <li><strong className="text-foreground">Row-Level Security:</strong> Las políticas de seguridad a nivel de base de datos garantizan que cada usuario solo pueda acceder a la información que le corresponde.</li>
                        </ul>
                    </section>

                    {/* 5 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">5. Transferencia de Datos</h2>
                        <p className="text-muted-foreground">
                            Los Desarrolladores se comprometen a <strong className="text-foreground">no vender, alquilar, ceder ni compartir</strong> los datos personales de los usuarios con terceros para fines comerciales o publicitarios. Los datos podrán ser compartidos únicamente cuando sea requerido por autoridad competente mediante orden judicial o resolución administrativa debidamente fundada y motivada.
                        </p>
                    </section>

                    {/* 6 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">6. Derechos ARCO</h2>
                        <p className="mb-2 text-muted-foreground">
                            De conformidad con la LFPDPPP, el usuario tiene derecho a ejercer en todo momento sus derechos de:
                        </p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li><strong className="text-foreground">Acceso:</strong> Conocer qué datos personales tenemos sobre usted y cómo los tratamos.</li>
                            <li><strong className="text-foreground">Rectificación:</strong> Solicitar la corrección de datos personales inexactos o incompletos.</li>
                            <li><strong className="text-foreground">Cancelación:</strong> Solicitar la eliminación de sus datos personales de nuestros registros.</li>
                            <li><strong className="text-foreground">Oposición:</strong> Oponerse al tratamiento de sus datos para finalidades específicas.</li>
                        </ul>
                        <p className="mt-3 text-muted-foreground">
                            Para ejercer sus derechos ARCO, el usuario podrá enviar una solicitud al correo electrónico <a href="mailto:soporte@potronet.com" className="text-primary hover:underline">soporte@potronet.com</a>, indicando su nombre completo, nombre de usuario, el derecho que desea ejercer y una descripción clara de su solicitud. Se dará respuesta en un plazo máximo de 20 días hábiles.
                        </p>
                    </section>

                    {/* 7 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">7. Uso de Cookies</h2>
                        <p className="text-muted-foreground">
                            PotroNET utiliza cookies estrictamente necesarias para mantener la sesión del usuario y garantizar el funcionamiento correcto de la Plataforma. No se utilizan cookies de rastreo, publicidad ni analítica de terceros.
                        </p>
                    </section>

                    {/* 8 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">8. Conservación de Datos</h2>
                        <p className="text-muted-foreground">
                            Los datos personales serán conservados mientras la cuenta del usuario permanezca activa. En caso de que el usuario solicite la cancelación de su cuenta o ejerza su derecho de cancelación, los datos serán eliminados de forma definitiva en un plazo máximo de 30 días naturales, salvo aquellos que deban conservarse por obligación legal.
                        </p>
                    </section>

                    {/* 9 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">9. Modificaciones al Aviso de Privacidad</h2>
                        <p className="text-muted-foreground">
                            Los Desarrolladores se reservan el derecho de modificar el presente Aviso de Privacidad en cualquier momento. Las modificaciones serán publicadas en la Plataforma y entrarán en vigor a partir de su publicación. El uso continuado de PotroNET constituirá la aceptación de los cambios realizados.
                        </p>
                    </section>

                    {/* 10 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">10. Legislación Aplicable</h2>
                        <p className="text-muted-foreground">
                            El presente Aviso de Privacidad se rige por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, su Reglamento, y demás legislación aplicable vigente en los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales competentes de Ciudad Obregón, Sonora, México.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
                    <p className="text-sm font-medium">
                        Si tiene preguntas sobre esta Política de Privacidad, puede contactarnos en{' '}
                        <a href="mailto:soporte@potronet.com" className="text-primary hover:underline">soporte@potronet.com</a>.
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
