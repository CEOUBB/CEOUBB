"use client";

import { useEffect, useState } from "react";
import { CaretRight, EyeSlash, ListBullets, Megaphone } from "@phosphor-icons/react";
import type { CoursePost } from "../../../lib/firebase-classroom-client";
import { sectionAnchor, type PageSectionView } from "../../../lib/course-page";
import { useHydratedReducedMotion } from "../../../lib/hooks/use-hydrated-reduced-motion";
import { formatDate } from "../../../lib/portal-utils";
import { MobileSheet } from "../../mobile-shell";

const INDEX_THRESHOLD = 3;

function useActiveSection(sectionIds: readonly string[]) {
  const [active, setActive] = useState("");
  const key = sectionIds.join("|");

  useEffect(() => {
    const anchors = key ? key.split("|").map(sectionAnchor) : [];
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = anchors.find((anchor) => visible.has(anchor));
        if (first) setActive(first);
      },
      { rootMargin: "-18% 0px -62% 0px" }
    );
    for (const anchor of anchors) {
      const element = document.getElementById(anchor);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [key]);

  return active;
}

function useJumpToSection() {
  const reducedMotion = useHydratedReducedMotion();
  return (sectionId: string) => {
    const target = document.getElementById(sectionAnchor(sectionId));
    if (!target) return;
    target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    target.querySelector<HTMLElement>("h2 button, h2 input, h2")?.focus({ preventScroll: true });
  };
}

function IndexList({
  sections,
  active,
  onJump,
}: {
  sections: readonly PageSectionView[];
  active: string;
  onJump: (sectionId: string) => void;
}) {
  return (
    <ol className="course-index-list">
      {sections.map((section) => (
        <li key={section.id}>
          <button
            aria-current={active === sectionAnchor(section.id) ? "location" : undefined}
            data-hidden={section.hidden}
            onClick={() => onJump(section.id)}
            type="button"
          >
            <span>{section.title}</span>
            {section.hidden && <EyeSlash aria-label="Oculta para estudiantes" size={14} />}
          </button>
        </li>
      ))}
    </ol>
  );
}

// Implements: REQ-PAGE-01
export function CourseIndex({ sections }: { sections: readonly PageSectionView[] }) {
  const active = useActiveSection(sections.map((section) => section.id));
  const jump = useJumpToSection();
  if (sections.length < INDEX_THRESHOLD) return null;
  return (
    <nav aria-labelledby="course-index-title" className="course-index">
      <div className="section-title compact-title">
        <h2 id="course-index-title">
          <ListBullets aria-hidden="true" size={19} weight="bold" />
          Contenido
        </h2>
      </div>
      <IndexList active={active} onJump={jump} sections={sections} />
    </nav>
  );
}

// Implements: REQ-PAGE-01, REQ-PAGE-09, REQ-CAP-05
export function CourseMobileBar({
  announcements,
  sections,
  onOpenAnnouncements,
}: {
  announcements: readonly CoursePost[];
  sections: readonly PageSectionView[];
  onOpenAnnouncements: (postId?: string) => void;
}) {
  const [indexOpen, setIndexOpen] = useState(false);
  const jump = useJumpToSection();
  const [latest] = announcements;

  return (
    <div className="course-mobile-bar">
      <button
        className="course-mobile-announcement"
        onClick={() => onOpenAnnouncements(latest?.id)}
        type="button"
      >
        <Megaphone aria-hidden="true" size={20} weight="fill" />
        <span>
          <strong>{latest ? latest.title : "Avisos"}</strong>
          <small>
            {latest ? (
              <>
                <span className="num">{formatDate(latest.createdAt)}</span>
                {announcements.length > 1 && (
                  <>
                    {" · "}
                    <span className="num">{announcements.length}</span> avisos
                  </>
                )}
              </>
            ) : (
              "No hay avisos publicados"
            )}
          </small>
        </span>
        <CaretRight aria-hidden="true" size={16} />
      </button>
      {sections.length >= INDEX_THRESHOLD && (
        <button className="course-mobile-index" onClick={() => setIndexOpen(true)} type="button">
          <ListBullets aria-hidden="true" size={18} weight="bold" />
          Secciones
        </button>
      )}
      <MobileSheet onOpenChange={setIndexOpen} open={indexOpen} title="Secciones del ramo">
        <IndexList
          active=""
          onJump={(sectionId) => {
            setIndexOpen(false);
            window.setTimeout(() => jump(sectionId), 320);
          }}
          sections={sections}
        />
      </MobileSheet>
    </div>
  );
}
