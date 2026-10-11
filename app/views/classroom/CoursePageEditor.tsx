"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Reorder, useDragControls } from "motion/react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowsDownUp,
  CalendarBlank,
  Check,
  CopySimple,
  DotsSixVertical,
  DotsThree,
  Eye,
  EyeSlash,
  FileArrowUp,
  ImageSquare,
  LinkSimple,
  PencilSimple,
  PencilSimpleLine,
  Plus,
  TextT,
  Trash,
  type Icon,
} from "@phosphor-icons/react";
import type { Course } from "../../../lib/courses";
import {
  createPageItem,
  createPageSection,
  duplicatePageItem,
  materializeSections,
  placePageItem,
  restoreTrashEntry,
  sectionTrashId,
  setSectionVisibility,
  trashItems,
  trashSection,
  updatePageItem,
  updatePageSection,
  uploadPostAttachment,
  type ClassroomAttachment,
  type ClassroomState,
  type CoursePost,
} from "../../../lib/firebase-classroom-client";
import {
  EMPTY_HISTORY,
  ITEM_TITLE_MAX,
  SECTION_TITLE_MAX,
  announcementDraftFor,
  buildCoursePage,
  cleanLink,
  copyTitle,
  displayName,
  locationFor,
  materializationPlan,
  moveId,
  movedEntry,
  positionBetween,
  positionForIndex,
  recordEntry,
  renumber,
  stepBack,
  stepForward,
  type CoursePage,
  type PageItemType,
  type PageSectionView,
  type TrashEntry,
  type UndoEntry,
  type UndoHistory,
} from "../../../lib/course-page";
import { useHydratedReducedMotion } from "../../../lib/hooks/use-hydrated-reduced-motion";
import { persistDefaultEditor, readDefaultEditor } from "../../../lib/publication-workflow";
import { toast } from "../../../lib/toast";
import { PageSectionsView, sectionAnchor, type ComposeSeed } from "./CoursePage";
import { PageItemContent, VisibilityNote, type OpenAttachment } from "./CoursePageItems";
import { CourseTrashDialog } from "./CourseTrashDialog";
import { PageDialog } from "./PageDialog";
import { PublishConfirmDialog } from "./PublishPanels";
import { RichPostEditor } from "./RichPostEditor";

const FILE_ACCEPT =
  ".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/png,image/jpeg,image/webp";
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const SPRING = { type: "spring", stiffness: 340, damping: 28, mass: 0.8 } as const;
const INSTANT = { duration: 0 } as const;

type FormType = "text" | "link" | "file" | "image";
type Editing =
  | { kind: "new"; sectionId: string; type: "text" | "link" }
  | { kind: "edit"; itemId: string }
  | null;
type Schedule = { scope: "section" | "item"; id: string; title: string };
type Upload = { key: string; sectionId: string; name: string; percent: number };
type Order = { scope: string; ids: string[] };
type ItemValues = { title: string; body: string; linkUrl: string };
type Added = { id: string; sectionTitle: string; title: string };

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function messageOf(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function itemLabel(item: Pick<CoursePost, "title" | "itemType">) {
  if (item.title) return `«${item.title}»`;
  return item.itemType === "image" ? "la imagen" : "el texto";
}

function sameOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function tomorrowMorning() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 0, 0, 0);
  return localInputValue(date);
}

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

// Implements: REQ-PAGE-03
function ActionMenu({
  label,
  children,
}: {
  label: string;
  children: (menuId: string) => ReactNode;
}) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        aria-haspopup="menu"
        aria-label={label}
        className="page-tool"
        popoverTarget={id}
        ref={buttonRef}
        type="button"
      >
        <DotsThree aria-hidden="true" size={20} weight="bold" />
      </button>
      <div
        className="page-menu"
        id={id}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          const items = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]"),
          ];
          const current = items.indexOf(document.activeElement as HTMLButtonElement);
          const step = event.key === "ArrowDown" ? 1 : -1;
          items[(current + step + items.length) % items.length]?.focus();
        }}
        onBeforeToggle={(event) => {
          if (event.newState !== "open") return;
          const anchor = buttonRef.current?.getBoundingClientRect();
          if (!anchor) return;
          const menu = event.currentTarget;
          menu.style.setProperty(
            "--menu-right",
            `${Math.round(document.documentElement.clientWidth - anchor.right)}px`
          );
          menu.style.setProperty("--menu-y", `${Math.round(anchor.bottom + 6)}px`);
        }}
        onToggle={(event) => {
          if (event.newState !== "open") return;
          const anchor = buttonRef.current?.getBoundingClientRect();
          const menu = event.currentTarget;
          const { height } = menu.getBoundingClientRect();
          if (anchor && anchor.bottom + 6 + height > window.innerHeight - 8)
            menu.style.setProperty(
              "--menu-y",
              `${Math.round(Math.max(8, anchor.top - height - 6))}px`
            );
          menu.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
        }}
        popover="auto"
        role="menu"
        tabIndex={-1}
      >
        {children(id)}
      </div>
    </>
  );
}

function MenuItem({
  icon: Glyph,
  label,
  onSelect,
  danger = false,
  disabled = false,
  menuId,
}: {
  icon: Icon;
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  menuId?: string;
}) {
  return (
    <button
      className={danger ? "page-menu-item is-danger" : "page-menu-item"}
      disabled={disabled}
      onClick={onSelect}
      popoverTarget={menuId}
      popoverTargetAction={menuId ? "hide" : undefined}
      role="menuitem"
      type="button"
    >
      <Glyph aria-hidden="true" size={17} />
      {label}
    </button>
  );
}

