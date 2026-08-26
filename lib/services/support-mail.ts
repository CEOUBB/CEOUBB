import { CATEGORIA_ETIQUETAS, type CategoriaSoporte } from "../support-request.ts";

/*
  Implements: REQ-SUP-08, REQ-SUP-09
  Puerto único de entrega de solicitudes de soporte. El transporte se elige por
  variable de entorno y no necesita SDK de proveedor: una petición `fetch` basta.

  Sin proveedor configurado la función responde `entregado: false` en vez de
  fallar. Así las páginas se despliegan antes de que exista la cuenta de correo
  y ninguna solicitud se pierde: queda en estado `pendiente`.
*/

const PUNTO_BREVO = "https://api.brevo.com/v3/smtp/email";
const TIEMPO_LIMITE_MS = 10_000;

export type SolicitudParaCorreo = {
  nombre: string;
  email: string;
  categoria: CategoriaSoporte;
  asunto: string;
  mensaje: string;
  rolDeclarado: string | null;
};

/**
 * `intentado` distingue "nunca se intentó" de "se intentó y falló". Sin
 * proveedor configurado la solicitud queda `pendiente`, porque nada se ha
 * perdido todavía; un fallo real del proveedor la deja `fallido`.
 */
export type ResultadoEntrega = { entregado: boolean; intentado: boolean; error?: string };

/**
 * Colapsa un valor a una sola línea. Los campos que viajan en cabeceras de
 * correo (asunto, nombre, dirección) nunca deben llevar saltos de línea: es la
 * vía clásica de inyección de cabeceras. El cuerpo del mensaje no pasa por aquí
 * porque ahí los saltos son contenido legítimo.
 */
function unaLinea(valor: string): string {
  return valor.replace(/[\r\n\t]+/g, " ").trim();
}

export function componerAsunto(solicitud: SolicitudParaCorreo): string {
  const etiqueta = CATEGORIA_ETIQUETAS[solicitud.categoria] ?? solicitud.categoria;
  return unaLinea(`[${etiqueta}] ${solicitud.asunto}`).slice(0, 200);
}

/**
 * Cuerpo en texto plano. Nunca se compone una parte HTML, así que el contenido
 * escrito por la persona llega literal y no puede renderizarse como marcado.
 */
export function componerCuerpo(solicitud: SolicitudParaCorreo): string {
  const procedencia =
    solicitud.rolDeclarado === null
      ? "Correo no institucional, no se puede verificar matrícula."
      : `Rol derivado del dominio institucional: ${solicitud.rolDeclarado}.`;

  return [
    `Nombre: ${unaLinea(solicitud.nombre)}`,
    `Correo: ${unaLinea(solicitud.email)}`,
    `Categoría: ${CATEGORIA_ETIQUETAS[solicitud.categoria] ?? solicitud.categoria}`,
    procedencia,
    "",
    "Mensaje:",
    solicitud.mensaje,
    "",
    "Enviado desde el formulario de contacto de ceoubb.com.",
    "Responder a este correo escribe directamente a quien lo envió.",
  ].join("\n");
}

async function entregarPorBrevo(solicitud: SolicitudParaCorreo): Promise<ResultadoEntrega> {
  const clave = process.env.SOPORTE_MAIL_API_KEY;
  const remitente = process.env.SOPORTE_MAIL_FROM;
  const destino = process.env.SOPORTE_MAIL_TO;

  if (!clave || !remitente || !destino) {
    return { entregado: false, intentado: false, error: "configuración de correo incompleta" };
  }

  try {
    const respuesta = await fetch(PUNTO_BREVO, {
      method: "POST",
      headers: {
        "api-key": clave,
        "content-type": "application/json",
        accept: "application/json",
      },
      /*
        Brevo admite un solo tipo de cuerpo por petición. Enviar `textContent`
        y jamás `htmlContent` convierte la garantía de "sin HTML" en algo
        estructural y no en una convención que alguien pueda olvidar.
      */
      body: JSON.stringify({
        sender: { name: "Centro de Estudio UBB", email: remitente },
        to: [{ email: destino, name: "Soporte CEOUBB" }],
        replyTo: { name: unaLinea(solicitud.nombre), email: unaLinea(solicitud.email) },
        subject: componerAsunto(solicitud),
        textContent: componerCuerpo(solicitud),
      }),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });

    if (!respuesta.ok) {
      // El cuerpo de error del proveedor no se propaga: puede citar la petición
      // completa, credenciales incluidas.
      return { entregado: false, intentado: true, error: `el proveedor respondió ${respuesta.status}` };
    }
    return { entregado: true, intentado: true };
  } catch (error) {
    const motivo = error instanceof Error ? error.name : "error desconocido";
    return { entregado: false, intentado: true, error: `fallo de red al entregar (${motivo})` };
  }
}

export async function enviarCorreoSoporte(
  solicitud: SolicitudParaCorreo
): Promise<ResultadoEntrega> {
  const driver = process.env.SOPORTE_MAIL_DRIVER ?? "none";
  if (driver === "brevo") return entregarPorBrevo(solicitud);
  return { entregado: false, intentado: false, error: "sin proveedor configurado" };
}
