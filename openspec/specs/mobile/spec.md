# mobile Specification

### Purpose

Gobierna la integración híbrida de Capacitor 7 (`cl.ubb.centroestudio`), el puente nativo con degradación segura en la web, los presupuestos de rendimiento móvil y la gestión de la biblioteca estática.

### Requirements

#### Requirement: Remote-First Web App Seam

The system SHALL operate with a remote-first Capacitor architecture where native WebViews load `https://ceoubb.com`, reserving local bundled assets solely for offline fallback.

##### Scenario: Native container boot

- **GIVEN** the Android app launches with active connectivity
- **WHEN** the Capacitor WebView initializes
- **THEN** it SHALL navigate to `https://ceoubb.com`

#### Requirement: Safe Native Bridge Degradation

The system SHALL ensure that all native bridge invocations (`lib/mobile-bridge.ts`, Haptics, Push Notifications, Status Bar) degrade silently to a no-op when executing in a standard web browser.

##### Scenario: Browser execution

- **GIVEN** execution on web platform (`Capacitor.isNativePlatform() === false`)
- **WHEN** `triggerHapticFeedback()` is called
- **THEN** it SHALL resolve safely without throwing an exception

#### Requirement: Single Study Library Copy

The system SHALL maintain `public/biblioteca/` as the single authoritative copy of study resources, avoiding duplication in native asset trees.

##### Scenario: Asset resolution

- **WHEN** referencing study documents or guides
- **THEN** the client SHALL resolve them via `/biblioteca/...`
