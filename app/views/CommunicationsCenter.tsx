"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import {
  ArrowDown,
  ArrowUp,
  CaretDown,
  CaretLeft,
  ChatCircleText,
  CheckCircle,
  Checks,
  CloudSlash,
  LockSimple,
  MagnifyingGlass,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { Course } from "../../lib/courses.ts";
import {
  ConversationListSkeleton,
  ConversationSkeleton,
  HistoryListSkeleton,
  PendingBandSkeleton,
} from "./ViewSkeletons";
import {
  MAX_COMMUNICATION_ITEMS,
  MAX_MESSAGE_LENGTH,
  MESSAGE_EMPTY_ERROR,
  announcementCursorKey,
  awaitsTeamReply,
  canListStudentThreads,
  clockTime,
  dayKey,
  dayLabel,
  deriveNotifications,
  firebaseUserId,
  firstUnreadMessageId,
  fullStamp,
  groupMessages,
  readCursorMap,
  stampLabel,
  threadCursorKey,
  timestampIsUnread,
  unreadCommunicationCount,
  type CommunicationReadCursor,
  type DirectMessage,
  type MessageThreadSummary,
  type NotificationItem,
} from "../../lib/communications.ts";
import type { CourseActivity } from "../../lib/firebase-classroom-client.ts";
import {
  markCommunicationRead,
  sendDirectMessage,
  watchDirectMessages,
} from "../../lib/firebase-classroom-client.ts";
import { SPRING_LAYOUT } from "../../lib/ease";
import { useClock } from "../../lib/hooks/use-clock";
import { formatDueDate, type User } from "../../lib/portal-utils.ts";
import type { SectionMembership } from "../../lib/section-roles.ts";
import { CommunicationMark, POST_KINDS } from "../notification-panel";

type CommunicationsMode = "all" | "announcements" | "messages";

const MODES: { id: CommunicationsMode; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "announcements", label: "Avisos" },
  { id: "messages", label: "Mensajes" },
];

