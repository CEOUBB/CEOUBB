## ADDED Requirements

### Requirement: Elimination of Unauthenticated Boot Waterfall Skeleton

The system SHALL eliminate the client-side boot loading skeleton for unauthenticated visitors by serving the access interface directly in the initial server-rendered document.

#### Scenario: Direct access screen presentation

- **WHEN** an unauthenticated visitor requests the root URL
- **THEN** the initial server response SHALL contain the complete institutional login UI structure and brand assets
- **AND** the viewport SHALL display the login form without flashing intermediate skeleton loaders (`LoadingScreen`)
