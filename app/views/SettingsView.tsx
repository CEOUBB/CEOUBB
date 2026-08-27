"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowCounterClockwise,
  Bell,
  CheckCircle,
  Eye,
  IdentificationCard,
  Image as ImageIcon,
  ShieldCheck,
  SignOut,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { roleLabel, type User } from "../../lib/portal-utils.ts";
import {
  CHANNELS_WITHOUT_SENDER,
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  defaultPreferences,
  loadPreferences,
  savePreferences,
  type ChannelPreference,
  type NotificationChannel,
  type UserPreferences,
} from "../../lib/user-preferences.ts";
import { Avatar } from "../portal-ui.tsx";

type ActiveSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};

type CropState = { zoom: number; x: number; y: number };

type CropSource = { url: string; image: HTMLImageElement };

type ChannelTarget = "web" | "push";

/* Lado del recorte que se sube. 512 px cubre el avatar grande sin acercarse al tope de 2 MB. */
const CROP_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

const CHANNEL_TARGETS: readonly { key: ChannelTarget; label: string }[] = [
  { key: "web", label: "Web" },
  { key: "push", label: "Push móvil" },
];

/*
  La hora de una sesión se lee en el huso de la universidad, no en el del
  dispositivo: un estudiante de intercambio tiene que poder comparar lo que ve
  con lo que registró el servidor.
*/
const SESSION_DATE = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

function formatSessionDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "fecha desconocida" : SESSION_DATE.format(parsed);
}

function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const present = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  return present.length > 0 ? present.join(" ") : undefined;
}

async function apiError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return typeof data?.error === "string" ? data.error : fallback;
}

function failureMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

/*
  El recorte trabaja en el espacio del lienzo de salida: la imagen se escala
  para cubrir el cuadro y `x`/`y` son la esquina superior izquierda de esa
  imagen escalada. Guardar el desplazamiento en píxeles de salida evita
  recalcular nada cuando el lienzo se muestra a otro tamaño en pantalla.
*/
// Implements: REQ-CFG-02
function coverScale(image: HTMLImageElement, zoom: number): number {
  const shortest = Math.min(image.naturalWidth, image.naturalHeight) || 1;
  return (CROP_SIZE / shortest) * zoom;
}

function cropSlack(image: HTMLImageElement, zoom: number): { x: number; y: number } {
  const scale = coverScale(image, zoom);
  return {
    x: Math.max(0, image.naturalWidth * scale - CROP_SIZE),
    y: Math.max(0, image.naturalHeight * scale - CROP_SIZE),
  };
}

function clampCrop(image: HTMLImageElement, crop: CropState): CropState {
  const slack = cropSlack(image, crop.zoom);
  return {
    zoom: crop.zoom,
    x: Math.min(0, Math.max(-slack.x, crop.x)),
    y: Math.min(0, Math.max(-slack.y, crop.y)),
  };
}

function centeredCrop(image: HTMLImageElement, zoom: number): CropState {
  const slack = cropSlack(image, zoom);
  return { zoom, x: -slack.x / 2, y: -slack.y / 2 };
}

function paintCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: CropState): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const scale = coverScale(image, crop.zoom);
  context.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
  context.drawImage(image, crop.x, crop.y, image.naturalWidth * scale, image.naturalHeight * scale);
}

function blobExtension(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return "webp";
}

/* Alternador nativo: una casilla con `role="switch"` conserva teclado y lector de pantalla. */
// Implements: REQ-CFG-04
function SettingsSwitch({
  busy,
  checked,
  description,
  id,
  label,
  onChange,
}: {
  busy: boolean;
  checked: boolean;
  description?: string;
  id: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-switch" htmlFor={id}>
      <input
        aria-describedby={description}
        checked={checked}
        className="settings-switch-input"
        disabled={busy}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
        role="switch"
        type="checkbox"
      />
      <span aria-hidden="true" className="settings-switch-track" />
      <span>{label}</span>
    </label>
  );
}

