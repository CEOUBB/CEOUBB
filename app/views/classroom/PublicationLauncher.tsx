"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CaretDown, Check, Plus, SlidersHorizontal } from "@phosphor-icons/react";
import {
  EDITOR_MODES,
  createPublicationDraft,
  persistDefaultEditor,
  readDefaultEditor,
  type EditorMode,
  type PublicationDraft,
} from "../../../lib/publication-workflow";
import type { Note } from "./classroom-utils";
import { PublicationComposerDialog } from "./PublicationComposerDialog";
import { PublicationWizardDialog } from "./PublicationWizardDialog";

function readBrowserDefaultEditor() {
  try {
    return readDefaultEditor(window.localStorage);
  } catch {
    return null;
  }
}

function persistBrowserDefaultEditor(mode: EditorMode | null) {
  try {
    return persistDefaultEditor(window.localStorage, mode);
  } catch {
    return false;
  }
}

export function PublicationLauncher({
  folders,
  publish,
  status,
}: {
  folders: string[];
  publish: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  status: Note;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferredMode, setPreferredMode] = useState<EditorMode | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [draft, setDraft] = useState<PublicationDraft | null>(null);
  const defaultFolder = folders[0] ?? "";

  const openPreferred = () => {
    const preferred = readBrowserDefaultEditor();
    setPreferredMode(preferred);
    if (preferred) {
      setDraft(
        createPublicationDraft({
          contentType: "blank",
          editorMode: preferred,
          folder: defaultFolder,
          notificationMode: "push",
        })
      );
      return;
    }
    setWizardOpen(true);
  };

  const toggleMenu = () => {
    if (!menuOpen) setPreferredMode(readBrowserDefaultEditor());
    setMenuOpen((current) => !current);
  };

  const openMode = (mode: EditorMode) => {
    persistBrowserDefaultEditor(mode);
    setPreferredMode(mode);
    setMenuOpen(false);
    setDraft(
      createPublicationDraft({
        contentType: "blank",
        editorMode: mode,
        folder: defaultFolder,
        notificationMode: "push",
      })
    );
  };

  const openWizard = () => {
    setMenuOpen(false);
    setPreferredMode(readBrowserDefaultEditor());
    setWizardOpen(true);
  };

  const finishWizard = (nextDraft: PublicationDraft, remember: boolean) => {
    const nextPreference = remember ? nextDraft.editorMode : null;
    persistBrowserDefaultEditor(nextPreference);
    setPreferredMode(nextPreference);
    setWizardOpen(false);
    setDraft(nextDraft);
  };

  const handleKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && menuOpen) {
      event.preventDefault();
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: Event) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [menuOpen]);

  return (
    <>
      <div
        className="publication-split-wrap"
        data-requirement="Implements: REQ-PUB-01 REQ-PUB-02 REQ-PUB-05 REQ-PUB-08"
        role="group"
        aria-label="Crear una publicación"
        ref={rootRef}
      >
        <div className="publication-split">
          <button
            className="publication-split-main"
            onClick={openPreferred}
            onKeyDown={handleKeys}
            type="button"
          >
            <Plus size={17} weight="bold" aria-hidden="true" />
            Nueva publicación
          </button>
          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Elegir formato de publicación"
            className="publication-split-toggle"
            onClick={toggleMenu}
            onKeyDown={handleKeys}
            type="button"
          >
            <CaretDown size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>
        {menuOpen && (
          <div
            aria-label="Formatos de publicación"
            className="publication-menu"
            id={menuId}
            onKeyDown={handleKeys}
            role="menu"
            tabIndex={-1}
          >
            <p>Empezar directamente con</p>
            {EDITOR_MODES.map((mode) => (
              <button
                aria-checked={preferredMode === mode.value}
                key={mode.value}
                onClick={() => openMode(mode.value)}
                role="menuitemradio"
                type="button"
              >
                <span>
                  <strong>{mode.label}</strong>
                  <small>{mode.description}</small>
                </span>
                {preferredMode === mode.value && (
                  <Check size={16} weight="bold" aria-hidden="true" />
                )}
              </button>
            ))}
            <span className="publication-menu-rule" />
            <button onClick={openWizard} role="menuitem" type="button">
              <SlidersHorizontal size={17} aria-hidden="true" />
              <span>
                <strong>Abrir asistente</strong>
                <small>Configurar tipo, destino y alertas.</small>
              </span>
            </button>
          </div>
        )}
      </div>
      {wizardOpen && (
        <PublicationWizardDialog
          folders={folders}
          initialMode={preferredMode ?? "visual"}
          initialRemember={preferredMode !== null}
          onClose={() => setWizardOpen(false)}
          onComplete={finishWizard}
        />
      )}
      {draft && (
        <PublicationComposerDialog
          draft={draft}
          folders={folders}
          onClose={() => setDraft(null)}
          onReconfigure={() => {
            setDraft(null);
            setWizardOpen(true);
          }}
          publish={publish}
          status={status}
        />
      )}
    </>
  );
}
