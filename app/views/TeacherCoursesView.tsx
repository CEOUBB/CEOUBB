"use client";

import { useEffect, useReducer, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle,
  ChalkboardTeacher,
  Plus,
  Trash,
  UserPlus,
  UsersThree,
} from "@phosphor-icons/react";
import {
  COURSE_MODALITIES,
  COURSE_TONES,
  modalityLabel,
  type CourseAssistant,
  type CourseModality,
  type CourseTone,
  type ManagedCourse,
  type TeacherCourseCatalog,
  type UpdateTeacherCourseInput,
} from "../../lib/course-management";
import type { CourseGradebook } from "../../lib/firebase-classroom-client";
import {
  assignManagedAssistant,
  createManagedCourse,
  loadCourseAssistants,
  loadTeacherWorkspace,
  removeManagedAssistant,
  updateManagedCourse,
} from "../../lib/teacher-course-client";
import { GradebookSettingsEditor } from "./classroom/GradebookSettingsEditor";

type ManagerTab = "data" | "evaluations" | "assistants";

const EMPTY_CATALOG: TeacherCourseCatalog = { departments: [], periods: [] };

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

// Implements: REQ-QMD-01
type TeacherCoursesState = {
  courses: ManagedCourse[];
  catalog: TeacherCourseCatalog;
  selectedId: string;
  tab: ManagerTab;
  creating: boolean;
  loading: boolean;
  status: string;
};

