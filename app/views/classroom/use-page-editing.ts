"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
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
  SECTION_TITLE_MAX,
  copyTitle,
  displayName,
  locationFor,
  materializationPlan,
  moveId,
  pageErrorText,
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
import { toast } from "../../../lib/toast";

export type Upload = { key: string; sectionId: string; name: string; percent: number };
export type Order = { scope: string; ids: string[] };
export type ItemValues = { title: string; body: string; linkUrl: string };
export type Added = { id: string; sectionTitle: string; title: string };

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function itemLabel(item: Pick<CoursePost, "title" | "itemType">) {
  if (item.title) return `«${item.title}»`;
  return item.itemType === "image" ? "la imagen" : "el texto";
}

function sameOrder(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

// Implements: REQ-PAGE-07
function usePageHistory(clearOptimistic: (value: null) => void) {
  const historyRef = useRef<UndoHistory>(EMPTY_HISTORY);
  const queue = useRef<Promise<void> | null>(null);
  const [history, setHistory] = useState<UndoHistory>(EMPTY_HISTORY);
  const [pending, setPending] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  const perform = useCallback(
    (task: () => Promise<{ history: UndoHistory; message: string } | null>, failure: string) => {
      setPending((count) => count + 1);
      const run = (queue.current ?? Promise.resolve())
        .then(task)
        .then(
          (next) => {
            if (next) {
              historyRef.current = next.history;
              setHistory(next.history);
              if (next.message) setAnnouncement(next.message);
            }
            return true;
          },
          (cause) => {
            toast.error(pageErrorText(cause, failure));
            clearOptimistic(null);
            return false;
          }
        )
        .finally(() => setPending((count) => count - 1));
      queue.current = run.then(() => undefined);
      return run;
    },
    [clearOptimistic]
  );

  const commit = useCallback(
    (entry: UndoEntry, failure: string) =>
      perform(async () => {
        await entry.redo();
        return { history: recordEntry(historyRef.current, entry), message: "" };
      }, failure),
    [perform]
  );

  const undo = useCallback(
    () =>
      perform(async () => {
        const step = stepBack(historyRef.current);
        if (!step) return null;
        await step.entry.undo();
        return { history: step.history, message: `Se deshizo: ${step.entry.label}.` };
      }, "No se pudo deshacer el último cambio."),
    [perform]
  );

  const redo = useCallback(
    () =>
      perform(async () => {
        const step = stepForward(historyRef.current);
        if (!step) return null;
        await step.entry.redo();
        return { history: step.history, message: `Se rehízo: ${step.entry.label}.` };
      }, "No se pudo rehacer el cambio."),
    [perform]
  );

  const undoSpecific = useCallback(
    (entry: UndoEntry) =>
      perform(async () => {
        await entry.undo();
        return {
          history: {
            past: historyRef.current.past.filter((candidate) => candidate !== entry),
            future: historyRef.current.future,
          },
          message: "",
        };
      }, "No se pudo deshacer."),
    [perform]
  );

  const onHistoryKey = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const { target } = event;
    if (
      target instanceof Element &&
      target.closest("input, textarea, select, [contenteditable='true']")
    )
      return;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      void undo();
    } else if ((key === "z" && event.shiftKey) || key === "y") {
      event.preventDefault();
      void redo();
    }
  });

  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => onHistoryKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const offerUndo = (entry: UndoEntry, text: string) =>
    toast.message(text, {
      action: { label: "Deshacer", onClick: () => void undoSpecific(entry) },
    });

  return { history, pending, announcement, commit, undo, redo, offerUndo };
}

// Implements: REQ-PAGE-04
export function arrangePage(
  sections: readonly PageSectionView[],
  dragOrder: Order | null,
  settling: Order | null
) {
  const orderFor = (scope: string, server: string[]) => {
    if (dragOrder?.scope === scope) return dragOrder.ids;
    if (settling?.scope === scope && !sameOrder(settling.ids, server)) return settling.ids;
    return server;
  };
  const sectionIds = orderFor(
    "sections",
    sections.map((section) => section.id)
  );
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const itemsById = new Map(
    sections.flatMap((section) => section.items).map((item) => [item.id, item])
  );
  const orderedSections = sectionIds
    .map((id) => sectionsById.get(id))
    .filter((section): section is PageSectionView => Boolean(section));
  return { orderFor, sectionIds, itemsById, orderedSections };
}

