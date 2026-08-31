import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "../site-footer";

export const metadata = {
  title: "Política de privacidad · Centro de Estudio UBB",
  description:
    "Qué datos académicos guarda Centro de Estudio UBB, quién puede verlos, cuánto duran y cómo ejercer tus derechos.",
};

// Implements: REQ-DELIB-08, REQ-PRIV-01, REQ-PRIV-02, REQ-PRIV-03, REQ-PRIV-04, REQ-PRIV-05
function GovernanceSection() {
  return (
    <>
      <h2 id="alcance">
        <span className="num">1</span>. Quiénes somos y qué no somos
      </h2>
      <p>
        Centro de Estudio UBB es una plataforma estudiantil independiente. No representa a la
        Universidad del Bío-Bío, no reemplaza sus sistemas oficiales y no existe todavía un acuerdo
        institucional que la respalde.
      </p>
      <p>
        Las calificaciones registradas aquí <strong>no son</strong> el registro académico oficial de
        la Universidad del Bío-Bío. El acta oficial de una asignatura sigue siendo la que emite la
        universidad por sus canales; lo que ves en esta plataforma es la copia de trabajo que tu
        docente decidió publicar.
      </p>
      <p>
        El tratamiento de tus datos personales se rige por la Ley{" "}
        <span className="num">21.719</span> sobre Protección de Datos Personales. Tratamos tus datos
        porque los necesitamos para prestarte el servicio académico que solicitaste al ingresar con
        tu cuenta institucional, y sólo mientras esa relación exista.
      </p>
    </>
  );
}

function InventorySection() {
  return (
    <>
      <h2 id="datos">
        <span className="num">2</span>. Datos que guardamos
      </h2>

      <h3>Identidad y acceso</h3>
      <p>
        Tu nombre, tu correo institucional verificado, tu identificador de Firebase, el rol que se
        deriva de tu dominio de correo y los registros de sesión activa con su fecha de expiración.
      </p>

      <h3>Estructura académica</h3>
      <p>
        Tus matrículas y el estado de cada una, las secciones a las que perteneces (asignatura,
        período académico y número de sección) y si estás en ellas como estudiante o como docente.
        Cuando un docente importa una nómina de Moodle, podemos conservar temporalmente el correo
        institucional de una cuenta que todavía no existe para vincularla cuando inicie sesión.
      </p>

      <h3>Desempeño académico</h3>
      <p>
        Las calificaciones que tu docente publica en la escala chilena de{" "}
        <span className="num">1,0</span> a <span className="num">7,0</span>, las evaluaciones a las
        que corresponden, sus ponderaciones, el promedio ponderado que se calcula con ellas y tu
        progreso dentro de cada ramo.
      </p>

      <h3>Contenido</h3>
      <p>
        Las publicaciones y avisos de tus docentes, las entregas que subes a una evaluación y los
        archivos que tú o tu docente cargan en un ramo.
      </p>

      <h3>Operación</h3>
      <p>
        El token de tu dispositivo para enviarte notificaciones, y la bitácora de auditoría de
        calificaciones: cada vez que una nota se crea o se modifica se registra quién la cambió, el
        puntaje anterior, el puntaje nuevo, la fecha y hora, y la dirección IP desde la que se hizo
        el cambio.
      </p>

      <h2 id="finalidad">
        <span className="num">3</span>. Para qué los usamos
      </h2>
      <p>
        Para autenticar cuentas institucionales, mostrarte los materiales y evaluaciones de tus
        ramos, calcular y mostrar calificaciones y progreso, administrar permisos por sección,
        enviarte avisos académicos, y dejar constancia auditable de quién modificó una nota.
      </p>
      <p>
        No vendemos datos, no mostramos publicidad, no construimos perfiles comerciales y no
        entregamos tu información a terceros ajenos a la operación de la plataforma.
      </p>
    </>
  );
}

