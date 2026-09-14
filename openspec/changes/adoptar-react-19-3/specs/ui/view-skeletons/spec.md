## ADDED Requirements

### Requirement: Native ViewTransition Coordination for Suspense Reveals

The system SHALL wrap dynamic view suspense boundaries inside `<ViewTransition update="auto" default="none">` to animate the transition from geometric skeletons to resolved view components while keeping fallback appearance instantaneous.

#### Scenario: Smooth reveal from skeleton to resolved view

- **WHEN** a dynamically loaded view finishes loading its code chunk and data
- **THEN** React SHALL animate the replacement of the geometric skeleton by the resolved view via a GPU-accelerated update transition without intermediate flicker
