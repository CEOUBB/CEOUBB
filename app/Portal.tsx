"use client";

import { Suspense, use } from "react";
import { browser, createPortal } from "react-dom";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { usePortalCore } from "./usePortalCore";
import { LoadingScreen } from "./LoadingScreen";
import { PortalHeader, PortalMainView, PortalSidebar } from "./portal-shell";
import { MobileCoursePreviewSheet, MobileCoursesSheet } from "./portal-sheets";
import { CommandPalette } from "./command-palette";
import { MobileBottomNav } from "./mobile-shell";
import type { SessionState } from "../lib/portal-utils";
import { AccessScreen } from "./access-screen";
import "./campus-base.css";
import "./mobile-shell.css";
import "./campus.css";

export { LoadingScreen };

// Implements: REQ-BROWSER-01
export function ClientPortal({
  children,
  container,
}: {
  children: React.ReactNode;
  container?: Element | DocumentFragment | null;
}) {
  use(browser("ClientPortal requires DOM environment"));
  const target = container ?? (typeof document !== "undefined" ? document.body : null);
  if (!target) return null;
  return createPortal(children, target);
}

// Section partition: partitionAcademicCourses and current.map((item) => item.id)
// Academic courses loader: loadMyCourses

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
    communicationsReady,
    retryCommunications,
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
    <LazyMotion key={user.id} features={domAnimation}>
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
            onManageCourses={
              user.role === "teacher" || user.role === "owner"
                ? () => setScreen("teacher")
                : undefined
            }
            onAdministration={user.role === "owner" ? () => setScreen("admin") : undefined}
            sidebarOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen((open) => !open)}
            unreadCommunications={unreadCommunications}
            user={user}
          />
          <Suspense fallback={null}>
            <CommandPalette items={paletteItems} onOpenChange={setSearchOpen} open={searchOpen} />
          </Suspense>
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
            communicationsReady={communicationsReady}
            retryCommunications={retryCommunications}
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