function RecipientsSection() {
  return (
    <>
      <h2 id="quien-ve">
        <span className="num">4</span>. Quién puede verlos
      </h2>
      <p>
        Preferimos decirlo con nombre y apellido antes que hablar de &ldquo;personal
        autorizado&rdquo;:
      </p>
      <dl>
        <dt>Tú</dt>
        <dd>
          Ves tu propia ficha en las secciones donde tienes matrícula activa: tus notas, tus
          entregas y tu progreso. No ves los de otras personas.
        </dd>
        <dt>Tu docente</dt>
        <dd>
          Ve las notas, entregas y progreso de las secciones que dicta, y sólo de esas. Es la única
          persona que puede escribir una calificación en su sección.
        </dd>
        <dt>El administrador</dt>
        <dd>
          La cuenta administradora de la plataforma puede leer las calificaciones de cualquier
          sección, en todas las carreras y facultades. Ese acceso existe para auditar la plataforma
          y responder disputas de notas, y su uso queda registrado en la bitácora de auditoría
          descrita en la sección <span className="num">2</span>.
        </dd>
        <dt>Nadie más</dt>
        <dd>
          Ningún otro estudiante, ningún docente de otra sección y ninguna persona sin cuenta
          institucional puede leer tus datos académicos.
        </dd>
      </dl>
    </>
  );
}

function RetentionSection() {
  return (
    <>
      <h2 id="retencion">
        <span className="num">5</span>. Cuánto tiempo los conservamos
      </h2>
      <dl>
        <dt>Identidad y matrículas</dt>
        <dd>Mientras tu cuenta permanezca activa en la plataforma.</dd>
        <dt>Matrículas pendientes importadas</dt>
        <dd>
          El correo institucional pendiente se conserva hasta que la cuenta inicia sesión o por un
          máximo de <span className="num">90</span> días desde la importación.
        </dd>
        <dt>Sesiones</dt>
        <dd>Hasta la fecha de expiración de cada sesión; después se descartan.</dd>
        <dt>Notas, evaluaciones y entregas</dt>
        <dd>
          Mientras la sección siga siendo consultable por sus participantes, o mientras una
          obligación legal o una disputa de calificación en curso exijan conservarlas.
        </dd>
        <dt>Bitácora de auditoría</dt>
        <dd>
          El historial de puntajes se conserva íntegro. La dirección IP de cada cambio se borra a
          los <span className="num">12</span> meses de ocurrido: identifica un dispositivo, no un
          acto académico, y pasado ese plazo deja de ser necesaria. El resto de la entrada (quién,
          qué puntaje, cuándo) permanece intacto.
        </dd>
        <dt>Token de notificaciones</dt>
        <dd>Hasta que cierres sesión en ese dispositivo o desinstales la aplicación.</dd>
        <dt>Solicitudes de soporte</dt>
        <dd>
          Tu nombre, tu correo y el texto del mensaje se conservan <span className="num">12</span>{" "}
          meses desde el envío, y después la solicitud completa se elimina. La dirección desde la
          que escribiste nunca se guarda en claro: solo queda un identificador cifrado que no
          permite reconstruirla, y que existe para limitar envíos automatizados.
        </dd>
      </dl>

      <h2 id="proveedores">
        <span className="num">6</span>. Proveedores y telemetría
      </h2>
      <p>
        La plataforma se apoya en Google Firebase para autenticación, base de datos operacional,
        almacenamiento de archivos y notificaciones; en Turso para la estructura académica
        relacional; y en Cloudflare para publicar ceoubb.com. Cada proveedor procesa la información
        conforme a sus propias condiciones y medidas de seguridad.
      </p>
      <p>
        El formulario de <Link href="/contacto">contacto y soporte</Link> entrega tu mensaje al
        buzón institucional a través de Brevo, un servicio de correo transaccional. Brevo procesa tu
        nombre, tu dirección de correo y el texto que escribiste con el único fin de entregarlos, y
        no se le envía ningún otro dato de tu cuenta.
      </p>
      <p>
        Usamos Sentry para detectar errores. Junto al reporte de error se graba una muestra de
        sesiones de uso, que registra la disposición de la pantalla y la secuencia de clics.{" "}
        <strong>Esas grabaciones enmascaran todo el texto y todo lo que escribes</strong>: una
        grabación tomada sobre una pantalla de notas conserva la forma de la tabla, no los puntajes
        ni los nombres. Los datos técnicos de error incluyen tu dirección IP.
      </p>
    </>
  );
}

