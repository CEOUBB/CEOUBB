import type { DocumentData, QueryDocumentSnapshot, Transaction } from "firebase/firestore";
import {
  authorFields,
  cloudStorage,
  currentUser,
  firestore,
  isDevOrLocalEnvironment,
} from "./sdk.ts";
import { chunkOperations } from "./grades.ts";
import { deleteDevPost } from "./posts.ts";
import { folderName, iso, toAttachments, toPost, type ClassroomAttachment } from "./mappers.ts";
import type { CoursePost } from "./mappers.ts";
import {
  HIDDEN_ITEMS_LIMIT,
  ITEM_TITLE_MAX,
  PAGE_COLLECTIONS,
  TRASH_LIMIT,
  attachmentPathsOf,
  cleanLink,
  cleanSectionTitle,
  copyTitle,
  locationFor,
  pickContentFields,
  type ItemLocation,
  type PageItemType,
  type PageSection,
  type TrashEntry,
} from "../course-page.ts";
import { normalizeRichTextBody } from "../rich-text.ts";

type Collection = ItemLocation | typeof PAGE_COLLECTIONS.trash;
type ItemRef = Pick<CoursePost, "id" | "location">;
type Relocation = { id: string; from: Collection; to: Collection; patch?: DocumentData };
type Sdk = typeof import("firebase/firestore");

const MOVES_PER_TRANSACTION = 200;
const RELEASES_IN_FLIGHT = 8;
const CONTENT_COLLECTIONS: readonly Collection[] = ["posts", "hiddenItems", "trash"];

async function session() {
  const [{ sdk, db }, user] = await Promise.all([firestore(), currentUser()]);
  return { sdk, db, user };
}

function timestamp(sdk: Sdk, value: string) {
  return value ? sdk.Timestamp.fromDate(new Date(value)) : null;
}

function isDevItem(id: string) {
  return id.startsWith("dev-post-");
}

async function relocate(
  courseId: string,
  moves: readonly Relocation[],
  finalWrite?: (transaction: Transaction) => void
) {
  const { sdk, db, user } = await session();
  const reference = (collection: Collection, id: string) =>
    sdk.doc(db, "courses", courseId, collection, id);
  const groups = chunkOperations(moves, MOVES_PER_TRANSACTION);
  if (groups.length === 0) groups.push([]);

  const commitGroup = (group: readonly Relocation[], index: number) =>
    sdk.runTransaction(db, async (transaction) => {
      const snapshots = await Promise.all(
        group.map((move) => transaction.get(reference(move.from, move.id)))
      );
      group.forEach((move, position) => {
        const snapshot = snapshots[position];
        if (!snapshot?.exists()) return;
        const content = { ...pickContentFields(snapshot.data()), ...move.patch };
        transaction.set(reference(move.to, move.id), {
          ...content,
          attachmentPaths: attachmentPathsOf(content),
          updatedAt: sdk.serverTimestamp(),
          updatedBy: user.uid,
        });
        if (move.from !== move.to) transaction.delete(reference(move.from, move.id));
      });
      if (index === groups.length - 1) finalWrite?.(transaction);
    });

  await groups.reduce<Promise<void>>(
    (previous, group, index) => previous.then(() => commitGroup(group, index)),
    Promise.resolve()
  );
}

// Implements: REQ-PAGE-01
export async function createPageSection(
  courseId: string,
  input: { title: string; position: number; hidden?: boolean }
) {
  const { sdk, db, user } = await session();
  const reference = sdk.doc(sdk.collection(db, "courses", courseId, PAGE_COLLECTIONS.sections));
  await sdk.setDoc(reference, {
    title: cleanSectionTitle(input.title),
    position: input.position,
    hidden: input.hidden === true,
    publishAt: null,
    createdAt: sdk.serverTimestamp(),
    createdBy: user.uid,
    updatedAt: sdk.serverTimestamp(),
    updatedBy: user.uid,
  });
  return reference.id;
}

// Implements: REQ-PAGE-01, REQ-PAGE-04
export async function updatePageSection(
  courseId: string,
  sectionId: string,
  patch: { title?: string; position?: number }
) {
  const { sdk, db, user } = await session();
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, PAGE_COLLECTIONS.sections, sectionId), {
    ...(patch.title === undefined ? {} : { title: cleanSectionTitle(patch.title) }),
    ...(patch.position === undefined ? {} : { position: patch.position }),
    updatedAt: sdk.serverTimestamp(),
    updatedBy: user.uid,
  });
}