// Implements: REQ-PAGE-01, REQ-PAGE-04, REQ-PAGE-05, REQ-PAGE-06, REQ-PAGE-11, REQ-PAGE-15
export function usePageEditing({
  courseId,
  classroom,
  teamPage,
}: {
  courseId: string;
  classroom: ClassroomState;
  teamPage: CoursePage;
}) {
  const pageRef = useRef(teamPage);
  const materialized = useRef(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [added, setAdded] = useState<Added[]>([]);
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
    materializeSections(courseId, plan)
      .then(() =>
        toast.info("Ordenamos el material anterior en secciones según su carpeta de origen.")
      )
      .catch((cause) => {
        materialized.current = false;
        setMaterializeError(pageErrorText(cause, "No se pudo preparar la página para editar."));
      });
  }, [courseId]);

  useEffect(() => {
    if (!ready || materialized.current || !virtualPending) return;
    materialize();
  }, [materialize, ready, virtualPending]);

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

  const { history, pending, announcement, commit, undo, redo, offerUndo } =
    usePageHistory(setSettling);

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
      courseId,
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
      courseId,
      { ...entry, kind: "item", placement: "page" },
      pageRef.current.sections
    );

  const trashItemById = async (id: string) => {
    const found = findItem(id);
    if (found) await trashItems(courseId, [found.item], found.section.title);
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

          id = await createPageSection(courseId, { title, position });
        },
        undo: async () => {
          const section = sectionStub(id, title);
          await trashSection(courseId, section, section.items);
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
        redo: () => updatePageSection(courseId, id, { title }),
        undo: () => updatePageSection(courseId, id, { title: previous }),
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
              updatePageSection(courseId, sectionId, { position: value })
            )
          ).then(() => undefined),
        undo: () =>
          Promise.all(
            [...next.keys()].map((sectionId) =>
              updatePageSection(courseId, sectionId, {
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
    return placePageItem(courseId, item, {
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
            await Promise.all(
              [...renumbered].map(([id, value]) => {
                const found = findItem(id);
                return found
                  ? placeItem(id, {
                      sectionId,
                      position: value,
                      hidden: found.item.hidden,
                      publishAt: found.item.publishAt,
                    })
                  : undefined;
              })
            );
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
      await setSectionVisibility(courseId, current, current.items, state);
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
          const created = await duplicatePageItem(courseId, current.item, {
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

          id = await createPageSection(courseId, { title, position, hidden: source.hidden });
          await Promise.all(
            requireSection(sectionId).items.map((item) =>
              duplicatePageItem(
                courseId,
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
              )
            )
          );
        },
        undo: async () => {
          const section = sectionStub(id, title);
          await trashSection(courseId, section, section.items);
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
        await trashSection(courseId, current, current.items);
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
            id = await createPageItem(courseId, {
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

  const updateItem = (itemId: string, values: ItemValues) => {
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
    return commit(
      {
        label: `editar ${itemLabel(item)}`,
        redo: async () => updatePageItem(courseId, requireItem(itemId).item, patchFor(values)),
        undo: async () => updatePageItem(courseId, requireItem(itemId).item, patchFor(before)),
      },
      "No se pudo guardar el cambio."
    );
  };

  const upload = async (sectionId: string, files: File[], forceImage: boolean) => {
    for (const file of files) {
      const key = crypto.randomUUID();
      setUploads((list) => [...list, { key, sectionId, name: file.name, percent: 0 }]);
      try {
        const attachment = await uploadPostAttachment(courseId, file, (percent) =>
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
          `No se pudo subir ${file.name}. ${pageErrorText(cause, "Revisa el tamaño (hasta 50 MB) y el tipo de archivo.")}`
        );
      } finally {
        setUploads((list) => list.filter((entry) => entry.key !== key));
      }
    }
  };

  const settledOrder =
    settling &&
    (settling.scope === "sections"
      ? teamPage.sections.map((section) => section.id)
      : (teamPage.sections
          .find((section) => section.id === settling.scope)
          ?.items.map((item) => item.id) ?? []));
  if (settling && settledOrder && sameOrder(settledOrder, settling.ids)) setSettling(null);

  return {
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
  };
}