/*
  El editor de recorte es presentación pura: recibe el encuadre y devuelve
  intenciones. Separarlo deja el módulo de foto a la altura de lo que hace, que
  es hablar con la API, y no de cómo se dibujan tres deslizadores.
*/
// Implements: REQ-CFG-02
function CropEditor({
  crop,
  slack,
  framePercent,
  onCanvas,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onZoomChange,
  onFrameChange,
}: {
  crop: CropState;
  slack: { x: number; y: number };
  framePercent: { x: number; y: number };
  onCanvas: (canvas: HTMLCanvasElement | null) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onZoomChange: (value: number) => void;
  onFrameChange: (axis: "x" | "y", percent: number) => void;
}) {
  return (
    <div className="settings-crop">
      <canvas
        aria-label="Vista previa del recorte cuadrado. Arrastra sobre la imagen para reencuadrarla."
        className="settings-crop-canvas"
        height={CROP_SIZE}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={onCanvas}
        role="img"
        width={CROP_SIZE}
      />

      <div className="settings-slider">
        <label htmlFor="settings-crop-zoom">Acercamiento</label>
        <input
          id="settings-crop-zoom"
          max={MAX_ZOOM}
          min={MIN_ZOOM}
          onChange={(event) => onZoomChange(Number(event.target.value))}
          step={0.01}
          type="range"
          value={crop.zoom}
        />
      </div>

      {/*
            Los dos deslizadores repiten con teclado lo que el arrastre hace
            con el puntero. Se desactivan cuando el eje no tiene holgura,
            porque ahí no hay nada que reencuadrar.
          */}
      <div className="settings-slider">
        <label htmlFor="settings-crop-x">Encuadre horizontal</label>
        <input
          disabled={slack.x === 0}
          id="settings-crop-x"
          max={100}
          min={0}
          onChange={(event) => onFrameChange("x", Number(event.target.value))}
          step={1}
          type="range"
          value={framePercent.x}
        />
      </div>

      <div className="settings-slider">
        <label htmlFor="settings-crop-y">Encuadre vertical</label>
        <input
          disabled={slack.y === 0}
          id="settings-crop-y"
          max={100}
          min={0}
          onChange={(event) => onFrameChange("y", Number(event.target.value))}
          step={1}
          type="range"
          value={framePercent.y}
        />
      </div>
    </div>
  );
}

