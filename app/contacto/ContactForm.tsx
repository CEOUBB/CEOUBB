"use client";

import { CheckCircle, Info, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { roleForEmail } from "../../lib/access-policy.ts";
import {
  CATEGORIAS_SOPORTE,
  CATEGORIA_ETIQUETAS,
  type CategoriaSoporte,
  type ErroresPorCampo,
  erroresPorCampo,
  solicitudSoporteSchema,
} from "../../lib/support-request.ts";

/*
  Implements: REQ-HELP-03, REQ-HELP-04, REQ-HELP-05, REQ-SUP-03

  El acuse no se muestra en un aviso que se desvanece. Es el único texto que
  quien escribe necesita leer, recordar y a veces capturar en pantalla, así que
  reemplaza al formulario y se queda. De paso el doble envío deja de ser posible.
*/

type Estado = "listo" | "enviando" | "entregado" | "diferido" | "error";

const CORREO_INSTITUCIONAL = "contacto@ceoubb.com";

const CAMPOS = ["nombre", "email", "categoria", "asunto", "mensaje"] as const;

const VALORES_INICIALES = {
  nombre: "",
  email: "",
  categoria: "" as CategoriaSoporte | "",
  asunto: "",
  mensaje: "",
};

/** Lleva el foco al primer campo con error, en el orden en que se leen. */
function enfocarPrimerError(fallos: ErroresPorCampo) {
  const primero = CAMPOS.find((campo) => fallos[campo]);
  if (primero) document.getElementById(`soporte-${primero}`)?.focus();
}

export default function ContactForm() {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [errores, setErrores] = useState<ErroresPorCampo>({});
  const [estado, setEstado] = useState<Estado>("listo");
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [avisoDominio, setAvisoDominio] = useState(false);
  const [categoriaEnviada, setCategoriaEnviada] = useState<CategoriaSoporte | null>(null);
  const senuelo = useRef<HTMLInputElement>(null);
  const montadoEn = useRef<number>(0);
  const enviandoAhora = useRef(false);

  // Tiempo transcurrido medido aquí, no una marca de tiempo: el reloj del
  // dispositivo no tiene por qué coincidir con el del servidor.
  useEffect(() => {
    montadoEn.current = performance.now();
  }, []);

  /*
    Prefill de cortesía para quien ya tiene sesión abierta. Si falla, el
    formulario funciona igual: esta página no requiere estar autenticado.
  */
  useEffect(() => {
    let vigente = true;
    fetch("/api/auth/me")
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((datos) => {
        const usuario = datos?.user;
        if (!vigente || !usuario) return;
        setValores((previos) => ({
          ...previos,
          nombre: previos.nombre || usuario.name || "",
          email: previos.email || usuario.email || "",
        }));
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  function actualizar(campo: (typeof CAMPOS)[number], valor: string) {
    setValores((previos) => ({ ...previos, [campo]: valor }));
    if (errores[campo]) setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    /*
      El guardia tiene que ser síncrono. `setEstado("enviando")` no surte efecto
      hasta el siguiente renderizado, así que dos clics dentro del mismo tick
      pasarían los dos y crearían dos tickets. El atributo `disabled` del botón
      llega igual de tarde, porque depende del mismo renderizado.
    */
    if (enviandoAhora.current) return;
    enviandoAhora.current = true;

    const analisis = solicitudSoporteSchema.safeParse(valores);
    if (!analisis.success) {
      const fallos = erroresPorCampo(analisis.error);
      setErrores(fallos);
      setEstado("error");
      setMensajeEstado("Revisa los campos marcados antes de enviar.");
      enfocarPrimerError(fallos);
      enviandoAhora.current = false;
      return;
    }

    setErrores({});
    setEstado("enviando");
    setMensajeEstado("Enviando tu mensaje…");

    try {
      const respuesta = await fetch("/api/soporte", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...analisis.data,
          sitioWeb: senuelo.current?.value ?? "",
          duracionMs: Math.round(performance.now() - montadoEn.current),
        }),
      });

      if (respuesta.status === 201 || respuesta.status === 202) {
        setCategoriaEnviada(analisis.data.categoria);
        setEstado(respuesta.status === 201 ? "entregado" : "diferido");
        return;
      }

      const datos = (await respuesta.json().catch(() => null)) as {
        error?: string;
        campos?: ErroresPorCampo;
      } | null;

      if (datos?.campos) {
        setErrores(datos.campos);
        enfocarPrimerError(datos.campos);
      }
      setEstado("error");
      setMensajeEstado(
        datos?.error ??
          `No pudimos enviar tu mensaje. Escríbenos directamente a ${CORREO_INSTITUCIONAL}.`
      );
    } catch {
      setEstado("error");
      setMensajeEstado(
        `No pudimos conectar con el servidor. Escríbenos directamente a ${CORREO_INSTITUCIONAL}.`
      );
    } finally {
      // Se libera en todas las salidas, incluida la exitosa: tras "escribir otro
      // mensaje" el componente sigue montado y conserva esta referencia.
      enviandoAhora.current = false;
    }
  }

  if (estado === "entregado" || estado === "diferido") {
    const etiqueta = categoriaEnviada ? CATEGORIA_ETIQUETAS[categoriaEnviada] : "tu consulta";
    return (
      <div className="policy-confirm">
        <p className="policy-confirm-head">
          <CheckCircle aria-hidden="true" size={22} weight="fill" />
          Recibimos tu mensaje
        </p>
        {estado === "entregado" ? (
          <p>
            Tu mensaje sobre <strong>{etiqueta}</strong> llegó a {CORREO_INSTITUCIONAL}. Te
            responderemos a {valores.email}.
          </p>
        ) : (
          /*
            Implements: REQ-SUP-09
            202 significa que quedó registrado y aún no salió. Decirlo así es
            preferible a un visto bueno que no se corresponde con lo ocurrido.
          */
          <p>
            Tu mensaje sobre <strong>{etiqueta}</strong> quedó registrado, y su envío al buzón
            institucional está pendiente. Lo leeremos igual. Si necesitas una respuesta rápida,
            escribe también a <a href={`mailto:${CORREO_INSTITUCIONAL}`}>{CORREO_INSTITUCIONAL}</a>.
          </p>
        )}
        <p>
          Acusamos recibo dentro de cinco días hábiles y procuramos entregar una respuesta dentro de
          treinta días corridos.
        </p>
        <button
          className="policy-again"
          onClick={() => {
            setValores({ ...VALORES_INICIALES, nombre: valores.nombre, email: valores.email });
            setCategoriaEnviada(null);
            setMensajeEstado("");
            setEstado("listo");
          }}
          type="button"
        >
          Escribir otro mensaje
        </button>
      </div>
    );
  }

  const enviando = estado === "enviando";

  return (
    <form className="policy-form" noValidate onSubmit={enviar}>
      <div className="policy-field">
        <label htmlFor="soporte-nombre">Nombre</label>
        <input
          aria-describedby={errores.nombre ? "error-nombre" : undefined}
          aria-invalid={errores.nombre ? true : undefined}
          autoComplete="name"
          id="soporte-nombre"
          onChange={(evento) => actualizar("nombre", evento.target.value)}
          type="text"
          value={valores.nombre}
        />
        {errores.nombre ? (
          <p className="policy-field-error" id="error-nombre">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {errores.nombre}
          </p>
        ) : null}
      </div>

      <div className="policy-field">
        <label htmlFor="soporte-email">Correo</label>
        <input
          aria-describedby={
            errores.email ? "error-email" : avisoDominio ? "aviso-email" : "ayuda-email"
          }
          aria-invalid={errores.email ? true : undefined}
          autoComplete="email"
          id="soporte-email"
          onBlur={() =>
            setAvisoDominio(valores.email.includes("@") && roleForEmail(valores.email) === null)
          }
          onChange={(evento) => actualizar("email", evento.target.value)}
          type="email"
          value={valores.email}
        />
        {errores.email ? (
          <p className="policy-field-error" id="error-email">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {errores.email}
          </p>
        ) : avisoDominio ? (
          /*
            Implements: REQ-HELP-05
            Aviso, no error. Quien escribe desde un correo personal suele ser
            justamente quien no puede usar el institucional.
          */
          <p className="policy-field-note" id="aviso-email">
            <Info aria-hidden="true" size={16} weight="fill" />
            No es un correo institucional. Te responderemos igual, pero no podremos verificar tu
            matrícula desde esa dirección.
          </p>
        ) : (
          <p className="policy-field-hint" id="ayuda-email">
            Usa tu correo institucional si puedes. Si no tienes acceso a él, cualquier otro sirve.
          </p>
        )}
      </div>

      <div className="policy-field">
        <label htmlFor="soporte-categoria">Categoría</label>
        <select
          aria-describedby={errores.categoria ? "error-categoria" : undefined}
          aria-invalid={errores.categoria ? true : undefined}
          id="soporte-categoria"
          onChange={(evento) => actualizar("categoria", evento.target.value)}
          value={valores.categoria}
        >
          <option value="">Selecciona una categoría</option>
          {CATEGORIAS_SOPORTE.map((categoria) => (
            <option key={categoria} value={categoria}>
              {CATEGORIA_ETIQUETAS[categoria]}
            </option>
          ))}
        </select>
        {errores.categoria ? (
          <p className="policy-field-error" id="error-categoria">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {errores.categoria}
          </p>
        ) : null}
      </div>

      <div className="policy-field">
        <label htmlFor="soporte-asunto">Asunto</label>
        <input
          aria-describedby={errores.asunto ? "error-asunto" : undefined}
          aria-invalid={errores.asunto ? true : undefined}
          id="soporte-asunto"
          onChange={(evento) => actualizar("asunto", evento.target.value)}
          type="text"
          value={valores.asunto}
        />
        {errores.asunto ? (
          <p className="policy-field-error" id="error-asunto">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {errores.asunto}
          </p>
        ) : null}
      </div>

      <div className="policy-field">
        <label htmlFor="soporte-mensaje">Mensaje</label>
        <textarea
          aria-describedby={errores.mensaje ? "error-mensaje" : "ayuda-mensaje"}
          aria-invalid={errores.mensaje ? true : undefined}
          id="soporte-mensaje"
          onChange={(evento) => actualizar("mensaje", evento.target.value)}
          value={valores.mensaje}
        />
        {errores.mensaje ? (
          <p className="policy-field-error" id="error-mensaje">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {errores.mensaje}
          </p>
        ) : (
          <p className="policy-field-hint" id="ayuda-mensaje">
            Cuéntanos qué intentabas hacer, qué esperabas y qué ocurrió. Si es un error, indícanos
            el ramo y el navegador.
          </p>
        )}
      </div>

      {/*
        Señuelo antiabuso. Está fuera del orden de tabulación y fuera del árbol
        de accesibilidad, así que ninguna persona lo encuentra ni lo oye.
      */}
      <input
        aria-hidden="true"
        autoComplete="off"
        className="policy-honeypot"
        name="sitioWeb"
        ref={senuelo}
        tabIndex={-1}
        type="text"
      />

      <div className="policy-form-actions">
        <button className="policy-submit" disabled={enviando} type="submit">
          <PaperPlaneTilt aria-hidden="true" size={18} weight="fill" />
          {enviando ? "Enviando…" : "Enviar mensaje"}
        </button>
      </div>

      <p aria-live="polite" className={estado === "error" ? "policy-status bad" : "policy-status"}>
        {estado === "error" && mensajeEstado ? (
          <WarningCircle aria-hidden="true" size={16} weight="fill" />
        ) : null}
        {mensajeEstado}
      </p>
    </form>
  );
}
