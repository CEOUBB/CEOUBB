"use client";

import { useEffect, useMemo, useReducer, useRef, type FormEvent, type RefObject } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChatCircleText,
  CheckCircle,
  Checks,
  ClipboardText,
  LinkSimple,
  Megaphone,
  PaperPlaneTilt,
  type Icon,
} from "@phosphor-icons/react";
import type { Course } from "../../lib/courses.ts";
import { ConversationSkeleton } from "./ViewSkeletons";
import {
  announcementCursorKey,
  canListStudentThreads,
  firebaseUserId,
  readCursorMap,
  threadCursorKey,
  timestampIsUnread,
  unreadCommunicationCount,
  type CommunicationReadCursor,
  type DirectMessage,
  type MessageThreadSummary,
} from "../../lib/communications.ts";
import type { CourseActivity } from "../../lib/firebase-classroom-client.ts";
import {
  markCommunicationRead,
  sendDirectMessage,
  watchDirectMessages,
} from "../../lib/firebase-classroom-client.ts";
import type { User } from "../../lib/portal-utils.ts";
import type { SectionMembership } from "../../lib/section-roles.ts";

type CommunicationsMode = "announcements" | "messages";

type ConversationTarget = {
  key: string;
  courseId: string;
  threadId: string;
  heading: string;
  detail: string;
  tone: string;
  teaching: boolean;
  thread: MessageThreadSummary | null;
};

type CommunicationsUiState = {
  mode: CommunicationsMode;
  selected: ConversationTarget | null;
  messages: DirectMessage[];
  loadingMessages: boolean;
  messageError: string;
  feedback: string;
  body: string;
  sending: boolean;
};

const INITIAL_COMMUNICATIONS_UI: CommunicationsUiState = {
  mode: "announcements",
  selected: null,
  messages: [],
  loadingMessages: false,
  messageError: "",
  feedback: "",
  body: "",
  sending: false,
};

function updateCommunicationsUi(
  state: CommunicationsUiState,
  patch: Partial<CommunicationsUiState>
): CommunicationsUiState {
  return { ...state, ...patch };
}

const COMMUNICATION_KIND: Record<CourseActivity["kind"], { label: string; Icon: Icon }> = {
  notice: { label: "Aviso", Icon: Megaphone },
  guide: { label: "Guía", Icon: BookOpen },
  assessment: { label: "Evaluación", Icon: ClipboardText },
  resource: { label: "Recurso", Icon: LinkSimple },
};

const COMMUNICATION_DATE = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Santiago",
});

function communicationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : COMMUNICATION_DATE.format(date);
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
    const teaching = canListStudentThreads(user.role, membership.role);
    if (teaching) {
      for (const thread of threads.filter((item) => item.courseId === membership.sectionId)) {
        targets.push({
          key: `${thread.courseId}:${thread.id}`,
          courseId: thread.courseId,
          threadId: thread.id,
          heading: thread.studentName,
          detail: `${courseName} · ${thread.studentEmail}`,
          tone,
          teaching: true,
          thread,
        });
      }
    } else {
      const thread =
        threads.find(
          (item) => item.courseId === membership.sectionId && item.studentId === userId
        ) ?? null;
      targets.push({
        key: `${membership.sectionId}:${userId}`,
        courseId: membership.sectionId,
        threadId: userId,
        heading: courseName,
        detail: `${courseCode} · Equipo docente`,
        tone,
        teaching: false,
        thread,
      });
    }
  }

  return targets.sort((left, right) => {
    if (left.thread && right.thread)
      return right.thread.updatedAt.localeCompare(left.thread.updatedAt);
    if (left.thread) return -1;
    if (right.thread) return 1;
    return left.heading.localeCompare(right.heading, "es-CL");
  });
}