/*
  El módulo de foto vive aparte porque su estado no lo comparte nadie: la imagen
  cargada, el encuadre y el lienzo sólo importan mientras el recorte está
  abierto, y mezclarlos con el resto de la pantalla obligaría a leer trescientas
  líneas para entender un alternador.
*/
// Implements: REQ-CFG-02 REQ-CFG-03
function ProfilePhotoPanel({
  user,
  onPhotoChange,
  onStatus,
}: {
  user: User;
  onPhotoChange: (photoUrl: string | null) => void;
  onStatus: (message: string) => void;
}) {
  const [source, setSource] = useState<CropSource | null>(null);
  const [crop, setCrop] = useState<CropState>({ zoom: MIN_ZOOM, x: 0, y: 0 });
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  /* `movementX` no llega en todos los navegadores táctiles, así que el arrastre
     guarda la última posición del puntero y calcula el avance por su cuenta. */
  const dragFrom = useRef<{ x: number; y: number } | null>(null);

  /* La URL de objeto se libera al cambiar de imagen y al salir de la pantalla. */
  useEffect(() => {
    if (!source) return;
    return () => URL.revokeObjectURL(source.url);
  }, [source]);

  useEffect(() => {
    if (canvas && source) paintCrop(canvas, source.image, crop);
  }, [canvas, crop, source]);
  function closeCropper() {
    setSource(null);
    setCrop({ zoom: MIN_ZOOM, x: 0, y: 0 });
  }

  // Implements: REQ-CFG-02
  function onFilePicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Elige una imagen PNG, JPG o WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setPhotoError("La imagen no puede superar los 2 MB.");
      return;
    }
    setPhotoError("");
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setCrop(centeredCrop(image, MIN_ZOOM));
      setSource({ url, image });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      setPhotoError("No se pudo abrir esa imagen. Prueba con otro archivo.");
    };
    image.src = url;
  }

  /*
    El arrastre convierte el desplazamiento del puntero desde píxeles de
    pantalla a píxeles del recorte, de modo que reencuadrar avanza lo mismo en
    un teléfono estrecho que en un escritorio.
  */
  // Implements: REQ-CFG-02
  function onCropPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!source) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragFrom.current = { x: event.clientX, y: event.clientY };
  }

  function onCropPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const from = dragFrom.current;
    if (!source || !from) return;
    const ratio = CROP_SIZE / (event.currentTarget.getBoundingClientRect().width || CROP_SIZE);
    const stepX = (event.clientX - from.x) * ratio;
    const stepY = (event.clientY - from.y) * ratio;
    dragFrom.current = { x: event.clientX, y: event.clientY };
    setCrop((current) =>
      clampCrop(source.image, { zoom: current.zoom, x: current.x + stepX, y: current.y + stepY })
    );
  }

  function onCropPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    dragFrom.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  /* El acercamiento conserva el centro del cuadro para que el encuadre no salte. */
  function onZoomChange(value: number) {
    if (!source) return;
    setCrop((current) => {
      const middle = CROP_SIZE / 2;
      const factor = value / current.zoom;
      return clampCrop(source.image, {
        zoom: value,
        x: middle - (middle - current.x) * factor,
        y: middle - (middle - current.y) * factor,
      });
    });
  }

  function onFrameChange(axis: "x" | "y", percent: number) {
    if (!source) return;
    const slack = cropSlack(source.image, crop.zoom);
    setCrop((current) => ({ ...current, [axis]: -(slack[axis] * percent) / 100 }));
  }

  // Implements: REQ-CFG-02
  async function onPhotoSave() {
    if (!canvas || !source) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", 0.92);
      });
      if (!blob || !ACCEPTED_TYPES.includes(blob.type)) {
        setPhotoError("Este navegador no pudo generar el recorte. Prueba con otra imagen.");
        return;
      }
      if (blob.size > MAX_BYTES) {
        setPhotoError("El recorte supera los 2 MB. Reduce el acercamiento e inténtalo de nuevo.");
        return;
      }
      const body = new FormData();
      body.append(
        "photo",
        new File([blob], `perfil.${blobExtension(blob.type)}`, { type: blob.type })
      );
      const response = await fetch("/api/profile/photo", { method: "POST", body });
      if (!response.ok) {
        setPhotoError(await apiError(response, "No se pudo guardar la foto de perfil."));
        return;
      }
      const data = (await response.json()) as { photoUrl: string };
      onPhotoChange(data.photoUrl);
      closeCropper();
      onStatus("Tu foto de perfil quedó actualizada.");
    } catch (cause) {
      setPhotoError(failureMessage(cause, "No se pudo guardar la foto de perfil."));
    } finally {
      setPhotoBusy(false);
    }
  }

  // Implements: REQ-CFG-03
  async function onPhotoReset() {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const response = await fetch("/api/profile/photo", { method: "DELETE" });
      if (!response.ok) {
        setPhotoError(await apiError(response, "No se pudo restablecer la foto de perfil."));
        return;
      }
      onPhotoChange(null);
      closeCropper();
      onStatus("Tu avatar vuelve a la foto de tu cuenta institucional.");
    } catch (cause) {
      setPhotoError(failureMessage(cause, "No se pudo restablecer la foto de perfil."));
    } finally {
      setPhotoBusy(false);
    }
  }
  const slack = source ? cropSlack(source.image, crop.zoom) : { x: 0, y: 0 };
  const framePercent = {
    x: slack.x > 0 ? Math.round((-crop.x / slack.x) * 100) : 50,
    y: slack.y > 0 ? Math.round((-crop.y / slack.y) * 100) : 50,
  };
  return (
    <section aria-labelledby="settings-photo-title" className="settings-panel">
      <div className="settings-panel-head">
        <h2 id="settings-photo-title">
          <ImageIcon aria-hidden="true" size={22} />
          Foto de perfil
        </h2>
        <p className="settings-note">
          Se sube el recorte cuadrado que dejes encuadrado, no la imagen original. Admite PNG, JPG y
          WEBP de hasta 2 MB.
        </p>
      </div>

      <div className="settings-photo">
        <div className="settings-photo-current">
          <Avatar email={user.email} large name={user.name} photoUrl={user.photoUrl} />
          <span className="settings-photo-caption">Avatar actual</span>
        </div>

        {source ? (
          <CropEditor
            crop={crop}
            framePercent={framePercent}
            onCanvas={setCanvas}
            onFrameChange={onFrameChange}
            onPointerDown={onCropPointerDown}
            onPointerMove={onCropPointerMove}
            onPointerUp={onCropPointerUp}
            onZoomChange={onZoomChange}
            slack={slack}
          />
        ) : null}
      </div>

      {photoError ? (
        <p className="settings-error" id="settings-photo-error" role="alert">
          <WarningCircle aria-hidden="true" size={16} weight="fill" />
          {photoError}
        </p>
      ) : null}

      <div className="settings-actions">
        <span className="settings-file">
          <input
            accept={ACCEPTED_TYPES.join(",")}
            aria-describedby={describedBy(photoError && "settings-photo-error")}
            aria-invalid={photoError ? true : undefined}
            className="sr-only"
            disabled={photoBusy}
            id="settings-photo-file"
            onChange={onFilePicked}
            type="file"
          />
          <label className="secondary-button" htmlFor="settings-photo-file">
            <UploadSimple aria-hidden="true" size={18} />
            {source ? "Elegir otra imagen" : "Elegir imagen"}
          </label>
        </span>

        {source ? (
          <>
            <button
              aria-describedby={describedBy(photoError && "settings-photo-error")}
              className="primary-button"
              disabled={photoBusy}
              onClick={() => void onPhotoSave()}
              type="button"
            >
              {photoBusy ? "Guardando…" : "Guardar recorte"}
            </button>
            <button
              className="secondary-button"
              disabled={photoBusy}
              onClick={closeCropper}
              type="button"
            >
              <X aria-hidden="true" size={18} />
              Descartar
            </button>
          </>
        ) : null}

        <button
          className="secondary-button"
          disabled={photoBusy}
          onClick={() => void onPhotoReset()}
          type="button"
        >
          <ArrowCounterClockwise aria-hidden="true" size={18} />
          Restablecer la foto de Google
        </button>
      </div>
    </section>
  );
}

