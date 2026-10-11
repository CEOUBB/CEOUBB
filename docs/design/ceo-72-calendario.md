# CEO-72: academic calendar

## Direction (October 2026 redesign)

The calendar is a planning tool for UBB students who organize study and classes around the semester's evaluations and deliveries. The redesign keeps the campus identity from `DESIGN.md` (Inter, OKLCH tokens, UBB blue for actions and state, white sheets on the cool canvas, course tones) and rebuilds structure and interaction to the level of mainstream calendar products.

- **Structure: agenda and timeline.** A left column holds the mini month, "Lo que viene" (next 28 days of evaluations and deliveries, at most 8) and the course filters. The hour grid fills the rest. The column collapses by hand (persisted in `localStorage`) and disappears automatically when the `planner` container is narrower than 880 px.
- **Views.** Day, week, month and a continuous four week agenda. The selected view is persisted per device. Phones open on the day view with a seven day strip; desktop opens on the week.
- **Hierarchy.** The page title carries a one line summary of the visible period. The toolbar groups Today, period arrows, the range title (which opens a date picker) and a segmented view switch. Evaluations and deliveries live in a sticky ribbon above the hours, never as blocks inside them.
- **Phone.** The `h1` is visually hidden, the range title becomes the app bar, and "Nuevo bloque" turns into a 56 px floating button above the mobile navigation. Popovers become bottom sheets with a grabber. In the day view the strip names the selected day, so the title shows the month and the grid header is hidden.
- **Shape and surface.** Blocks are flat tonal surfaces with a 1 px tonal border and `--radius-sm`; no side stripe, shadow or pulse. The current time is a red line under the blocks plus a pill in the hour gutter. The elapsed part of today is veiled.
- **Motion, only where it explains change.** The view indicator slides with a 340/28 spring; a new period slides in the direction of travel; blocks enter from `scale(0.96)`; sheets rise with `@starting-style`; a horizontal swipe follows the finger and settles. Reduced motion removes all of it.
- **Controls.** 36 px on fine pointers and 44 px on coarse pointers (`--planner-control`).

## Interaction model

- **Mouse and pen** act immediately: drag over hours to create, drag a block to move it, drag its bottom edge to change its duration. Escape cancels any gesture.
- **Touch** keeps native vertical scrolling. Holding a slot or a block for 350 ms (8 px slop) starts creation or movement, with a short vibration where available. A horizontal swipe of 56 px or more changes the period; the strip and the month accept the same swipe. The explicit "touch selection" toggle from the first version is retired.
- **Quick create.** On desktop a popover opens beside the new range with title, times, duration, type and course; "Más opciones" moves the values into the full dialog. Phones open the full dialog directly.
- **Academic items** (evaluations and deliveries) open a peek with date, countdown, course and weight, plus "Ir al aula" and "Planificar estudio", which prefills a study block for the day before.
- **Keyboard.** T today, J and K next and previous period, D, S, M and A for the views, C new block, ? shortcut list. Shortcuts are ignored inside fields, dialogs and popovers. Hour slots, month days and mini month days use roving focus with the arrow keys; blocks open with Enter to change date and time.

## Contract

- REQ-CEO72-01: full month, navigation, indicators and access to activities.
- REQ-CEO72-02: weekly creation until a date, at most 26 weeks; atomic save and independently editable sessions.
- REQ-CEO72-03: create ranges and move blocks by pointer or touch, bounded to 08:00–21:00; Escape cancels.
- REQ-CEO72-04: paginated private Firestore listeners, loading and error states, complete keyboard alternatives.
- REQ-CEO72-05: day and agenda views; the agenda lists four weeks with date sheets and always shows today.
- REQ-CEO72-06: quick create beside the selection in a native top layer popover; Escape or an outside press closes it and focus returns to its origin.
- REQ-CEO72-07: resizing from the bottom edge, minimum 15 minutes, never past 21:00.
- REQ-CEO72-08: mini month and single key shortcuts, outside fields, dialogs and popovers.
- REQ-CEO72-09: phone day view with a weekly strip, course dots and horizontal swipe between periods.

The existing event schema is reused, including `clase`. No migration and no second data source are needed. The time zone label is computed with `Intl` (`shortOffset`), replacing a hardcoded `GMT−4` that was wrong during Chilean summer time.

## Evidence and limits

- `e2e/calendar-ceo72.spec.ts`: five journeys in Chromium (1280 px) and Pixel 7, ten runs in total. They cover control heights, the flat block surface, CDP touch long press for creation and movement, a vertical flick that must not create, mouse creation, movement and resizing, Escape cancellation, month keyboard navigation, atomic recurrence, a failed save, more than 200 records, agenda and day views, shortcuts, the date picker, the academic peek, course filters and the collapsible side column.
- `tests/planner-views.test.ts` seals the pure date and duration helpers.
- QA catalog: `calendar.day`, `calendar.agenda` and `calendar.quick-create` join the existing calendar scenarios.
- Screenshots were inspected at 1280, 900, 412 and 320 px for the week, day, month, agenda, quick create, peek, picker and shortcut states.

The end to end evidence uses the real components and adapter with a synthetic SDK transport. It does not prove the deployed Firestore, synchronization across physical devices or full WCAG conformance.

## History

The first version (September 2026) shipped the month view, weekly recurrence and pointer creation with an explicit touch selection mode, a "Mover" handle on each block and a date input in the toolbar. The redesign replaces those three with long press, whole block dragging and the range title picker.
