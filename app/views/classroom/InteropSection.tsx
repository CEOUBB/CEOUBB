"use client";

// Implements: REQ-QMD-07
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import { ArrowSquareOut, DownloadSimple, PlugsConnected, X } from "@phosphor-icons/react";
import { z } from "zod";
import { InteropListSkeleton } from "../ViewSkeletons";
import {
  downloadInteropFile,
  interopRequest,
  launchSchema,
  resourcePageSchema,
  toolPageSchema,
  type InteropResource,
  type InteropTool,
} from "../../../lib/interop/client";
import { MAX_PACKAGE_BYTES } from "../../../lib/interop/zip";
import type { Note } from "./classroom-utils";
import { InteropAuthoringPanel } from "./InteropAuthoringPanel";
import { ToolRegistration } from "./InteropToolRegistration";
import { EmptyState } from "./EmptyState";
import "./interop.css";

const kindLabel = {
  lti: "Herramienta LTI",
  scorm12: "SCORM 1.2",
  scorm2004: "SCORM 2004",
  xapi: "xAPI",
};

interface InteropState {
  resources: InteropResource[];
  tools: InteropTool[];
  cursor: string | null;
  toolCursor: string | null;
  loading: boolean;
  error: string;
}

type InteropAction =
  | {
      type: "LOAD_SUCCESS";
      resources: InteropResource[];
      cursor: string | null;
      tools: InteropTool[];
      toolCursor: string | null;
    }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "APPEND_RESOURCES"; resources: InteropResource[]; cursor: string | null }
  | { type: "APPEND_TOOLS"; tools: InteropTool[]; toolCursor: string | null };

const initialInteropState: InteropState = {
  resources: [],
  tools: [],
  cursor: null,
  toolCursor: null,
  loading: true,
  error: "",
};

function interopReducer(state: InteropState, action: InteropAction): InteropState {
  switch (action.type) {
    case "LOAD_SUCCESS":
      return {
        ...state,
        resources: action.resources,
        cursor: action.cursor,
        tools: action.tools,
        toolCursor: action.toolCursor,
        loading: false,
        error: "",
      };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "APPEND_RESOURCES":
      return {
        ...state,
        resources: [...state.resources, ...action.resources],
        cursor: action.cursor,
      };
    case "APPEND_TOOLS":
      return {
        ...state,
        tools: [...state.tools, ...action.tools],
        toolCursor: action.toolCursor,
      };
  }
}

