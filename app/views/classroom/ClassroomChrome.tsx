"use client";

import { ViewTransition } from "react";
import type { Course } from "../../../lib/courses";
import { COURSE_TABS, type Tab } from "./classroom-utils";

// Implements: REQ-MOTION-04
export function ClassroomHeader({
  course,
  onBack,
  children,
}: {
  course: Course;
  onBack?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <header className="classroom-top">
      <ViewTransition default="none" name={`course-${course.id}`} share="course-divider">
        <span aria-hidden="true" className="classroom-tab num">
          {course.code}
        </span>
      </ViewTransition>
      <div className="classroom-heading">
        <span className="breadcrumb">
          <button onClick={onBack} type="button">
            Mis cursos
          </button>{" "}
          / {course.name}
        </span>
        <h1>{course.name}</h1>
        <p className="classroom-identity">
          <span className="num">{course.code}</span> · Sección{" "}
          <span className="num">{course.section}</span> · {course.period}
        </p>
      </div>
      {children}
    </header>
  );
}

// Implements: REQ-MOTION-06
export function ClassroomTabs({
  tab,
  onSelect,
  onKeyDown,
  inert = false,
}: {
  tab: Tab;
  onSelect?: (key: Tab) => void;
  onKeyDown?: (key: Tab, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  inert?: boolean;
}) {
  return (
    <div
      aria-hidden={inert || undefined}
      aria-label={inert ? undefined : "Secciones del aula"}
      aria-orientation="horizontal"
      className="course-tabs"
      inert={inert}
      role={inert ? undefined : "tablist"}
    >
      {COURSE_TABS.map(({ key, label, Icon }) => {
        const isActive = tab === key;
        return (
          <button
            aria-controls={inert ? undefined : `classroom-panel-${key}`}
            aria-selected={inert ? undefined : isActive}
            className={isActive ? "active" : undefined}
            id={inert ? undefined : `classroom-tab-${key}`}
            key={key}
            onClick={() => onSelect?.(key)}
            onKeyDown={(event) => onKeyDown?.(key, event)}
            role={inert ? undefined : "tab"}
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            {isActive && (
              <ViewTransition default="none" name="course-tab-indicator" share="tab-indicator">
                <span className="course-tab-indicator" aria-hidden="true" />
              </ViewTransition>
            )}
          </button>
        );
      })}
    </div>
  );
}
