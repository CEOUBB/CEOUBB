## [2025-02-23] - Classroom / MultimodalEditor

- **Finding:** Phosphor SVG icons inside modal close triggers (`editor-modal-close`) lacked explicit `aria-hidden="true"`, causing potential redundancy for screen readers despite parent buttons having `aria-label="Cerrar modal"`.
- **Applied / Evaluated Pattern:** Added `aria-hidden="true"` to decorative `<X>` Phosphor icon elements within close `<button>`s with explicit `aria-label`s.
- **Design System Constraint:** Ensures decorative icon components inside labelled buttons don't introduce redundant assistive tree nodes (WCAG 2.2 SC 4.1.2 & SC 1.1.1).
- **Future Rule:** Decorative Phosphor icons inside interactive controls that already specify `aria-label` or visible text labels must include `aria-hidden="true"`.