function CommunicationsPanels({
  mode,
  activity,
  courseMap,
  reads,
  openAnnouncement,
  activeTarget,
  targets,
  currentUserId,
  chooseTarget,
  closeConversation,
  loadingMessages,
  messages,
  messagesEnd,
  submitMessage,
  body,
  setBody,
  textarea,
  sending,
}: {
  mode: CommunicationsMode;
  activity: CourseActivity[];
  courseMap: ReadonlyMap<string, Course>;
  reads: ReadonlyMap<string, string>;
  openAnnouncement: (item: CourseActivity) => void;
  activeTarget: ConversationTarget | null;
  targets: ConversationTarget[];
  currentUserId: string;
  chooseTarget: (target: ConversationTarget) => void;
  closeConversation: () => void;
  loadingMessages: boolean;
  messages: DirectMessage[];
  messagesEnd: RefObject<HTMLDivElement | null>;
  submitMessage: (event: FormEvent<HTMLFormElement>) => void;
  body: string;
  setBody: (body: string) => void;
  textarea: RefObject<HTMLTextAreaElement | null>;
  sending: boolean;
}) {
  if (mode === "announcements") {
    return (
      <div
        aria-labelledby="communications-announcements-tab"
        className="communications-panel"
        id="communications-announcements"
        role="tabpanel"
        tabIndex={0}
      >
        {activity.length === 0 ? (
          <div className="communications-empty">
            <CheckCircle aria-hidden="true" size={30} weight="duotone" />
            <h2>Todo al día</h2>
            <p>Los avisos de tus ramos aparecerán aquí cuando el equipo docente publique.</p>
          </div>
        ) : (
          <ol className="announcement-list">
            {activity.map((item) => {
              const course = courseMap.get(item.courseId);
              const details = COMMUNICATION_KIND[item.kind];
              const ItemIcon = details.Icon;
              const isUnread = timestampIsUnread(
                item.createdAt,
                reads.get(announcementCursorKey(item.courseId))
              );
              return (
                <li key={`${item.courseId}:${item.id}`}>
                  <button
                    aria-label={`${item.title}, ${course?.name ?? item.courseId}${
                      isUnread ? ", no leído" : ""
                    }`}
                    className="announcement-row"
                    data-unread={isUnread}
                    onClick={() => openAnnouncement(item)}
                    style={
                      {
                        "--course-tone": course?.tone ?? "var(--color-primary)",
                      } as React.CSSProperties
                    }
                    type="button"
                  >
                    <span aria-hidden="true" className="announcement-icon">
                      <ItemIcon size={20} weight="duotone" />
                    </span>
                    <span className="announcement-copy">
                      <span className="announcement-meta">
                        <strong>{course?.name ?? `Sección ${item.courseId}`}</strong>
                        <span>{details.label}</span>
                      </span>
                      <span className="announcement-title">{item.title}</span>
                      <time className="num" dateTime={item.createdAt}>
                        {communicationDate(item.createdAt)}
                      </time>
                    </span>
                    {isUnread && <span aria-hidden="true" className="announcement-unread" />}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div
      aria-labelledby="communications-messages-tab"
      className="communications-panel communications-messages"
      data-conversation-open={Boolean(activeTarget)}
      data-empty={targets.length === 0}
      id="communications-messages"
      role="tabpanel"
      tabIndex={0}
    >
      <aside aria-label="Conversaciones" className="conversation-list-panel">
        <div className="conversation-list-heading">
          <div>
            <h2>Conversaciones</h2>
            <p>
              {targets.some((target) => target.teaching)
                ? "Consultas privadas de tus secciones."
                : "Escribir al equipo docente de cada ramo."}
            </p>
          </div>
          <span className="num">{targets.length}</span>
        </div>
        {targets.length === 0 ? (
          <div className="communications-empty compact">
            <ChatCircleText aria-hidden="true" size={28} weight="duotone" />
            <h3>Sin conversaciones</h3>
            <p>Aparecerán al contar con una matrícula activa o una consulta estudiantil.</p>
          </div>
        ) : (
          <ol className="conversation-list">
            {targets.map((target) => {
              const itemUnread =
                target.thread?.latestAuthorId !== currentUserId &&
                Boolean(
                  target.thread &&
                  timestampIsUnread(
                    target.thread.updatedAt,
                    reads.get(threadCursorKey(target.courseId, target.threadId))
                  )
                );
              return (
                <li key={target.key}>
                  <button
                    aria-current={activeTarget?.key === target.key ? "true" : undefined}
                    className="conversation-row"
                    data-active={activeTarget?.key === target.key}
                    data-unread={itemUnread}
                    onClick={() => chooseTarget(target)}
                    style={{ "--course-tone": target.tone } as React.CSSProperties}
                    type="button"
                  >
                    <span aria-hidden="true" className="conversation-avatar">
                      {target.teaching ? (
                        target.heading.charAt(0).toUpperCase()
                      ) : (
                        <ChatCircleText size={20} />
                      )}
                    </span>
                    <span className="conversation-copy">
                      <strong>{target.heading}</strong>
                      <small>{target.detail}</small>
                      <span>{target.thread?.latestBody ?? "Iniciar una consulta privada"}</span>
                    </span>
                    {itemUnread && (
                      <span aria-label="No leído" className="conversation-unread" role="img" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </aside>

      <section
        aria-label="Conversación seleccionada"
        className="conversation-panel"
        hidden={targets.length === 0}
      >
        {activeTarget ? (
          <>
            <header className="conversation-heading">
              <button
                aria-label="Volver a las conversaciones"
                className="conversation-back"
                onClick={closeConversation}
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={19} />
              </button>
              <span
                aria-hidden="true"
                className="conversation-heading-mark"
                style={{ "--course-tone": activeTarget.tone } as React.CSSProperties}
              />
              <div>
                <h2>{activeTarget.heading}</h2>
                <p>{activeTarget.detail}</p>
              </div>
            </header>

            <div aria-busy={loadingMessages} aria-live="polite" className="message-history">
              {loadingMessages ? (
                <ConversationSkeleton />
              ) : messages.length === 0 ? (
                <div className="message-empty">
                  <ChatCircleText aria-hidden="true" size={28} weight="duotone" />
                  <p>
                    {activeTarget.teaching
                      ? "Esta consulta aún no tiene mensajes."
                      : "Escribe tu consulta. Sólo tú y el equipo docente de esta sección podrán verla."}
                  </p>
                </div>
              ) : (
                <ol className="message-list">
                  {messages.map((message) => {
                    const own = message.authorId === currentUserId;
                    return (
                      <li className={own ? "own" : undefined} key={message.id}>
                        <article className="message-bubble">
                          <strong>{own ? "Tú" : message.authorName}</strong>
                          <p>{message.body}</p>
                          <time className="num" dateTime={message.createdAt}>
                            {communicationDate(message.createdAt)}
                          </time>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              )}
              <div ref={messagesEnd} />
            </div>

            <form className="message-composer" onSubmit={submitMessage}>
              <label htmlFor="direct-message-body">Mensaje</label>
              <div className="message-composer-field">
                <textarea
                  aria-describedby="direct-message-counter"
                  id="direct-message-body"
                  maxLength={2000}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={
                    activeTarget.teaching
                      ? "Responder esta consulta…"
                      : "Escribe tu consulta al equipo docente…"
                  }
                  ref={textarea}
                  rows={3}
                  value={body}
                />
                <span className="num" id="direct-message-counter">
                  {body.length}/2.000
                </span>
              </div>
              <button className="message-send" disabled={sending} type="submit">
                <PaperPlaneTilt aria-hidden="true" size={18} weight="fill" />
                {sending ? "Enviando…" : "Enviar mensaje"}
              </button>
            </form>
          </>
        ) : (
          <div className="conversation-placeholder">
            <ChatCircleText aria-hidden="true" size={36} weight="duotone" />
            <h2>Elige una conversación</h2>
            <p>El historial privado y el espacio para responder aparecerán aquí.</p>
          </div>
        )}
      </section>
    </div>
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
  focusThread?: string;
  openCourse: (course: Course) => void;
}) {
  const [ui, updateUi] = useReducer(updateCommunicationsUi, INITIAL_COMMUNICATIONS_UI);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const currentUserId = firebaseUserId(user.id);
  const reads = useMemo(() => readCursorMap(cursors), [cursors]);
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const targets = useMemo(
    () => buildConversationTargets(user, courses, memberships, threads),
    [user, courses, memberships, threads]
  );
  const unread = useMemo(
    () => unreadCommunicationCount(activity, threads, cursors, currentUserId),
    [activity, threads, cursors, currentUserId]
  );
  const unreadAnnouncements = useMemo(
    () =>
      activity.filter((item) =>
        timestampIsUnread(item.createdAt, reads.get(announcementCursorKey(item.courseId)))
      ).length,
    [activity, reads]
  );
  const unreadThreads = useMemo(
    () =>
      threads.filter(
        (item) =>
          item.latestAuthorId !== currentUserId &&
          timestampIsUnread(item.updatedAt, reads.get(threadCursorKey(item.courseId, item.id)))
      ).length,
    [threads, reads, currentUserId]
  );
  const activeTarget = ui.selected
    ? (targets.find((target) => target.key === ui.selected?.key) ?? ui.selected)
    : null;
  const activeCourseId = activeTarget?.courseId ?? "";
  const activeThreadId = activeTarget?.threadId ?? "";

  useEffect(() => {
    if (!activeCourseId || !activeThreadId) return;
    return watchDirectMessages(
      activeCourseId,
      activeThreadId,
      (next) => {
        updateUi({ messages: next, loadingMessages: false });
      },
      (error) => {
        updateUi({ messageError: error, loadingMessages: false });
      }
    );
  }, [activeCourseId, activeThreadId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: "end" });
  }, [ui.messages]);

  /*
    El panel del header abre una conversación concreta. La selección se aplica
    cuando el destino ya existe entre los objetivos calculados; hasta entonces
    la vista queda en la pestaña de avisos y no pierde el foco del usuario.
  */
  // Implements: REQ-NOTIF-03
  useEffect(() => {
    if (!focusThread) return;
    const target = targets.find((item) => item.key === focusThread);
    if (!target) return;
    updateUi({
      mode: "messages",
      selected: target,
      messages: [],
      loadingMessages: true,
      messageError: "",
      feedback: "",
    });
  }, [focusThread, targets]);

  const chooseTarget = (target: ConversationTarget) => {
    updateUi({
      selected: target,
      messages: [],
      loadingMessages: true,
      messageError: "",
      feedback: "",
    });
    if (target.thread) {
      void markCommunicationRead([threadCursorKey(target.courseId, target.threadId)]).catch(
        (cause) => {
          updateUi({
            messageError:
              cause instanceof Error
                ? cause.message
                : "No se pudo actualizar el estado de lectura.",
          });
        }
      );
    }
  };

  const closeConversation = () => {
    updateUi({
      selected: null,
      messages: [],
      loadingMessages: false,
      messageError: "",
      feedback: "",
    });
  };

  const openAnnouncement = (item: CourseActivity) => {
    updateUi({ feedback: "" });
    void markCommunicationRead([announcementCursorKey(item.courseId)]).catch((cause) => {
      updateUi({
        messageError:
          cause instanceof Error ? cause.message : "No se pudo actualizar el estado de lectura.",
      });
    });
    const course = courseMap.get(item.courseId);
    if (course) openCourse(course);
  };

  const markAll = async () => {
    updateUi({ messageError: "", feedback: "" });
    const threadKeys = threads.reduce<string[]>((keys, item) => {
      if (item.latestAuthorId !== currentUserId) {
        keys.push(threadCursorKey(item.courseId, item.id));
      }
      return keys;
    }, []);
    const keys = [
      ...new Set(activity.map((item) => announcementCursorKey(item.courseId))),
      ...threadKeys,
    ];
    try {
      await markCommunicationRead(keys);
      updateUi({ feedback: "Todo quedó marcado como leído." });
    } catch (cause) {
      updateUi({
        messageError:
          cause instanceof Error ? cause.message : "No se pudo actualizar el estado de lectura.",
      });
    }
  };

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTarget || ui.sending) return;
    updateUi({ messageError: "", feedback: "", sending: true });
    try {
      await sendDirectMessage(activeTarget.courseId, activeTarget.threadId, ui.body);
      updateUi({ body: "", feedback: "Mensaje enviado." });
      await markCommunicationRead([threadCursorKey(activeTarget.courseId, activeTarget.threadId)]);
      textarea.current?.focus();
    } catch (cause) {
      updateUi({
        messageError: cause instanceof Error ? cause.message : "No se pudo enviar el mensaje.",
      });
      textarea.current?.focus();
    } finally {
      updateUi({ sending: false });
    }
  };

  return (
    <section
      className="communications-center"
      data-requirement="Implements: REQ-COMM-01 REQ-COMM-02 REQ-COMM-03 REQ-COMM-04 REQ-COMM-08"
    >
      <header className="page-head communications-heading">
        <div>
          <h1>Avisos y mensajes</h1>
          <p>Revisa lo nuevo en tus ramos y conversa en privado con el equipo docente.</p>
        </div>
        <div className="communications-summary" aria-label={`${unread} elementos no leídos`}>
          <span className="num">{unread}</span>
          <small>{unread === 1 ? "pendiente" : "pendientes"}</small>
        </div>
      </header>

      <div className="communications-toolbar">
        <div
          aria-label="Secciones del centro de comunicaciones"
          className="communications-tabs"
          role="tablist"
        >
          <button
            aria-controls="communications-announcements"
            aria-selected={ui.mode === "announcements"}
            id="communications-announcements-tab"
            onClick={() => {
              updateUi({ mode: "announcements" });
              closeConversation();
            }}
            role="tab"
            type="button"
          >
            <Bell
              aria-hidden="true"
              size={18}
              weight={ui.mode === "announcements" ? "fill" : "regular"}
            />
            Avisos
            {unreadAnnouncements > 0 && (
              <span className="communications-tab-count num">{unreadAnnouncements}</span>
            )}
          </button>
          <button
            aria-controls="communications-messages"
            aria-selected={ui.mode === "messages"}
            id="communications-messages-tab"
            onClick={() => updateUi({ mode: "messages" })}
            role="tab"
            type="button"
          >
            <ChatCircleText
              aria-hidden="true"
              size={18}
              weight={ui.mode === "messages" ? "fill" : "regular"}
            />
            Mensajes
            {unreadThreads > 0 && (
              <span className="communications-tab-count num">{unreadThreads}</span>
            )}
          </button>
        </div>
        {unread > 0 && (
          <button className="communications-read-all" onClick={() => void markAll()} type="button">
            <Checks aria-hidden="true" size={18} />
            Marcar todo como leído
          </button>
        )}
      </div>

      <p aria-atomic="true" className="communications-feedback" role="status">
        {ui.feedback}
      </p>
      {(connectionError || ui.messageError) && (
        <p className="communications-error" role="alert">
          {ui.messageError || connectionError}
        </p>
      )}

      <CommunicationsPanels
        activeTarget={activeTarget}
        activity={activity}
        body={ui.body}
        chooseTarget={chooseTarget}
        closeConversation={closeConversation}
        courseMap={courseMap}
        currentUserId={currentUserId}
        loadingMessages={ui.loadingMessages}
        messages={ui.messages}
        messagesEnd={messagesEnd}
        mode={ui.mode}
        openAnnouncement={openAnnouncement}
        reads={reads}
        sending={ui.sending}
        setBody={(body) => updateUi({ body })}
        submitMessage={submitMessage}
        targets={targets}
        textarea={textarea}
      />
    </section>
  );
}
