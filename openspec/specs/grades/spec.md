# grades Specification

### Purpose

Gobierna la aritmética pura de calificaciones en el sistema universitario chileno (escala 1.0 a 7.0), los promedios ponderados, redondeos institucionales y las validaciones de aprobación.

### Requirements

#### Requirement: Chilean Grade Scale Bounds

The system SHALL strictly validate that all grade inputs are real numbers within the inclusive interval $[1.0, 7.0]$.

##### Scenario: Grade within bounds accepted

- **GIVEN** a grade value of `5.5`
- **WHEN** submitted for recording
- **THEN** the system SHALL accept the value

##### Scenario: Grade out of bounds rejected

- **GIVEN** a grade value of `7.5` or `0.8`
- **WHEN** validated by `validateGrade()`
- **THEN** the system SHALL return a validation error

#### Requirement: Institutional Grade Rounding

The system SHALL round all calculated weighted averages to exactly one decimal place using half-up arithmetic (`roundGrade()` in `lib/grades.ts`).

##### Scenario: Rounding calculated average

- **GIVEN** an unrounded average of `3.94`
- **WHEN** rounded by `roundGrade()`
- **THEN** the resulting grade SHALL be `3.9`

##### Scenario: Rounding approval threshold

- **GIVEN** an unrounded average of `3.95`
- **WHEN** rounded by `roundGrade()`
- **THEN** the resulting grade SHALL be `4.0` (Approval)

#### Requirement: Weighted Average Calculation

The system SHALL compute course final grades based on evaluation weights summing to 100%.

##### Scenario: Weighted evaluation average

- **GIVEN** grades `[5.0, 6.0]` with weights `[40%, 60%]`
- **WHEN** calculating weighted average
- **THEN** the final grade SHALL be `5.6`
