"use client";

import {
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
import { type ClassroomState, type CoursePost } from "../../../lib/firebase-classroom-client";
import {
  ITEM_TITLE_MAX,
  SECTION_TITLE_MAX,
  announcementDraftFor,
  buildCoursePage,
  cleanLink,
  movedEntry,
  pageErrorText,
  sectionAnchor,
  type CoursePage,
  type PageItemType,
  type PageSectionView,
} from "../../../lib/course-page";
import { useHydratedReducedMotion } from "../../../lib/hooks/use-hydrated-reduced-motion";
import { persistDefaultEditor, readDefaultEditor } from "../../../lib/publication-workflow";
import { toast } from "../../../lib/toast";
import { PageSectionsView, type ComposeSeed } from "./CoursePage";
import { PageItemContent, VisibilityNote, type OpenAttachment } from "./CoursePageItems";
import { CourseTrashDialog } from "./CourseTrashDialog";
import { PageDialog } from "./PageDialog";
import { PublishConfirmDialog } from "./PublishPanels";
import { RichPostEditor } from "./RichPostEditor";
import {
  itemLabel,
  arrangePage,
  usePageEditing,
  type Added,
  type ItemValues,
  type Order,
  type Upload,
} from "./use-page-editing";

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

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function carriesFiles(event: DragEvent) {
  return event.dataTransfer.types.includes("Files");
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
        setError(pageErrorText(cause, "Revisa la dirección del enlace."));
        return;
      }
    }

    setSaving(true);
    try {
      const saved = await onSave(values);
      if (!saved) setError("No se pudo guardar. Revisa tu conexión y vuelve a intentarlo.");
    } finally {
      setSaving(false);
    }
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
  const [earliest] = useState(() => localInputValue(new Date()));
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
            min={earliest}
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
// Implements: REQ-PAGE-03, REQ-PAGE-07
function EditBar({
  announcement,
  canUndo,
  canRedo,
  pending,
  preview,
  onUndo,
  onRedo,
  onTogglePreview,
  onOpenTrash,
  onFinish,
}: {
  announcement: string;
  canUndo: boolean;
  canRedo: boolean;
  pending: boolean;
  preview: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreview: () => void;
  onOpenTrash: () => void;
  onFinish: () => void;
}) {
  return (
    <div aria-label="Edición de la página" className="page-edit-bar" role="toolbar">
      <p className="page-edit-status">
        <PencilSimpleLine aria-hidden="true" size={18} />
        <strong>Editando la página</strong>
        <span aria-live="polite" className="page-edit-saving">
          {pending ? "Guardando…" : "Todo guardado"}
        </span>
      </p>
      <div className="page-edit-actions">
        <button
          aria-label="Deshacer"
          className="page-tool"
          disabled={!canUndo}
          onClick={onUndo}
          title="Deshacer (Ctrl+Z)"
          type="button"
        >
          <ArrowCounterClockwise aria-hidden="true" size={18} />
        </button>
        <button
          aria-label="Rehacer"
          className="page-tool"
          disabled={!canRedo}
          onClick={onRedo}
          title="Rehacer (Ctrl+Shift+Z)"
          type="button"
        >
          <ArrowClockwise aria-hidden="true" size={18} />
        </button>
        <button
          aria-pressed={preview}
          className="page-bar-button"
          onClick={onTogglePreview}
          type="button"
        >
          <Eye aria-hidden="true" size={17} />
          <span>Vista de estudiante</span>
        </button>
        <button className="page-bar-button" onClick={onOpenTrash} type="button">
          <Trash aria-hidden="true" size={17} />
          <span>Papelera</span>
        </button>
        <button className="primary-button" onClick={onFinish} type="button">
          <Check aria-hidden="true" size={16} weight="bold" />
          Listo
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

// Implements: REQ-PAGE-10
function AnnounceDialog({
  added,
  onSkip,
  onCompose,
}: {
  added: readonly Added[];
  onSkip: () => void;
  onCompose: () => void;
}) {
  return (
    <PublishConfirmDialog
      cancelLabel="Ahora no"
      confirmLabel="Redactar aviso"
      message={
        <>
          <p>
            Agregaste{" "}
            {added.length === 1 ? "un elemento visible" : `${added.length} elementos visibles`} a la
            página. La página no envía notificaciones por sí sola.
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
      onCancel={onSkip}
      onConfirm={onCompose}
      title="¿Avisar al curso del material nuevo?"
    />
  );
}

type ItemActions = {
  remove: (itemId: string) => void;
  duplicate: (itemId: string) => void;
  move: (itemId: string, sectionId: string, index: number) => void;
  moveToSection: (itemId: string, targetId: string) => void;
  save: (itemId: string, values: ItemValues) => Promise<boolean>;
  toggleHidden: (item: CoursePost) => void;
  schedule: (item: CoursePost) => void;
  create: (sectionId: string, draft: { itemType: PageItemType } & ItemValues) => Promise<boolean>;
};

// Implements: REQ-PAGE-03, REQ-PAGE-05
function StudentPreview({
  classroom,
  courseId,
  openAttachment,
}: {
  classroom: ClassroomState;
  courseId: string;
  openAttachment: OpenAttachment;
}) {
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

  return (
    <div className="page-preview">
      <p className="page-notice">
        <Eye aria-hidden="true" size={18} />
        <span>Así ven la página los estudiantes. Lo oculto y lo programado no aparece.</span>
      </p>
      {studentPage.sections.length === 0 ? (
        <p className="page-section-empty">Los estudiantes todavía no ven contenido.</p>
      ) : (
        <PageSectionsView
          courseId={courseId}
          openAttachment={openAttachment}
          sections={studentPage.sections}
        />
      )}
    </div>
  );
}

// Implements: REQ-PAGE-11
function PreparingNotice({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="page-notice" role="status">
      {error ? (
        <>
          <span>{error}</span>
          <button className="secondary-button" onClick={onRetry} type="button">
            Reintentar
          </button>
        </>
      ) : (
        <span>Preparando la página para editar…</span>
      )}
    </div>
  );
}

// Implements: REQ-PAGE-01
function AddSection({
  creating,
  onCreate,
  onToggle,
}: {
  creating: boolean;
  onCreate: (title: string) => void;
  onToggle: (open: boolean) => void;
}) {
  if (creating) {
    return (
      <SectionNameForm
        initial=""
        onCancel={() => onToggle(false)}
        onSubmit={onCreate}
        submitLabel="Crear sección"
      />
    );
  }

  return (
    <button className="page-add-section" onClick={() => onToggle(true)} type="button">
      <Plus aria-hidden="true" size={18} weight="bold" />
      Agregar sección
    </button>
  );
}

// Implements: REQ-PAGE-02, REQ-PAGE-04
function SectionItems({
  section,
  ids,
  itemsById,
  sections,
  editing,
  actions,
  openAttachment,
  onEditingChange,
  onReorder,
  onDragEnd,
}: {
  section: PageSectionView;
  ids: string[];
  itemsById: ReadonlyMap<string, CoursePost>;
  sections: readonly PageSectionView[];
  editing: Editing;
  actions: ItemActions;
  openAttachment: OpenAttachment;
  onEditingChange: (value: Editing) => void;
  onReorder: (ids: string[]) => void;
  onDragEnd: () => void;
}) {
  return (
    <>
      <Reorder.Group
        as="div"
        axis="y"
        className="page-section-items"
        onReorder={onReorder}
        values={ids}
      >
        {ids
          .map((id) => itemsById.get(id))
          .filter((item): item is CoursePost => Boolean(item))
          .map((item, itemIndex) => (
            <EditableItem
              editing={editing?.kind === "edit" && editing.itemId === item.id}
              index={itemIndex}
              item={item}
              key={item.id}
              onCancelEdit={() => onEditingChange(null)}
              onDelete={() => actions.remove(item.id)}
              onDragEnd={onDragEnd}
              onDuplicate={() => actions.duplicate(item.id)}
              onEdit={() => onEditingChange({ kind: "edit", itemId: item.id })}
              onMove={(index) => actions.move(item.id, section.id, index)}
              onMoveToSection={(targetId) => actions.moveToSection(item.id, targetId)}
              onSave={(values) => actions.save(item.id, values)}
              onSchedule={() => actions.schedule(item)}
              onToggleHidden={() => actions.toggleHidden(item)}
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
            onCancel={() => onEditingChange(null)}
            onSave={async (values) => {
              const saved = await actions.create(section.id, {
                itemType: editing.type,
                ...values,
              });
              if (saved) onEditingChange(null);
              return saved;
            }}
            type={editing.type}
          />
        </div>
      )}
    </>
  );
}

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
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<{ sectionId: string; type: "file" | "image" } | null>(null);
  const [preview, setPreview] = useState(false);
  const [editing, setEditing] = useState<Editing>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [creatingSection, setCreatingSection] = useState<string | null>();
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [dragOrder, setDragOrder] = useState<Order | null>(null);

  const {
    history,
    pending,
    announcement,
    undo,
    redo,
    ready,
    virtualPending,
    materializeError,
    materialize,
    settling,
    added,
    uploads,
    findSection,
    createSection,
    renameSection,
    moveSection,
    moveItem,
    setItemVisibility,
    setSectionHidden,
    duplicateItem,
    duplicateSection,
    deleteItem,
    deleteSection,
    createItem,
    updateItem,
    upload,
  } = usePageEditing({ courseId: course.id, classroom, teamPage });

  const saveItem = async (itemId: string, values: ItemValues) => {
    const saved = await updateItem(itemId, values);
    if (saved) setEditing(null);
    return saved;
  };

  const itemActions: ItemActions = {
    remove: deleteItem,
    duplicate: duplicateItem,
    move: moveItem,
    moveToSection: (itemId, targetId) =>
      moveItem(itemId, targetId, findSection(targetId)?.items.length ?? 0),
    save: saveItem,
    toggleHidden: (item) => setItemVisibility(item.id, !item.hidden, ""),
    schedule: (item) => setSchedule({ scope: "item", id: item.id, title: itemLabel(item) }),
    create: createItem,
  };

  const sections = teamPage.sections;

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
    if (!carriesFiles(event)) return;
    event.preventDefault();
    setDropTarget(null);
    void upload(sectionId, [...event.dataTransfer.files], false);
  };

  const { orderFor, sectionIds, itemsById, orderedSections } = arrangePage(
    sections,
    dragOrder,
    settling
  );

  return (
    <section aria-label="Editar la página del ramo" className="course-page is-editing">
      <EditBar
        announcement={announcement}
        canRedo={history.future.length > 0}
        canUndo={history.past.length > 0}
        onFinish={finish}
        onOpenTrash={() => setTrashOpen(true)}
        onRedo={() => void redo()}
        onTogglePreview={() => setPreview((value) => !value)}
        onUndo={() => void undo()}
        pending={pending > 0}
        preview={preview}
      />

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
        <StudentPreview
          classroom={classroom}
          courseId={course.id}
          openAttachment={openAttachment}
        />
      ) : !ready || virtualPending ? (
        <PreparingNotice error={materializeError} onRetry={materialize} />
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
                  if (!carriesFiles(event)) return;
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
                <SectionItems
                  actions={itemActions}
                  editing={editing}
                  ids={orderFor(
                    section.id,
                    section.items.map((item) => item.id)
                  )}
                  itemsById={itemsById}
                  onDragEnd={() => finishDrag(section.id)}
                  onEditingChange={setEditing}
                  onReorder={(ids) => setDragOrder({ scope: section.id, ids })}
                  openAttachment={openAttachment}
                  section={section}
                  sections={sections}
                />
              </EditableSection>
            ))}
          </Reorder.Group>
          <AddSection
            creating={
              creatingSection === "" || (creatingSection === undefined && sections.length === 0)
            }
            onCreate={(title) => {
              setCreatingSection(null);
              createSection(title, "");
            }}
            onToggle={(open) => setCreatingSection(open ? "" : null)}
          />
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
        <AnnounceDialog
          added={added}
          onCompose={() => {
            setAnnounceOpen(false);
            onDone(announcementDraftFor(added));
          }}
          onSkip={() => {
            setAnnounceOpen(false);
            onDone(null);
          }}
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
