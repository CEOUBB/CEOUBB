import { ArrowLeft, CheckCircle } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Declaración de accesibilidad · Centro de Estudio UBB",
  description:
    "Conformidad WCAG 2.2 nivel AA, alcance, método de evaluación y canal de contacto de Centro de Estudio UBB.",
};

export default function AccessibilityPage() {
  return (
    <main className="policy-page" data-requirement="Implements: REQ-A11Y-08">
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
          Declaración emitida el <time dateTime="2026-08-23">23 de agosto de 2026</time>
        </p>
        <h1>Declaración de accesibilidad</h1>
        <p className="conformance-status">
          <CheckCircle aria-hidden="true" size={22} weight="fill" />
          <strong>Conformidad completa con WCAG 2.2, Nivel AA</strong>
        </p>
        <p>
          Centro de Estudio UBB se compromete a que sus contenidos y funciones puedan ser usados por
          personas con discapacidad en condiciones equivalentes, con independencia del dispositivo o
          la tecnología de asistencia que utilicen.
        </p>

        <ul className="policy-index">
          <li>
            <a href="#estado">1. Estado y alcance de conformidad</a>
          </li>
          <li>
            <a href="#medidas">2. Medidas de accesibilidad</a>
          </li>
          <li>
            <a href="#compatibilidad">3. Compatibilidad y tecnologías</a>
          </li>
          <li>
            <a href="#evaluacion">4. Método de evaluación</a>
          </li>
          <li>
            <a href="#limitaciones">5. Limitaciones y recursos externos</a>
          </li>
          <li>
            <a href="#contacto">6. Comentarios y contacto</a>
          </li>
        </ul>

        <h2 id="estado">1. Estado y alcance de conformidad</h2>
        <p>
          Las páginas incluidas cumplen plenamente las{" "}
          <a href="https://www.w3.org/TR/WCAG22/">Web Content Accessibility Guidelines 2.2</a> del
          W3C en Nivel AA. En esta norma, conformidad completa significa satisfacer todos los
          criterios de nivel A y AA aplicables, sin excepciones dentro de las páginas declaradas.
        </p>
        <p>La afirmación de conformidad cubre las siguientes páginas y estados propios:</p>
        <ul>
          <li>
            <code>https://ceoubb.com/</code>, incluida la pantalla de acceso y las vistas
            autenticadas para estudiantes, docentes y administración.
          </li>
          <li>
            <code>https://ceoubb.com/biblioteca/index.html</code> y sus estados interactivos.
          </li>
          <li>
            <code>https://ceoubb.com/privacidad</code>, <code>/terminos</code> y{" "}
            <code>/accesibilidad</code>.
          </li>
        </ul>

        <h2 id="medidas">2. Medidas de accesibilidad</h2>
        <ul>
          <li>Navegación completa mediante teclado, orden de foco lógico y enlaces de salto.</li>
          <li>
            Nombres, roles, estados y mensajes dinámicos disponibles para lectores de pantalla.
          </li>
          <li>Contraste mínimo AA y estados que no dependen exclusivamente del color.</li>
          <li>Reflujo a 320 píxeles CSS y texto ampliable al 200 % sin pérdida de funciones.</li>
          <li>
            Supresión de movimiento no esencial cuando el sistema solicita movimiento reducido.
          </li>
          <li>Etiquetas programáticas, instrucciones y errores asociados a los formularios.</li>
          <li>Objetivos interactivos de al menos 24 por 24 píxeles CSS cuando corresponde.</li>
        </ul>

        <h2 id="compatibilidad">3. Compatibilidad y tecnologías</h2>
        <p>
          El sitio está diseñado para las dos versiones vigentes más recientes de Chrome, Edge,
          Firefox y Safari, y para tecnologías de asistencia modernas como NVDA, VoiceOver y
          TalkBack. Para su conformidad depende de HTML, CSS, JavaScript, WAI-ARIA y SVG.
        </p>

        <h2 id="evaluacion">4. Método de evaluación</h2>
        <p>
          La conformidad se determinó mediante autoevaluación técnica: reglas JSX de accesibilidad,
          pruebas de regresión, revisión del árbol accesible, navegación sólo con teclado,
          inspección de contraste y foco, reflujo a 320 píxeles, ampliación de texto al 200 %,
          espaciado personalizado y emulación de movimiento reducido. La evaluación se repetirá
          después de cambios sustanciales y, como mínimo, una vez al año.
        </p>

        <h2 id="limitaciones">5. Limitaciones y recursos externos</h2>
        <p>
          No conocemos incumplimientos dentro de las páginas incluidas. Los servicios externos que
          se abren desde un enlace —por ejemplo ChatGPT— y los archivos descargables aportados por
          docentes o terceros no forman parte de esta afirmación, porque CEOUBB no controla su
          accesibilidad. Si uno de esos recursos impide realizar una actividad, solicita una
          alternativa accesible mediante el canal indicado a continuación.
        </p>
        <p>
          Esta es una plataforma estudiantil independiente y no es un servicio oficial de la
          Universidad del Bío-Bío. La referencia a la{" "}
          <a href="https://www.bcn.cl/leychile/navegar?idNorma=1010903">Ley 20.422</a> y a la{" "}
          <a href="https://www.senadis.gob.cl/descarga/i/4504/documento">
            guía de accesibilidad web de SENADIS
          </a>{" "}
          expresa el estándar adoptado voluntariamente mientras no exista un acuerdo institucional.
        </p>

        <h2 id="contacto">6. Comentarios y contacto</h2>
        <p>
          Si encuentras una barrera, escribe a{" "}
          <a href="mailto:contacto@ceoubb.com">contacto@ceoubb.com</a>. Incluye la página, la tarea
          que intentabas realizar y, si quieres, tu navegador o tecnología de asistencia. Acusamos
          recibo dentro de cinco días hábiles y procuramos entregar una respuesta o alternativa
          accesible dentro de treinta días corridos.
        </p>
        <p>
          Esta declaración sigue la orientación del W3C para{" "}
          <a href="https://www.w3.org/WAI/planning/statements/">
            desarrollar declaraciones de accesibilidad
          </a>
          .
        </p>

        <nav aria-label="Documentos relacionados">
          Ver también la <Link href="/privacidad">política de privacidad</Link> y los{" "}
          <Link href="/terminos">términos de uso</Link>.
        </nav>
      </article>
    </main>
  );
}
