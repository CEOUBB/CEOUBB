# Palette Journal - UI & Accessibility Learnings

## [2025-05-20] - ExpandableActionBar (`components/motion/expandable-action-bar.tsx`)
- **Finding:** In collapsed state, `ExpandableActionBar` items hide their text label using `aria-hidden={!isExpanded}` without setting `aria-label` on the parent `<button>`, causing screen readers to lack an explicit accessible name when collapsed. Decorative icon wrappers also lacked explicit `aria-hidden="true"`.
- **Applied / Evaluated Pattern:** Added `aria-label={typeof item.label === "string" ? item.label : undefined}` to the item button trigger and `aria-hidden="true"` to the icon container `<span>`.
- **Design System Constraint:** Retains existing Radix/motion primitives and Tailwind tokens without modifying visual layout or introducing raw custom CSS.
- **Future Rule:** Always ensure expandable or icon-collapsible button triggers specify an explicit `aria-label` and mask decorative icon wrappers with `aria-hidden="true"`.
