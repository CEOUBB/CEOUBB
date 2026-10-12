# Bolt Performance Journal

## 2025-05-18 - CoursesDashboard Agenda Calculation
- **Finding:** `CoursesDashboard` recalculated calendar entries for `later` by performing nested linear `courses.find()` calls inside a `.flatMap()` filter over calendar entries ($O(N \times C)$ complexity).
- **Attempted / Identified Solution:** Indexed `courses` into a memoized `Map<string, Course>` (`courseMap`), converting the course lookup inside `.flatMap()` to an $O(1)$ map read ($O(N + C)$ total complexity).
- **Outcome / Learning:** Succeeded without functional drift or visual changes. All 652 unit/integration tests and static analysis verification passed cleanly.
- **Future Rule:** Index collections into a Map when performing repeated reference lookups inside list processing hooks in React components.
