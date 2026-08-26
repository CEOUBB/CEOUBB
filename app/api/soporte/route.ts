import { roleForEmail } from "../../../lib/access-policy.ts";
import { getSessionUser } from "../../../lib/auth.ts";
import { enviarCorreoSoporte } from "../../../lib/services/support-mail.ts";
import {
  contarSolicitudesRecientes,
  direccionDeSolicitud,
  hashDireccion,
  marcarEntregada,
  marcarFallida,
  registrarSolicitud,
  superaLimite,
} from "../../../lib/services/support-requests.ts";
import {
  DURACION_MINIMA_MS,
  TAMANO_MAXIMO_BYTES,
  envioSoporteSchema,
  erroresPorCampo,
} from "../../../lib/support-request.ts";

/*
  Implements: REQ-SUP-01, REQ-SUP-02, REQ-SUP-03, REQ-SUP-04, REQ-SUP-05,
              REQ-SUP-06, REQ-SUP-07, REQ-SUP-08, REQ-SUP-09

  Este endpoint es público a propósito: quien no puede autenticarse es
  justamente quien más necesita escribir. A cambio lleva cuatro controles
  independientes, ordenados del más barato al más caro, y cada uno corta la
  ejecución antes de tocar la base de datos.

    1. Tipo de contenido y tamaño del cuerpo (ninguna E/S).
    2. Validación del esquema compartido (ninguna E/S).
    3. Señuelo y permanencia mínima (ninguna E/S).
    4. Límite de envíos por hora (una consulta indexada y acotada).

  Los rechazos del paso 3 devuelven exactamente lo mismo que una aceptación
  diferida. Un cliente automatizado no aprende nada de la diferencia.
*/

/** Respuesta de aceptación diferida. También es la que ven los rechazos silenciosos. */
function aceptacionDiferida() {
  return Response.json({ estado: "recibido", entregado: false }, { status: 202 });
}

export async function POST(request: Request) {
  // 1. Tipo de contenido y tamaño.
  const tipo = request.headers.get("content-type") ?? "";
  if (!tipo.includes("application/json")) {
    return Response.json({ error: "Formato no admitido." }, { status: 415 });
  }

  const declarado = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declarado) && declarado > TAMANO_MAXIMO_BYTES) {
    return Response.json({ error: "El mensaje es demasiado extenso." }, { status: 413 });
  }

  const crudo = await request.text();
  if (Buffer.byteLength(crudo, "utf8") > TAMANO_MAXIMO_BYTES) {
    return Response.json({ error: "El mensaje es demasiado extenso." }, { status: 413 });
  }

  // 2. Validación. El navegador no es una frontera de confianza: se revalida
  // aquí contra el mismo esquema, pase lo que pase del otro lado.
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const analisis = envioSoporteSchema.safeParse(cuerpo);
  if (!analisis.success) {
    return Response.json(
      { error: "Revisa los campos marcados.", campos: erroresPorCampo(analisis.error) },
      { status: 400 }
    );
  }
  const envio = analisis.data;

  // 3. Señuelo y permanencia mínima.
  if (envio.sitioWeb) return aceptacionDiferida();
  if (envio.duracionMs !== undefined && envio.duracionMs < DURACION_MINIMA_MS) {
    return aceptacionDiferida();
  }

  // 4. Límite de envíos. Se resuelve contra la base de datos porque Vercel
  // levanta muchas instancias aisladas y un contador en memoria del proceso
  // sería un límite solo de nombre.
  const ipHash = hashDireccion(direccionDeSolicitud(request));

  try {
    const conteo = await contarSolicitudesRecientes(ipHash);
    if (superaLimite(conteo)) {
      return Response.json(
        {
          error:
            "Recibimos varias solicitudes desde aquí en la última hora. Inténtalo más tarde o escribe directamente a contacto@ceoubb.com.",
        },
        { status: 429 }
      );
    }

    /*
      Implements: REQ-SUP-06
      El dominio se anota, nunca se rechaza. `roleForEmail()` es la fuente única
      de la política de dominios; aquí no se interpreta ningún correo a mano.
      Un correo externo devuelve null y la solicitud se acepta igual.
    */
    const rolDeclarado = roleForEmail(envio.email);

    const sesion = await getSessionUser(request);

    // Implements: REQ-SUP-07. La fila existe antes de que se intente la
    // entrega, así que una caída del proveedor deja un ticket en cola y no un
    // mensaje perdido.
    const solicitud = await registrarSolicitud({
      nombre: envio.nombre,
      email: envio.email,
      rolDeclarado,
      categoria: envio.categoria,
      asunto: envio.asunto,
      mensaje: envio.mensaje,
      ipHash,
      userId: sesion?.id ?? null,
    });

    const entrega = await enviarCorreoSoporte({
      nombre: solicitud.nombre,
      email: solicitud.email,
      categoria: solicitud.categoria,
      asunto: solicitud.asunto,
      mensaje: solicitud.mensaje,
      rolDeclarado: solicitud.rolDeclarado,
    });

    if (entrega.entregado) {
      await marcarEntregada(solicitud.id);
      return Response.json({ estado: "entregado", entregado: true }, { status: 201 });
    }

    /*
      Implements: REQ-SUP-09
      Sin proveedor configurado nunca hubo intento, así que la fila sigue
      `pendiente` y no `fallido`. La diferencia importa: `pendiente` es una cola
      que espera credenciales, `fallido` es un proveedor que rechazó el mensaje.
    */
    if (entrega.intentado) {
      await marcarFallida(solicitud.id, entrega.error ?? "error desconocido");
    }
    return aceptacionDiferida();
  } catch {
    return Response.json(
      {
        error: "No pudimos registrar tu mensaje. Escríbenos directamente a contacto@ceoubb.com.",
      },
      { status: 500 }
    );
  }
}