// Implements: REQ-PAGE-02
function ItemForm({
  type,
  initial,
  onCancel,
  onSave,
}: {
  type: FormType;
  initial: ItemValues;
  onCancel: () => void;
  onSave: (values: ItemValues) => Promise<boolean>;
}) {
  const [values, setValues] = useState(initial);
  const [editorMode, setEditorMode] = useState(() => readDefaultEditor(storage()) ?? "visual");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (type !== "text") titleRef.current?.focus();
  }, [type]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const shortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      event.preventDefault();
      form.requestSubmit();
    };
    form.addEventListener("keydown", shortcut);
    return () => form.removeEventListener("keydown", shortcut);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (type === "text" && !values.title.trim() && !values.body.trim()) {
      setError("Escribe un título o un contenido antes de guardar.");
      return;
    }

    if (type === "link") {
      try {
        cleanLink(values.linkUrl);
      } catch (cause) {
        setError(messageOf(cause, "Revisa la dirección del enlace."));
        return;
      }
    }

    setSaving(true);
    const saved = await onSave(values);
    setSaving(false);
    if (!saved) setError("No se pudo guardar. Revisa tu conexión y vuelve a intentarlo.");
  };

  const field = (key: keyof ItemValues) => ({
    value: values[key],
    onChange: (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  return (
    <form className="page-item-form" onSubmit={submit} ref={formRef}>
      {type === "text" && (
        <>
          <input
            {...field("title")}
            aria-label="Título del texto"
            autoComplete="off"
            className="page-form-title"
            maxLength={ITEM_TITLE_MAX}
            placeholder="Título (opcional)"
          />
          <RichPostEditor
            editorMode={editorMode}
            label="Contenido"
            name="body"
            onChange={(body) => setValues((current) => ({ ...current, body }))}
            onEditorModeChange={(mode) => {
              setEditorMode(mode);
              persistDefaultEditor(storage(), mode);
            }}
            value={values.body}
          />
        </>
      )}
      {type === "link" && (
        <div className="page-form-grid">
          <label>
            Texto del enlace
            <input
              {...field("title")}
              autoComplete="off"
              maxLength={ITEM_TITLE_MAX}
              placeholder="Por ejemplo, Simulador de ciclos"
              ref={titleRef}
            />
          </label>
          <label>
            Dirección
            <input
              {...field("linkUrl")}
              autoComplete="url"
              inputMode="url"
              placeholder="https://"
              required
              type="url"
            />
          </label>
        </div>
      )}
      {(type === "file" || type === "image") && (
        <label className="page-form-single">
          {type === "image" ? "Descripción de la imagen" : "Nombre visible"}
          <input
            {...field("title")}
            autoComplete="off"
            maxLength={ITEM_TITLE_MAX}
            placeholder={type === "image" ? "Qué muestra la imagen, para quien no puede verla" : ""}
            ref={titleRef}
          />
        </label>
      )}
      {error && (
        <p className="tool-status bad" role="alert">
          {error}
        </p>
      )}
      <div className="page-form-actions">
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="primary-button" disabled={saving} type="submit">
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

function SectionNameForm({
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  initial: string;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <form
      className="page-section-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onSubmit(title.trim());
      }}
    >
      <input
        aria-label="Nombre de la sección"
        autoComplete="off"
        maxLength={SECTION_TITLE_MAX}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder="Nombre de la sección, por ejemplo Unidad 1: Primera ley"
        ref={inputRef}
        value={title}
      />
      <button className="primary-button" disabled={!title.trim()} type="submit">
        {submitLabel}
      </button>
      <button className="secondary-button" onClick={onCancel} type="button">
        Cancelar
      </button>
    </form>
  );
}

// Implements: REQ-PAGE-05
function ScheduleDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: Schedule;
  onCancel: () => void;
  onConfirm: (iso: string) => void;
}) {
  const [value, setValue] = useState(tomorrowMorning);
  const [error, setError] = useState("");
  return (
    <PageDialog
      description={`${target.scope === "section" ? "La sección" : "El elemento"} queda oculto para estudiantes hasta esa fecha y aparece solo, sin enviar notificaciones.`}
      onClose={onCancel}
      title={`Mostrar ${target.title} desde una fecha`}
    >
      <form
        className="page-schedule-form"
        onSubmit={(event) => {
          event.preventDefault();
          const date = new Date(value);
          if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
            setError("Elige una fecha y hora futuras.");
            return;
          }

          onConfirm(date.toISOString());
        }}
      >
        <label>
          Fecha y hora
          <input
            min={localInputValue(new Date())}
            onChange={(event) => setValue(event.target.value)}
            required
            type="datetime-local"
            value={value}
          />
        </label>
        {error && (
          <p className="tool-status bad" role="alert">
            {error}
          </p>
        )}
        <div className="page-form-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            <CalendarBlank aria-hidden="true" size={16} />
            Programar
          </button>
        </div>
      </form>
    </PageDialog>
  );
}

function AddBar({ onAdd, disabled }: { onAdd: (type: FormType) => void; disabled: boolean }) {
  const options: { type: FormType; label: string; icon: Icon }[] = [
    { type: "text", label: "Texto", icon: TextT },
    { type: "file", label: "Archivo", icon: FileArrowUp },
    { type: "link", label: "Enlace", icon: LinkSimple },
    { type: "image", label: "Imagen", icon: ImageSquare },
  ];
  return (
    <div aria-label="Agregar a esta sección" className="page-add-bar" role="group">
      {options.map(({ type, label, icon: Glyph }) => (
        <button disabled={disabled} key={type} onClick={() => onAdd(type)} type="button">
          <Glyph aria-hidden="true" size={17} />
          {label}
        </button>
      ))}
    </div>
  );
}

function handleKeys(
  event: KeyboardEvent<HTMLButtonElement>,
  index: number,
  total: number,
  move: (index: number) => void
) {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  event.preventDefault();
  const next = event.key === "ArrowUp" ? index - 1 : index + 1;
  if (next < 0 || next >= total) return;
  move(next);
}

