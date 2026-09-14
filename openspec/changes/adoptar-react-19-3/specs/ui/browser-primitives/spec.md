## Purpose

Define el mecanismo estándar de aislamiento y ejecución de componentes que dependen exclusivamente de APIs del navegador web o del puente nativo de Capacitor móvil mediante `use(browser())`.

## ADDED Requirements

### Requirement: Server-Side Opt-Out via Native browser() Hook

The system SHALL utilize `use(browser())` from `react-dom` inside client-only components that access `window`, `document`, `localStorage`, or Capacitor plugins, opting them out of server-side rendering without hydration mismatch errors.

#### Scenario: Server render suspension

- **WHEN** a component calling `use(browser())` is rendered during server-side HTML streaming
- **THEN** the component SHALL trigger Suspense on the server and yield immediately to the nearest Suspense fallback

#### Scenario: Client hydration resolution

- **WHEN** the document hydrates on the client environment
- **THEN** `use(browser())` SHALL resolve synchronously without suspending, allowing immediate execution of browser and native device capabilities

### Requirement: Elimination of Mounted State Anti-Patterns

The system SHALL replace legacy `useState(false)` + `useEffect(() => setMounted(true))` boilerplate in portal and browser-bound utilities with declarative `use(browser())` calls.

#### Scenario: Portal element rendering

- **WHEN** `app/Portal.tsx` renders in the browser context
- **THEN** it SHALL render children into the target DOM container without requiring a secondary render cycle driven by `setMounted(true)`
