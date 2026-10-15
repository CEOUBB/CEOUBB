## [2025-03-29] - CoursesDashboard Component Optimization

- **Finding:** Array iteration scans via `courses.find(...)` inside the agenda computation in `CoursesDashboard` created unnecessary linear linear search overhead across renders when matching calendar entries with course objects.
- **Attempted / Identified Solution:** Constructed a memoized `Map<string, Course>` (`coursesMap`) indexed by course ID, replacing `courses.find(...)` in `nextCourse` resolution and `later` agenda filtering with O(1) Map lookups.
- **Outcome / Learning:** Succeeded without regression. Clean O(1) lookup map reduces array scans during agenda evaluation on every Dashboard render.
- **Future Rule:** When mapping or looking up entities across arrays in React render loops (e.g. matching calendar items or activity records with courses), construct a memoized `Map` by ID instead of repeatedly invoking `.find()`.