type TeacherCoursesAction =
  | { type: "LOAD_WORKSPACE_SUCCESS"; courses: ManagedCourse[]; catalog: TeacherCourseCatalog; preferredId?: string }
  | { type: "SET_STATUS"; status: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SELECT_COURSE"; id: string }
  | { type: "SET_TAB"; tab: ManagerTab }
  | { type: "SET_CREATING"; creating: boolean }
  | { type: "TOGGLE_CREATING" }
  | { type: "COURSE_CREATED"; course: ManagedCourse }
  | { type: "COURSE_UPDATED"; course: ManagedCourse };

const INITIAL_STATE: TeacherCoursesState = {
  courses: [],
  catalog: EMPTY_CATALOG,
  selectedId: "",
  tab: "data",
  creating: false,
  loading: true,
  status: "",
};

function teacherCoursesReducer(
  state: TeacherCoursesState,
  action: TeacherCoursesAction
): TeacherCoursesState {
  switch (action.type) {
    case "LOAD_WORKSPACE_SUCCESS": {
      const nextId =
        action.preferredId && action.courses.some((course) => course.id === action.preferredId)
          ? action.preferredId
          : state.selectedId && action.courses.some((course) => course.id === state.selectedId)
          ? state.selectedId
          : (action.courses[0]?.id ?? "");
      return {
        ...state,
        courses: action.courses,
        catalog: action.catalog,
        selectedId: nextId,
        loading: false,
      };
    }
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SELECT_COURSE":
      return { ...state, selectedId: action.id, tab: "data", status: "", creating: false };
    case "SET_TAB":
      return { ...state, tab: action.tab };
    case "SET_CREATING":
      return { ...state, creating: action.creating };
    case "TOGGLE_CREATING":
      return { ...state, creating: !state.creating };
    case "COURSE_CREATED":
      return {
        ...state,
        creating: false,
        tab: "data",
        courses: [action.course, ...state.courses.filter((item) => item.id !== action.course.id)],
        selectedId: action.course.id,
        status: `${action.course.name} quedó creado y disponible en el portal.`,
      };
    case "COURSE_UPDATED":
      return {
        ...state,
        courses: state.courses.map((item) => (item.id === action.course.id ? action.course : item)),
        status: "La ficha del ramo quedó actualizada.",
      };
    default:
      return state;
  }
}

// Implements: REQ-QMD-01
export function TeacherCoursesView({
  openCourse,
  onCoursesChanged,
}: {
  openCourse: (course: ManagedCourse) => void;
  onCoursesChanged: () => Promise<void>;
}) {
  const [state, dispatch] = useReducer(teacherCoursesReducer, INITIAL_STATE);
  const { courses, catalog, selectedId, tab, creating, loading, status } = state;

  const reload = async (preferredId?: string) => {
    const workspace = await loadTeacherWorkspace();
    dispatch({
      type: "LOAD_WORKSPACE_SUCCESS",
      courses: workspace.courses,
      catalog: workspace.catalog,
      preferredId,
    });
  };

  useEffect(() => {
    let active = true;
    loadTeacherWorkspace()
      .then((workspace) => {
        if (!active) return;
        dispatch({
          type: "LOAD_WORKSPACE_SUCCESS",
          courses: workspace.courses,
          catalog: workspace.catalog,
        });
      })
      .catch((cause) => {
        if (active) dispatch({ type: "SET_STATUS", status: message(cause, "No fue posible cargar tus ramos.") });
      })
      .finally(() => {
        if (active) dispatch({ type: "SET_LOADING", loading: false });
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = courses.find((course) => course.id === selectedId) ?? courses[0] ?? null;

  const handleCreated = async (course: ManagedCourse) => {
    dispatch({ type: "COURSE_CREATED", course });
    await Promise.allSettled([reload(course.id), onCoursesChanged()]);
  };

  const handleUpdated = async (course: ManagedCourse) => {
    dispatch({ type: "COURSE_UPDATED", course });
    await Promise.allSettled([onCoursesChanged()]);
  };

  return (
    <section className="teacher-manager">
      <header className="teacher-manager-hero">
        <div>
          <span className="teacher-manager-kicker">
            <ChalkboardTeacher aria-hidden="true" size={17} weight="fill" />
            Espacio docente
          </span>
          <h1>Administrar ramos</h1>
          <p>Crea tu sección y mantén su ficha, evaluaciones y ayudantes desde un solo lugar.</p>
        </div>
        <button
          className="primary-button teacher-create-trigger"
          onClick={() => dispatch({ type: "TOGGLE_CREATING" })}
          type="button"
        >
          <Plus aria-hidden="true" size={17} weight="bold" />
          {creating ? "Cerrar formulario" : "Crear ramo"}
        </button>
      </header>

      {creating && (
        <CreateCourseForm
          catalog={catalog}
          key={`${catalog.departments[0]?.id ?? "none"}:${catalog.periods[0]?.id ?? "none"}`}
          onCancel={() => dispatch({ type: "SET_CREATING", creating: false })}
          onCreated={handleCreated}
        />
      )}

      <p aria-live="polite" className="teacher-manager-status">
        {status}
      </p>

      {loading ? (
        <div aria-busy="true" className="teacher-manager-loading">
          Cargando espacio docente…
        </div>
      ) : courses.length === 0 ? (
        <div className="teacher-manager-empty">
          <BookOpenText aria-hidden="true" size={36} />
          <strong>Aún no administras ramos</strong>
          <p>Crea tu primera sección para comenzar a publicar su información.</p>
          <button
            className="primary-button"
            onClick={() => dispatch({ type: "SET_CREATING", creating: true })}
            type="button"
          >
            Crear mi primer ramo
          </button>
        </div>
      ) : (
        <div className="teacher-manager-layout">
          <aside className="teacher-course-list" aria-label="Ramos administrados">
            <div className="teacher-course-list-head">
              <span>Mis secciones</span>
              <b className="num">{courses.length}</b>
            </div>
            {courses.map((course) => (
              <button
                aria-current={selected?.id === course.id ? "true" : undefined}
                className={selected?.id === course.id ? "active" : ""}
                key={course.id}
                onClick={() => dispatch({ type: "SELECT_COURSE", id: course.id })}
                style={{ "--course-tone": course.tone } as React.CSSProperties}
                type="button"
              >
                <span className="teacher-course-mark" aria-hidden="true" />
                <span>
                  <strong>{course.name}</strong>
                  <small>
                    {course.code} · Sección {course.section}
                  </small>
                </span>
              </button>
            ))}
          </aside>

          {selected && (
            <div className="teacher-course-workspace">
              <div className="teacher-course-heading">
                <div>
                  <span>{selected.eyebrow}</span>
                  <h2>{selected.name}</h2>
                  <p>{selected.period}</p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => openCourse(selected)}
                  type="button"
                >
                  Abrir aula
                  <ArrowRight aria-hidden="true" size={16} />
                </button>
              </div>

              <div
                className="teacher-manager-tabs"
                role="tablist"
                aria-label="Configuración del ramo"
              >
                <ManagerTabButton
                  active={tab === "data"}
                  onClick={() => dispatch({ type: "SET_TAB", tab: "data" })}
                >
                  Datos del ramo
                </ManagerTabButton>
                <ManagerTabButton
                  active={tab === "evaluations"}
                  onClick={() => dispatch({ type: "SET_TAB", tab: "evaluations" })}
                >
                  Evaluaciones
                </ManagerTabButton>
                <ManagerTabButton
                  active={tab === "assistants"}
                  onClick={() => dispatch({ type: "SET_TAB", tab: "assistants" })}
                >
                  Ayudantes
                </ManagerTabButton>
              </div>

              {tab === "data" && (
                <CourseDataForm course={selected} key={selected.id} onUpdated={handleUpdated} />
              )}
              {tab === "evaluations" && <CourseEvaluations course={selected} key={selected.id} />}
              {tab === "assistants" && <CourseAssistants course={selected} key={selected.id} />}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ManagerTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={active ? "active" : ""}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
    </button>
  );
}

function CreateCourseForm({
  catalog,
  onCancel,
  onCreated,
}: {
  catalog: TeacherCourseCatalog;
  onCancel: () => void;
  onCreated: (course: ManagedCourse) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("6");
  const [section, setSection] = useState("1");
  const [departmentId, setDepartmentId] = useState(catalog.departments[0]?.id ?? "");
  const [periodId, setPeriodId] = useState(catalog.periods[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [modality, setModality] = useState<CourseModality>("presencial");
  const [room, setRoom] = useState("");
  const [tone, setTone] = useState<CourseTone>("sky");
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const period = catalog.periods.find((item) => item.id === periodId);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!departmentId || !periodId) {
      setStatus("No hay un período académico habilitado para crear secciones.");
      return;
    }
    setWorking(true);
    setStatus("Creando la sección…");
    try {
      const course = await createManagedCourse({
        code,
        name,
        creditsSct: Number(credits),
        departmentId,
        periodId,
        sectionNumber: Number(section),
        summary,
        modality,
        room,
        tone,
      });
      await onCreated(course);
    } catch (cause) {
      setStatus(message(cause, "No fue posible crear el ramo."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <form className="teacher-create-form" onSubmit={submit}>
      <div className="teacher-form-heading">
        <div>
          <span>Nueva sección</span>
          <h2>Datos académicos esenciales</h2>
        </div>
        {period && <span className="teacher-period-pill">{period.label}</span>}
      </div>
      <div className="teacher-form-grid">
        <label>
          Código del ramo
          <input
            maxLength={24}
            onChange={(event) => setCode(event.target.value)}
            required
            value={code}
          />
        </label>
        <label className="teacher-field-wide">
          Nombre del ramo
          <input
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label>
          Créditos SCT
          <input
            max={30}
            min={0}
            onChange={(event) => setCredits(event.target.value)}
            required
            type="number"
            value={credits}
          />
        </label>
        <label>
          Sección
          <input
            max={99}
            min={1}
            onChange={(event) => setSection(event.target.value)}
            required
            type="number"
            value={section}
          />
        </label>
        <label className="teacher-field-wide">
          Unidad académica
          <select
            onChange={(event) => setDepartmentId(event.target.value)}
            required
            value={departmentId}
          >
            {catalog.departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Período
          <select onChange={(event) => setPeriodId(event.target.value)} required value={periodId}>
            {catalog.periods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Modalidad
          <select
            onChange={(event) => setModality(event.target.value as CourseModality)}
            value={modality}
          >
            {COURSE_MODALITIES.map((value) => (
              <option key={value} value={value}>
                {modalityLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sala o enlace
          <input maxLength={80} onChange={(event) => setRoom(event.target.value)} value={room} />
        </label>
        <label>
          Identidad visual
          <select onChange={(event) => setTone(event.target.value as CourseTone)} value={tone}>
            {COURSE_TONES.map((value) => (
              <option key={value} value={value}>
                {toneLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="teacher-field-full">
          Descripción para estudiantes
          <textarea
            maxLength={2000}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            value={summary}
          />
        </label>
      </div>
      <div className="teacher-form-actions">
        <p aria-live="polite">{status}</p>
        <button className="secondary-button" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="primary-button" disabled={working} type="submit">
          {working ? "Creando…" : "Crear sección"}
        </button>
      </div>
    </form>
  );
}

function CourseDataForm({
  course,
  onUpdated,
}: {
  course: ManagedCourse;
  onUpdated: (course: ManagedCourse) => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setStatus("Guardando ficha…");
    const values = new FormData(event.currentTarget);
    const modality = COURSE_MODALITIES.find((value) => value === values.get("modality"));
    const tone = COURSE_TONES.find((value) => value === values.get("tone"));
    const input: UpdateTeacherCourseInput = {
      title: String(values.get("title") ?? ""),
      summary: String(values.get("summary") ?? ""),
      modality: modality ?? course.modality,
      room: String(values.get("room") ?? ""),
      tone: tone ?? course.toneKey,
    };
    try {
      const updated = await updateManagedCourse(course.id, input);
      await onUpdated(updated);
      setStatus("Ficha actualizada.");
    } catch (cause) {
      setStatus(message(cause, "No fue posible actualizar la ficha."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <form className="teacher-config-panel" onSubmit={submit}>
      <div className="teacher-panel-intro">
        <BookOpenText aria-hidden="true" size={22} />
        <div>
          <h3>Datos del ramo</h3>
          <p>Esta información aparece en la portada y en la navegación de tus estudiantes.</p>
        </div>
      </div>
      <div className="teacher-form-grid">
        <label className="teacher-field-full">
          Nombre visible
          <input defaultValue={course.name} maxLength={120} name="title" required />
        </label>
        <label>
          Modalidad
          <select defaultValue={course.modality} name="modality">
            {COURSE_MODALITIES.map((value) => (
              <option key={value} value={value}>
                {modalityLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sala o enlace
          <input defaultValue={course.room} maxLength={80} name="room" />
        </label>
        <label>
          Identidad visual
          <select defaultValue={course.toneKey} name="tone">
            {COURSE_TONES.map((value) => (
              <option key={value} value={value}>
                {toneLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="teacher-field-full">
          Descripción
          <textarea defaultValue={course.summary} maxLength={2000} name="summary" rows={5} />
        </label>
      </div>
      <div className="teacher-form-actions">
        <p aria-live="polite">{status}</p>
        <button className="primary-button" disabled={working} type="submit">
          {working ? "Guardando…" : "Guardar ficha"}
        </button>
      </div>
    </form>
  );
}

function CourseEvaluations({ course }: { course: ManagedCourse }) {
  const [state, setState] = useState<CourseGradebook>({
    courseId: "",
    items: [],
    exemption: null,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let stop: (() => void) | undefined;
    let active = true;
    import("../../lib/firebase-classroom-client").then(({ watchGradebook }) => {
      if (!active) return;
      stop = watchGradebook(course.id, setState, setError);
    });
    return () => {
      active = false;
      stop?.();
    };
  }, [course.id]);

  const current =
    state.courseId === course.id ? state : { courseId: course.id, items: [], exemption: null };

  return (
    <section className="teacher-config-panel">
      <div className="teacher-panel-intro">
        <CheckCircle aria-hidden="true" size={22} />
        <div>
          <h3>Evaluaciones</h3>
          <p>Define el esquema completo; la suma debe ser exactamente 100%.</p>
        </div>
      </div>
      <GradebookSettingsEditor
        courseId={course.id}
        exemption={current.exemption}
        gradebook={current.items}
      />
      <p aria-live="polite" className="teacher-inline-error">
        {error}
      </p>
    </section>
  );
}

function CourseAssistants({ course }: { course: ManagedCourse }) {
  const [assistantState, setAssistantState] = useState<{
    courseId: string;
    items: CourseAssistant[];
  }>({
    courseId: "",
    items: [],
  });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [working, setWorking] = useState(false);

  const reload = async () => {
    const items = await loadCourseAssistants(course.id);
    setAssistantState({ courseId: course.id, items });
  };

  useEffect(() => {
    let active = true;
    loadCourseAssistants(course.id)
      .then((items) => {
        if (active) setAssistantState({ courseId: course.id, items });
      })
      .catch((cause) => {
        if (active) setStatus(message(cause, "No fue posible cargar las ayudantías."));
      });
    return () => {
      active = false;
    };
  }, [course.id]);

  const assistants = assistantState.courseId === course.id ? assistantState.items : [];

  const assign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setStatus("Asignando ayudantía…");
    try {
      const assigned = await assignManagedAssistant(course.id, email);
      setEmail("");
      setAssistantState((current) => ({
        courseId: course.id,
        items: [assigned, ...current.items.filter((item) => item.userId !== assigned.userId)],
      }));
      setStatus(`${assigned.name} ahora figura como ayudante del ramo.`);
      await Promise.allSettled([reload()]);
    } catch (cause) {
      setStatus(message(cause, "No fue posible asignar la ayudantía."));
    } finally {
      setWorking(false);
    }
  };

  const remove = async (assistant: CourseAssistant) => {
    setWorking(true);
    setStatus(`Quitando a ${assistant.name}…`);
    try {
      await removeManagedAssistant(course.id, assistant.userId);
      setAssistantState((current) => ({
        courseId: course.id,
        items: current.items.filter((item) => item.userId !== assistant.userId),
      }));
      setStatus(`${assistant.name} ya no figura como ayudante.`);
      await Promise.allSettled([reload()]);
    } catch (cause) {
      setStatus(message(cause, "No fue posible quitar la ayudantía."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="teacher-config-panel">
      <div className="teacher-panel-intro">
        <UsersThree aria-hidden="true" size={22} />
        <div>
          <h3>Ayudantes</h3>
          <p>Designa estudiantes ya registrados con su correo institucional UBB.</p>
        </div>
      </div>
      <form className="teacher-assistant-form" onSubmit={assign}>
        <span className="teacher-assistant-label" id="assistant-email-label">
          Correo del estudiante
        </span>
        <div className="teacher-assistant-field">
          <input
            aria-labelledby="assistant-email-label"
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@alumnos.ubiobio.cl"
            required
            type="email"
            value={email}
          />
          <button className="primary-button" disabled={working} type="submit">
            <UserPlus aria-hidden="true" size={16} />
            Designar
          </button>
        </div>
      </form>
      <div className="teacher-assistant-list">
        {assistants.length === 0 ? (
          <p className="empty-row">Este ramo aún no tiene ayudantes designados.</p>
        ) : (
          assistants.map((assistant) => (
            <div key={assistant.userId}>
              <span className="teacher-assistant-avatar" aria-hidden="true">
                {initials(assistant.name)}
              </span>
              <span>
                <strong>{assistant.name}</strong>
                <small>{assistant.email}</small>
              </span>
              <button
                aria-label={`Quitar a ${assistant.name} de ayudantes`}
                className="teacher-remove-assistant"
                disabled={working}
                onClick={() => remove(assistant)}
                type="button"
              >
                <Trash aria-hidden="true" size={16} />
                Quitar
              </button>
            </div>
          ))
        )}
      </div>
      <p aria-live="polite" className="teacher-manager-status">
        {status}
      </p>
    </section>
  );
}

function toneLabel(tone: CourseTone): string {
  const labels: Record<CourseTone, string> = {
    sky: "Celeste",
    emerald: "Esmeralda",
    gold: "Dorado",
    red: "Rojo",
    teal: "Turquesa",
    purple: "Morado",
  };
  return labels[tone];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