export function InteropSection({
  sectionId,
  canTeach,
  isOwner,
  readOnly,
  note,
}: {
  sectionId: string;
  canTeach: boolean;
  isOwner: boolean;
  readOnly: boolean;
  note: (text: string, tone?: Note["tone"]) => void;
}) {
  const [state, dispatch] = useReducer(interopReducer, initialInteropState);
  const [busy, startTransition] = useTransition();
  const [player, setPlayer] = useState<{ url: string; title: string } | null>(null);
  const noteRef = useRef(note);
  const base = "/api/courses/" + encodeURIComponent(sectionId) + "/interop";

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  const refresh = useCallback(
    (signal?: AbortSignal) => {
      return Promise.all([
        interopRequest(base, resourcePageSchema, { signal }),
        canTeach
          ? interopRequest("/api/interop/tools", toolPageSchema, { signal })
          : Promise.resolve({ items: [], nextCursor: null }),
      ])
        .then(([page, registered]) => {
          if (signal?.aborted) return;
          dispatch({
            type: "LOAD_SUCCESS",
            resources: page.items,
            cursor: page.nextCursor,
            tools: registered.items,
            toolCursor: registered.nextCursor,
          });
        })
        .catch((cause: unknown) => {
          if (!signal?.aborted) {
            dispatch({
              type: "LOAD_ERROR",
              error: cause instanceof Error ? cause.message : "No se pudieron cargar los recursos.",
            });
          }
        });
    },
    [base, canTeach]
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const performAction = (operation: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await operation();
      } catch (cause) {
        noteRef.current(
          cause instanceof Error ? cause.message : "No se pudo completar la operación.",
          "bad"
        );
      }
    });
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PACKAGE_BYTES || !file.name.toLowerCase().endsWith(".zip"))
      return note("Selecciona un ZIP de hasta 50 MiB.", "bad");
    performAction(async () => {
      note("Validando y guardando el paquete…");
      await interopRequest(base, z.object({ id: z.string() }), {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: file,
      });
      await refresh();
      note("Objeto de aprendizaje disponible en la sección.", "ok");
    });
  };

  const linkTool = async (data: { title: string; toolId: string; targetUrl: string }) => {
    performAction(async () => {
      await interopRequest(base, z.object({ id: z.string() }), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await refresh();
      note("Herramienta vinculada a la sección.", "ok");
    });
  };

  const loadMoreTools = async () => {
    if (!state.toolCursor) return;
    performAction(async () => {
      const page = await interopRequest(
        "/api/interop/tools?cursor=" + encodeURIComponent(state.toolCursor!),
        toolPageSchema
      );
      dispatch({ type: "APPEND_TOOLS", tools: page.items, toolCursor: page.nextCursor });
    });
  };

  const open = (resource: InteropResource) =>
    performAction(async () => {
      const result = await interopRequest(base + "/" + resource.id, launchSchema, {
        method: "POST",
      });
      if (result.kind === "lti") window.location.assign(result.url);
      else setPlayer({ url: result.url, title: result.title });
    });

  if (player)
    return (
      <section className="interop-player" aria-label={player.title}>
        <header>
          <h2>{player.title}</h2>
          <button className="secondary-button" onClick={() => setPlayer(null)} type="button">
            <X size={18} aria-hidden="true" />
            Cerrar recurso
          </button>
        </header>
        <p>
          Antes de cerrar, usa la opción de guardar o finalizar del objeto. Su avance no modifica el
          libro de notas.
        </p>
        <iframe
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-forms allow-popups"
          src={player.url}
          title={player.title}
        />
      </section>
    );

  /*
    El contenido de la sección va primero y el formulario después: antes la
    pantalla abría con dos paneles de administración y dejaba la lista real de
    recursos al final, debajo de un registro LTI que sólo usa administración.
  */
  const canAuthor = canTeach && !readOnly;

  return (
    <section className="interop-workspace" aria-label="Herramientas y objetos de aprendizaje">
      <div className="section-title compact-title">
        <h2>Herramientas y objetos de aprendizaje</h2>
      </div>
      <p className="interop-lede">
        Abre los laboratorios, bibliotecas y actividades que comparte tu equipo docente.
      </p>
      {state.error && (
        <div className="interop-alert" role="alert">
          <p>{state.error}</p>
          <button className="secondary-button" onClick={() => void refresh()} type="button">
            Reintentar
          </button>
        </div>
      )}
      {busy && (
        <p className="interop-progress" role="status">
          Procesando recurso…
        </p>
      )}
      {state.loading ? (
        <InteropListSkeleton />
      ) : state.resources.length === 0 && !state.error ? (
        <EmptyState
          icon={PlugsConnected}
          title="Esta sección aún no tiene recursos externos"
          description={
            canAuthor
              ? "Sube un paquete SCORM o xAPI, o vincula una herramienta LTI ya registrada por administración."
              : "Los laboratorios y actividades que agregue el equipo docente aparecerán aquí."
          }
        />
      ) : (
        <ul className="interop-resource-list">
          {state.resources.map((resource) => (
            <li key={resource.id}>
              <div>
                <span>{kindLabel[resource.kind]}</span>
                <h3>{resource.title}</h3>
              </div>
              <div className="interop-actions">
                {resource.kind !== "lti" && (
                  <button
                    className="secondary-button"
                    aria-label={"Descargar " + resource.title}
                    disabled={busy}
                    onClick={() =>
                      void performAction(() =>
                        downloadInteropFile(base + "/" + resource.id, resource.title + ".zip")
                      )
                    }
                    type="button"
                  >
                    <DownloadSimple size={18} aria-hidden="true" />
                    ZIP
                  </button>
                )}
                <button
                  className="primary-button"
                  disabled={busy || readOnly}
                  onClick={() => open(resource)}
                  type="button"
                >
                  <ArrowSquareOut size={18} aria-hidden="true" />
                  Abrir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {state.cursor && (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() =>
            void performAction(async () => {
              const page = await interopRequest(
                base + "?cursor=" + encodeURIComponent(state.cursor!),
                resourcePageSchema
              );
              dispatch({
                type: "APPEND_RESOURCES",
                resources: page.items,
                cursor: page.nextCursor,
              });
            })
          }
          type="button"
        >
          Cargar más recursos
        </button>
      )}
      {canAuthor && (
        <InteropAuthoringPanel
          busy={busy}
          tools={state.tools}
          toolCursor={state.toolCursor}
          upload={upload}
          onLinkTool={linkTool}
          onLoadMoreTools={loadMoreTools}
          defaultOpen={state.resources.length === 0 && !state.loading}
        />
      )}
      {isOwner && (
        <ToolRegistration
          tools={state.tools}
          disabled={busy}
          onChanged={refresh}
          onError={(message) => note(message, "bad")}
        />
      )}
    </section>
  );
}