// Implements: REQ-PAGE-05
export async function setSectionVisibility(
  courseId: string,
  section: PageSection,
  items: readonly CoursePost[],
  visibility: { hidden: boolean; publishAt: string }
) {
  const { sdk, db, user } = await session();
  const moves = items.flatMap((item) => {
    const to = locationFor(item.hidden, visibility.hidden);
    return to === item.location
      ? []
      : [{ id: item.id, from: item.location, to, patch: { notifyStudents: false } }];
  });
  await relocate(courseId, moves, (transaction) =>
    transaction.update(sdk.doc(db, "courses", courseId, PAGE_COLLECTIONS.sections, section.id), {
      hidden: visibility.hidden,
      publishAt: visibility.hidden ? timestamp(sdk, visibility.publishAt) : null,
      updatedAt: sdk.serverTimestamp(),
      updatedBy: user.uid,
    })
  );
}

export type PageItemDraft = {
  sectionId: string;
  sectionTitle: string;
  position: number;
  itemType: PageItemType;
  title: string;
  body: string;
  linkUrl: string;
  attachments: ClassroomAttachment[];
  location: ItemLocation;
};

// Implements: REQ-PAGE-02
export async function createPageItem(courseId: string, draft: PageItemDraft) {
  const { sdk, db, user } = await session();
  const attachments = toAttachments(draft.attachments);
  const reference = sdk.doc(sdk.collection(db, "courses", courseId, draft.location));
  await sdk.setDoc(reference, {
    ...authorFields(user),
    courseId,
    title: draft.title.trim().slice(0, ITEM_TITLE_MAX),
    body: normalizeRichTextBody(draft.body),
    kind: "resource",
    folder: folderName(draft.sectionTitle),
    dueDate: "",
    fileUrl: draft.itemType === "link" ? cleanLink(draft.linkUrl) : "",
    fileName: "",
    storagePath: "",
    contentType: "",
    fileSize: 0,
    attachments,
    attachmentPaths: attachmentPathsOf({ attachments }),
    notifyStudents: false,
    placement: "page",
    sectionId: draft.sectionId,
    position: draft.position,
    itemType: draft.itemType,
    hidden: false,
    publishAt: null,
    createdAt: sdk.serverTimestamp(),
    updatedAt: sdk.serverTimestamp(),
    updatedBy: user.uid,
  });
  return reference.id;
}

export type PageItemPatch = {
  title?: string;
  body?: string;
  linkUrl?: string;
  attachments?: ClassroomAttachment[];
};

// Implements: REQ-PAGE-02, REQ-PAGE-08
export async function updatePageItem(
  courseId: string,
  item: Pick<CoursePost, "id" | "location" | "storagePath">,
  patch: PageItemPatch
) {
  const { sdk, db, user } = await session();
  const attachments = patch.attachments ? toAttachments(patch.attachments) : null;
  await sdk.updateDoc(sdk.doc(db, "courses", courseId, item.location, item.id), {
    ...(patch.title === undefined ? {} : { title: patch.title.trim().slice(0, ITEM_TITLE_MAX) }),
    ...(patch.body === undefined ? {} : { body: normalizeRichTextBody(patch.body) }),
    ...(patch.linkUrl === undefined ? {} : { fileUrl: cleanLink(patch.linkUrl) }),
    ...(attachments
      ? {
          attachments,
          attachmentPaths: attachmentPathsOf({ storagePath: item.storagePath, attachments }),
        }
      : {}),
    updatedAt: sdk.serverTimestamp(),
    updatedBy: user.uid,
  });
}

export type ItemPlacement = {
  sectionId: string;
  sectionTitle: string;
  position: number;
  hidden: boolean;
  publishAt: string;
  sectionHidden: boolean;
};

