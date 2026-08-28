## 2026-08-28 - Planner Block Layout (`lib/planner.ts`)
- **Finding:** `placeBlocks` computed `Math.max(...columnEnds)` inside the iteration loop for every block, resulting in repeated array spreading and scanning ($O(C)$ per block, where $C$ is active column count).
- **Attempted / Identified Solution:** Maintained an incremental `clusterMaxEnd` state variable updated on column assignment and reset on `flush()`.
- **Outcome / Learning:** Reduced cluster boundary check from $O(C)$ array spread to $O(1)$ scalar comparison while maintaining 100% equivalence.
- **Future Rule:** Avoid array spread into `Math.max` or similar variadic calls inside hot layout loops when peak/bounds state can be incrementally maintained.
