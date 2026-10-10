# Bolt Performance Journal ⚡

## [2025-02-23] - app/views/CoursesDashboard.tsx (Agenda Evaluation Lookups)

- **Finding:** Linear `courses.find(...)` array scans executed inside `.flatMap()` over calendar entries ($O(E \cdot C)$ complexity) and multi-stage array allocations (`filter().flatMap().slice()`) without early loop termination.
- **Attempted / Identified Solution:** Constructed a memoized `courseMap` (`Map<string, Course>`) for $O(1)$ lookups and replaced the multi-stage array chaining in `later` with a single-pass `for...of` loop with early `break` upon reaching `AGENDA_LATER_LIMIT`.
- **Outcome / Learning:** Reduced computational complexity from $O(E \cdot C)$ to $O(C + E)$ with early exit and zero extra array allocations beyond the result list, passing all 631 unit tests and linter/typecheck gates.
- **Future Rule:** When resolving parent models (like courses) for a collection of child items (like calendar entries), always construct an $O(1)$ `Map` lookup and short-circuit iterations once display limits are met.
