"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChalkboardTeacher, GraduationCap } from "@phosphor-icons/react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { usePortalCore } from "./usePortalCore";
import { LoadingScreen } from "./LoadingScreen";
import { PortalHeader, PortalMainView, PortalSidebar } from "./portal-shell";
import { MobileCoursePreviewSheet, MobileCoursesSheet } from "./portal-sheets";
import { CommandPalette } from "./command-palette";
import { MobileBottomNav } from "./mobile-shell";
import { parseAcademicSections } from "../lib/courses";
import { rememberPhoto, type SessionState, type User } from "../lib/portal-utils";
import { parseSectionMemberships } from "../lib/section-roles";

export { LoadingScreen };

// Section partition: partitionAcademicCourses and current.map((item) => item.id)
// Academic courses loader: loadMyCourses

// Implements: REQ-AUTH-01, REQ-QMD-01
export function AccessScreen({
  onSignedIn,
  onSignedInWithSession,
  isQuickAuthAvailable,
}: {
  onSignedIn?: (user: User) => void;
  onSignedInWithSession?: (session: SessionState) => void;
  isQuickAuthAvailable?: boolean;
}) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const finishGoogleAccess = useCallback(
    async (idToken: string) => {
      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        let errorMessage = "No fue posible continuar.";
        try {
          const errorData = await response.json();
          if (errorData?.error) errorMessage = errorData.error;
        } catch {
          // Non-JSON response
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data.photoUrl) rememberPhoto(data.user.email, data.photoUrl);
      if (data.sections && onSignedInWithSession) {
        onSignedInWithSession({
          user: data.user,
          sectionIds: Array.isArray(data.sectionIds)
            ? data.sectionIds.filter((value: unknown): value is string => typeof value === "string")
            : [],
          memberships: parseSectionMemberships(data.memberships),
          sections: Array.isArray(data.sections) ? parseAcademicSections(data.sections) : null,
          archivedNextCursor:
            typeof data.archivedNextCursor === "string" ? data.archivedNextCursor : null,
        });
      } else if (onSignedIn) {
        onSignedIn(data.user);
      }
    },
    [onSignedIn, onSignedInWithSession]
  );

  const googleAccess = async () => {
    setError("");
    setWorking(true);
    try {
      const { signInWithInstitutionalGoogle } = await import("../lib/firebase-client");
      const idToken = await signInWithInstitutionalGoogle();
      await finishGoogleAccess(idToken);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible continuar.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  const quickAuthActive =
    isQuickAuthAvailable ??
    (process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "preview" ||
      process.env.NEXT_PUBLIC_CEOUBB_ENVIRONMENT === "staging");

  const devAccess = async (role: "student" | "teacher") => {
    setError("");
    setWorking(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        let errorMessage = "No fue posible acceder en modo testing.";
        try {
          const errorData = await response.json();
          if (errorData?.error) errorMessage = errorData.error;
        } catch {
          // Non-JSON response
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data.photoUrl) rememberPhoto(data.user.email, data.photoUrl);
      if (data.sections && onSignedInWithSession) {
        onSignedInWithSession({
          user: data.user,
          sectionIds: Array.isArray(data.sectionIds)
            ? data.sectionIds.filter((value: unknown): value is string => typeof value === "string")
            : [],
          memberships: parseSectionMemberships(data.memberships),
          sections: Array.isArray(data.sections) ? parseAcademicSections(data.sections) : null,
          archivedNextCursor:
            typeof data.archivedNextCursor === "string" ? data.archivedNextCursor : null,
        });
      } else if (onSignedIn) {
        onSignedIn(data.user);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible acceder.";
      setError(message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <main className="access-page">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>
      <section className="access-brand">
        <div className="access-brand-lockup">
          <Image
            src="/brand/ubb-shield.webp"
            alt="Escudo de la Universidad del Bío-Bío"
            width={388}
            height={594}
            priority
          />
          <h1>
            Centro de <strong>Estudio UBB</strong>
          </h1>
        </div>
      </section>
      <section
        aria-labelledby="access-title"
        className="access-panel"
        id="contenido-principal"
        tabIndex={-1}
      >
        <div className="access-panel-inner">
          <div className="login-card" id="inicio">
            <span className="login-rule" aria-hidden="true" />
            <h2 id="access-title">Ingresa con tu correo institucional</h2>
            <button
              className="google-button"
              disabled={working}
              onClick={googleAccess}
              type="button"
            >
              {working ? (
                <span className="google-spinner" aria-hidden="true" />
              ) : (
                <Image
                  src="/brand/google-g.webp"
                  alt=""
                  aria-hidden="true"
                  width={256}
                  height={256}
                  priority
                />
              )}
              {working ? "Verificando cuenta…" : "Continuar con Google"}
            </button>
            {quickAuthActive && (
              <div
                className="dev-auth-container"
                role="region"
                aria-label="Accesos rápidos de testing"
              >
                <div className="dev-auth-divider">
                  <span>Accesos rápidos de prueba</span>
                </div>
                <div className="dev-auth-actions">
                  <button
                    className="dev-auth-button dev-auth-button-student"
                    disabled={working}
                    onClick={() => devAccess("student")}
                    type="button"
                  >
                    <GraduationCap aria-hidden="true" size={18} weight="bold" />
                    <span>Entrar como estudiante</span>
                  </button>
                  <button
                    className="dev-auth-button dev-auth-button-teacher"
                    disabled={working}
                    onClick={() => devAccess("teacher")}
                    type="button"
                  >
                    <ChalkboardTeacher aria-hidden="true" size={18} weight="bold" />
                    <span>Entrar como docente</span>
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="institution-note">
              <strong>Acceso exclusivo UBB.</strong> Usa tu cuenta @alumnos.ubiobio.cl o
              @ubiobio.cl. Cualquier otra universidad o correo personal será rechazado.
            </p>
          </div>
          <div className="store-block">
            <div
              className="store-badges"
              role="group"
              aria-label="Aplicaciones móviles próximamente disponibles"
            >
              <div className="store-badge">
                <Image
                  src="/brand/app-store-badge-es.webp"
                  alt="App Store"
                  width={3840}
                  height={1284}
                />
              </div>
              <div className="store-badge">
                <Image
                  src="/brand/google-play-badge-es.webp"
                  alt="Google Play"
                  width={2214}
                  height={675}
                />
              </div>
            </div>
          </div>

          <p className="legal-note">
            Plataforma estudiantil independiente. No reemplaza los sistemas oficiales de la
            Universidad del Bío-Bío. <Link href="/faq">Preguntas frecuentes</Link> ·{" "}
            <Link href="/contacto">Contacto</Link> · <Link href="/privacidad">Privacidad</Link> ·{" "}
            <Link href="/terminos">Términos</Link> ·{" "}
            <Link href="/accesibilidad">Accesibilidad</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

// Implements: REQ-QMD-01
export function Portal({
  initialSession,
  isQuickAuthAvailable,
}: {
  initialSession?: SessionState;
  isQuickAuthAvailable?: boolean;
} = {}) {
  const core = usePortalCore(initialSession);

  if (core.checking) return <LoadingScreen />;
  if (!core.user) {
    return (
      <AccessScreen
        isQuickAuthAvailable={isQuickAuthAvailable}
        onSignedIn={core.finishSignedIn}
        onSignedInWithSession={core.finishSignedInWithSession}
      />
    );
  }

  const {
    user,
    courses,
    archivedCourses,
    archivedNextCursor,
    archivedLoading,
    loadMoreArchived,
    refreshCourses,
    activity,
    gradebooks,
    memberships,
    communications,
    communicationError,
    screen,
    preview,
    coursesSheet,
    focusThread,
    setScreen,
    setCoursesSheet,
    setPreview,
    sidebarOpen,
    setSidebarOpen,
    searchOpen,
    setSearchOpen,
    seen,
    mobile,
    prefersReducedMotion,
    notifications,
    notificationsLoading,
    unreadCommunications,
    enterCourse,
    openCourse,
    openNotification,
    markAllNotifications,
    logout,
    onPhotoChange,
    openedCourse,
    openedSectionRole,
    context,
    paletteItems,
    mobileTabs,
    entries,
  } = core;

  // Mobile navigation tabs reference: label: "Avisos"

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "user"}>
        <a className="skip-link" href="#contenido-principal">
          Saltar al contenido principal
        </a>
        <div
          className="app-shell"
          data-requirement="Implements: REQ-A11Y-01 REQ-A11Y-02 REQ-A11Y-05"
          data-mobile={mobile}
          data-sidebar={sidebarOpen ? "open" : "closed"}
        >
          <PortalHeader
            context={context}
            notifications={notifications}
            notificationsLoading={notificationsLoading}
            onHome={() => setScreen("courses")}
            onCommunications={() => setScreen("notifications")}
            onLogout={logout}
            onMarkAllNotifications={markAllNotifications}
            onOpenNotification={openNotification}
            onSearch={() => setSearchOpen(true)}
            onSettings={() => setScreen("settings")}
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen((open) => !open)}
            unreadCommunications={unreadCommunications}
            user={user}
          />
          <CommandPalette
            items={paletteItems}
            onClose={() => setSearchOpen(false)}
            open={searchOpen}
          />
          <PortalSidebar
            courses={courses}
            open={sidebarOpen}
            openCourse={openCourse}
            openCourseId={screen === "course" ? openedCourse?.id : undefined}
            screen={screen}
            setScreen={setScreen}
            user={user}
          />
          <button
            aria-label="Cerrar el menú"
            className="sidebar-scrim"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
          <PortalMainView
            activity={activity}
            archivedCourses={archivedCourses}
            archivedHasMore={archivedNextCursor !== null}
            archivedLoading={archivedLoading}
            communicationCursors={communications.cursors}
            communicationError={communicationError}
            communicationThreads={communications.threads}
            courses={courses}
            focusThread={focusThread}
            onLogout={logout}
            onPhotoChange={onPhotoChange}
            context={context}
            entries={entries}
            gradebooks={gradebooks}
            memberships={memberships}
            openCourse={openCourse}
            onLoadMoreArchived={loadMoreArchived}
            openedCourse={openedCourse}
            onCoursesChanged={refreshCourses}
            screen={screen}
            seen={seen}
            sectionRole={openedSectionRole}
            setScreen={setScreen}
            user={user}
          />
          {mobile && <MobileBottomNav items={mobileTabs} />}
          {mobile && (
            <MobileCoursesSheet
              courses={courses}
              onOpenChange={setCoursesSheet}
              open={coursesSheet}
              openCourse={openCourse}
              openedCourseId={openedCourse?.id}
              screen={screen}
            />
          )}
          {mobile && preview && (
            <MobileCoursePreviewSheet
              enterCourse={enterCourse}
              onClose={() => setPreview(null)}
              preview={preview}
            />
          )}
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
