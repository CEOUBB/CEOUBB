---
version: alpha
name: CEOUBB Design System
description: An institutional design system for Centro de Estudio UBB: a paper-calm, high-readability academic platform built on a light canvas, a Merriweather display voice over near-black Manrope UI typography, and UBB's official royal blue, red, and gold emblem palette.

colors:
  primary: "oklch(0.48 0.18 255)" # UBB Royal Blue #0055b8
  primary-active: "oklch(0.38 0.16 255)" # #003d82
  secondary: "oklch(0.24 0.09 255)" # UBB Midnight Navy #002b5c
  on-primary: "#ffffff"
  canvas: "#ffffff"
  canvas-soft: "oklch(0.975 0.005 240)" # #f4f6f9
  surface: "#ffffff"
  ink: "oklch(0.20 0.03 260)" # #0f172a
  ink-secondary: "oklch(0.36 0.03 255)" # #334155
  ink-muted: "oklch(0.48 0.03 250)" # #64748b
  ink-faint: "oklch(0.58 0.03 250)" # #94a3b8
  hairline: "oklch(0.920 0.006 60)" # #e2e8f0
  accent-sky: "oklch(0.75 0.14 235)" # #38bdf8
  accent-purple: "oklch(0.62 0.22 300)" # #8b5cf6
  accent-purple-deep: "oklch(0.35 0.20 300)" # #4c1d95
  accent-pink: "oklch(0.65 0.22 350)" # #ec4899
  accent-orange: "oklch(0.55 0.22 25)" # Shield Red #e31b23
  accent-orange-deep: "oklch(0.42 0.20 25)" # #991b1b
  accent-teal: "oklch(0.58 0.12 185)" # #0d9488
  accent-green: "oklch(0.70 0.17 155)" # #10b981
  accent-yellow: "oklch(0.75 0.16 75)" # #f59e0b
  accent-brown: "oklch(0.38 0.12 60)" # #78350f

typography:
  display-1:
    fontFamily: Merriweather
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -2.125px
  display-2:
    fontFamily: Merriweather
    fontSize: 54px
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -1.875px
  heading-1:
    fontFamily: Merriweather
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1px
  heading-2:
    fontFamily: Merriweather
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.23
    letterSpacing: -0.625px
  heading-3:
    fontFamily: Merriweather
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.27
    letterSpacing: -0.25px
  title:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.125px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0
  button:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  eyebrow:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: 0.125px

rounded:
  xs: 4px
  sm: 5px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 28px
  xxl: 32px

components:
  app-bar:
    description: "Global LMS app bar. Solid institutional navy across the full width, 58px tall, closed by a 2px heraldic rule (royal blue / sky / gold / red)."
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    height: 58px
    padding: 0 16px
  nav-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    padding: 16px
  course-card-banner:
    description: "Course cover slot on the dashboard card. 16:5 band tinted with the course tone and a centred Phosphor glyph; accepts a teacher-uploaded image through the --course-image custom property."
    aspectRatio: "16 / 5"
    backgroundColor: "color-mix(in srgb, {course-tone} 13%, white)"
    borderBottom: "1px solid {colors.hairline}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
  button-utility:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 4px 14px
  button-icon-circular:
    backgroundColor: "rgba(0, 0, 0, 0.05)"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
  badge-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.full}"
    padding: 4px 8px
  feature-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  feature-card-elevated:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    padding: 6px
  hero-band:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-1}"
    padding: 32px
  footer:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.caption}"
    padding: 32px
---

## Overview

