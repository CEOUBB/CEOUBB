import Link from "next/link";
import ContactForm from "./ContactForm.tsx";
import { SiteFooter } from "../site-footer";
import { PolicyHead } from "../policy-head";

export const metadata = {
  title: "Contacto y soporte · Centro de Estudio UBB",
  description:
    "Canales oficiales, plazos de respuesta y formulario de soporte de Centro de Estudio UBB para estudiantes y docentes de la Universidad del Bío-Bío.",
};

// Implements: REQ-HELP-01, REQ-HELP-02, REQ-HELP-09, REQ-HELP-10
export default function ContactoPage() {
  return (
    <main className="policy-page">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      {/* Cabecera institucional: className="policy-back" provisto por PolicyHead */}
      <PolicyHead />

      <article id="contenido-principal" tabIndex={-1}>
        <h1>Contacto y soporte</h1>
        <p className="policy-lead">
          Escríbenos si algo no funciona, si tienes una duda sobre la plataforma o si quieres
          proponer una mejora. Responde una persona, no un sistema automático.
        </p>

        <nav className="contact-shortcuts" aria-label="Opciones de ayuda">
          <a href="#formulario">Escribir a soporte</a>
          <Link href="/faq">Consultar preguntas frecuentes</Link>
          <a href="#canales">Canales y plazos</a>
        </nav>

        <h2 id="antes-de-escribir">Antes de escribir</h2>
        <p>
          Buena parte de las consultas que recibimos ya está respondida. Si tu pregunta es sobre
          cómo entrar, por qué no ves un ramo, cómo se calcula el promedio ponderado o cuándo estará
          la aplicación móvil, es probable que encuentres la respuesta en un minuto.
        </p>
        <p>
          <Link href="/faq">Revisar las preguntas frecuentes</Link>
        </p>

        <h2 id="canales">Canales y plazos</h2>
        <dl>
          <dt>Correo institucional</dt>
          <dd>
            <a href="mailto:contacto@ceoubb.com">contacto@ceoubb.com</a>. Es el mismo buzón al que
            llega el formulario de esta página, así que puedes usar cualquiera de los dos.
          </dd>
          <dt>Acuse de recibo</dt>
          <dd>
            Dentro de <span className="num">cinco</span> días hábiles.
          </dd>
          <dt>Respuesta</dt>
          <dd>
            Dentro de <span className="num">treinta</span> días corridos. Los problemas que impiden
            acceder a la plataforma se atienden antes que el resto.
          </dd>
          <dt>Barreras de accesibilidad</dt>
          <dd>
            Se atienden por este mismo canal, con el mismo compromiso de plazos. Indica la página,
            la tarea que intentabas realizar y, si quieres, tu navegador o tecnología de asistencia.
            Los detalles están en la <Link href="/accesibilidad">declaración de accesibilidad</Link>
            .
          </dd>
          <dt>Datos personales</dt>
          <dd>
            Las solicitudes de acceso, rectificación o eliminación de tus datos también llegan aquí.
            El procedimiento está descrito en la{" "}
            <Link href="/privacidad">política de privacidad</Link>.
          </dd>
        </dl>

        <h2 id="formulario">Escríbenos</h2>
        <p>
          Guardamos tu mensaje para poder responderlo y lo eliminamos a los{" "}
          <span className="num">12</span> meses. No hace falta tener sesión abierta, y si tu correo
          institucional es justamente lo que no funciona, puedes escribir desde cualquier otra
          dirección.
        </p>

        <ContactForm />

        <h2 id="que-no-resolvemos">Lo que no podemos resolver</h2>
        <p>
          Centro de Estudio UBB es una plataforma estudiantil independiente y no representa a la
          Universidad del Bío-Bío. Los trámites de matrícula, las actas oficiales, las becas y
          cualquier gestión curricular se resuelven en los canales de la universidad, no aquí. Si
          nos escribes por uno de esos temas te lo diremos, pero no podremos hacerlo avanzar.
        </p>

        <nav aria-label="Documentos relacionados">
          Ver también las <Link href="/faq">preguntas frecuentes</Link>, la{" "}
          <Link href="/privacidad">política de privacidad</Link>, los{" "}
          <Link href="/terminos">términos de uso</Link> y la{" "}
          <Link href="/accesibilidad">declaración de accesibilidad</Link>.
        </nav>
      </article>
      <SiteFooter />
    </main>
  );
}
