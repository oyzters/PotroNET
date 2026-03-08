import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, SunIcon, MoonIcon } from 'lucide-react';

export function TermsPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Top bar */}
            <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-8">
                <Link
                    to="/register"
                    className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Volver al registro
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
                    <h1 className="text-3xl font-black">Términos y Condiciones de Uso</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Aviso de Privacidad y Deslinde de Responsabilidad
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Versión 1.0 — Marzo 2026 · Ciudad Obregón, Sonora, México
                    </p>
                    <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                        Este documento constituye un contrato vinculante entre el usuario y los desarrolladores de PotroNET.
                    </p>
                </div>

                <div className="space-y-8 text-sm leading-relaxed">

                    {/* 1 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">1. Definiciones y Alcance</h2>
                        <p className="mb-2 text-muted-foreground">Para efectos del presente documento, se entenderá por:</p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li><strong className="text-foreground">"PotroNET" o "La Plataforma":</strong> Aplicación web de carácter social desarrollada de manera independiente por estudiantes, sin relación institucional, corporativa ni gubernamental alguna. PotroNET es un proyecto personal y autónomo.</li>
                            <li><strong className="text-foreground">"El Desarrollador" o "Los Desarrolladores":</strong> La persona o personas físicas que han creado, mantienen y administran PotroNET de forma independiente, sin representar a ninguna institución educativa, empresa u organización.</li>
                            <li><strong className="text-foreground">"El Usuario":</strong> Toda persona física que acceda, se registre o utilice PotroNET en cualquiera de sus funcionalidades.</li>
                            <li><strong className="text-foreground">"ITSON":</strong> Instituto Tecnológico de Sonora. Institución educativa que NO tiene ningún vínculo, patrocinio, afiliación, endoso ni participación alguna en el desarrollo, administración ni operación de PotroNET.</li>
                            <li><strong className="text-foreground">"Contenido del Usuario":</strong> Todo texto, imagen, enlace, archivo, comentario, publicación o cualquier tipo de información que el usuario suba, publique, comparta o transmita a través de la Plataforma.</li>
                        </ul>
                    </section>

                    {/* 2 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">2. Deslinde Institucional</h2>
                        <h3 className="mb-2 font-semibold">2.1. Independencia Total de ITSON y Cualquier Otra Institución</h3>
                        <p className="mb-3 text-muted-foreground">
                            PotroNET es un proyecto completamente independiente, de carácter personal y sin fines de lucro. La Plataforma <strong className="text-foreground">NO es propiedad, NO está patrocinada, NO está avalada, NO está autorizada y NO está afiliada</strong> de ninguna manera al Instituto Tecnológico de Sonora (ITSON), ni a ninguna otra universidad, institución educativa, organismo gubernamental, empresa privada u organización de cualquier tipo.
                        </p>
                        <p className="mb-3 text-muted-foreground">
                            El uso del término "Potro" es de carácter coloquial y referencial, utilizado únicamente como identificador cultural entre la comunidad estudiantil, y no implica en ningún caso una asociación, licencia, permiso o vínculo comercial o institucional con ITSON.
                        </p>
                        <h3 className="mb-2 font-semibold">2.2. Ausencia de Responsabilidad Institucional</h3>
                        <p className="mb-2 text-muted-foreground">ITSON, sus directivos, personal y representantes legales no tienen participación alguna en:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>El desarrollo, programación, diseño o mantenimiento de la Plataforma.</li>
                            <li>La moderación, supervisión o control del contenido publicado por los usuarios.</li>
                            <li>La administración de datos personales recopilados por la Plataforma.</li>
                            <li>Las decisiones técnicas, de política o de operación de PotroNET.</li>
                            <li>Cualquier daño, perjuicio o controversia que se derive del uso de la Plataforma.</li>
                        </ul>
                    </section>

                    {/* 3 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">3. Aceptación de los Términos</h2>
                        <p className="mb-2 text-muted-foreground">Al registrarse, acceder o utilizar PotroNET, el Usuario declara y acepta de manera libre, voluntaria, informada y expresa que:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Ha leído, comprendido y aceptado íntegramente los presentes Términos y Condiciones.</li>
                            <li>Es mayor de 18 años o cuenta con el consentimiento de su padre, madre o tutor legal.</li>
                            <li>Reconoce que PotroNET es un proyecto independiente sin afiliación institucional.</li>
                            <li>Asume la total responsabilidad por el contenido que publique y por las interacciones que realice.</li>
                            <li>Renuncia expresamente a cualquier reclamación contra los Desarrolladores por daños derivados del uso ordinario de la Plataforma, salvo en los casos previstos por la ley aplicable.</li>
                            <li>Acepta que la Plataforma se proporciona "tal cual" ("as is"), sin garantías de disponibilidad, seguridad absoluta o funcionalidad continua.</li>
                        </ul>
                    </section>

                    {/* 4 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">4. Responsabilidad del Usuario</h2>
                        <h3 className="mb-2 font-semibold">4.1. Conducta del Usuario</h3>
                        <p className="mb-2 text-muted-foreground">El Usuario se compromete a utilizar PotroNET de manera responsable, ética y conforme a la legislación vigente. Queda estrictamente prohibido:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Publicar contenido difamatorio, calumnioso, amenazante, acosador, discriminatorio, obsceno o que incite a la violencia.</li>
                            <li>Suplantar la identidad de otra persona, institución o entidad.</li>
                            <li>Compartir información personal de terceros sin su consentimiento explícito.</li>
                            <li>Publicar contenido que infrinja derechos de propiedad intelectual, marcas registradas o derechos de autor de terceros.</li>
                            <li>Utilizar la Plataforma para actividades ilícitas, fraudulentas o contrarias a la moral.</li>
                            <li>Realizar ingeniería inversa, hackeo, ataques informáticos o cualquier actividad que comprometa la integridad técnica de la Plataforma.</li>
                            <li>Publicar spam, publicidad no autorizada, cadenas o contenido comercial sin aprobación previa.</li>
                        </ul>
                        <h3 className="mb-2 mt-4 font-semibold">4.2. Responsabilidad por Contenido</h3>
                        <p className="text-muted-foreground">El Usuario es el único y exclusivo responsable de todo el contenido que publique. Los Desarrolladores no revisan, aprueban ni respaldan el contenido generado por los usuarios y no serán responsables por la veracidad, exactitud, legalidad o calidad del contenido publicado, ni por las consecuencias que se deriven del mismo.</p>
                    </section>

                    {/* 5 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">5. Limitación de Responsabilidad de los Desarrolladores</h2>
                        <h3 className="mb-2 font-semibold">5.1. Exención General</h3>
                        <p className="mb-2 text-muted-foreground">Los Desarrolladores no serán responsables por ningún daño directo, indirecto, incidental, especial, consecuente o punitivo, incluyendo:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Pérdida de datos, información o contenido del usuario.</li>
                            <li>Interrupciones del servicio, fallas técnicas o errores de software.</li>
                            <li>Acceso no autorizado a cuentas de usuario por parte de terceros.</li>
                            <li>Daños derivados de virus, malware o código malicioso transmitido a través de la Plataforma.</li>
                            <li>Daños a la reputación, imagen o patrimonio del usuario derivados de interacciones con otros usuarios.</li>
                        </ul>
                        <h3 className="mb-2 mt-4 font-semibold">5.2. Ausencia de Garantías</h3>
                        <p className="mb-2 text-muted-foreground">PotroNET se proporciona <strong className="text-foreground">"TAL CUAL"</strong> y <strong className="text-foreground">"SEGÚN DISPONIBILIDAD"</strong>, sin garantía alguna, expresa o implícita, incluyendo garantías de comercialización, disponibilidad ininterrumpida, seguridad absoluta o ausencia de errores.</p>
                        <h3 className="mb-2 mt-4 font-semibold">5.3. Límite Económico de Responsabilidad</h3>
                        <p className="text-muted-foreground">En caso de que se determine judicialmente alguna responsabilidad de los Desarrolladores, la responsabilidad total acumulada no excederá bajo ninguna circunstancia la cantidad de <strong className="text-foreground">$500.00 MXN</strong> (quinientos pesos mexicanos 00/100).</p>
                    </section>

                    {/* 6 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">6. Propiedad Intelectual</h2>
                        <p className="mb-2 text-muted-foreground">Todo el código fuente, diseño, estructura, logotipos, nombre y demás elementos que componen PotroNET son propiedad exclusiva de los Desarrolladores, protegidos por las leyes de propiedad intelectual aplicables en México.</p>
                        <p className="mb-2 text-muted-foreground">El Usuario conserva la propiedad de su contenido original. Sin embargo, al publicar contenido en PotroNET, el Usuario otorga a los Desarrolladores una licencia no exclusiva, mundial, libre de regalías para usar, reproducir, modificar y mostrar dicho contenido únicamente con fines de operación, mejora y promoción de la Plataforma.</p>
                        <p className="text-muted-foreground">PotroNET no reclama ni utiliza marcas registradas, logotipos, escudos, mascotas o cualquier signo distintivo perteneciente a ITSON o a cualquier otra institución.</p>
                    </section>

                    {/* 7 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">7. Privacidad y Protección de Datos Personales</h2>
                        <h3 className="mb-2 font-semibold">7.1. Datos Recopilados</h3>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Nombre completo y nombre de usuario.</li>
                            <li>Dirección de correo electrónico institucional.</li>
                            <li>Carrera, semestre y datos académicos proporcionados voluntariamente.</li>
                            <li>Fotografía de perfil (opcional).</li>
                            <li>Contenido publicado en la Plataforma.</li>
                            <li>Datos de uso y navegación (cookies, dirección IP, tipo de dispositivo).</li>
                        </ul>
                        <h3 className="mb-2 mt-4 font-semibold">7.2. Uso de los Datos</h3>
                        <p className="mb-2 text-muted-foreground">Los datos personales se utilizarán exclusivamente para proveer y mejorar las funcionalidades de la Plataforma, personalizar la experiencia del usuario y comunicaciones relacionadas con el servicio. Los Desarrolladores se comprometen a <strong className="text-foreground">no vender, alquilar ni ceder datos personales a terceros</strong> con fines comerciales o publicitarios.</p>
                        <h3 className="mb-2 mt-4 font-semibold">7.3. Derechos ARCO</h3>
                        <p className="text-muted-foreground">De conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, el Usuario podrá ejercer en todo momento sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) respecto a sus datos personales, contactando a los Desarrolladores a través de los canales oficiales de la Plataforma.</p>
                    </section>

                    {/* 8 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">8. Indemnización</h2>
                        <p className="mb-2 text-muted-foreground">El Usuario acepta indemnizar, defender y mantener indemnes a los Desarrolladores frente a cualquier reclamación, demanda, daño, pérdida, costo o gasto (incluyendo honorarios de abogados) que surja de:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>El incumplimiento por parte del Usuario de los presentes Términos y Condiciones.</li>
                            <li>El contenido publicado por el Usuario en la Plataforma.</li>
                            <li>La violación de derechos de terceros por parte del Usuario.</li>
                            <li>El uso indebido, ilegal o no autorizado de la Plataforma.</li>
                        </ul>
                    </section>

                    {/* 9 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">9. Suspensión y Terminación</h2>
                        <p className="mb-2 text-muted-foreground">Los Desarrolladores se reservan el derecho de, sin previo aviso ni obligación de justificación:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Suspender o eliminar cuentas de usuario que violen estos Términos y Condiciones.</li>
                            <li>Eliminar contenido que se considere inapropiado, ilícito o perjudicial.</li>
                            <li>Modificar, suspender o descontinuar parcial o totalmente la Plataforma en cualquier momento.</li>
                        </ul>
                    </section>

                    {/* 10 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">10. Modificaciones a los Términos</h2>
                        <p className="text-muted-foreground">Los Desarrolladores se reservan el derecho de modificar, actualizar o reemplazar los presentes Términos en cualquier momento. Las modificaciones entrarán en vigor a partir de su publicación en la Plataforma. El uso continuado de PotroNET constituirá la aceptación tácita de los cambios.</p>
                    </section>

                    {/* 11 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">11. Ley Aplicable y Jurisdicción</h2>
                        <p className="mb-2 text-muted-foreground">Los presentes Términos se rigen e interpretan de conformidad con las leyes vigentes de los Estados Unidos Mexicanos, incluyendo:</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                            <li>Código Civil Federal y del Estado de Sonora.</li>
                            <li>Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</li>
                            <li>Ley Federal del Derecho de Autor.</li>
                            <li>Ley Federal de Protección al Consumidor (en lo aplicable).</li>
                            <li>Código de Comercio y legislación mercantil aplicable.</li>
                        </ul>
                        <p className="mt-2 text-muted-foreground">Las partes se someten expresamente a la jurisdicción de los tribunales competentes de <strong className="text-foreground">Ciudad Obregón, Sonora, México</strong>, renunciando a cualquier otro fuero que pudiere corresponderles.</p>
                    </section>

                    {/* 12 */}
                    <section>
                        <h2 className="mb-3 text-lg font-bold">12. Disposiciones Finales</h2>
                        <p className="mb-2 text-muted-foreground"><strong className="text-foreground">División de Cláusulas:</strong> Si alguna disposición fuera declarada nula o inaplicable, las disposiciones restantes continuarán en pleno vigor.</p>
                        <p className="mb-2 text-muted-foreground"><strong className="text-foreground">No Renuncia:</strong> La falta de ejercicio de cualquier derecho no constituirá renuncia al mismo ni impedirá su ejercicio posterior.</p>
                        <p className="text-muted-foreground"><strong className="text-foreground">Acuerdo Íntegro:</strong> Estos Términos constituyen el acuerdo completo entre el Usuario y los Desarrolladores en relación con el uso de PotroNET, reemplazando cualquier acuerdo previo.</p>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
                    <p className="text-sm font-medium">
                        Al hacer clic en "Aceptar" o al utilizar PotroNET, usted confirma que ha leído,
                        comprendido y aceptado íntegramente los presentes Términos y Condiciones.
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                        PotroNET © 2026 · Proyecto independiente — Sin afiliación institucional
                    </p>
                    <Link to="/register">
                        <Button className="mt-4">
                            Volver al registro
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