function EditableItem({
  item,
  index,
  total,
  sectionId,
  sections,
  editing,
  openAttachment,
  onDragEnd,
  onEdit,
  onCancelEdit,
  onSave,
  onMove,
  onMoveToSection,
  onToggleHidden,
  onSchedule,
  onDuplicate,
  onDelete,
}: {
  item: CoursePost;
  index: number;
  total: number;
  sectionId: string;
  sections: readonly PageSectionView[];
  editing: boolean;
  openAttachment: OpenAttachment;
  onDragEnd: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (values: ItemValues) => Promise<boolean>;
  onMove: (index: number) => void;
  onMoveToSection: (sectionId: string) => void;
  onToggleHidden: () => void;
  onSchedule: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();
  const reducedMotion = useHydratedReducedMotion();
  const [lifted, setLifted] = useState(false);
  const [moving, setMoving] = useState(false);
  const name = itemLabel(item);

  return (
    <Reorder.Item
      as="div"
      className="page-item is-editable"
      data-hidden={item.hidden}
      data-lifted={lifted}
      data-type={item.itemType}
      dragControls={controls}
      dragListener={false}
      onDragEnd={() => {
        setLifted(false);
        onDragEnd();
      }}
      onDragStart={() => setLifted(true)}
      transition={reducedMotion ? INSTANT : SPRING}
      value={item.id}
    >
      <button
        aria-label={`Mover ${name}. Usa las flechas arriba y abajo para reordenar.`}
        className="page-handle"
        onKeyDown={(event) => handleKeys(event, index, total, onMove)}
        onPointerDown={(event) => controls.start(event)}
        type="button"
      >
        <DotsSixVertical aria-hidden="true" size={18} weight="bold" />
      </button>
      <div className="page-item-main">
        {editing ? (
          <ItemForm
            initial={{ title: item.title, body: item.body, linkUrl: item.linkUrl ?? "" }}
            onCancel={onCancelEdit}
            onSave={onSave}
            type={item.itemType}
          />
        ) : (
          <>
            <PageItemContent item={item} openAttachment={openAttachment} />
            <VisibilityNote hidden={item.hidden} noun="elemento" publishAt={item.publishAt} />
          </>
        )}
      </div>
      {!editing && (
        <ActionMenu label={`Acciones de ${name}`}>
          {(menuId) =>
            moving ? (
              <>
                <MenuItem icon={ArrowLeft} label="Volver" onSelect={() => setMoving(false)} />
                {sections.map((section) => (
                  <MenuItem
                    disabled={section.id === sectionId}
                    icon={ArrowsDownUp}
                    key={section.id}
                    label={section.title}
                    menuId={menuId}
                    onSelect={() => {
                      setMoving(false);
                      onMoveToSection(section.id);
                    }}
                  />
                ))}
              </>
            ) : (
              <>
                <MenuItem
                  icon={PencilSimple}
                  label="Editar"
                  menuId={menuId}
                  onSelect={() => {
                    onEdit();
                  }}
                />
                {sections.length > 1 && (
                  <MenuItem
                    icon={ArrowsDownUp}
                    label="Mover a otra sección"
                    onSelect={() => setMoving(true)}
                  />
                )}
                <MenuItem
                  icon={item.hidden ? Eye : EyeSlash}
                  label={item.hidden ? "Mostrar a estudiantes" : "Ocultar a estudiantes"}
                  menuId={menuId}
                  onSelect={() => {
                    onToggleHidden();
                  }}
                />
                <MenuItem
                  icon={CalendarBlank}
                  label="Mostrar desde una fecha"
                  menuId={menuId}
                  onSelect={() => {
                    onSchedule();
                  }}
                />
                <MenuItem
                  icon={CopySimple}
                  label="Duplicar"
                  menuId={menuId}
                  onSelect={() => {
                    onDuplicate();
                  }}
                />
                <MenuItem
                  danger
                  icon={Trash}
                  label="Eliminar"
                  menuId={menuId}
                  onSelect={() => {
                    onDelete();
                  }}
                />
              </>
            )
          }
        </ActionMenu>
      )}
    </Reorder.Item>
  );
}

// Implements: REQ-PAGE-01, REQ-PAGE-03, REQ-PAGE-04, REQ-PAGE-05, REQ-PAGE-06, REQ-PAGE-07, REQ-PAGE-10, REQ-PAGE-15
export function CoursePageEditor({
  course,
  classroom,
  teamPage,
  openAttachment,
  onDone,
}: {
  course: Course;
  classroom: ClassroomState;
  teamPage: CoursePage;
  openAttachment: OpenAttachment;
  onDone: (seed: ComposeSeed | null) => void;
}) {
  const reducedMotion = useHydratedReducedMotion();
  const pageRef = useRef(teamPage);
  const historyRef = useRef<UndoHistory>(EMPTY_HISTORY);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<{ sectionId: string; type: "file" | "image" } | null>(null);
  const materialized = useRef(false);
  const [history, setHistory] = useState<UndoHistory>(EMPTY_HISTORY);
  const [pending, setPending] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [preview, setPreview] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [creatingSection, setCreatingSection] = useState<string | null>(
    teamPage.sections.length === 0 ? "" : null
  );
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [added, setAdded] = useState<Added[]>([]);
  const [dragOrder, setDragOrder] = useState<Order | null>(null);
  const [settling, setSettling] = useState<Order | null>(null);
  const [materializeError, setMaterializeError] = useState("");

  useEffect(() => {
    pageRef.current = teamPage;
  }, [teamPage]);

  const ready = classroom.postsStatus === "ready" && classroom.sectionsStatus === "ready";
  const virtualPending = teamPage.sections.some((section) => section.virtual);

  const materialize = useCallback(() => {
    const plan = materializationPlan(pageRef.current);
    if (plan.length === 0) return;
    materialized.current = true;
    setMaterializeError("");
    materializeSections(course.id, plan)
      .then(() =>
        toast.info("Ordenamos el material anterior en secciones según su carpeta de origen.")
      )
      .catch((cause) => {
        materialized.current = false;
        setMaterializeError(messageOf(cause, "No se pudo preparar la página para editar."));
      });
  }, [course.id]);

  useEffect(() => {
    if (!ready || materialized.current || !virtualPending) return;
    materialize();
  }, [materialize, ready, virtualPending]);

  const studentPage = useMemo(
    () =>
      buildCoursePage({
        sections: classroom.sections,
        posts: classroom.posts,
        hiddenItems: [],
        audience: "student",
      }),
    [classroom.posts, classroom.sections]
  );

  const sections = teamPage.sections;

  const findSection = (id: string) => pageRef.current.sections.find((entry) => entry.id === id);
  const requireSection = (id: string) => {
    const section = findSection(id);
    if (!section) throw new Error("La sección ya no existe.");
    return section;
  };
  const findItem = (id: string) => {
    for (const section of pageRef.current.sections) {
      const item = section.items.find((entry) => entry.id === id);
      if (item) return { item, section };
    }
    return null;
  };
  const requireItem = (id: string) => {
    const found = findItem(id);
    if (!found) throw new Error("El elemento ya no existe.");
    return found;
  };

  const perform = useCallback((task: () => Promise<void>, failure: string) => {
    setPending((count) => count + 1);
    const run = queue.current
      .then(task)
      .then(
        () => true,
        (cause) => {
          toast.error(messageOf(cause, failure));
          setSettling(null);
          return false;
        }
      )
      .finally(() => setPending((count) => count - 1));
    queue.current = run.then(() => undefined);
    return run;
  }, []);

  const commit = useCallback(
    (entry: UndoEntry, failure: string) =>
      perform(async () => {
        await entry.redo();
        historyRef.current = recordEntry(historyRef.current, entry);
        setHistory(historyRef.current);
      }, failure),
    [perform]
  );

  const undo = useCallback(
    () =>
      perform(async () => {
        const step = stepBack(historyRef.current);
        if (!step) return;
        await step.entry.undo();
        historyRef.current = step.history;
        setHistory(step.history);
        setAnnouncement(`Se deshizo: ${step.entry.label}.`);
      }, "No se pudo deshacer el último cambio."),
    [perform]
  );

  const redo = useCallback(
    () =>
      perform(async () => {
        const step = stepForward(historyRef.current);
        if (!step) return;
        await step.entry.redo();
        historyRef.current = step.history;
        setHistory(step.history);
        setAnnouncement(`Se rehízo: ${step.entry.label}.`);
      }, "No se pudo rehacer el cambio."),
    [perform]
  );

  const undoSpecific = useCallback(
    (entry: UndoEntry) =>
      perform(async () => {
        await entry.undo();
        historyRef.current = {
          past: historyRef.current.past.filter((candidate) => candidate !== entry),
          future: historyRef.current.future,
        };
        setHistory(historyRef.current);
      }, "No se pudo deshacer."),
    [perform]
  );

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        void undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        void redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo]);

  const offerUndo = (entry: UndoEntry, text: string) =>
    toast.message(text, {
      action: { label: "Deshacer", onClick: () => void undoSpecific(entry) },
    });

  const sectionStub = (id: string, title: string): PageSectionView =>
    findSection(id) ?? {
      id,
      title,
      position: 0,
      hidden: false,
      publishAt: "",
      virtual: false,
      items: [],
    };

  const restoreSection = (id: string, title: string) =>
    restoreTrashEntry(
      course.id,
      {
        id: sectionTrashId(id),
        kind: "section",
        sectionId: id,
        sectionTitle: title,
        placement: "page",
        hidden: false,
      },
      pageRef.current.sections
    );

  const restoreItem = (entry: Pick<TrashEntry, "id" | "sectionId" | "sectionTitle" | "hidden">) =>
    restoreTrashEntry(
      course.id,
      { ...entry, kind: "item", placement: "page" },
      pageRef.current.sections
    );

  const trashItemById = async (id: string) => {
    const found = findItem(id);
    if (found) await trashItems(course.id, [found.item], found.section.title);
  };

  const createSection = (title: string, afterId: string) => {
    const list = pageRef.current.sections;
    const index = afterId ? list.findIndex((entry) => entry.id === afterId) : list.length - 1;
    const position = positionBetween(list[index]?.position, list[index + 1]?.position);
    let id = "";
    void commit(
      {
        label: `crear la sección «${title}»`,
        redo: async () => {
          if (id) {
            await restoreSection(id, title);
            return;
          }

          id = await createPageSection(course.id, { title, position });
        },
        undo: async () => {
          const section = sectionStub(id, title);
          await trashSection(course.id, section, section.items);
        },
      },
      "No se pudo crear la sección."
    );
  };

  const renameSection = (id: string, title: string) => {
    const previous = requireSection(id).title;
    if (previous === title) return;
    void commit(
      {
        label: "cambiar el nombre de la sección",
        redo: () => updatePageSection(course.id, id, { title }),
        undo: () => updatePageSection(course.id, id, { title: previous }),
      },
      "No se pudo cambiar el nombre."
    );
  };

  const moveSection = (id: string, index: number) => {
    const list = pageRef.current.sections;
    const previous = new Map(list.map((section) => [section.id, section.position]));
    const position = positionForIndex(list, id, index);
    const order = moveId(
      list.map((section) => section.id),
      id,
      index
    );
    const next = position === null ? renumber(order) : new Map([[id, position]]);
    setSettling({ scope: "sections", ids: order });
    void commit(
      {
        label: "mover la sección",
        redo: () =>
          Promise.all(
            [...next].map(([sectionId, value]) =>
              updatePageSection(course.id, sectionId, { position: value })
            )
          ).then(() => undefined),
        undo: () =>
          Promise.all(
            [...next.keys()].map((sectionId) =>
              updatePageSection(course.id, sectionId, {
                position: previous.get(sectionId) ?? 0,
              })
            )
          ).then(() => undefined),
      },
      "No se pudo mover la sección."
    );
  };

  const placeItem = (
    itemId: string,
    target: { sectionId: string; position: number; hidden: boolean; publishAt: string }
  ) => {
    const { item } = requireItem(itemId);
    const section = requireSection(target.sectionId);
    return placePageItem(course.id, item, {
      ...target,
      sectionTitle: section.title,
      sectionHidden: section.hidden,
    });
  };

  const moveItem = (itemId: string, sectionId: string, index: number) => {
    const { item, section: origin } = requireItem(itemId);
    const target = requireSection(sectionId);
    const before = {
      sectionId: origin.id,
      position: item.position,
      hidden: item.hidden,
      publishAt: item.publishAt,
    };
    const fits = positionForIndex(target.items, itemId, index);
    const renumbered =
      fits === null
        ? renumber(target.items.filter((entry) => entry.id !== itemId).map((entry) => entry.id))
        : null;
    const spaced = renumbered ? [...renumbered.values()] : [];
    const position = fits ?? positionBetween(spaced[index - 1], spaced[index]);
    const after = { ...before, sectionId, position };
    if (sectionId === origin.id)
      setSettling({
        scope: sectionId,
        ids: moveId(
          origin.items.map((entry) => entry.id),
          itemId,
          index
        ),
      });
    void commit(
      {
        label: sectionId === origin.id ? "mover el elemento" : `mover a «${target.title}»`,
        redo: async () => {
          if (renumbered) {
            for (const [id, value] of renumbered) {
              const found = findItem(id);
              if (found)
                await placeItem(id, {
                  sectionId,
                  position: value,
                  hidden: found.item.hidden,
                  publishAt: found.item.publishAt,
                });
            }
          }
          await placeItem(itemId, after);
        },
        undo: () => placeItem(itemId, before),
      },
      "No se pudo mover el elemento."
    );
  };

  const setItemVisibility = (itemId: string, hidden: boolean, publishAt: string) => {
    const { item, section } = requireItem(itemId);
    const keep = { sectionId: section.id, position: item.position };
    const before = { ...keep, hidden: item.hidden, publishAt: item.publishAt };
    void commit(
      {
        label: hidden ? `ocultar ${itemLabel(item)}` : `mostrar ${itemLabel(item)}`,
        redo: () => placeItem(itemId, { ...keep, hidden, publishAt }),
        undo: () => placeItem(itemId, before),
      },
      "No se pudo cambiar la visibilidad."
    );
  };

  const setSectionHidden = (sectionId: string, hidden: boolean, publishAt: string) => {
    const section = requireSection(sectionId);
    const before = { hidden: section.hidden, publishAt: section.publishAt };
    const apply = (state: { hidden: boolean; publishAt: string }) => async () => {
      const current = requireSection(sectionId);
      await setSectionVisibility(course.id, current, current.items, state);
    };
    void commit(
      {
        label: hidden ? `ocultar la sección «${section.title}»` : `mostrar «${section.title}»`,
        redo: apply({ hidden, publishAt }),
        undo: apply(before),
      },
      "No se pudo cambiar la visibilidad de la sección."
    );
  };

  const duplicateItem = (itemId: string) => {
    const { item, section } = requireItem(itemId);
    const index = section.items.findIndex((entry) => entry.id === itemId);
    const position = positionBetween(item.position, section.items[index + 1]?.position);
    let copy = "";
    void commit(
      {
        label: `duplicar ${itemLabel(item)}`,
        redo: async () => {
          if (copy) {
            await restoreItem({
              id: copy,
              sectionId: section.id,
              sectionTitle: section.title,
              hidden: item.hidden,
            });
            return;
          }

          const current = requireItem(itemId);
          const created = await duplicatePageItem(course.id, current.item, {
            sectionId: section.id,
            sectionTitle: section.title,
            position,
            hidden: current.item.hidden,
            publishAt: current.item.publishAt,
            sectionHidden: current.section.hidden,
          });
          copy = created.id;
        },
        undo: () => trashItemById(copy),
      },
      "No se pudo duplicar el elemento."
    );
  };

  const duplicateSection = (sectionId: string) => {
    const source = requireSection(sectionId);
    const list = pageRef.current.sections;
    const index = list.findIndex((entry) => entry.id === sectionId);
    const position = positionBetween(source.position, list[index + 1]?.position);
    const title = copyTitle(source.title).slice(0, SECTION_TITLE_MAX);
    let id = "";
    void commit(
      {
        label: `duplicar la sección «${source.title}»`,
        redo: async () => {
          if (id) {
            await restoreSection(id, title);
            return;
          }

          id = await createPageSection(course.id, { title, position, hidden: source.hidden });
          for (const item of requireSection(sectionId).items) {
            await duplicatePageItem(
              course.id,
              item,
              {
                sectionId: id,
                sectionTitle: title,
                position: item.position,
                hidden: item.hidden,
                publishAt: item.publishAt,
                sectionHidden: source.hidden,
              },
              false
            );
          }
        },
        undo: async () => {
          const section = sectionStub(id, title);
          await trashSection(course.id, section, section.items);
        },
      },
      "No se pudo duplicar la sección."
    );
  };

  const deleteItem = (itemId: string) => {
    const { item, section } = requireItem(itemId);
    const reference = {
      id: item.id,
      sectionId: section.id,
      sectionTitle: section.title,
      hidden: item.hidden,
    };
    const entry: UndoEntry = {
      label: `eliminar ${itemLabel(item)}`,
      redo: () => trashItemById(itemId),
      undo: () => restoreItem(reference),
    };
    void commit(entry, "No se pudo eliminar el elemento.").then((done) => {
      if (done) offerUndo(entry, `${capitalize(itemLabel(item))} se movió a la papelera.`);
    });
  };

  const deleteSection = (sectionId: string) => {
    const section = requireSection(sectionId);
    const entry: UndoEntry = {
      label: `eliminar la sección «${section.title}»`,
      redo: async () => {
        const current = requireSection(sectionId);
        await trashSection(course.id, current, current.items);
      },
      undo: () => restoreSection(sectionId, section.title),
    };
    void commit(entry, "No se pudo eliminar la sección.").then((done) => {
      if (!done) return;
      const count = section.items.length;
      offerUndo(
        entry,
        count > 0
          ? `La sección «${section.title}» y sus ${count} elementos se movieron a la papelera.`
          : `La sección «${section.title}» se movió a la papelera.`
      );
    });
  };

  const createItem = (
    sectionId: string,
    draft: { itemType: PageItemType; title: string; body: string; linkUrl: string },
    attachments: ClassroomAttachment[] = []
  ) => {
    let id = "";
    const summary = draft.title || displayName(attachments[0]?.name ?? "") || "Texto";
    return commit(
      {
        label: `agregar «${summary}»`,
        redo: async () => {
          const section = requireSection(sectionId);
          if (id) {
            await restoreItem({ id, sectionId, sectionTitle: section.title, hidden: false });
          } else {
            id = await createPageItem(course.id, {
              ...draft,
              attachments,
              sectionId,
              sectionTitle: section.title,
              position: positionBetween(section.items.at(-1)?.position, undefined),
              location: locationFor(false, section.hidden),
            });
          }

          if (!section.hidden)
            setAdded((list) => [
              ...list.filter((entry) => entry.id !== id),
              { id, sectionTitle: section.title, title: summary },
            ]);
        },
        undo: async () => {
          await trashItemById(id);
          setAdded((list) => list.filter((entry) => entry.id !== id));
        },
      },
      "No se pudo agregar el elemento."
    );
  };

  const saveItem = async (itemId: string, values: ItemValues) => {
    const { item } = requireItem(itemId);
    const before: ItemValues = {
      title: item.title,
      body: item.body,
      linkUrl: item.linkUrl ?? "",
    };
    const patchFor = (state: ItemValues) => ({
      title: state.title,
      ...(item.itemType === "text" ? { body: state.body } : {}),
      ...(item.itemType === "link" ? { linkUrl: state.linkUrl } : {}),
    });
    const saved = await commit(
      {
        label: `editar ${itemLabel(item)}`,
        redo: async () => updatePageItem(course.id, requireItem(itemId).item, patchFor(values)),
        undo: async () => updatePageItem(course.id, requireItem(itemId).item, patchFor(before)),
      },
      "No se pudo guardar el cambio."
    );
    if (saved) setEditing(null);
    return saved;
  };

  const upload = async (sectionId: string, files: File[], forceImage: boolean) => {
    for (const file of files) {
      const key = crypto.randomUUID();
      setUploads((list) => [...list, { key, sectionId, name: file.name, percent: 0 }]);
      try {
        const attachment = await uploadPostAttachment(course.id, file, (percent) =>
          setUploads((list) =>
            list.map((entry) => (entry.key === key ? { ...entry, percent } : entry))
          )
        );
        const image = forceImage || attachment.contentType.startsWith("image/");
        await createItem(
          sectionId,
          {
            itemType: image ? "image" : "file",
            title: displayName(file.name),
            body: "",
            linkUrl: "",
          },
          [attachment]
        );
      } catch (cause) {
        toast.error(
          `No se pudo subir ${file.name}. ${messageOf(cause, "Revisa el tamaño (hasta 50 MB) y el tipo de archivo.")}`
        );
      } finally {
        setUploads((list) => list.filter((entry) => entry.key !== key));
      }
    }
  };

  const startAdd = (sectionId: string, type: FormType) => {
    if (type === "text" || type === "link") {
      setEditing({ kind: "new", sectionId, type });
      return;
    }

    uploadTarget.current = { sectionId, type };
    const input = fileInput.current;
    if (!input) return;
    input.accept = type === "image" ? IMAGE_ACCEPT : FILE_ACCEPT;
    input.click();
  };

  const finishDrag = (scope: string) => {
    const draft = dragOrder;
    setDragOrder(null);
    if (!draft || draft.scope !== scope) return;
    const server =
      scope === "sections"
        ? sections.map((section) => section.id)
        : (findSection(scope)?.items.map((item) => item.id) ?? []);
    const moved = movedEntry(server, draft.ids);
    if (!moved) return;
    if (scope === "sections") moveSection(moved.id, moved.index);
    else moveItem(moved.id, scope, moved.index);
  };

  const orderFor = (scope: string, server: string[]) => {
    if (dragOrder?.scope === scope) return dragOrder.ids;
    if (settling?.scope === scope && !sameOrder(settling.ids, server)) return settling.ids;
    return server;
  };

  const settledOrder =
    settling &&
    (settling.scope === "sections"
      ? teamPage.sections.map((section) => section.id)
      : (teamPage.sections
          .find((section) => section.id === settling.scope)
          ?.items.map((item) => item.id) ?? []));
  if (settling && settledOrder && sameOrder(settledOrder, settling.ids)) setSettling(null);

  const finish = () => {
    if (pending > 0 || uploads.length > 0) {
      toast.info("Espera a que terminen de guardarse los cambios.");
      return;
    }

    if (added.length === 0) {
      onDone(null);
      return;
    }

    setAnnounceOpen(true);
  };

  const onDrop = (sectionId: string) => (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDropTarget(null);
    void upload(sectionId, [...event.dataTransfer.files], false);
  };

  const sectionIds = orderFor(
    "sections",
    sections.map((section) => section.id)
  );
  const orderedSections = sectionIds
    .map((id) => sections.find((section) => section.id === id))
    .filter((section): section is PageSectionView => Boolean(section));

  return (
    <section aria-label="Editar la página del ramo" className="course-page is-editing">
      <div aria-label="Edición de la página" className="page-edit-bar" role="toolbar">
        <p className="page-edit-status">
          <PencilSimpleLine aria-hidden="true" size={18} />
          <strong>Editando la página</strong>
          <span aria-live="polite" className="page-edit-saving">
            {pending > 0 ? "Guardando…" : "Todo guardado"}
          </span>
        </p>
        <div className="page-edit-actions">
          <button
            aria-label="Deshacer"
            className="page-tool"
            disabled={history.past.length === 0}
            onClick={() => void undo()}
            title="Deshacer (Ctrl+Z)"
            type="button"
          >
            <ArrowCounterClockwise aria-hidden="true" size={18} />
          </button>
          <button
            aria-label="Rehacer"
            className="page-tool"
            disabled={history.future.length === 0}
            onClick={() => void redo()}
            title="Rehacer (Ctrl+Shift+Z)"
            type="button"
          >
            <ArrowClockwise aria-hidden="true" size={18} />
          </button>
          <button
            aria-pressed={preview}
            className="page-bar-button"
            onClick={() => setPreview((value) => !value)}
            type="button"
          >
            <Eye aria-hidden="true" size={17} />
            <span>Vista de estudiante</span>
          </button>
          <button className="page-bar-button" onClick={() => setTrashOpen(true)} type="button">
            <Trash aria-hidden="true" size={17} />
            <span>Papelera</span>
          </button>
          <button className="primary-button" onClick={finish} type="button">
            <Check aria-hidden="true" size={16} weight="bold" />
            Listo
          </button>
        </div>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      <input
        aria-hidden="true"
        className="sr-only"
        multiple
        onChange={(event) => {
          const target = uploadTarget.current;
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (target && files.length > 0)
            void upload(target.sectionId, files, target.type === "image");
        }}
        ref={fileInput}
        tabIndex={-1}
        type="file"
      />

      {preview ? (
        <div className="page-preview">
          <p className="page-notice">
            <Eye aria-hidden="true" size={18} />
            <span>Así ven la página los estudiantes. Lo oculto y lo programado no aparece.</span>
          </p>
          {studentPage.sections.length === 0 ? (
            <p className="page-section-empty">Los estudiantes todavía no ven contenido.</p>
          ) : (
            <PageSectionsView
              courseId={course.id}
              openAttachment={openAttachment}
              sections={studentPage.sections}
            />
          )}
        </div>
      ) : !ready || virtualPending ? (
        <div className="page-notice" role="status">
          {materializeError ? (
            <>
              <span>{materializeError}</span>
              <button className="secondary-button" onClick={materialize} type="button">
                Reintentar
              </button>
            </>
          ) : (
            <span>Preparando la página para editar…</span>
          )}
        </div>
      ) : (
        <>
          <Reorder.Group
            as="div"
            axis="y"
            className="page-sections"
            onReorder={(ids: string[]) => setDragOrder({ scope: "sections", ids })}
            values={sectionIds}
          >
            {orderedSections.map((section, sectionIndex) => (
              <EditableSection
                creatingAfter={creatingSection === section.id}
                dropActive={dropTarget === section.id}
                editing={editing}
                index={sectionIndex}
                key={section.id}
                onAdd={(type) => startAdd(section.id, type)}
                onCancelCreate={() => setCreatingSection(null)}
                onCreateAfter={() => setCreatingSection(section.id)}
                onCreateSection={(title) => {
                  setCreatingSection(null);
                  createSection(title, section.id);
                }}
                onDelete={() => deleteSection(section.id)}
                onDragEnd={() => finishDrag("sections")}
                onDragLeave={() => setDropTarget(null)}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes("Files")) return;
                  event.preventDefault();
                  setDropTarget(section.id);
                }}
                onDrop={onDrop(section.id)}
                onDuplicate={() => duplicateSection(section.id)}
                onMove={(index) => moveSection(section.id, index)}
                onRename={(title) => {
                  setRenaming(null);
                  renameSection(section.id, title);
                }}
                onSchedule={() =>
                  setSchedule({
                    scope: "section",
                    id: section.id,
                    title: `«${section.title}»`,
                  })
                }
                onStartRename={() => setRenaming(section.id)}
                onStopRename={() => setRenaming(null)}
                onToggleHidden={() => setSectionHidden(section.id, !section.hidden, "")}
                reducedMotion={reducedMotion}
                renaming={renaming === section.id}
                section={section}
                total={orderedSections.length}
                uploads={uploads.filter((entry) => entry.sectionId === section.id)}
              >
                <Reorder.Group
                  as="div"
                  axis="y"
                  className="page-section-items"
                  onReorder={(ids: string[]) => setDragOrder({ scope: section.id, ids })}
                  values={orderFor(
                    section.id,
                    section.items.map((item) => item.id)
                  )}
                >
                  {orderFor(
                    section.id,
                    section.items.map((item) => item.id)
                  )
                    .map((id) => section.items.find((item) => item.id === id))
                    .filter((item): item is CoursePost => Boolean(item))
                    .map((item, itemIndex) => (
                      <EditableItem
                        editing={editing?.kind === "edit" && editing.itemId === item.id}
                        index={itemIndex}
                        item={item}
                        key={item.id}
                        onCancelEdit={() => setEditing(null)}
                        onDelete={() => deleteItem(item.id)}
                        onDragEnd={() => finishDrag(section.id)}
                        onDuplicate={() => duplicateItem(item.id)}
                        onEdit={() => setEditing({ kind: "edit", itemId: item.id })}
                        onMove={(index) => moveItem(item.id, section.id, index)}
                        onMoveToSection={(targetId) =>
                          moveItem(item.id, targetId, findSection(targetId)?.items.length ?? 0)
                        }
                        onSave={(values) => saveItem(item.id, values)}
                        onSchedule={() =>
                          setSchedule({ scope: "item", id: item.id, title: itemLabel(item) })
                        }
                        onToggleHidden={() => setItemVisibility(item.id, !item.hidden, "")}
                        openAttachment={openAttachment}
                        sectionId={section.id}
                        sections={sections}
                        total={section.items.length}
                      />
                    ))}
                </Reorder.Group>
                {editing?.kind === "new" && editing.sectionId === section.id && (
                  <div className="page-item is-draft">
                    <ItemForm
                      initial={{ title: "", body: "", linkUrl: "" }}
                      onCancel={() => setEditing(null)}
                      onSave={async (values) => {
                        const saved = await createItem(section.id, {
                          itemType: editing.type,
                          ...values,
                        });
                        if (saved) setEditing(null);
                        return saved;
                      }}
                      type={editing.type}
                    />
                  </div>
                )}
              </EditableSection>
            ))}
          </Reorder.Group>
          {creatingSection === "" ? (
            <SectionNameForm
              initial=""
              onCancel={() => setCreatingSection(null)}
              onSubmit={(title) => {
                setCreatingSection(null);
                createSection(title, "");
              }}
              submitLabel="Crear sección"
            />
          ) : (
            <button
              className="page-add-section"
              onClick={() => setCreatingSection("")}
              type="button"
            >
              <Plus aria-hidden="true" size={18} weight="bold" />
              Agregar sección
            </button>
          )}
        </>
      )}

      {schedule && (
        <ScheduleDialog
          onCancel={() => setSchedule(null)}
          onConfirm={(iso) => {
            if (schedule.scope === "section") setSectionHidden(schedule.id, true, iso);
            else setItemVisibility(schedule.id, true, iso);
            setSchedule(null);
          }}
          target={schedule}
        />
      )}

      {trashOpen && (
        <CourseTrashDialog
          courseId={course.id}
          onClose={() => setTrashOpen(false)}
          sections={sections}
        />
      )}

      {announceOpen && (
        <PublishConfirmDialog
          cancelLabel="Ahora no"
          confirmLabel="Redactar aviso"
          message={
            <>
              <p>
                Agregaste{" "}
                {added.length === 1 ? "un elemento visible" : `${added.length} elementos visibles`}{" "}
                a la página. La página no envía notificaciones por sí sola.
              </p>
              <ul className="page-added-list">
                {added.slice(0, 6).map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.sectionTitle}</strong> · {entry.title}
                  </li>
                ))}
              </ul>
            </>
          }
          note="Puedes revisar el aviso antes de enviarlo y elegir si alerta al curso."
          onCancel={() => {
            setAnnounceOpen(false);
            onDone(null);
          }}
          onConfirm={() => {
            setAnnounceOpen(false);
            onDone(announcementDraftFor(added));
          }}
          title="¿Avisar al curso del material nuevo?"
        />
      )}
    </section>
  );
}