const PHONE_QUERY = "(max-width: 767px)";
function subscribePhone(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const phoneLayout = () => window.matchMedia(PHONE_QUERY).matches;
const serverPhoneLayout = () => false;

const finePointer = () => window.matchMedia("(pointer: fine)").matches;

const STACK_PREVIEW = 4;
const COUNTER_THRESHOLD = 200;

type ConversationTarget = {
  key: string;
  courseId: string;
  threadId: string;
  heading: string;
  courseName: string;
  courseCode: string;
  tone: string;
  teaching: boolean;
  thread: MessageThreadSummary | null;
};

type Outgoing = {
  key: string;
  body: string;
  baseline: number;
};

type CommunicationsUiState = {
  mode: CommunicationsMode;
  selectedKey: string;
  selected: ConversationTarget | null;
  readAtOnOpen: string | undefined;
  messages: DirectMessage[];
  loadingMessages: boolean;
  threadError: string;
  notice: string;
  feedback: string;
  composerHint: string;
  drafts: Record<string, string>;
  sending: boolean;
  outgoing: Outgoing | null;
};

type UiPatch =
  | Partial<CommunicationsUiState>
  | ((state: CommunicationsUiState) => Partial<CommunicationsUiState>);

const INITIAL_COMMUNICATIONS_UI: CommunicationsUiState = {
  mode: "all",
  selectedKey: "",
  selected: null,
  readAtOnOpen: undefined,
  messages: [],
  loadingMessages: false,
  threadError: "",
  notice: "",
  feedback: "",
  composerHint: "",
  drafts: {},
  sending: false,
  outgoing: null,
};

function updateCommunicationsUi(
  state: CommunicationsUiState,
  patch: UiPatch
): CommunicationsUiState {
  return { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
}

function errorText(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function normalizedBody(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

function toneStyle(tone: string): CSSProperties {
  return { "--course-tone": tone } as CSSProperties;
}

function buildConversationTargets(
  user: User,
  courses: readonly Course[],
  memberships: readonly SectionMembership[],
  threads: readonly MessageThreadSummary[]
): ConversationTarget[] {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const userId = firebaseUserId(user.id);
  const targets: ConversationTarget[] = [];

  for (const membership of memberships) {
    const course = courseMap.get(membership.sectionId);
    const courseName = course?.name ?? `Sección ${membership.sectionId}`;
    const courseCode = course?.code ?? membership.sectionId.toUpperCase();
    const tone = course?.tone ?? "var(--color-primary)";

    if (canListStudentThreads(user.role, membership.role)) {
      for (const thread of threads.filter((item) => item.courseId === membership.sectionId)) {
        targets.push({
          key: `${thread.courseId}:${thread.id}`,
          courseId: thread.courseId,
          threadId: thread.id,
          heading: thread.studentName,
          courseName,
          courseCode,
          tone,
          teaching: true,
          thread,
        });
      }
      continue;
    }

    targets.push({
      key: `${membership.sectionId}:${userId}`,
      courseId: membership.sectionId,
      threadId: userId,
      heading: courseName,
      courseName,
      courseCode,
      tone,
      teaching: false,
      thread:
        threads.find(
          (item) => item.courseId === membership.sectionId && item.studentId === userId
        ) ?? null,
    });
  }

  return targets.sort((left, right) => {
    if (left.thread && right.thread)
      return right.thread.updatedAt.localeCompare(left.thread.updatedAt);
    if (left.thread) return -1;
    if (right.thread) return 1;
    return left.heading.localeCompare(right.heading, "es-CL");
  });
}

function targetDetail(target: ConversationTarget): string {
  return target.teaching
    ? `${target.courseName} · ${target.thread?.studentEmail ?? ""}`
    : `${target.courseCode} · Equipo docente`;
}

function targetUnread(
  target: ConversationTarget,
  reads: ReadonlyMap<string, string>,
  currentUserId: string
): boolean {
  return Boolean(
    target.thread &&
    target.thread.latestAuthorId !== currentUserId &&
    timestampIsUnread(
      target.thread.updatedAt,
      reads.get(threadCursorKey(target.courseId, target.threadId))
    )
  );
}

function threadPreview(target: ConversationTarget, currentUserId: string): string {
  if (!target.thread) return "Iniciar una consulta privada";
  return target.thread.latestAuthorId === currentUserId
    ? `Tú: ${target.thread.latestBody}`
    : target.thread.latestBody;
}

function focusConversationOrigin(key: string) {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(`[data-conversation-key="${CSS.escape(key)}"]`)
      ?.focus({ preventScroll: true });
  });
}

type HistoryEntry =
  | { type: "announcement"; key: string; createdAt: string; item: CourseActivity }
  | { type: "conversation"; key: string; createdAt: string; target: ConversationTarget };

type PendingGroup = { courseId: string; items: NotificationItem[] };

function PendingRow({
  item,
  now,
  onOpen,
}: {
  item: NotificationItem;
  now: Date;
  onOpen: (item: NotificationItem) => void;
}) {
  const due = item.kind === "assessment" && item.dueDate ? formatDueDate(item.dueDate) : "";
  return (
    <button
      className="pending-row"
      data-conversation-key={item.threadId ? `${item.courseId}:${item.threadId}` : undefined}
      onClick={() => onOpen(item)}
      type="button"
    >
      <CommunicationMark kind={item.kind} name={item.title} tone={item.tone} />
      <span className="pending-copy">
        <strong>{item.title}</strong>
        <small>
          {item.kind ? POST_KINDS[item.kind].label : item.excerpt}
          {due && ` · Entrega ${due}`}
        </small>
      </span>
      <time className="num" dateTime={item.createdAt}>
        {stampLabel(item.createdAt, now)}
      </time>
    </button>
  );
}

// Implements: REQ-COMM-01 REQ-COMM-02
function PendingStack({
  ref,
  group,
  course,
  now,
  onOpen,
  onMarkRead,
}: {
  ref?: Ref<HTMLElement>;
  group: PendingGroup;
  course: Course | undefined;
  now: Date;
  onOpen: (item: NotificationItem) => void;
  onMarkRead: (group: PendingGroup) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [first, ...rest] = group.items;
  const preview = rest.slice(0, STACK_PREVIEW);
  const beyond = rest.length - preview.length;
  const name = course?.name ?? first.courseName;
  const titleId = `pending-${group.courseId}`;

  return (
    <m.article
      animate={{ opacity: 1, scale: 1 }}
      aria-labelledby={titleId}
      className="pending-stack"
      data-depth={Math.min(rest.length, 2)}
      data-expanded={expanded}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      initial={{ opacity: 0, scale: 0.96 }}
      layout="position"
      ref={ref}
      style={toneStyle(first.tone)}
      transition={SPRING_LAYOUT}
    >
      <span aria-hidden="true" className="pending-tab">
        {course?.code ?? group.courseId.toUpperCase()}
      </span>
      <header className="pending-head">
        <h3 id={titleId}>{name}</h3>
        <span className="pending-count num">
          {group.items.length} {group.items.length === 1 ? "nuevo" : "nuevos"}
        </span>
        <button
          aria-label={`Marcar ${name} como leído`}
          className="pending-dismiss"
          onClick={() => onMarkRead(group)}
          title="Marcar como leído"
          type="button"
        >
          <Checks aria-hidden="true" size={17} />
        </button>
      </header>
      <PendingRow item={first} now={now} onOpen={onOpen} />
      {rest.length > 0 && (
        <>
          <div className="pending-more" inert={!expanded}>
            <div>
              {preview.map((item) => (
                <PendingRow item={item} key={item.id} now={now} onOpen={onOpen} />
              ))}
              {beyond > 0 && (
                <p className="pending-beyond">
                  y <span className="num">{beyond}</span> más en el historial
                </p>
              )}
            </div>
          </div>
          <button
            aria-expanded={expanded}
            className="pending-toggle"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "Mostrar menos" : `Ver ${rest.length} más`}
            <CaretDown aria-hidden="true" size={14} weight="bold" />
          </button>
        </>
      )}
    </m.article>
  );
}

function AnnouncementRow({
  item,
  course,
  now,
  onOpen,
}: {
  item: CourseActivity;
  course: Course | undefined;
  now: Date;
  onOpen: (courseId: string) => void;
}) {
  const courseName = course?.name ?? `Sección ${item.courseId}`;
  const due = item.kind === "assessment" && item.dueDate ? formatDueDate(item.dueDate) : "";
  return (
    <button
      aria-label={`${item.title}, ${courseName}`}
      className="announcement-row"
      onClick={() => onOpen(item.courseId)}
      type="button"
    >
      <CommunicationMark kind={item.kind} tone={course?.tone ?? "var(--color-primary)"} />
      <span className="row-copy">
        <span className="row-title">{item.title}</span>
        <span className="row-meta">
          {courseName} · {POST_KINDS[item.kind].label}
          {due && ` · Entrega ${due}`}
        </span>
      </span>
      <time className="row-time num" dateTime={item.createdAt}>
        {stampLabel(item.createdAt, now)}
      </time>
    </button>
  );
}

function ConversationRow({
  target,
  unread,
  flagged = false,
  active,
  currentUserId,
  now,
  onChoose,
}: {
  target: ConversationTarget;
  unread: boolean;
  flagged?: boolean;
  active: boolean;
  currentUserId: string;
  now: Date;
  onChoose: (target: ConversationTarget) => void;
}) {
  const awaiting = target.teaching && target.thread && awaitsTeamReply(target.thread);
  return (
    <button
      aria-current={active ? "true" : undefined}
      className="conversation-row"
      data-active={active}
      data-conversation-key={target.key}
      data-unread={unread}
      onClick={() => onChoose(target)}
      type="button"
    >
      {flagged && (
        <span className="row-flag">
          {unread && <span aria-label="No leído" className="conversation-unread" role="img" />}
        </span>
      )}
      <CommunicationMark name={target.heading} tone={target.tone} />
      <span className="row-copy">
        <span className="row-title">{target.heading}</span>
        <span className="row-preview">{threadPreview(target, currentUserId)}</span>
        <span className="row-meta">
          {target.teaching ? target.courseName : `${target.courseCode} · Equipo docente`}
          {awaiting && <span className="row-state"> · Por responder</span>}
        </span>
      </span>
      <time className="row-time num" dateTime={target.thread?.updatedAt}>
        {target.thread ? stampLabel(target.thread.updatedAt, now) : ""}
      </time>
    </button>
  );
}

// Implements: REQ-COMM-03 REQ-COMM-04 REQ-COMM-06 REQ-COMM-08
function ConversationSheet({
  target,
  phone,
  messages,
  loading,
  threadError,
  notice,
  readAtOnOpen,
  currentUserId,
  outgoing,
  draft,
  sending,
  composerHint,
  textarea,
  now,
  onDraft,
  onSubmit,
  onClose,
  onRetry,
}: {
  target: ConversationTarget;
  phone: boolean;
  messages: DirectMessage[];
  loading: boolean;
  threadError: string;
  notice: string;
  readAtOnOpen: string | undefined;
  currentUserId: string;
  outgoing: Outgoing | null;
  draft: string;
  sending: boolean;
  composerHint: string;
  textarea: RefObject<HTMLTextAreaElement | null>;
  now: Date;
  onDraft: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const history = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pinned = useRef(true);
  const settled = useRef(false);
  const [distant, setDistant] = useState(false);
  const days = useMemo(() => groupMessages(messages, currentUserId), [messages, currentUserId]);
  const firstUnread = useMemo(
    () => firstUnreadMessageId(messages, readAtOnOpen, currentUserId),
    [messages, readAtOnOpen, currentUserId]
  );
  const ownCount = (body: string) =>
    messages.filter((message) => message.authorId === currentUserId && message.body === body)
      .length;
  const showOutgoing = outgoing?.key === target.key && ownCount(outgoing.body) <= outgoing.baseline;
  const lastRun = days.at(-1)?.runs.at(-1);
  const remaining = MAX_MESSAGE_LENGTH - draft.length;

  useLayoutEffect(() => {
    pinned.current = true;
    settled.current = false;
  }, [target.key]);

  useEffect(() => {
    if (finePointer()) textarea.current?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
  }, [target.key, textarea]);

  useLayoutEffect(() => {
    const node = history.current;
    if (!node || loading) return;
    const marker = settled.current ? null : node.querySelector<HTMLElement>(".message-new");
    settled.current = true;
    if (marker) {
      node.scrollTop = Math.max(0, marker.offsetTop - node.clientHeight / 3);
      pinned.current = false;
      return;
    }
    if (pinned.current) node.scrollTop = node.scrollHeight;
  }, [loading, messages, showOutgoing]);

  const follow = () => {
    const node = history.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    pinned.current = distance < 64;
    setDistant(distance > 240);
  };

  const toLatest = () => {
    const node = history.current;
    if (!node) return;
    pinned.current = true;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  };

  const submit = () => {
    pinned.current = true;
    onSubmit();
  };

  const onComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (!finePointer()) return;
    event.preventDefault();
    submit();
  };

  return (
    <m.section
      aria-label="Conversación seleccionada"
      className="conversation-sheet"
      exit={phone ? { x: "100%" } : { opacity: 0 }}
      initial={false}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
      style={toneStyle(target.tone)}
      transition={phone ? { type: "spring", stiffness: 380, damping: 38 } : { duration: 0.12 }}
    >
      <header className="conversation-heading">
        <button
          aria-label="Volver a las conversaciones"
          className="conversation-back"
          data-hardware-back
          onClick={onClose}
          type="button"
        >
          <CaretLeft aria-hidden="true" size={22} weight="bold" />
        </button>
        <CommunicationMark name={target.heading} tone={target.tone} />
        <div className="conversation-title">
          <h2 ref={heading} tabIndex={-1}>
            {target.heading}
          </h2>
          <p title="Solo participan quien consulta y el equipo docente de la sección.">
            <LockSimple aria-label="Conversación privada" role="img" size={12} weight="bold" />
            <span>{targetDetail(target)}</span>
          </p>
        </div>
        <button
          aria-label="Cerrar conversación"
          className="conversation-close"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div
        aria-busy={loading}
        aria-live="polite"
        className="message-history"
        onScroll={follow}
        ref={history}
      >
        {loading ? (
          <ConversationSkeleton />
        ) : messages.length === 0 && threadError ? (
          <div className="message-empty">
            <CloudSlash aria-hidden="true" size={34} />
            <h3>No se pudo cargar la conversación</h3>
            <p>Reintenta la conexión. Tu borrador se conserva.</p>
            <button className="secondary-button" onClick={onRetry} type="button">
              Reintentar conversación
            </button>
          </div>
        ) : messages.length === 0 && !showOutgoing ? (
          <div className="message-empty">
            <ChatCircleText aria-hidden="true" size={34} />
            <h3>La conversación empieza aquí</h3>
            <p>
              {target.teaching
                ? "Esta consulta aún no tiene mensajes."
                : "Escribe tu consulta. Solo tú y el equipo docente de esta sección podrán verla."}
            </p>
          </div>
        ) : (
          <ol className="message-list">
            {days.map((day) => (
              <Fragment key={day.key}>
                <li className="message-day">
                  <h3>{dayLabel(day.key, now)}</h3>
                </li>
                {day.runs.map((run) => {
                  const last = run.messages[run.messages.length - 1];
                  const delivered = run === lastRun && run.own && !showOutgoing;
                  return (
                    <Fragment key={run.key}>
                      {run.messages.some((message) => message.id === firstUnread) && (
                        <li className="message-new">Mensajes nuevos</li>
                      )}
                      <li className={run.own ? "message-run own" : "message-run"}>
                        {!run.own && <strong className="message-author">{run.authorName}</strong>}
                        {run.messages.map((message) => (
                          <div
                            className="message-bubble"
                            key={message.id}
                            title={fullStamp(message.createdAt)}
                          >
                            <p>{message.body}</p>
                          </div>
                        ))}
                        <time className="message-time num" dateTime={last.createdAt}>
                          {clockTime(last.createdAt)}
                          {delivered && " · Enviado"}
                        </time>
                      </li>
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
            {showOutgoing && outgoing && (
              <li className="message-run own" data-state="sending">
                <div className="message-bubble">
                  <p>{outgoing.body}</p>
                </div>
                <span className="message-time">Enviando…</span>
              </li>
            )}
          </ol>
        )}
      </div>

      <AnimatePresence>
        {distant && !loading && (
          <m.button
            animate={{ opacity: 1, y: 0 }}
            aria-label="Ir al último mensaje"
            className="message-latest"
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            onClick={toLatest}
            transition={{ duration: 0.16 }}
            type="button"
          >
            <ArrowDown aria-hidden="true" size={16} weight="bold" />
          </m.button>
        )}
      </AnimatePresence>

      <form
        className="message-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {notice && (
          <p className="message-notice" role="alert">
            <WarningCircle aria-hidden="true" size={16} weight="fill" />
            {notice}
          </p>
        )}
        <label className="sr-only" htmlFor="direct-message-body">
          Mensaje
        </label>
        <div className="message-field">
          <textarea
            aria-describedby="direct-message-hint"
            className="message-input"
            enterKeyHint="send"
            id="direct-message-body"
            maxLength={2000}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={onComposerKey}
            placeholder={target.teaching ? "Responder esta consulta" : "Escribe al equipo docente"}
            ref={textarea}
            rows={1}
            value={draft}
          />
          <button
            aria-label="Enviar mensaje"
            className="message-send"
            disabled={sending || !draft.trim()}
            type="submit"
          >
            <ArrowUp aria-hidden="true" size={18} weight="bold" />
          </button>
        </div>
        <p
          className="message-hint"
          data-tone={composerHint ? "error" : remaining <= COUNTER_THRESHOLD ? "count" : "tip"}
          id="direct-message-hint"
        >
          {composerHint ||
            (remaining <= COUNTER_THRESHOLD ? (
              <>
                Quedan <span className="num">{remaining.toLocaleString("es-CL")}</span> caracteres
              </>
            ) : (
              "Enter envía · Mayús + Enter agrega una línea"
            ))}
        </p>
      </form>
    </m.section>
  );
}

export function CommunicationsCenter({
  user,
  courses,
  memberships,
  activity,
  threads,
  cursors,
  connectionError,
  ready = true,
  retry,
  focusThread = "",
  openCourse,
}: {
  user: User;
  courses: Course[];
  memberships: SectionMembership[];
  activity: CourseActivity[];
  threads: MessageThreadSummary[];
  cursors: CommunicationReadCursor[];
  connectionError: string;
  ready?: boolean;
  retry?: () => void;
  focusThread?: string;
  openCourse: (course: Course) => void;
}) {
  const [ui, updateUi] = useReducer(updateCommunicationsUi, INITIAL_COMMUNICATIONS_UI);
  const [search, setSearch] = useState("");
  const [messageRetry, setMessageRetry] = useState(0);
  const [initialPending] = useState(!ready);
  const phone = useSyncExternalStore(subscribePhone, phoneLayout, serverPhoneLayout);
  const now = useClock();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const handledThread = useRef("");
  const currentUserId = firebaseUserId(user.id);
  const reads = useMemo(() => readCursorMap(cursors), [cursors]);
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const targets = useMemo(
    () => buildConversationTargets(user, courses, memberships, threads),
    [user, courses, memberships, threads]
  );
  const teaching = memberships.some((membership) =>
    canListStudentThreads(user.role, membership.role)
  );
  const unread = useMemo(
    () => unreadCommunicationCount(activity, threads, cursors, currentUserId),
    [activity, threads, cursors, currentUserId]
  );
  const pendingGroups = useMemo<PendingGroup[]>(() => {
    const items = deriveNotifications(
      activity,
      threads,
      cursors,
      currentUserId,
      courses,
      MAX_COMMUNICATION_ITEMS
    ).filter((item) => item.unread);
    return [...Map.groupBy(items, (item) => item.courseId)].map(([courseId, grouped]) => ({
      courseId,
      items: grouped,
    }));
  }, [activity, threads, cursors, currentUserId, courses]);
  const pendingCount = pendingGroups.reduce((total, group) => total + group.items.length, 0);
  const activeTarget = ui.selectedKey
    ? (targets.find((target) => target.key === ui.selectedKey) ?? ui.selected)
    : null;
  const activeKey = activeTarget?.key ?? "";
  const activeCourseId = activeTarget?.courseId ?? "";
  const activeThreadId = activeTarget?.threadId ?? "";
  const activeUnread = activeTarget ? targetUnread(activeTarget, reads, currentUserId) : false;
  const draft = ui.drafts[activeKey] ?? "";

  const markRead = useCallback((keys: readonly string[]) => {
    if (keys.length === 0) return;
    void markCommunicationRead(keys).catch((cause) => {
      updateUi({ notice: errorText(cause, "No se pudo actualizar el estado de lectura.") });
    });
  }, []);

  useEffect(() => {
    if (!activeCourseId || !activeThreadId) return;
    return watchDirectMessages(
      activeCourseId,
      activeThreadId,
      (next) => updateUi({ messages: next, loadingMessages: false, threadError: "" }),
      (error) => updateUi({ threadError: error, loadingMessages: false })
    );
  }, [activeCourseId, activeThreadId, messageRetry]);

  // Implements: REQ-COMM-02
  useEffect(() => {
    if (!activeUnread) return;
    markRead([threadCursorKey(activeCourseId, activeThreadId)]);
  }, [activeUnread, activeCourseId, activeThreadId, markRead]);

  useEffect(() => {
    const outgoing = ui.outgoing;
    if (!outgoing || ui.sending) return;
    const delivered = ui.messages.filter(
      (message) => message.authorId === currentUserId && message.body === outgoing.body
    ).length;
    if (delivered > outgoing.baseline) updateUi({ outgoing: null });
  }, [ui.messages, ui.outgoing, ui.sending, currentUserId]);

  const chooseTarget = useCallback(
    (target: ConversationTarget) => {
      if (target.key === ui.selectedKey) {
        textarea.current?.focus({ preventScroll: true });
        return;
      }
      updateUi({
        selectedKey: target.key,
        selected: target,
        readAtOnOpen: reads.get(threadCursorKey(target.courseId, target.threadId)),
        messages: [],
        loadingMessages: true,
        threadError: "",
        notice: "",
        feedback: "",
        composerHint: "",
      });
    },
    [reads, ui.selectedKey]
  );

  // Implements: REQ-NOTIF-03
  useEffect(() => {
    if (!focusThread || handledThread.current === focusThread) return;
    const target = targets.find((item) => item.key === focusThread);
    if (!target) return;
    handledThread.current = focusThread;
    chooseTarget(target);
  }, [focusThread, targets, chooseTarget]);

  const closeConversation = () => {
    const key = ui.selectedKey;
    updateUi({
      selectedKey: "",
      selected: null,
      messages: [],
      loadingMessages: false,
      threadError: "",
      notice: "",
      composerHint: "",
    });
    focusConversationOrigin(key);
  };

  const openAnnouncement = (courseId: string) => {
    markRead([announcementCursorKey(courseId)]);
    const course = courseMap.get(courseId);
    if (course) openCourse(course);
  };

  const openPending = (item: NotificationItem) => {
    if (item.source === "announcement") {
      openAnnouncement(item.courseId);
      return;
    }
    const target = targets.find((entry) => entry.key === `${item.courseId}:${item.threadId}`);
    if (target) chooseTarget(target);
  };

  const markGroupRead = (group: PendingGroup) => {
    markRead([...new Set(group.items.map((item) => item.cursorKey))]);
    const name = courseMap.get(group.courseId)?.name ?? group.items[0].courseName;
    updateUi({ feedback: `${name} quedó al día.` });
  };

  const markAll = () => {
    const threadKeys = threads
      .filter((item) => item.latestAuthorId !== currentUserId)
      .map((item) => threadCursorKey(item.courseId, item.id));
    markRead([
      ...new Set([...activity.map((item) => announcementCursorKey(item.courseId)), ...threadKeys]),
    ]);
    updateUi({ feedback: "Todo quedó marcado como leído." });
  };

  const setDraft = (value: string) => {
    updateUi((state) => ({
      drafts: { ...state.drafts, [activeKey]: value },
      composerHint: "",
    }));
  };

  const submitMessage = async () => {
    const target = activeTarget;
    if (!target || ui.sending) return;
    const text = draft;
    const body = normalizedBody(text);

    if (!body) {
      updateUi({ composerHint: MESSAGE_EMPTY_ERROR });
      textarea.current?.focus();
      return;
    }

    updateUi((state) => ({
      sending: true,
      notice: "",
      feedback: "",
      composerHint: "",
      drafts: { ...state.drafts, [target.key]: "" },
      outgoing: {
        key: target.key,
        body,
        baseline: state.messages.filter(
          (message) => message.authorId === currentUserId && message.body === body
        ).length,
      },
    }));

    try {
      await sendDirectMessage(target.courseId, target.threadId, text);
      updateUi({ sending: false, feedback: "Mensaje enviado." });
    } catch (cause) {
      updateUi((state) => ({
        sending: false,
        outgoing: null,
        notice: errorText(cause, "No se pudo enviar el mensaje."),
        drafts: { ...state.drafts, [target.key]: state.drafts[target.key] || text },
      }));
    }
    textarea.current?.focus();
  };

  const visibleTargets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es-CL");
    if (!query) return targets;
    return targets.filter((target) =>
      [target.heading, target.courseName, target.courseCode, target.thread?.studentEmail ?? ""]
        .join(" ")
        .toLocaleLowerCase("es-CL")
        .includes(query)
    );
  }, [targets, search]);

  const historyDays = useMemo(() => {
    const entries: HistoryEntry[] = activity
      .filter(
        (item) =>
          !timestampIsUnread(item.createdAt, reads.get(announcementCursorKey(item.courseId)))
      )
      .map((item) => ({
        type: "announcement",
        key: `${item.courseId}:${item.id}`,
        createdAt: item.createdAt,
        item,
      }));
    if (ui.mode === "all") {
      for (const target of targets) {
        if (!target.thread || targetUnread(target, reads, currentUserId)) continue;
        entries.push({
          type: "conversation",
          key: target.key,
          createdAt: target.thread.updatedAt,
          target,
        });
      }
    }
    entries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return [...Map.groupBy(entries, (entry) => dayKey(entry.createdAt))];
  }, [activity, targets, reads, currentUserId, ui.mode]);

  const chooseMode = (mode: CommunicationsMode) => {
    updateUi({ mode });
  };

  const onTabsKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = MODES.findIndex((mode) => mode.id === ui.mode);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? MODES.length - 1
          : ["ArrowRight", "ArrowDown"].includes(event.key)
            ? (index + 1) % MODES.length
            : ["ArrowLeft", "ArrowUp"].includes(event.key)
              ? (index - 1 + MODES.length) % MODES.length
              : -1;
    if (next < 0) return;
    event.preventDefault();
    chooseMode(MODES[next].id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  const loading = !ready && !connectionError;
  const withThreads = visibleTargets.filter((target) => target.thread);
  const withoutThreads = visibleTargets.filter((target) => !target.thread);

  const conversationRow = (target: ConversationTarget) => (
    <li key={target.key}>
      <ConversationRow
        active={activeKey === target.key}
        currentUserId={currentUserId}
        flagged
        now={now}
        onChoose={chooseTarget}
        target={target}
        unread={targetUnread(target, reads, currentUserId)}
      />
    </li>
  );

  return (
    <section
      className="communications-center"
      data-conversation-open={Boolean(activeTarget)}
      data-requirement="Implements: REQ-COMM-01 REQ-COMM-02 REQ-COMM-03 REQ-COMM-04 REQ-COMM-08"
    >
      <p aria-atomic="true" className="communications-feedback sr-only" role="status">
        {ui.feedback}
      </p>

      <div className="communications-layout" data-conversation-open={Boolean(activeTarget)}>
        <div className="communications-stream" inert={phone && Boolean(activeTarget)}>
          <header className="page-head communications-heading">
            <div>
              <h1>Avisos y mensajes</h1>
              <p>
                {teaching
                  ? "Lo nuevo de tus secciones y las consultas privadas de tus estudiantes."
                  : "Lo nuevo de tus ramos y tus conversaciones privadas con el equipo docente."}
              </p>
            </div>
            <div className="communications-summary">
              <p
                className="sr-only"
                aria-label={
                  connectionError
                    ? "Comunicaciones sin sincronizar"
                    : loading
                      ? "Sincronizando comunicaciones"
                      : `${unread} elementos no leídos`
                }
                role="status"
              >
                {connectionError ? (
                  "Sin sincronizar"
                ) : loading ? (
                  "Sincronizando…"
                ) : unread === 0 ? (
                  "Al día"
                ) : (
                  <>
                    <span className="num">{unread}</span> sin leer
                  </>
                )}
              </p>
              {ready && !connectionError && unread > 0 && (
                <button className="communications-read-all" onClick={markAll} type="button">
                  <Checks aria-hidden="true" size={17} />
                  Marcar todo como leído
                </button>
              )}
            </div>
          </header>

          {(connectionError || (ui.notice && !activeTarget)) && (
            <div className="communications-error" role="alert">
              <WarningCircle aria-hidden="true" size={18} weight="fill" />
              <p>{connectionError || ui.notice}</p>
              {connectionError && retry && (
                <button className="secondary-button" onClick={retry} type="button">
                  Reintentar conexión
                </button>
              )}
            </div>
          )}

          {loading ? (
            <PendingBandSkeleton />
          ) : (
            !connectionError && (
              <section aria-labelledby="pending-title" className="pending-band">
                <h2 id="pending-title">
                  Sin leer
                  {pendingCount > 0 && <span className="num">{pendingCount}</span>}
                </h2>
                {pendingGroups.length === 0 ? (
                  <div className="pending-clear">
                    <CheckCircle aria-hidden="true" size={26} />
                    <div>
                      <h3>Todo al día</h3>
                      <p>
                        {teaching
                          ? "Las consultas nuevas de tus estudiantes y lo publicado en tus secciones aparecerán aquí."
                          : "Lo nuevo de tus ramos y las respuestas del equipo docente aparecerán aquí."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="pending-grid">
                    <AnimatePresence initial={false} mode="popLayout">
                      {pendingGroups.map((group) => (
                        <PendingStack
                          course={courseMap.get(group.courseId)}
                          group={group}
                          key={group.courseId}
                          now={now}
                          onMarkRead={markGroupRead}
                          onOpen={openPending}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            )
          )}

          <section aria-labelledby="history-title" className="communications-history">
            <div className="communications-history-head">
              <h2 id="history-title">Historial</h2>
              <div
                aria-label="Historial de avisos y mensajes"
                aria-orientation="horizontal"
                className="communications-tabs"
                onKeyDown={onTabsKey}
                role="tablist"
                tabIndex={-1}
              >
                {MODES.map((mode) => {
                  const selected = ui.mode === mode.id;
                  return (
                    <button
                      aria-controls="communications-history-panel"
                      aria-selected={selected}
                      id={`communications-tab-${mode.id}`}
                      key={mode.id}
                      onClick={() => chooseMode(mode.id)}
                      role="tab"
                      tabIndex={selected ? 0 : -1}
                      type="button"
                    >
                      {selected && (
                        <m.span
                          aria-hidden="true"
                          className="communications-tab-indicator"
                          layoutId="communications-tab-indicator"
                          transition={SPRING_LAYOUT}
                        />
                      )}
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              aria-labelledby={`communications-tab-${ui.mode}`}
              className="communications-panel"
              id="communications-history-panel"
              role="tabpanel"
            >
              {ui.mode === "messages" ? (
                <aside aria-label="Conversaciones" className="conversation-list-panel">
                  {targets.length > 0 && (
                    <label className="conversation-search">
                      <MagnifyingGlass aria-hidden="true" size={17} />
                      <input
                        aria-label="Buscar conversaciones"
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={teaching ? "Buscar estudiante o ramo" : "Buscar ramo"}
                        type="search"
                        value={search}
                      />
                    </label>
                  )}
                  {targets.length === 0 && loading ? (
                    <ConversationListSkeleton />
                  ) : targets.length === 0 ? (
                    <div className="communications-empty">
                      <ChatCircleText aria-hidden="true" size={30} />
                      <h3>
                        {connectionError ? "Conversaciones no disponibles" : "Sin conversaciones"}
                      </h3>
                      <p>
                        {connectionError
                          ? "Espera a que se actualice la lista o reintenta la conexión."
                          : "Aparecerán al contar con una matrícula activa o una consulta estudiantil."}
                      </p>
                    </div>
                  ) : visibleTargets.length === 0 ? (
                    <p className="conversation-no-results" role="status">
                      No hay conversaciones para «{search}».{" "}
                      <button onClick={() => setSearch("")} type="button">
                        Limpiar búsqueda
                      </button>
                    </p>
                  ) : (
                    <div className={initialPending ? "conversation-groups resolve" : undefined}>
                      {withThreads.length > 0 && (
                        <ol aria-label="Conversaciones recientes" className="conversation-list">
                          {withThreads.map(conversationRow)}
                        </ol>
                      )}
                      {withoutThreads.length > 0 && (
                        <>
                          <h3 className="communications-group-label">Escribir al equipo docente</h3>
                          <ol className="conversation-list">
                            {withoutThreads.map(conversationRow)}
                          </ol>
                        </>
                      )}
                    </div>
                  )}
                </aside>
              ) : loading ? (
                <HistoryListSkeleton />
              ) : historyDays.length === 0 ? (
                <div className="communications-empty">
                  {connectionError ? (
                    <CloudSlash aria-hidden="true" size={30} />
                  ) : (
                    <ChatCircleText aria-hidden="true" size={30} />
                  )}
                  <h3>
                    {connectionError
                      ? "Avisos no disponibles"
                      : pendingCount > 0
                        ? "Nada más por ahora"
                        : ui.mode === "announcements"
                          ? "Sin avisos"
                          : "Sin actividad todavía"}
                  </h3>
                  <p>
                    {connectionError
                      ? "No pudimos comprobar las novedades. Reintenta para ver los avisos de tus secciones."
                      : pendingCount > 0
                        ? "Lo que ya revisaste queda registrado aquí, ordenado por día."
                        : ui.mode === "announcements"
                          ? "Los avisos, guías y evaluaciones de tus ramos aparecerán aquí."
                          : teaching
                            ? "Lo que publiques en tus secciones y las consultas de tus estudiantes quedarán registrados aquí."
                            : "Lo que publique el equipo docente y tus consultas quedarán registrados aquí."}
                  </p>
                </div>
              ) : (
                <ol
                  className={
                    initialPending ? "communications-list resolve-children" : "communications-list"
                  }
                >
                  {historyDays.map(([day, entries]) => (
                    <li className="communications-day" key={day}>
                      <h3>{dayLabel(day, now)}</h3>
                      <ul>
                        {entries.map((entry) => (
                          <li key={`${entry.type}:${entry.key}`}>
                            {entry.type === "announcement" ? (
                              <AnnouncementRow
                                course={courseMap.get(entry.item.courseId)}
                                item={entry.item}
                                now={now}
                                onOpen={openAnnouncement}
                              />
                            ) : (
                              <ConversationRow
                                active={activeKey === entry.target.key}
                                currentUserId={currentUserId}
                                now={now}
                                onChoose={chooseTarget}
                                target={entry.target}
                                unread={targetUnread(entry.target, reads, currentUserId)}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>

        <AnimatePresence>
          {activeTarget && (
            <ConversationSheet
              composerHint={ui.composerHint}
              currentUserId={currentUserId}
              draft={draft}
              key="conversation"
              loading={ui.loadingMessages}
              messages={ui.messages}
              notice={ui.notice}
              now={now}
              onClose={closeConversation}
              onDraft={setDraft}
              onRetry={() => {
                updateUi({ threadError: "", loadingMessages: true });
                setMessageRetry((value) => value + 1);
              }}
              onSubmit={() => void submitMessage()}
              outgoing={ui.outgoing}
              phone={phone}
              readAtOnOpen={ui.readAtOnOpen}
              sending={ui.sending}
              target={activeTarget}
              textarea={textarea}
              threadError={ui.threadError}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