function RightsSection() {
  return (
    <>
      <h2 id="derechos">
        <span className="num">7</span>. Tus derechos y cómo ejercerlos
      </h2>
      <p>
        La Ley <span className="num">21.719</span> te reconoce derechos sobre tus datos personales,
        y puedes ejercerlos sin costo:
      </p>
      <ul>
        <li>
          <strong>Acceso</strong>: saber qué datos tuyos tenemos y obtener una copia.
        </li>
        <li>
          <strong>Rectificación</strong>: corregir datos inexactos o incompletos.
        </li>
        <li>
          <strong>Supresión</strong>: pedir que borremos tus datos cuando ya no sean necesarios.
        </li>
        <li>
          <strong>Oposición</strong>: oponerte a un tratamiento determinado.
        </li>
        <li>
          <strong>Portabilidad</strong>: recibir tus datos en un formato estructurado y de uso
          común.
        </li>
        <li>
          <strong>Bloqueo</strong>: suspender temporalmente el tratamiento mientras se resuelve una
          solicitud.
        </li>
      </ul>
      <p>
        Para ejercer cualquiera de ellos escribe a{" "}
        <a href="mailto:contacto@ceoubb.com">contacto@ceoubb.com</a> desde tu correo institucional
        (así verificamos tu identidad) indicando qué derecho quieres ejercer y sobre qué datos.
        Respondemos en un plazo máximo de <span className="num">30</span> días corridos desde que
        recibimos la solicitud. Si necesitamos más antecedentes para identificarte, te los pediremos
        dentro de ese mismo plazo.
      </p>
      <p>
        <strong>Corrección de una nota:</strong> si crees que una calificación está equivocada, la
        corrige tu docente de sección, que es quien tiene la potestad de escribirla. Escríbele
        directamente. La corrección queda registrada en la bitácora de auditoría con el puntaje
        anterior y el nuevo, de modo que el cambio siempre es reconstruible.
      </p>

      <h2 id="contacto">
        <span className="num">8</span>. Contacto
      </h2>
      <p>
        Para cualquier consulta sobre privacidad, escribe a{" "}
        <a href="mailto:contacto@ceoubb.com">contacto@ceoubb.com</a>. Si algo en este documento no
        coincide con lo que la plataforma hace en la práctica, cuéntanoslo: preferimos corregir el
        sistema o el texto antes que sostener una diferencia entre ambos.
      </p>

      <nav aria-label="Documentos relacionados">
        Ver también los <Link href="/terminos">términos de uso</Link> y la{" "}
        <Link href="/accesibilidad">declaración de accesibilidad</Link>.
      </nav>
    </>
  );
}

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <header className="policy-head">
        <Link className="app-brand" href="/">
          <Image
            src="/brand/ubb-shield.webp"
            alt=""
            aria-hidden="true"
            width={388}
            height={594}
            priority
          />
          <strong>Centro de Estudio UBB</strong>
        </Link>
        <Link className="policy-back" href="/">
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          Volver al portal
        </Link>
      </header>
      <article id="contenido-principal" tabIndex={-1}>
        <p className="privacy-date">
          Vigente desde el <span className="num">20</span> de agosto de{" "}
          <span className="num">2026</span>
        </p>
        <h1>Política de privacidad</h1>
        <p>
          Este documento explica qué datos tuyos guarda Centro de Estudio UBB, para qué los usa,
          quién puede verlos, cuánto duran y cómo pedir que se corrijan o se borren. Está escrito
          para leerse buscando una cláusula: cada sección lleva número y se puede citar por él.
        </p>

        <ul className="policy-index">
          <li>
            <a href="#alcance">
              <span className="num">1</span>. Quiénes somos y qué no somos
            </a>
          </li>
          <li>
            <a href="#datos">
              <span className="num">2</span>. Datos que guardamos
            </a>
          </li>
          <li>
            <a href="#finalidad">
              <span className="num">3</span>. Para qué los usamos
            </a>
          </li>
          <li>
            <a href="#quien-ve">
              <span className="num">4</span>. Quién puede verlos
            </a>
          </li>
          <li>
            <a href="#retencion">
              <span className="num">5</span>. Cuánto tiempo los conservamos
            </a>
          </li>
          <li>
            <a href="#proveedores">
              <span className="num">6</span>. Proveedores y telemetría
            </a>
          </li>
          <li>
            <a href="#derechos">
              <span className="num">7</span>. Tus derechos y cómo ejercerlos
            </a>
          </li>
          <li>
            <a href="#contacto">
              <span className="num">8</span>. Contacto
            </a>
          </li>
        </ul>

        <GovernanceSection />
        <InventorySection />
        <RecipientsSection />
        <RetentionSection />
        <RightsSection />
      </article>
      <SiteFooter />
    </main>
  );
}
