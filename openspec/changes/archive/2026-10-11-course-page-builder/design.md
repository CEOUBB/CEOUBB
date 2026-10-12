## Context

The course cover rendered `courses/{sectionId}/posts` as one chronological feed. Every post carried a `kind` chosen from presets, and the only grouping was a free `folder` string. Moodle UBB and Adecca UBB let each teacher build a page of named sections with ordered material, hidden drafts and a separate announcements area; CEOUBB has to match that before it can replace them.

Constraints that shaped the design:

- Firestore rules are not filters. A student query that could match a hidden document is rejected as a whole, so hidden content cannot share a collection with visible content.
- Historical posts have no section, position or placement, and a backfill across thousands of sections is not acceptable for this change.
- Every query must stay bounded, and the page must open without extra round trips for students.
- The teaching team of a section (owner teacher, co-teachers, assistants with content rights) edits together.

## Goals / Non-Goals

**Goals**

- A page the team builds from nothing: named sections, ordered items, no predefined types.
- Editing in place, with drag and keyboard reordering, undo and redo, duplicate, hide, schedule and a recoverable trash.
- Avisos kept apart as the only content that notifies students.
- Hidden and scheduled content unreadable by students at the rules level.
- No orphaned Storage objects.

**Non-Goals**

- Backfilling historical posts.
- Per-group visibility, completion tracking, cross-course import.
- Offline editing.

## Decisions

### Three collections per section

| Collection     | Holds                                                         | Students read          |
| -------------- | ------------------------------------------------------------- | ---------------------- |
| `posts`        | avisos and visible page items                                 | yes                    |
| `pageSections` | section titles, order, visibility                             | only `hidden == false` |
| `hiddenItems`  | hidden or scheduled items, and every item of a hidden section | no                     |
| `trash`        | deleted avisos, items and sections                            | no                     |

An item's collection is derived by `locationFor(itemHidden, sectionHidden)`. Hiding a section moves its items to `hiddenItems` in the same transaction, so a student reading `posts` never sees material of a hidden section. Students list `pageSections` with `where("hidden", "==", false)`, which the rules can prove.

Alternative rejected: a `hidden` flag on posts. Students would need a filtered query on every listener, and a direct document read would still have to be denied by a per-document check; both are fragile and a missing filter fails closed for the whole page.

### Placement classified on read

Posts gain `placement` (`notice` or `page`), `sectionId`, `position`, `itemType`, `publishAt`, `attachmentPaths`, `updatedAt` and `updatedBy`. `placementFor` and `itemTypeFor` classify a post without those fields: a notice without a stored file is an aviso and everything else is page content. Page content without a section is grouped into virtual sections named after its `folder`, ordered by `createdAt`.

When the team opens the edit mode, `materializeSections` writes the virtual sections as real `pageSections` documents and stamps the items, preserving the visible order. Students keep the read-time grouping until then, so no backfill runs.

### Fractional positions

Sections and items sort by a numeric `position`. A move writes one document at the midpoint of its neighbours (`positionBetween`). When the gap falls below what a double can represent, `renumber` rewrites the affected list with a step of 1024. Moves across collections (hide, show, schedule, move into a hidden section) run in transactions of at most 200 documents.

### Undo as inverse operations

Each edit records an `UndoEntry` with `undo` and `redo` closures that call the same Firestore operations with the previous and next state. The history keeps at most 50 entries, clears its future on a new edit, and runs operations through a queue so a fast Ctrl+Z cannot interleave with a pending write. Deletion is undone by restoring from the trash, which keeps the trash as the single recovery path.

### Trash and file lifetime

Deleting moves the document to `trash` with its original collection, section title and position. Deleting a section writes one `section_{id}` entry plus one entry per item marked with `trashedWithSection`, so the trash lists the section once and restores it with its items.

Every content document records `attachmentPaths`. A Storage object is deleted only when no document in `posts`, `hiddenItems` or `trash` of the same section still lists it, which makes duplicates safe: a duplicate shares the original objects. The same check runs when a teacher removes an attachment from an aviso or discards a draft that uploaded files.

### Scheduler

`publishScheduledCourseContent` runs every five minutes in `southamerica-west1`. It reads due `pageSections` and `hiddenItems` through collection-group single-field indexes on `publishAt`, publishes up to 200 of each per run, and purges up to 200 trash entries older than 30 days through a collection-group index on `deletedAt`. Published items keep `notifyStudents: false`; the team decides whether to send an aviso.

### Co-editing

Rules accept a content write when the writer manages the section's content and `updatedBy` equals the writer. `authorId` is immutable after creation. Field whitelists (`contentFields()`, `trashFields()`) mirror `CONTENT_FIELDS` and `TRASH_FIELDS` in `lib/course-page.ts`, and a unit test keeps them equal.

### Interface

- The cover is two columns: the page and a rail with the latest three avisos and a section index with scroll spy. Below 1100 px the rail collapses into a bar with the latest aviso and a sections sheet.
- The editor is loaded with `next/dynamic` only when a teacher activates "Editar página"; students never download it.
- Reordering uses `motion/react` `Reorder` with a drag handle, so text selection and scrolling keep working; the same handle moves with ArrowUp and ArrowDown. Motion respects reduced motion and uses the shared 340/28 spring.
- Menus use the native popover API; dialogs use `<dialog>` on wide screens and the existing sheet on compact ones.
- "Listo" ends the session and, if visible items were added, offers a prefilled aviso.

## Risks / Trade-offs

- **Read-time classification costs CPU on every render.** It is linear in at most 300 posts and memoised per snapshot.
- **A five-minute cadence delays scheduled content by up to five minutes.** Acceptable for course material; the dialog states the date, not an exact minute.
- **Sections with more than 300 items** would exceed the posts bound. The overflow notice makes it visible; pagination by section is the upgrade path.
- **Concurrent edits** resolve last write wins per document. Positions are per document, so two teachers reordering different items do not conflict.

## Migration Plan

1. Deploy Firestore rules and indexes, then Storage rules.
2. Enable the Cloud Scheduler API and deploy `publishScheduledCourseContent`.
3. Deploy the web application.

Rollback: the previous web build still reads posts and still writes them as their author, because historical fields are untouched. Content that the new build moved to `hiddenItems` or `trash` stays invisible to it until the new build returns.