// Implements: REQ-PAGE-04, REQ-PAGE-05
export async function placePageItem(courseId: string, item: ItemRef, target: ItemPlacement) {
  const { sdk, db, user } = await session();
  const to = locationFor(target.hidden, target.sectionHidden);
  const patch = {
    sectionId: target.sectionId,
    folder: folderName(target.sectionTitle),
    position: target.position,
    hidden: target.hidden,
    publishAt: target.hidden ? timestamp(sdk, target.publishAt) : null,
    notifyStudents: false,
  };
  if (to === item.location) {
    await sdk.updateDoc(sdk.doc(db, "courses", courseId, item.location, item.id), {
      ...patch,
      updatedAt: sdk.serverTimestamp(),
      updatedBy: user.uid,
    });
    return;
  }

  await relocate(courseId, [{ id: item.id, from: item.location, to, patch }]);
}

// Implements: REQ-PAGE-11
export async function materializeSections(
  courseId: string,
  plan: readonly {
    title: string;
    position: number;
    items: readonly { id: string; location: ItemLocation; position: number }[];
  }[]
) {
  const { sdk, db, user } = await session();
  for (const section of plan) {
    const reference = sdk.doc(sdk.collection(db, "courses", courseId, PAGE_COLLECTIONS.sections));
    const writes = [
      (batch: ReturnType<Sdk["writeBatch"]>) =>
        batch.set(reference, {
          title: cleanSectionTitle(section.title),
          position: section.position,
          hidden: false,
          publishAt: null,
          createdAt: sdk.serverTimestamp(),
          createdBy: user.uid,
          updatedAt: sdk.serverTimestamp(),
          updatedBy: user.uid,
        }),
      ...section.items
        .filter((item) => !isDevItem(item.id))
        .map(
          (item) => (batch: ReturnType<Sdk["writeBatch"]>) =>
            batch.update(sdk.doc(db, "courses", courseId, item.location, item.id), {
              sectionId: reference.id,
              position: item.position,
              placement: "page",
              updatedAt: sdk.serverTimestamp(),
              updatedBy: user.uid,
            })
        ),
    ];
    for (const group of chunkOperations(writes, 400)) {
      const batch = sdk.writeBatch(db);
      for (const write of group) write(batch);
      await batch.commit();
    }
  }
}

function trashPatch(sdk: Sdk, uid: string, sectionTitle: string, trashedWithSection = "") {
  return {
    deletedAt: sdk.serverTimestamp(),
    deletedBy: uid,
    trashKind: "item",
    trashedWithSection,
    sectionTitle: sectionTitle.slice(0, ITEM_TITLE_MAX),
  };
}

// Implements: REQ-PAGE-06, REQ-PAGE-09
export async function trashItems(
  courseId: string,
  items: readonly ItemRef[],
  sectionTitle: string
) {
  for (const item of items.filter((entry) => isDevItem(entry.id))) deleteDevPost(courseId, item.id);
  const remote = items.filter((item) => !isDevItem(item.id));
  if (remote.length === 0) return;
  const { sdk, user } = await session();
  await relocate(
    courseId,
    remote.map((item) => ({
      id: item.id,
      from: item.location,
      to: PAGE_COLLECTIONS.trash,
      patch: trashPatch(sdk, user.uid, sectionTitle),
    }))
  );
}

// Implements: REQ-PAGE-06
export async function trashSection(
  courseId: string,
  section: PageSection,
  items: readonly CoursePost[]
) {
  if (section.virtual) return trashItems(courseId, items, section.title);
  const { sdk, db, user } = await session();
  await relocate(
    courseId,
    items.map((item) => ({
      id: item.id,
      from: item.location,
      to: PAGE_COLLECTIONS.trash,
      patch: trashPatch(sdk, user.uid, section.title, section.id),
    })),
    (transaction) => {
      transaction.set(
        sdk.doc(db, "courses", courseId, PAGE_COLLECTIONS.trash, sectionTrashId(section.id)),
        {
          trashKind: "section",
          trashedWithSection: "",
          sectionId: section.id,
          title: section.title,
          position: section.position,
          hidden: section.hidden,
          publishAt: timestamp(sdk, section.publishAt),
          itemCount: items.length,
          deletedAt: sdk.serverTimestamp(),
          deletedBy: user.uid,
          updatedAt: sdk.serverTimestamp(),
          updatedBy: user.uid,
        }
      );
      transaction.delete(sdk.doc(db, "courses", courseId, PAGE_COLLECTIONS.sections, section.id));
    }
  );
}

