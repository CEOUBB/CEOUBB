# Palette 🎨 - Journal & UI Learnings

## [2026-03-31] - Classroom / ProgressBar

- **Finding:** The visual progress bar element `Bar` rendered a generic `motion.span` without `role="progressbar"` or ARIA value attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`), rendering course learning progress unannounced to screen reader users (WCAG 2.2 SC 4.1.2 Name, Role, Value).
- **Applied / Evaluated Pattern:** Updated `Bar` to accept `completed` and `total` props, adding `role="progressbar"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax`, and `aria-label`.
- **Design System Constraint:** Maintained backwards compatibility with `ratio` while preserving smooth `motion` scale animation and visual CSS classes.
- **Future Rule:** Ensure all progress indicators declare `role="progressbar"` with explicit ARIA numeric ranges (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`).

## [2026-03-31] - Classroom / QuizzesSection

- **Finding:** SVG icon status badges (`CheckCircle` and `XCircle`) using `aria-label` lacked explicit `role="img"`, while quiz attempt progress containers lacked `role="progressbar"` and numeric range attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`), limiting screen reader accessibility (WCAG 2.2 SC 4.1.2 Name, Role, Value).
- **Applied / Evaluated Pattern:** Added `role="img"` to SVG icon indicators using `aria-label`, and added `role="progressbar"` with `aria-valuenow`, `aria-valuemin={0}`, and `aria-valuemax` to the progress bar element.
- **Design System Constraint:** Preserved existing DOM structures and CSS styles without altering visual appearance or component props.
- **Future Rule:** Always ensure icon-based status indicators expose `role="img"` alongside `aria-label`, and progress elements declare explicit `role="progressbar"` with numeric ARIA range attributes.

## [2026-03-31] - Planner / PlannerBlock

- **Finding:** Main event block action buttons in the calendar grid rendered nested elements (`<strong>` and `<small>`) without structured programmatic labels, creating screen reader ambiguity on time ranges and event context (WCAG 2.2 SC 4.1.2 & SC 2.4.4).
- **Applied / Evaluated Pattern:** Added explicit `aria-label` detailing title, start and end time, and course or activity category (e.g. `aria-label={`Ver detalles de "${block.title}", ${block.startTime} a ${block.endTime}...`}`).
- **Design System Constraint:** Utilized existing block props and static category labels without modifying visual styles or DOM structure.
- **Future Rule:** Ensure grid/calendar event interactive targets expose structured time and context labels via `aria-label` for screen reader navigation.

## [2026-03-31] - Notification Panel & Communications Center

- **Finding:** Generic `<span>` indicators with `aria-label` ("Sin leer", "No leído") lacked an explicit WAI-ARIA role (`role="img"`), causing browsers and assistive technologies to ignore the `aria-label` attribute on generic elements (WCAG 2.2 SC 4.1.2 Name, Role, Value).
- **Applied / Evaluated Pattern:** Added `role="img"` to generic indicator dot `<span>` elements using `aria-label`.
- **Design System Constraint:** Retained existing CSS classes (`notification-dot`, `conversation-unread`, `participant-contact unavailable`) without visual or layout modifications.
- **Future Rule:** Whenever a non-interactive generic `<span>` or `<div>` is used as a visual status badge with `aria-label`, explicitly declare `role="img"` or `role="status"`.

## [2026-03-30] - Classroom / PostsSection & MaterialsSection

- **Finding:** Repeated action buttons ("Modificar", "Eliminar", "Descargar", "Mover") in classroom lists lacked programmatic context, causing screen reader ambiguity when multiple items were rendered (WCAG 2.2 SC 2.4.4 & 4.1.2).
- **Applied / Evaluated Pattern:** Added explicit `aria-label` attributes to action buttons containing item-specific identifiers (e.g. `aria-label={`Modificar aviso "${post.title}"`}`).
- **Design System Constraint:** Retained visible text labels and existing button classes without raw CSS overrides or visual changes.
- **Future Rule:** Always ensure list item action buttons expose item-specific ARIA labels when visible button text is generic across repeated rows.
