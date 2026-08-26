import Link from "next/link";

/*
  Implements: REQ-HELP-09
  Pie institucional compartido. Existe para que los documentos públicos y las
  vistas autenticadas terminen igual: mismo juego de enlaces, mismo descargo de
  independencia, misma voz. Antes cada superficie resolvía ese cierre por su
  cuenta y ninguna coincidía con las demás.

  Es un componente de servidor sin estado: solo enlaces y texto.
*/

const ENLACES = [
  { href: "/faq", texto: "Preguntas frecuentes" },
  { href: "/contacto", texto: "Ayuda y contacto" },
  { href: "/privacidad", texto: "Privacidad" },
  { href: "/terminos", texto: "Términos de uso" },
  { href: "/accesibilidad", texto: "Accesibilidad" },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav aria-label="Documentos relacionados" className="site-footer-nav">
          {ENLACES.map((enlace) => (
            <Link href={enlace.href} key={enlace.href}>
              {enlace.texto}
            </Link>
          ))}
        </nav>
        <p className="site-footer-note">
          Centro de Estudio UBB es una plataforma estudiantil independiente. No representa a la
          Universidad del Bío-Bío ni reemplaza sus sistemas oficiales.
        </p>
      </div>
    </footer>
  );
}