export function sectionTrashId(sectionId: string) {
  return `section_${sectionId}`;
}

// Implements: REQ-PAGE-06
export async function restoreTrashEntry(
  courseId: string,
  entry: Pick<TrashEntry, "id" | "kind" | "sectionId" | "sectionTitle" | "placement" | "hidden">,
  sections: readonly PageSection[]
) {
  const { sdk, db, user } = await session();
  const trash = sdk.collection(db, "courses", courseId, PAGE_COLLECTIONS.trash);

  if (entry.kind === "section") {
    const [record, members] = await Promise.all([
      sdk.getDoc(sdk.doc(trash, entry.id)),
      sdk.getDocs(
        sdk.query(
          trash,
          sdk.where("trashedWithSection", "==", entry.sectionId),
          sdk.limit(HIDDEN_ITEMS_LIMIT)
        )
      ),
    ]);
    if (!record.exists()) throw new Error("La sección ya no está en la papelera.");
    const section = record.data();
    const sectionHidden = section.hidden === true;
    await relocate(
      courseId,
      members.docs.map((member) => ({
        id: member.id,
        from: PAGE_COLLECTIONS.trash,
        to: locationFor(member.data().hidden === true, sectionHidden),
        patch: { sectionId: entry.sectionId, notifyStudents: false },
      })),
      (transaction) => {
        transaction.set(
          sdk.doc(db, "courses", courseId, PAGE_COLLECTIONS.sections, entry.sectionId),
          {
            title: cleanSectionTitle(String(section.title ?? "Sin título")),
            position: Number(section.position) || 0,
            hidden: sectionHidden,
            publishAt: sectionHidden ? (section.publishAt ?? null) : null,
            createdAt: sdk.serverTimestamp(),
            createdBy: user.uid,
            updatedAt: sdk.serverTimestamp(),
            updatedBy: user.uid,
          }
        );
        transaction.delete(sdk.doc(trash, entry.id));
      }
    );
    return;
  }

  const section = sections.find(
    (candidate) => candidate.id === entry.sectionId && !candidate.virtual
  );
  const notice = entry.placement === "notice";
  await relocate(courseId, [
    {
      id: entry.id,
      from: PAGE_COLLECTIONS.trash,
      to: notice ? "posts" : locationFor(entry.hidden, section?.hidden ?? false),
      patch: {
        notifyStudents: false,
        ...(notice || section || !entry.sectionId
          ? {}
          : { sectionId: "", folder: folderName(entry.sectionTitle) }),
      },
    },
  ]);
}

// Implements: REQ-PAGE-15
export async function duplicatePageItem(
  courseId: string,
  item: ItemRef,
  target: ItemPlacement,
  markCopy = true
) {
  const { sdk, db, user } = await session();
  const source = sdk.doc(db, "courses", courseId, item.location, item.id);
  return sdk.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(source);
    if (!snapshot.exists()) throw new Error("El elemento ya no existe.");
    const {
      sourceSystem: _sourceSystem,
      sourceId: _sourceId,
      sourceKey: _sourceKey,
      importFingerprint: _importFingerprint,
      contentHash: _contentHash,
      ...content
    } = pickContentFields(snapshot.data());
    const paths = attachmentPathsOf(content);
    const destination = sdk.doc(
      sdk.collection(db, "courses", courseId, locationFor(target.hidden, target.sectionHidden))
    );
    transaction.set(destination, {
      ...content,
      ...authorFields(user),
      title: markCopy ? copyTitle(String(content.title ?? "")) : String(content.title ?? ""),
      sectionId: target.sectionId,
      folder: folderName(target.sectionTitle),
      position: target.position,
      hidden: target.hidden,
      publishAt: target.hidden ? timestamp(sdk, target.publishAt) : null,
      notifyStudents: false,
      attachmentPaths: paths,
      createdAt: sdk.serverTimestamp(),
      updatedAt: sdk.serverTimestamp(),
      updatedBy: user.uid,
    });
    transaction.update(source, {
      attachmentPaths: paths,
      updatedAt: sdk.serverTimestamp(),
      updatedBy: user.uid,
    });
    return { id: destination.id, location: locationFor(target.hidden, target.sectionHidden) };
  });
}

