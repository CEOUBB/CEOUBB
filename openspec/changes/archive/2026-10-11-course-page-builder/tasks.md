## 1. Contract

- [x] 1.1 Confirm with the maintainer: sections with items, a separate avisos panel, in-place edit mode, co-editing by the whole teaching team, scheduling and a 30-day trash.
- [x] 1.2 Write the proposal and the `classroom/course-page` delta (REQ-PAGE-01..15). Verify: `openspec validate --specs`.

## 2. Model

- [x] 2.1 Add `lib/course-page.ts`: classification on read, positions, page building, materialization plan, aviso draft, trash days and the bounded undo history. Verify: `node --experimental-strip-types --test tests/course-page.test.ts`.
- [x] 2.2 Project placement, section, position, item type, visibility and schedule in `toPost`, and add `toSection`. Verify: `pnpm run typecheck`.
- [x] 2.3 Remove content presets and templates from `lib/publication-workflow.ts`. Verify: `tests/publication-workflow.test.ts`.

## 3. Persistence

- [x] 3.1 Extend `watchClassroom` with bounded section and hidden item listeners and report posts overflow.
- [x] 3.2 Add `lib/firebase/course-page.ts`: create, update, place, hide, schedule, materialize, duplicate, trash, restore and purge, with reference-checked file release.
- [x] 3.3 Write `placement`, `updatedBy` and `attachmentPaths` from the aviso composer and from Moodle and ADECCA imports.

## 4. Security and infrastructure

- [x] 4.1 Validate content documents with field whitelists, add `pageSections`, `hiddenItems` and `trash` rules, and require `updatedBy` for co-editing. Verify: rules emulator suite.
- [x] 4.2 Allow content managers to delete course files in Storage while the period is writable.
- [x] 4.3 Add the trash composite index and the collection-group overrides for the scheduler.
- [x] 4.4 Add `publishScheduledCourseContent` (publish due sections and items, purge expired trash). Verify: `pnpm run check` on Functions.

## 5. Interface

- [x] 5.1 Build `CoursePage`, `CoursePageItems`, `CourseNavigation` and the skeleton; remove `PostsSection`.
- [x] 5.2 Build `CoursePageEditor` (loaded on demand) with menus, forms, drag and keyboard reordering, undo and redo, student preview and the aviso offer.
- [x] 5.3 Build `AnnouncementsPanel`, `AnnouncementsReader` with inline undo, and `CourseTrashDialog`.
- [x] 5.4 Turn `PublishView` into the aviso composer and release uploads on discard.
- [x] 5.5 Write the styles following `DESIGN.md`, with compact and coarse pointer layouts.

## 6. Verification

- [x] 6.1 Repoint existing tests to the files that now hold each guarantee without weakening any assertion; add the course page and rules tests.
- [x] 6.2 Register page scenarios in the QA catalog and seed fixtures, and run `pnpm qa` for the page, classroom and publication areas.
- [x] 6.3 Run `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm run verify:fast`, `pnpm run verify:invariants` and `pnpm test`.
- [x] 6.4 Update `AGENTS.md` and `PLAN.md`, consolidate the master specs and archive this change.