function EditableSection({
  section,
  index,
  total,
  renaming,
  creatingAfter,
  editing,
  dropActive,
  uploads,
  reducedMotion,
  children,
  onDragEnd,
  onMove,
  onStartRename,
  onStopRename,
  onRename,
  onToggleHidden,
  onSchedule,
  onDuplicate,
  onDelete,
  onAdd,
  onCreateAfter,
  onCreateSection,
  onCancelCreate,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  section: PageSectionView;
  index: number;
  total: number;
  renaming: boolean;
  creatingAfter: boolean;
  editing: Editing;
  dropActive: boolean;
  uploads: Upload[];
  reducedMotion: boolean;
  children: ReactNode;
  onDragEnd: () => void;
  onMove: (index: number) => void;
  onStartRename: () => void;
  onStopRename: () => void;
  onRename: (title: string) => void;
  onToggleHidden: () => void;
  onSchedule: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAdd: (type: FormType) => void;
  onCreateAfter: () => void;
  onCreateSection: (title: string) => void;
  onCancelCreate: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  const controls = useDragControls();
  const [lifted, setLifted] = useState(false);
  const anchor = sectionAnchor(section.id);
  const busy = editing?.kind === "new" && editing.sectionId === section.id;

  return (
    <>
      <Reorder.Item
        aria-labelledby={`${anchor}-title`}
        as="section"
        className="page-section is-editable"
        data-drop={dropActive}
        data-hidden={section.hidden}
        data-lifted={lifted}
        dragControls={controls}
        dragListener={false}
        id={anchor}
        onDragEnd={() => {
          setLifted(false);
          onDragEnd();
        }}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDragStart={() => setLifted(true)}
        onDrop={onDrop}
        transition={reducedMotion ? INSTANT : SPRING}
        value={section.id}
      >
        <header className="page-section-head">
          <button
            aria-label={`Mover la sección «${section.title}». Usa las flechas arriba y abajo para reordenar.`}
            className="page-handle"
            onKeyDown={(event) => handleKeys(event, index, total, onMove)}
            onPointerDown={(event) => controls.start(event)}
            type="button"
          >
            <DotsSixVertical aria-hidden="true" size={18} weight="bold" />
          </button>
          {renaming ? (
            <SectionNameForm
              initial={section.title}
              onCancel={onStopRename}
              onSubmit={onRename}
              submitLabel="Guardar"
            />
          ) : (
            <h2 id={`${anchor}-title`}>
              <button className="page-section-rename" onClick={onStartRename} type="button">
                <span aria-hidden="true" className="page-section-mark" />
                <span className="page-section-title">{section.title}</span>
                <PencilSimple aria-hidden="true" className="page-section-pencil" size={15} />
                <span className="sr-only">Cambiar nombre</span>
              </button>
            </h2>
          )}
          {!renaming && (
            <ActionMenu label={`Acciones de la sección «${section.title}»`}>
              {(menuId) => (
                <>
                  <MenuItem
                    icon={PencilSimple}
                    label="Cambiar nombre"
                    menuId={menuId}
                    onSelect={() => {
                      onStartRename();
                    }}
                  />
                  <MenuItem
                    icon={section.hidden ? Eye : EyeSlash}
                    label={section.hidden ? "Mostrar a estudiantes" : "Ocultar a estudiantes"}
                    menuId={menuId}
                    onSelect={() => {
                      onToggleHidden();
                    }}
                  />
                  <MenuItem
                    icon={CalendarBlank}
                    label="Mostrar desde una fecha"
                    menuId={menuId}
                    onSelect={() => {
                      onSchedule();
                    }}
                  />
                  <MenuItem
                    disabled={index === 0}
                    icon={ArrowUp}
                    label="Subir"
                    menuId={menuId}
                    onSelect={() => {
                      onMove(index - 1);
                    }}
                  />
                  <MenuItem
                    disabled={index === total - 1}
                    icon={ArrowDown}
                    label="Bajar"
                    menuId={menuId}
                    onSelect={() => {
                      onMove(index + 1);
                    }}
                  />
                  <MenuItem
                    icon={Plus}
                    label="Agregar sección debajo"
                    menuId={menuId}
                    onSelect={() => {
                      onCreateAfter();
                    }}
                  />
                  <MenuItem
                    icon={CopySimple}
                    label="Duplicar sección"
                    menuId={menuId}
                    onSelect={() => {
                      onDuplicate();
                    }}
                  />
                  <MenuItem
                    danger
                    icon={Trash}
                    label="Eliminar sección"
                    menuId={menuId}
                    onSelect={() => {
                      onDelete();
                    }}
                  />
                </>
              )}
            </ActionMenu>
          )}
          <VisibilityNote hidden={section.hidden} noun="sección" publishAt={section.publishAt} />
        </header>
        <div className="page-section-body">
          {section.items.length === 0 && !busy && uploads.length === 0 && (
            <p className="page-section-empty">
              Sección vacía. Agrega contenido con los botones de abajo o arrastra archivos aquí.
            </p>
          )}
          {children}
          {uploads.map((entry) => (
            <div className="page-upload" key={entry.key} role="status">
              <span>
                Subiendo <strong>{entry.name}</strong>
              </span>
              <progress aria-label={`Progreso de ${entry.name}`} max={100} value={entry.percent} />
            </div>
          ))}
          <AddBar disabled={busy} onAdd={onAdd} />
        </div>
      </Reorder.Item>
      {creatingAfter && (
        <SectionNameForm
          initial=""
          onCancel={onCancelCreate}
          onSubmit={onCreateSection}
          submitLabel="Crear sección"
        />
      )}
    </>
  );
}
