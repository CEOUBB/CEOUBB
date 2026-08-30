# Palette 🎨 - Journal & UI Learnings

## [2026-03-31] - Planner / PlannerBlock

- **Finding:** Main event block action buttons in the calendar grid rendered nested elements (`<strong>` and `<small>`) without structured programmatic labels, creating screen reader ambiguity on time ranges and event context (WCAG 2.2 SC 4.1.2 & SC 2.4.4).
- **Applied / Evaluated Pattern:** Added explicit `aria-label` detailing title, start and end time, and course or activity category (e.g. `aria-label={`Ver detalles de "${block.title}", ${block.startTime} a ${block.endTime}...`}`).
- **Design System Constraint:** Utilized existing block props and static category labels without modifying visual styles or DOM structure.
- **Future Rule:** Ensure grid/calendar event interactive targets expose structured time and context labels via `aria-label` for screen reader navigation.

## [2026-03-30] - Classroom / PostsSection & MaterialsSection

- **Finding:** Repeated action buttons ("Modificar", "Eliminar", "Descargar", "Mover") in classroom lists lacked programmatic context, causing screen reader ambiguity when multiple items were rendered (WCAG 2.2 SC 2.4.4 & 4.1.2).
- **Applied / Evaluated Pattern:** Added explicit `aria-label` attributes to action buttons containing item-specific identifiers (e.g. `aria-label={`Modificar aviso "${post.title}"`}`).
- **Design System Constraint:** Retained visible text labels and existing button classes without raw CSS overrides or visual changes.
- **Future Rule:** Always ensure list item action buttons expose item-specific ARIA labels when visible button text is generic across repeated rows.
