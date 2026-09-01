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

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const CORREO_INSTITUCIONAL = "contacto@ceoubb.com";

// Implements: REQ-HELP-03, REQ-HELP-04, REQ-HELP-05, REQ-SUP-03, REQ-QMD-01
type Estado = "listo" | "enviando" | "entregado" | "diferido" | "error";

type FormValues = {
  nombre: string;
  email: string;
  categoria: CategoriaSoporte | "";
  asunto: string;
  mensaje: string;
};

const CAMPOS = ["nombre", "email", "categoria", "asunto", "mensaje"] as const;

const VALORES_INICIALES: FormValues = {
  nombre: "",
  email: "",
  categoria: "" as CategoriaSoporte | "",
  asunto: "",
  mensaje: "",
};

function enfocarPrimerError(fallos: ErroresPorCampo) {
  const primero = CAMPOS.find((campo) => fallos[campo]);
  if (primero) document.getElementById(`soporte-${primero}`)?.focus();
}

function ContactReceipt({
  estado,
  categoria,
  email,
  onReset,
}: {
  estado: "entregado" | "diferido";
  categoria: CategoriaSoporte | null;
  email: string;
  onReset: () => void;
}) {
  const etiqueta = categoria ? CATEGORIA_ETIQUETAS[categoria] : "tu consulta";
  return (
    <div className="policy-confirm" aria-live="polite">
      <p className="policy-confirm-head">
        <CheckCircle aria-hidden="true" size={22} weight="fill" />
        Recibimos tu mensaje
      </p>
      {estado === "entregado" ? (
        <p>
          Tu mensaje sobre <strong>{etiqueta}</strong> llegó a {CORREO_INSTITUCIONAL}. Te
          responderemos a {email}.
        </p>
      ) : (
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
      <button className="policy-again" onClick={onReset} type="button">
        Escribir otro mensaje
      </button>
    </div>
  );
}

export default function ContactForm() {
  const [valores, setValores] = useState<FormValues>(VALORES_INICIALES);
  const [errores, setErrores] = useState<ErroresPorCampo>({});
  const [estado, setEstado] = useState<Estado>("listo");
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [avisoDominio, setAvisoDominio] = useState(false);
  const [categoriaEnviada, setCategoriaEnviada] = useState<CategoriaSoporte | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const senuelo = useRef<HTMLInputElement>(null);
  const montadoEn = useRef<number>(0);
  const enviandoAhora = useRef(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    montadoEn.current = performance.now();
  }, []);

  useEffect(() => {
    if (!siteKey || !turnstileContainerRef.current) return;

    let widgetId: string | undefined;

    const renderWidget = () => {
      if (window.turnstile && turnstileContainerRef.current) {
        try {
          widgetId = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => setTurnstileToken(token),
            "expired-callback": () => setTurnstileToken(""),
            "error-callback": () => setTurnstileToken(""),
            theme: "auto",
          });
        } catch {
          // No-op si ya está renderizado
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const scriptId = "cf-turnstile-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.reset(widgetId);
        } catch {
          // Ignorar al desmontar
        }
      }
    };
  }, [siteKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal })
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((datos) => {
        const usuario = datos?.user;
        if (!usuario) return;
        setValores((previos) => ({
          ...previos,
          nombre: previos.nombre || usuario.name || "",
          email: previos.email || usuario.email || "",
        }));
      })
      .catch(() => {});
    return () => {
      controller.abort();
    };
  }, []);

  function actualizar(campo: keyof FormValues, valor: string) {
    setValores((previos) => ({ ...previos, [campo]: valor }));
    if (errores[campo]) setErrores((previos) => ({ ...previos, [campo]: undefined }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviandoAhora.current) return;
    enviandoAhora.current = true;

    const analisis = solicitudSoporteSchema.safeParse(valores);
    if (!analisis.success) {
      const fallos = erroresPorCampo(analisis.error);
      setErrores(fallos);
      setEstado("error");
      setMensajeEstado("");
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
          turnstileToken: turnstileToken || undefined,
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
        setEstado("error");
        setMensajeEstado("");
        return;
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
      enviandoAhora.current = false;
    }
  }

  if (estado === "entregado" || estado === "diferido") {
    return (
      <ContactReceipt
        categoria={categoriaEnviada}
        email={valores.email}
        estado={estado}
        onReset={() => {
          setValores({ ...VALORES_INICIALES, nombre: valores.nombre, email: valores.email });
          setCategoriaEnviada(null);
          setMensajeEstado("");
          setEstado("listo");
        }}
      />
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
          placeholder="Tu nombre completo"
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
          placeholder="nombre@alumnos.ubiobio.cl o correo personal"
          type="email"
          value={valores.email}
        />
        {errores.email ? (
          <p className="policy-field-error" id="error-email">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {errores.email}
          </p>
        ) : avisoDominio ? (
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
        <div className="policy-field-head">
          <label htmlFor="soporte-asunto">Asunto</label>
          <span aria-live="polite" className="policy-field-counter num">
            {valores.asunto.length} / 160
          </span>
        </div>
        <input
          aria-describedby={errores.asunto ? "error-asunto" : undefined}
          aria-invalid={errores.asunto ? true : undefined}
          id="soporte-asunto"
          maxLength={160}
          onChange={(evento) => actualizar("asunto", evento.target.value)}
          placeholder="¿De qué se trata tu consulta o problema?"
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
        <div className="policy-field-head">
          <label htmlFor="soporte-mensaje">Mensaje</label>
          <span aria-live="polite" className="policy-field-counter num">
            {valores.mensaje.length < 20
              ? `${valores.mensaje.length} / 20 mín. (máx. 4000)`
              : `${valores.mensaje.length} / 4000`}
          </span>
        </div>
        <textarea
          aria-describedby={errores.mensaje ? "error-mensaje" : "ayuda-mensaje"}
          aria-invalid={errores.mensaje ? true : undefined}
          id="soporte-mensaje"
          maxLength={4000}
          onChange={(evento) => actualizar("mensaje", evento.target.value)}
          placeholder="Describe con detalle lo que intentabas hacer, lo que esperabas y lo que ocurrió…"
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

      <input
        aria-hidden="true"
        autoComplete="off"
        className="policy-honeypot"
        name="sitioWeb"
        ref={senuelo}
        tabIndex={-1}
        type="text"
      />

      {siteKey ? (
        <div className="policy-field">
          <div ref={turnstileContainerRef} />
        </div>
      ) : null}

      <div className="policy-form-actions">
        <button className="policy-submit" disabled={enviando} type="submit">
          <PaperPlaneTilt aria-hidden="true" size={18} weight="fill" />
          {enviando ? "Enviando…" : "Enviar mensaje"}
        </button>
      </div>

      {mensajeEstado ? (
        <p
          aria-live="polite"
          className={estado === "error" ? "policy-status bad" : "policy-status"}
        >
          {estado === "error" ? <WarningCircle aria-hidden="true" size={16} weight="fill" /> : null}
          {mensajeEstado}
        </p>
      ) : null}
    </form>
  );
}
