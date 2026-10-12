## Why

The course cover is a flat chronological feed. Every publication is forced into a predefined type (Aviso, Guía, Certamen) seeded with filler text, and the teaching team cannot name, group, order, hide or recover anything. Moodle UBB and Adecca UBB, the systems CEOUBB intends to replace, let each teacher build a course page of their own: named sections, ordered material, hidden drafts, and a separate announcements panel. A course description published on the first day ends up at the bottom of the feed after a few weeks, which is the opposite of what teachers expect.

The review also found functional defects: deleting is irreversible, removed or discarded attachments stay orphaned in Cloud Storage, posts beyond the first 100 disappear silently, a co-teacher cannot correct material published by another teacher of the same section, and post documents are written without any schema validation.

## What Changes

- The Portada becomes a **course page** made of ordered sections whose names the teaching team chooses, each holding ordered items of four kinds: text, file, link and image.
- Teachers edit the page **in place** with an edit mode: add, rename, reorder by drag or keyboard, move between sections, duplicate, hide, schedule, delete, undo and redo, and preview as a student.
- **Avisos** move to their own chronological panel in the course rail. They remain the only content that sends push notifications. After adding visible material, the team is offered a prefilled aviso.
- Deleting moves content to a **trash** kept for 30 days, restorable, with automatic purge of unreferenced files.
- Hidden and scheduled content lives in a teacher-only collection so students cannot read it; a scheduled Function publishes it when due.
- The publication studio becomes the aviso composer: the preset stage and its templates are removed.
- Any content manager of the section edits any item; writes record who changed them; post documents are schema-validated by the rules.
- Moodle and Adecca imports land as page items grouped into sections named after their source sections.

## Non-goals

- No change to grades, quizzes, people, interoperability, the access screen or the studio inspector, which keeps omitting folder, due date and external link by the owner's decision.
- No import from another CEOUBB course, no per-group visibility, no completion tracking and no text colour palette in this change.
- No backfill: historical posts are classified on read.
- No offline editing: page edits require Firestore.

## Capabilities

### New Capabilities

- `classroom/course-page`: teacher-built course page, edit mode, trash, scheduling and the avisos panel.

### Modified Capabilities

- `classroom/publication-studio`: the studio composes avisos only; REQ-PUB-10 (content presets) is removed; REQ-PUB-01 and REQ-PUB-13 are rewritten.

### Removed Capabilities

- None.

## Impact

**Code**

- `lib/course-page.ts` (pure model) and `lib/firebase/course-page.ts` (Firestore operations).
- `lib/firebase/posts.ts`, `lib/firebase/mappers.ts`: classification fields, raised and reported listener bound, page section and hidden item listeners.
- `app/views/classroom/`: `CoursePage`, `CoursePageEditor`, `CoursePageItems`, `AnnouncementsPanel`; `PostsSection` and the preset stage are removed; `PublishView` composes and edits avisos.
- `firebase/firestore.rules`, `firebase/storage.rules`, `firebase/firestore.indexes.json`.
- `firebase/functions/index.js` and `firebase/functions/course-page-schedule.js`.
- `lib/services/moodle-import.ts`, `lib/services/adecca-import.ts`: `placement` on imported posts.

**Data and scale**

- New collections `pageSections`, `hiddenItems` and `trash` under `courses/{sectionId}`; every query is bounded (100, 300 and 100 documents).
- The posts listener grows from 100 to 300 documents and reports overflow instead of truncating silently.
- Three collection-group single-field overrides serve the scheduler, and one composite index serves the trash listener.
- One scheduled Function, `publishScheduledCourseContent`, runs every five minutes and requires the Cloud Scheduler API.
