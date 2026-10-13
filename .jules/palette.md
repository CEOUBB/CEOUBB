## [2026-03-30] - NotificationStack & PortalShell Account Menu

- **Finding:** Expandable controls (`NotificationStack` toggle button and Account Menu summary) were missing explicit `aria-expanded` attributes, preventing screen readers from perceiving dynamic expand/collapse state.
- **Applied / Evaluated Pattern:** Added `aria-expanded={isExpanded}` to `NotificationStack` toggle button and `aria-expanded={accountOpen}` to the Account `<summary>` control in `PortalHeader`.
- **Design System Constraint:** Strictly lightweight additions leveraging existing React state hooks (`isExpanded`, `accountOpen`) and semantic HTML attributes without introducing custom CSS or external dependencies.
- **Future Rule:** Ensure all custom toggle triggers and `<summary>` popover controls specify dynamic `aria-expanded` state for screen reader accessibility (WCAG 2.2 SC 4.1.2).