CEOUBB (Centro de Estudio UBB) is structured as a clear academic workspace. The dominant surface is a calm, paper-soft off-white (`{colors.canvas-soft}` / #f4f6f9 / `oklch(0.975 0.005 240)`) that reduces eye strain during extended study sessions and makes course portals read like a structured academic document. Type is set in `Manrope` in near-black `{colors.ink}` (oklch(0.20 0.03 260) / #0f172a) at large, tightly-tracked weights, so headlines read as clear, confident statements with zero letter-spacing slack at display sizes (`{typography.display-1}` pulls -2.125px of tracking at 64px). The overall interface uses quiet greys and deep slates, punctuated by a single structural accent: **UBB Royal Blue**, `{colors.primary}` (oklch(0.48 0.18 255) / #0055b8), derived from Universidad del Bío-Bío's official heraldic shield and reserved strictly for primary actions, active navigation states, and inline links.

Against that quiet chrome, CEOUBB utilizes an **academic and shield accent palette** inspired by the UBB crest: UBB Shield Red (`{colors.accent-orange}` / #e31b23), Sun Gold (`{colors.accent-yellow}` / #f59e0b), Sky Blue (`{colors.accent-sky}` / #38bdf8), Academic Emerald (`{colors.accent-green}` / #10b981), Teal (`{colors.accent-teal}` / #0d9488), and Violet (`{colors.accent-purple}` / #8b5cf6). These accents carry course category indicators, evaluation tags, status badges, and academic metrics. They never structure the layout or paint primary CTAs; they categorize and decorate. The interface remains clean and institutional so educational materials and course activity remain the primary focus. The single exception to the light tone is the portal hero, which inverts into a deep UBB Midnight Navy band (`{colors.secondary}` / #002b5c) with white typography as an institutional anchor section.

Surfaces are defined by clean hairlines (`{colors.hairline}` / #e2e8f0) and subtle layered micro-shadows rather than heavy drop-shadows. Feature cards round at 12px (`{rounded.lg}`), primary action buttons are fully pill-shaped (`{rounded.full}`), and utility controls round at 8px (`{rounded.md}`). Nothing is visually distracting; the system's character comes from academic clarity, precise spacing, and harmonious color contrast.

**Key Characteristics:**

- Paper-soft light canvas `{colors.canvas-soft}` over pure white, optimized for long academic reading sessions
- Near-black `{colors.ink}` `Manrope` typography with tight negative tracking at display sizes (`{typography.display-1}`)
- Exactly one structural accent: UBB Royal Blue `{colors.primary}` (#0055b8), reserved for CTAs, active states, and links
- An academic category palette (`{colors.accent-yellow}`, `{colors.accent-orange}`, `{colors.accent-sky}`, `{colors.accent-teal}`, `{colors.accent-green}`, `{colors.accent-purple}`) derived from the UBB heraldic shield to tag subjects, grades, and statuses
- Pill-shaped main CTAs (`{rounded.full}`) contrasted with 8px utility buttons (`{rounded.md}`)
- Elevation achieved via clean hairlines and layered micro-shadows
- A single dark UBB Midnight Navy hero band (`{colors.secondary}`) anchoring full-bleed portal highlights

## Colors

> Palette derived directly from the official Universidad del Bío-Bío heraldic shield (`ubb-shield.webp`): UBB Royal Blue, Shield Red center, Sun Gold torches/stars, Wave Sky Blue, and Platinum silver accents.

### Brand and Accent

- **UBB Royal Blue** (`{colors.primary}`: #0055b8): the single structural accent. Primary CTA fill ("Ingresar a CEOUBB", "Ver ramo"), inline link color, active tab indicator, and focus ring. This is the only color that paints primary user actions.
- **Pressed Blue** (`{colors.primary-active}`: #003d82): the darker press state of the primary CTA button.
- **UBB Midnight Navy** (`{colors.secondary}`: #002b5c): the institutional chrome. It fills the global app bar across every portal view and the dark course cover band, directly matching the deep base of the UBB shield. Both surfaces close with the heraldic rule (royal blue, sky, gold, red) read from the crest.

The remaining colors form CEOUBB's **academic category palette**, used for course badges, evaluation status, faculty tags, and statistics, never as primary CTA fills:

- **Shield Sky Blue** (`{colors.accent-sky}`: #38bdf8)
- **Shield Gold** (`{colors.accent-yellow}`: #f59e0b)
- **Shield Red** (`{colors.accent-orange}`: #e31b23) / **Deep Red** (`{colors.accent-orange-deep}`: #991b1b)
- **Academic Emerald** (`{colors.accent-green}`: #10b981)
- **Academic Teal** (`{colors.accent-teal}`: #0d9488)
- **Academic Purple** (`{colors.accent-purple}`: #8b5cf6) / **Deep Purple** (`{colors.accent-purple-deep}`: #4c1d95)
- **Academic Pink** (`{colors.accent-pink}`: #ec4899)
- **Academic Bronze** (`{colors.accent-brown}`: #78350f)

### Surface

- **White** (`{colors.canvas}` / `{colors.surface}`: #ffffff): card and panel surfaces, navigation bar, form fields.
- **Paper Canvas** (`{colors.canvas-soft}`: #f4f6f9): the signature page canvas and footer band, a soft off-white slate that gives the entire platform its calm document feel.
- **Hairline** (`{colors.hairline}`: #e2e8f0): 1px card borders and section dividers.

### Text

- **Ink** (`{colors.ink}`: #0f172a): primary headings and main body text.
- **Slate Charcoal** (`{colors.ink-secondary}`: #334155): secondary body copy and footer text.
- **Muted Slate** (`{colors.ink-muted}`: #64748b): supporting copy, timestamps, and secondary metadata.
- **Ash Slate** (`{colors.ink-faint}`: #94a3b8): captions, placeholder text, and disabled elements.

### Semantic

Status and system feedback map to the academic palette:

- **Success / Approved**: `{colors.accent-green}` (#10b981)
- **Warning / Pending**: `{colors.accent-yellow}` (#f59e0b)
- **Danger / Urgent**: `{colors.accent-orange}` (#e31b23)
- **Info / Course Note**: `{colors.primary}` (#0055b8) or `{colors.accent-sky}` (#38bdf8)

## Typography

### Font Family

CEOUBB runs on a two-family pairing, mirroring the standard university split between printed official acts and administrative forms:

- **`Merriweather`** (`--font-display`, fallback `"Iowan Old Style", "Palatino Linotype", Georgia, serif`) signs the institution: page headings, section titles, course names and cover headlines, the brand lockup, and the large grade and progress figures.
- **`Manrope`** (`--font-core`, fallback `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) carries operational content: navigation, tables, forms, metadata, badges, and body copy.

Numerals are set with `font-variant-numeric: lining-nums tabular-nums` (`--num`) wherever figures line up in a column: grades, weights, dates, counters. Monospace (`--font-mono`) is reserved for registry identifiers such as course codes (`440299`, `MATLAB`) and file extensions, never as a decorative styling voice.

### Hierarchy

| Token                    | Size | Weight | Line Height | Letter Spacing | Use                                                 |
| ------------------------ | ---- | ------ | ----------- | -------------- | --------------------------------------------------- |
| `{typography.display-1}` | 64px | 700    | 1.0         | -2.125px       | Main portal hero headline ("Centro de Estudio UBB") |
| `{typography.display-2}` | 54px | 700    | 1.04        | -1.875px       | Major section titles                                |
| `{typography.heading-1}` | 40px | 700    | 1.1         | -1px           | Page headings ("Mis Asignaturas y Materiales")      |
| `{typography.heading-2}` | 26px | 700    | 1.23        | -0.625px       | Course module headings, section subtitles           |
| `{typography.heading-3}` | 22px | 700    | 1.27        | -0.25px        | Course card titles, dialog titles                   |
| `{typography.title}`     | 20px | 600    | 1.4         | -0.125px       | Resource item titles, callout headings              |
| `{typography.body-md}`   | 16px | 400    | 1.5         | 0              | Standard body copy, announcement text               |
| `{typography.body-sm}`   | 15px | 400    | 1.33        | 0              | Dense body, table cells, navigation links           |
| `{typography.button}`    | 16px | 500    | 1.5         | 0              | Action button labels                                |
| `{typography.caption}`   | 14px | 400    | 1.43        | 0              | Footnotes, file sizes, upload metadata              |
| `{typography.eyebrow}`   | 12px | 600    | 1.33        | +0.125px       | Status badges, category pills, code tags            |

### Principles

CEOUBB's typographic voice is clean, structured, and legible. Headlines rely on weight 700 and negative tracking at larger font sizes so display titles read compactly. Body copy maintains a 1.5 line-height for optimal reading comfort. The contrast between bold headings (700) and regular body text (400) creates a fast, scannable academic hierarchy.

## Layout

### Spacing System

- **Base unit**: 8px.
- **Tokens (front matter)**: `{spacing.xxs}` 4px, `{spacing.xs}` 8px, `{spacing.sm}` 12px, `{spacing.md}` 16px, `{spacing.lg}` 24px, `{spacing.xl}` 28px, `{spacing.xxl}` 32px.
- Card interior padding uses `{spacing.lg}` (24px); utility buttons use 4px 14px; search fields use 6px padding. Section gaps stack the larger 24px to 32px steps.

### Grid and Container

Content is centered in a standard max-width container (~1080 to 1300px on desktop) with generous lateral padding. Course dashboards alternate between full-width hero summary blocks and 2-up / 3-up resource grids; grade tables widen to full container width. The dark hero band spans full-bleed edge-to-edge while main page content rests within the centered container.

### Whitespace Philosophy

Whitespace is the primary grouping device. Dashboard sections are separated by generous vertical padding rather than dark divider lines, and course cards sit on the soft canvas with subtle hairlines (`{colors.hairline}`). The presentation feels airy, structured, and easy to navigate.

### Responsive Strategy

#### Breakpoints

| Name    | Width       | Key Changes                                                     |
| ------- | ----------- | --------------------------------------------------------------- |
| Wide    | 1440px+     | Full multi-column dashboard grids, max container                |
| Desktop | 1080-1300px | Standard centered container, 3-column course grids              |
| Tablet  | 768-840px   | Grids reflow to 2 columns, navigation collapses                 |
| Mobile  | <=600px     | Single-column vertical stack, mobile drawer, full-width actions |

#### Touch Targets

All action buttons (`button-primary`, `button-secondary`, `button-utility`) maintain a minimum 44x44px hit region on touch devices by preserving vertical touch padding even on compact viewports.

#### Collapsing Strategy

Top navigation reflows into a mobile menu below 768px; multi-column course grids stack into a single column; gradebook tables convert to scrollable or card-based views.

## Elevation and Depth

| Level       | Treatment                                                                                                                | Use                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| 0: Flat     | Hairline border `{colors.hairline}`, no shadow                                                                           | Default cards, subject list items        |
| 1: Soft     | Micro shadow: `rgba(0,0,0,0.01) 0 0.175px 1.041px`, `0.02 0 0.8px 2.925px`, `0.027 0 2.025px 7.847px`, `0.04 0 4px 18px` | Hoverable course cards, floating actions |
| 2: Elevated | Deeper shadow stack ending in `rgba(0,0,0,0.05) 0 23px 52px`                                                             | Modals, popovers, announcement dialogs   |

CEOUBB uses minimal depth: elevation relies on crisp 1px borders and layered micro-shadows so elements lift gently off the light background without creating visual noise.

## Shapes

### Border Radius Scale

| Token            | Value  | Use                                                 |
| ---------------- | ------ | --------------------------------------------------- |
| `{rounded.xs}`   | 4px    | Form inputs, search fields, inline code chips       |
| `{rounded.sm}`   | 5px    | Table row actions, dropdown menu items              |
| `{rounded.md}`   | 8px    | Utility buttons, filter tags, small container cards |
| `{rounded.lg}`   | 12px   | Course cards, resource containers, preview frames   |
| `{rounded.xl}`   | 16px   | Main dashboard panels, modal containers             |
| `{rounded.full}` | 9999px | Primary pill CTAs, status badges, avatar icons      |

## Components

> Specs document Default and Active/Pressed states. Component tokens match front-matter entries.

### Navigation

**`nav-bar`**: Main navigation bar

- White background `{colors.canvas}`, `{colors.ink}` text at `{typography.body-sm}`, padding `{spacing.md}`. Includes CEOUBB logo mark, navigation links, and a `button-utility` CTA ("Acceder al Portal").

### Buttons

**`button-primary`**: Primary Action CTA ("Ingresar a CEOUBB")

- Background `{colors.primary}` (#0055b8), text `{colors.on-primary}`, type `{typography.button}`, fully pill-shaped `{rounded.full}`. Used for the primary call-to-action on any view.
- Pressed state in `button-primary-pressed` (background `{colors.primary-active}`).

**`button-primary-pressed`**

- Background `{colors.primary-active}` (#003d82), text `{colors.on-primary}`.

**`button-secondary`**: Secondary Action CTA ("Explorar Ramos")

- White background `{colors.surface}`, text `{colors.ink}`, type `{typography.button}`, pill `{rounded.full}`, subtle Level-1 shadow.

**`button-utility`**: Compact Navigation / Filter Action

- White surface `{colors.surface}`, text `{colors.ink}`, type `{typography.button}`, radius `{rounded.md}` (8px), padding `4px 14px`, 1px `{colors.hairline}` border.

**`button-icon-circular`**: Circular Media / Icon Control

- Circular `{rounded.full}` control with translucent `rgba(0,0,0,0.05)` fill and `{colors.on-primary}` glyph.

### Cards and Containers

**`feature-card`**: Course / Resource Card

- White surface `{colors.surface}`, `{colors.ink}` text, `{typography.body-md}`, radius `{rounded.lg}` (12px), padding `{spacing.lg}` (24px). Often paired with a color-coded top category indicator tag from the UBB academic palette. Hairline border `{colors.hairline}`.

**`feature-card-elevated`**: Floating Feature Container

- Same dimensions as `feature-card` with Level-1 micro shadow.

**`study-track-card`** / **`study-track-card-featured`**: Module / Track Cards

- Repurposed for course track and study plan cards using `{colors.surface}` and `{colors.canvas-soft}` backgrounds.

### Inputs and Forms

**`text-input`**: Input / Search Field

- White surface `{colors.surface}`, `{colors.ink}` text, `{typography.body-sm}`, 1px `{colors.hairline}` border, radius `{rounded.xs}` (4px), padding `6px`.

### Signature Components

**`hero-band`**: Portal Hero Header

- Full-bleed UBB Midnight Navy `{colors.secondary}` (#002b5c) band carrying white `{typography.display-1}` title, institutional emblem, and CTA button pair.

**`badge-pill`**: Status and Category Pill

- White surface `{colors.surface}`, `{colors.primary}` text, `{typography.eyebrow}` (12px / 600), pill `{rounded.full}`, padding `4px 8px`.

**`footer`**: Institutional Footer

- `{colors.canvas-soft}` band, `{colors.ink-secondary}` text at `{typography.caption}`, padding `{spacing.xxl}`. Includes disclaimers, resource links, and copyright info.

### Examples (illustrative)

**`ex-study-track`**: Default Course Track card. Uses feature-card style with `{colors.canvas-soft}` background.
**`ex-study-track-featured`**: Highlighted Course Track, inverted surface (`{colors.ink}` fill with `{colors.on-primary}` text).
**`ex-resource-card`**: Resource summary card for academic materials.
**`ex-materials-drawer`**: Selected study materials list drawer.
**`ex-app-shell-row`**: Sidebar navigation item with `{colors.primary}` active indicator.
**`ex-data-table-cell`**: Academic gradebook th + td cell style.
**`ex-auth-form-card`**: Student login / auth card.
**`ex-modal-card`**: Dialog modal surface.
**`ex-empty-state-card`**: Empty state container.
**`ex-toast`**: System toast notification.

## Do's and Don'ts

### Do

- Reserve UBB Royal Blue (`{colors.primary}` / #0055b8) strictly for primary actions, active navigation states, and inline links.
- Keep page backgrounds on the paper-soft canvas (`{colors.canvas-soft}` / #f4f6f9) for readability.
- Use the academic shield palette (`{colors.accent-yellow}`, `{colors.accent-orange}`, `{colors.accent-sky}`, etc.) exclusively for category tags, subject badges, and status highlights.
- Set headings, course names and cover headlines in bold `Merriweather` (`{typography.display-1}`, `{typography.heading-1}`) with about -0.02em tracking, and leave every operational surface in `Manrope`.
- Give figures that line up in a column (grades, weights, dates, counters) `lining-nums tabular-nums`.
- Keep the global app bar in UBB Midnight Navy with the heraldic rule closing it; it is the platform's institutional signature.
- Apply fully pill-shaped radii (`{rounded.full}`) for main CTA buttons and 8px (`{rounded.md}`) for utility buttons.
- Use 1px hairlines (`{colors.hairline}`) and micro shadows for UI component borders.
- Keep the dark UBB Midnight Navy (`{colors.secondary}`) treatment reserved for the hero header.

### Don't

- Don't paint primary CTAs or structural page fills in category accent colors (e.g. red or gold).
- Don't introduce arbitrary blue shades outside the official UBB Royal Blue (`#0055b8`) and Navy (`#002b5c`).
- Don't use full pill radii on text inputs; keep form controls tight at 4px (`{rounded.xs}`).
- Don't use heavy, dark drop-shadows.
- Don't set body copy in bold weights; reserve weight 700 for headings.
- Don't set the serif in interface furniture: buttons, tabs, table cells, form labels, badges and metadata stay in `Manrope`.
- Don't place an eyebrow or kicker label above a page heading; the heading carries its own weight, and context belongs in the line beneath it or in a chip row.
- Don't use monospace as a technical costume; it is only for course codes, file extensions and other registry identifiers.
- Don't use pure clinical white (#ffffff) for full page backgrounds; use `{colors.canvas-soft}` (#f4f6f9).