async function referenced(courseId: string, path: string) {
  const { sdk, db } = await firestore();
  const matches = await Promise.all(
    CONTENT_COLLECTIONS.map((collection) =>
      sdk.getDocs(
        sdk.query(
          sdk.collection(db, "courses", courseId, collection),
          sdk.where("attachmentPaths", "array-contains", path),
          sdk.limit(1)
        )
      )
    )
  );
  return matches.some((snapshot) => !snapshot.empty);
}

// Implements: REQ-PAGE-06, REQ-PUB-09
export async function releaseUploadedFiles(courseId: string, paths: readonly string[]) {
  const owned = [...new Set(paths)].filter((path) => path.startsWith(`courses/${courseId}/`));
  if (owned.length === 0) return;
  const cloud = await cloudStorage();
  const release = async (path: string) => {
    if (await referenced(courseId, path)) return;
    try {
      await cloud.sdk.deleteObject(cloud.sdk.ref(cloud.storage, path));
    } catch (cause) {
      const code = typeof cause === "object" && cause && "code" in cause ? cause.code : "";
      if (code !== "storage/object-not-found") throw cause;
    }
  };
  await chunkOperations(owned, RELEASES_IN_FLIGHT).reduce(
    (previous, group) => previous.then(() => Promise.all(group.map(release))).then(() => undefined),
    Promise.resolve()
  );
}

// Implements: REQ-PAGE-06
export async function purgeTrashEntries(courseId: string, entries: readonly TrashEntry[]) {
  const { sdk, db } = await session();
  const trash = sdk.collection(db, "courses", courseId, PAGE_COLLECTIONS.trash);
  const ids = new Set(entries.map((entry) => entry.id));
  const sections = await Promise.all(
    entries
      .filter((candidate) => candidate.kind === "section")
      .map((entry) =>
        sdk.getDocs(
          sdk.query(
            trash,
            sdk.where("trashedWithSection", "==", entry.sectionId),
            sdk.limit(HIDDEN_ITEMS_LIMIT)
          )
        )
      )
  );
  for (const member of sections.flatMap((snapshot) => snapshot.docs)) ids.add(member.id);
  const records = await Promise.all([...ids].map((id) => sdk.getDoc(sdk.doc(trash, id))));
  const paths = records.flatMap((record) =>
    record.exists() ? attachmentPathsOf(record.data()) : []
  );
  for (const group of chunkOperations([...ids], 400)) {
    const batch = sdk.writeBatch(db);
    for (const id of group) batch.delete(sdk.doc(trash, id));
    await batch.commit();
  }
  await releaseUploadedFiles(courseId, paths);
}

function toTrashEntry(document: QueryDocumentSnapshot<DocumentData>): TrashEntry {
  const value = document.data();
  const post = toPost(document, "hiddenItems");
  return {
    id: document.id,
    kind: value.trashKind === "section" ? "section" : "item",
    title: post.title,
    placement: post.placement,
    itemType: post.itemType,
    sectionId: post.sectionId,
    sectionTitle: String(value.sectionTitle ?? ""),
    trashedWithSection: String(value.trashedWithSection ?? ""),
    hidden: value.hidden === true,
    itemCount: Number(value.itemCount) || 0,
    deletedAt: iso(value.deletedAt),
    deletedBy: String(value.deletedBy ?? ""),
  };
}

// Implements: REQ-PAGE-06, REQ-PAGE-12
export function watchTrash(
  courseId: string,
  onChange: (entries: TrashEntry[]) => void,
  onError: (message: string) => void
) {
  let active = true;
  let stop = () => {};
  firestore()
    .then(({ sdk, db }) => {
      if (!active) return;
      stop = sdk.onSnapshot(
        sdk.query(
          sdk.collection(db, "courses", courseId, PAGE_COLLECTIONS.trash),
          sdk.where("trashedWithSection", "==", ""),
          sdk.orderBy("deletedAt", "desc"),
          sdk.limit(TRASH_LIMIT)
        ),
        (snapshot) => onChange(snapshot.docs.map(toTrashEntry)),
        () => {
          if (isDevOrLocalEnvironment()) {
            onChange([]);
            return;
          }
          onError("No se pudo cargar la papelera del ramo.");
        }
      );
    })
    .catch(() => onError("No se pudo cargar la papelera del ramo."));
  return () => {
    active = false;
    stop();
  };
}
