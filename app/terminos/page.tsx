import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Términos de uso · Centro de Estudio UBB",
  description:
    "Condiciones de uso de Centro de Estudio UBB: quién puede acceder, qué se espera de docentes y estudiantes, y los límites del servicio.",
};

// Implements: REQ-PRIV-06
export default function TermsPage() {
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
        <h1>Términos de uso</h1>
        <p>
          Al ingresar a Centro de Estudio UBB aceptas estas condiciones. Cada sección lleva número y
          se puede citar por él.
        </p>

        <ul className="policy-index">
          <li>
            <a href="#naturaleza">
              <span className="num">1</span>. Qué es esta plataforma
            </a>
          </li>
          <li>
            <a href="#acceso">
              <span className="num">2</span>. Quién puede usarla
            </a>
          </li>
          <li>
            <a href="#uso">
              <span className="num">3</span>. Uso aceptable
            </a>
          </li>
          <li>
            <a href="#docentes">
              <span className="num">4</span>. Responsabilidad de los docentes
            </a>
          </li>
          <li>
            <a href="#contenido">
              <span className="num">5</span>. Contenido y materiales
            </a>
          </li>
          <li>
            <a href="#disponibilidad">
              <span className="num">6</span>. Disponibilidad del servicio
            </a>
          </li>
          <li>
            <a href="#suspension">
              <span className="num">7</span>. Suspensión de cuentas
            </a>
          </li>
          <li>
            <a href="#cambios">
              <span className="num">8</span>. Cambios y contacto
            </a>
          </li>
        </ul>

        <h2 id="naturaleza">
          <span className="num">1</span>. Qué es esta plataforma
        </h2>
        <p>
          Centro de Estudio UBB es una plataforma estudiantil independiente. No es un servicio
          oficial de la Universidad del Bío-Bío, no la representa y no cuenta todavía con un acuerdo
          institucional.
        </p>
        <p>
          No reemplaza a Moodle UBB ni a Adecca UBB. Los actos académicos oficiales —actas de notas,
          inscripción de asignaturas, certificaciones— se realizan en los sistemas de la
          universidad. Lo que ocurre aquí es apoyo al estudio y a la operación cotidiana de una
          sección.
        </p>

        <h2 id="acceso">
          <span className="num">2</span>. Quién puede usarla
        </h2>
        <p>
          El acceso está restringido a cuentas institucionales de la Universidad del Bío-Bío. Se
          admiten dos dominios:
        </p>
        <dl>
          <dt>@alumnos.ubiobio.cl</dt>
          <dd>Ingresa con rol de estudiante.</dd>
          <dt>@ubiobio.cl</dt>
          <dd>Ingresa con rol de docente.</dd>
        </dl>
        <p>
          Cualquier otro dominio es rechazado en el momento del ingreso. El rol se deriva
          automáticamente del dominio del correo y no se solicita ni se negocia: no hay forma de
          pedir un rol distinto al que corresponde a tu cuenta.
        </p>
        <p>
          Tu cuenta es personal. Compartir credenciales, suplantar a otra persona o intentar acceder
          a secciones donde no tienes matrícula activa está prohibido.
        </p>

        <h2 id="uso">
          <span className="num">3</span>. Uso aceptable
        </h2>
        <ul>
          <li>Usa la plataforma para fines académicos relacionados con tus ramos.</li>
          <li>
            No publiques contenido ilegal, ofensivo, ni material que vulnere derechos de autor de
            terceros.
          </li>
          <li>
            No intentes acceder, alterar o extraer datos de secciones ajenas, ni sortear los
            controles de acceso.
          </li>
          <li>
            No automatices consultas masivas ni realices acciones que degraden el servicio para el
            resto.
          </li>
          <li>No publiques datos personales de terceros que no tengas derecho a compartir.</li>
        </ul>

        <h2 id="docentes">
          <span className="num">4</span>. Responsabilidad de los docentes
        </h2>
        <p>
          El docente que publica una calificación en su sección es responsable de su exactitud y de
          que corresponda a la evaluación indicada. La plataforma calcula promedios y registra
          cambios, pero no valida ni certifica el contenido académico de una nota.
        </p>
        <p>
          Toda creación o modificación de una calificación queda registrada en una bitácora de
          auditoría con el autor del cambio, el puntaje anterior, el puntaje nuevo y la fecha. Esa
          bitácora es la referencia ante una disputa.
        </p>
        <p>
          El docente que carga material o datos de estudiantes es responsable de tener derecho a
          hacerlo y de respetar la normativa de protección de datos aplicable.
        </p>

        <h2 id="contenido">
          <span className="num">5</span>. Contenido y materiales
        </h2>
        <p>
          Los materiales que subes siguen siendo tuyos o de quien tenga sus derechos. Al subirlos
          autorizas a la plataforma a almacenarlos y mostrarlos a los participantes de la sección
          correspondiente, y sólo a ellos.
        </p>
        <p>
          La biblioteca de estudio reúne recursos de apoyo. No sustituye la bibliografía oficial de
          una asignatura ni las instrucciones de tu docente.
        </p>

        <h2 id="disponibilidad">
          <span className="num">6</span>. Disponibilidad del servicio
        </h2>
        <p>
          La plataforma se ofrece tal como está, sin garantía de disponibilidad continua. Puede
          haber interrupciones por mantenimiento, fallas de proveedores o cambios en el servicio.
        </p>
        <p>
          No dependas exclusivamente de esta plataforma para plazos académicos formales: la fuente
          de verdad de un plazo oficial es el canal institucional de la universidad.
        </p>

        <h2 id="suspension">
          <span className="num">7</span>. Suspensión de cuentas
        </h2>
        <p>Una cuenta puede ser suspendida cuando:</p>
        <ul>
          <li>
            Se incumplen las reglas de uso aceptable de la sección <span className="num">3</span>.
          </li>
          <li>
            Se intenta acceder a datos de secciones ajenas o vulnerar los controles de acceso.
          </li>
          <li>Se suplanta a otra persona o se comparten credenciales.</li>
          <li>
            La persona deja de tener una cuenta institucional vigente en la Universidad del Bío-Bío.
          </li>
        </ul>
        <p>
          Si tu cuenta es suspendida, te avisamos al correo institucional con el motivo. Puedes
          responder a ese aviso para revisar la decisión.
        </p>

        <h2 id="cambios">
          <span className="num">8</span>. Cambios y contacto
        </h2>
        <p>
          Podemos actualizar estos términos. La fecha de vigencia al inicio del documento indica la
          última versión, y los cambios relevantes se avisan dentro de la plataforma.
        </p>
        <p>
          Para consultas sobre estas condiciones escribe a{" "}
          <a href="mailto:contacto@ceoubb.com">contacto@ceoubb.com</a>. El tratamiento de tus datos
          personales se detalla en la <Link href="/privacidad">política de privacidad</Link>.
        </p>

        <nav aria-label="Documentos relacionados">
          Ver también la <Link href="/privacidad">política de privacidad</Link> y la{" "}
          <Link href="/accesibilidad">declaración de accesibilidad</Link>.
        </nav>
      </article>
    </main>
  );
}
