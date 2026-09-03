# Palette 🎨 - Journal & UI Learnings

## [2026-03-31] - Calendar / CalendarHeader & BlockDialog

- **Finding:** Decorative Phosphor SVG icons embedded in calendar action buttons (`<CaretLeft>`, `<CaretRight>`, `<Plus>`, `<X>`, `<TrashSimple>`) lacked `aria-hidden="true"`, causing screen readers to process redundant child vector nodes within button triggers (WCAG 2.2 SC 4.1.2 Name, Role, Value & SC 1.1.1 Non-text Content).
- **Applied / Evaluated Pattern:** Added `aria-hidden="true"` to decorative Phosphor SVG icons inside interactive buttons with `aria-label` or visible text labels.
- **Design System Constraint:** Preserved existing Phosphor icon props (`size`, `weight`) and button layout without modifying CSS styles or element geometry.
- **Future Rule:** Ensure decorative SVG icons inside action buttons with visible or programmatic text labels explicitly set `aria-hidden="true"`.

## [2026-03-31] - Classroom / ProgressBar

- **Finding:** The reusable `Bar` component in `app/views/classroom/ProgressBar.tsx` rendered a visual progress bar element without programmatic ARIA roles or range values, leaving screen reader users without feedback on course completion percentage (WCAG 2.2 SC 4.1.2 Name, Role, Value).
- **Applied / Evaluated Pattern:** Added `role="progressbar"`, `aria-label="Progreso de avance"`, `aria-valuenow={percentage}`, `aria-valuemin={0}`, and `aria-valuemax={100}` attributes to the `<m.span>` element.
- **Design System Constraint:** Utilized existing Framer Motion animation properties and `safeRatio` calculation without changing CSS or component interface.
- **Future Rule:** Ensure reusable visual progress elements always include `role="progressbar"` with calculated `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` attributes for screen readers.

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