/*
  Cuenta y seguridad también se sostiene sola: el listado de sesiones se pide una
  vez y sólo esta sección lo consume.
*/
// Implements: REQ-CFG-06 REQ-CFG-07
function AccountPanel({
  user,
  onLogout,
  onStatus,
}: {
  user: User;
  onLogout: () => void;
  onStatus: (message: string) => void;
}) {
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState("");
  const [revoking, setRevoking] = useState("");

  // Implements: REQ-CFG-07
  useEffect(() => {
    let alive = true;
    fetch("/api/profile/sessions")
      .then(async (response) => {
        if (!response.ok)
          throw new Error(await apiError(response, "No se pudieron leer tus sesiones."));
        return (await response.json()) as { sessions: ActiveSession[] };
      })
      .then((data) => {
        if (alive) setSessions(data.sessions);
      })
      .catch((cause: unknown) => {
        if (!alive) return;
        setSessions([]);
        setSessionsError(failureMessage(cause, "No se pudieron leer tus sesiones."));
      });
    return () => {
      alive = false;
    };
  }, []);
  // Implements: REQ-CFG-07
  async function onSessionRevoke(id: string) {
    setRevoking(id);
    setSessionsError("");
    try {
      const response = await fetch("/api/profile/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        setSessionsError(await apiError(response, "No se pudo cerrar esa sesión."));
        return;
      }
      const data = (await response.json()) as { revoked: string; current: boolean };
      if (data.current) {
        onLogout();
        return;
      }
      setSessions((current) => (current ?? []).filter((item) => item.id !== data.revoked));
      onStatus("La sesión quedó cerrada en ese dispositivo.");
    } catch (cause) {
      setSessionsError(failureMessage(cause, "No se pudo cerrar esa sesión."));
    } finally {
      setRevoking("");
    }
  }
  return (
    <section aria-labelledby="settings-account-title" className="settings-panel">
      <div className="settings-panel-head">
        <h2 id="settings-account-title">
          <IdentificationCard aria-hidden="true" size={22} />
          Cuenta y seguridad
        </h2>
        <p className="settings-note">
          Tu correo y tu rango se derivan de la cuenta institucional y no se editan desde aquí.
        </p>
      </div>

      <dl className="settings-facts">
        <div>
          <dt>Correo institucional</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Rango</dt>
          <dd>{roleLabel(user.role)}</dd>
        </div>
        {user.carrera ? (
          <div>
            <dt>Carrera</dt>
            <dd>{user.carrera}</dd>
          </div>
        ) : null}
      </dl>

      <h3 className="settings-subhead" id="settings-sessions-title">
        Sesiones activas
      </h3>

      {sessionsError ? (
        <p className="settings-error" id="settings-sessions-error" role="alert">
          <WarningCircle aria-hidden="true" size={16} weight="fill" />
          {sessionsError}
        </p>
      ) : null}

      {sessions === null ? (
        <p className="settings-note">Leyendo tus sesiones…</p>
      ) : sessions.length === 0 ? (
        <p className="settings-note">
          No hay ninguna sesión activa que mostrar además de la que estás usando.
        </p>
      ) : (
        <ul aria-labelledby="settings-sessions-title" className="settings-sessions">
          {sessions.map((session) => (
            <li className="settings-session" key={session.id}>
              <div className="settings-session-copy">
                <strong>Iniciada el {formatSessionDate(session.createdAt)}</strong>
                <small>Vence el {formatSessionDate(session.expiresAt)}</small>
              </div>
              {session.current ? (
                <span className="settings-session-current">
                  <ShieldCheck aria-hidden="true" size={14} weight="fill" />
                  Sesión actual
                </span>
              ) : (
                <button
                  aria-describedby={describedBy(sessionsError && "settings-sessions-error")}
                  className="settings-revoke"
                  disabled={revoking === session.id}
                  onClick={() => void onSessionRevoke(session.id)}
                  type="button"
                >
                  <X aria-hidden="true" size={16} />
                  {revoking === session.id ? "Cerrando…" : "Cerrar sesión"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="settings-actions">
        <button className="secondary-button settings-logout" onClick={onLogout} type="button">
          <SignOut aria-hidden="true" size={18} />
          Cerrar sesión en este dispositivo
        </button>
      </div>
    </section>
  );
}

/*
  Una sola columna de lectura con cuatro módulos etiquetados. Cada control lleva
  su etiqueta asociada y cada mensaje de validación apunta a su campo, porque a
  320 CSS px el error suele quedar fuera de la vista del control que lo produjo.
  La pantalla sólo conserva lo que dos módulos comparten: el aviso vivo y las
  preferencias, que alimentan a la vez avisos y accesibilidad.
*/
// Implements: REQ-CFG-08
export function SettingsView({
  user,
  onLogout,
  onPhotoChange,
}: {
  user: User;
  onLogout: () => void;
  onPhotoChange: (photoUrl: string | null) => void;
}) {
  const [status, setStatus] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");

  /*
    Cargar no es guardar: la respuesta sólo alimenta el estado local. Una
    cuenta que nunca abrió esta pantalla no escribe documento hasta que
    cambia un valor a mano.
  */
  // Implements: REQ-CFG-04
  useEffect(() => {
    let alive = true;
    loadPreferences()
      .then((value) => {
        if (alive) setPreferences(value);
      })
      .catch(() => {
        if (alive) {
          setPreferencesError(
            "No se pudieron leer tus preferencias. Se muestran los valores por defecto."
          );
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  /*
    El alternador se pinta antes de que responda el servidor y vuelve a su
    valor anterior si la escritura falla: así el control nunca miente sobre lo
    que quedó guardado.
  */
  // Implements: REQ-CFG-04 REQ-CFG-05
  async function commitPreferences(next: UserPreferences, message: string) {
    const previous = preferences;
    setPreferences(next);
    setPreferencesError("");
    setPreferencesBusy(true);
    try {
      setPreferences(await savePreferences(next));
      setStatus(message);
    } catch (cause) {
      setPreferences(previous);
      setPreferencesError(failureMessage(cause, "No se pudieron guardar las preferencias."));
    } finally {
      setPreferencesBusy(false);
    }
  }

  // Implements: REQ-CFG-04
  function onChannelChange(channel: NotificationChannel, target: ChannelTarget, value: boolean) {
    const current = preferences.channels[channel];
    const updated: ChannelPreference =
      target === "web" ? { ...current, web: value } : { ...current, push: value };
    const destination = target === "web" ? "en la web" : "en push móvil";
    void commitPreferences(
      { ...preferences, channels: { ...preferences.channels, [channel]: updated } },
      `${CHANNEL_LABELS[channel]}: aviso ${destination} ${value ? "activado" : "desactivado"}.`
    );
  }

  // Implements: REQ-CFG-05
  function onReducedMotionChange(value: boolean) {
    void commitPreferences(
      { ...preferences, reducedMotion: value },
      value
        ? "El portal reducirá el movimiento en tu cuenta."
        : "El movimiento del portal vuelve a depender de tu sistema."
    );
  }
  return (
    <section className="settings-view">
      <div className="page-head lead">
        <h1>Configuración</h1>
        <p>Tu foto, los avisos que recibes y las sesiones abiertas en tu cuenta.</p>
      </div>

      <p aria-live="polite" className="settings-status" role="status">
        {status ? (
          <>
            <CheckCircle aria-hidden="true" size={18} weight="fill" />
            {status}
          </>
        ) : null}
      </p>

      <ProfilePhotoPanel onPhotoChange={onPhotoChange} onStatus={setStatus} user={user} />

      {/* Implements: REQ-CFG-04 */}
      <section aria-labelledby="settings-notifications-title" className="settings-panel">
        <div className="settings-panel-head">
          <h2 id="settings-notifications-title">
            <Bell aria-hidden="true" size={22} />
            Avisos
          </h2>
          <p className="settings-note">
            Cada canal se controla por separado para el portal web y para las notificaciones push de
            la aplicación móvil. Los cambios se guardan en cuanto los haces.
          </p>
        </div>

        {preferencesError ? (
          <p className="settings-error" id="settings-preferences-error" role="alert">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {preferencesError}
          </p>
        ) : null}

        <div className="settings-channels">
          {NOTIFICATION_CHANNELS.map((channel) => {
            const pending = CHANNELS_WITHOUT_SENDER.includes(channel);
            const noteId = pending ? `settings-channel-${channel}-note` : undefined;
            return (
              <div className="settings-channel" key={channel}>
                <div className="settings-channel-copy">
                  <strong>{CHANNEL_LABELS[channel]}</strong>
                  {pending ? (
                    <small id={noteId}>
                      Tu preferencia queda guardada, pero este aviso todavía no tiene un emisor que
                      lo envíe.
                    </small>
                  ) : null}
                </div>
                <div className="settings-channel-toggles">
                  {CHANNEL_TARGETS.map((target) => (
                    <SettingsSwitch
                      busy={preferencesBusy}
                      checked={preferences.channels[channel][target.key]}
                      description={describedBy(
                        noteId,
                        preferencesError && "settings-preferences-error"
                      )}
                      id={`settings-channel-${channel}-${target.key}`}
                      key={target.key}
                      label={target.label}
                      onChange={(value) => onChannelChange(channel, target.key, value)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Implements: REQ-CFG-05 */}
      <section aria-labelledby="settings-motion-title" className="settings-panel">
        <div className="settings-panel-head">
          <h2 id="settings-motion-title">
            <Eye aria-hidden="true" size={22} />
            Accesibilidad
          </h2>
          <p className="settings-note" id="settings-motion-note">
            Con el alternador apagado, la preferencia de movimiento de tu sistema operativo sigue
            aplicándose por su cuenta.
          </p>
        </div>

        <SettingsSwitch
          busy={preferencesBusy}
          checked={preferences.reducedMotion}
          description={describedBy(
            "settings-motion-note",
            preferencesError && "settings-preferences-error"
          )}
          id="settings-reduced-motion"
          label="Reducir el movimiento del portal"
          onChange={onReducedMotionChange}
        />
      </section>

      <AccountPanel onLogout={onLogout} onStatus={setStatus} user={user} />
    </section>
  );
}
