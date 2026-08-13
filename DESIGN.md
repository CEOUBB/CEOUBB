---
version: alpha
name: CEOUBB Design System
description: An institutional design system for Centro de Estudio UBB — a paper-calm, high-readability academic platform built on a light canvas, a Source Serif 4 display voice over near-black Inter UI typography, and UBB's official royal blue, red, and gold emblem palette.

colors:
  primary: "#0055b8"
  primary-active: "#003d82"
  secondary: "#002b5c"
  on-primary: "#ffffff"
  canvas: "#ffffff"
  canvas-soft: "#f4f6f9"
  surface: "#ffffff"
  ink: "#0f172a"
  ink-secondary: "#334155"
  ink-muted: "#57657a"
  ink-faint: "#616f85"
  hairline: "#e2e8f0"
  accent-sky: "#38bdf8"
  accent-purple: "#8b5cf6"
  accent-purple-deep: "#4c1d95"
  accent-pink: "#ec4899"
  accent-orange: "#e31b23"
  accent-orange-deep: "#991b1b"
  accent-teal: "#0d9488"
  accent-green: "#10b981"
  accent-yellow: "#f59e0b"
  accent-brown: "#78350f"

typography:
  display-1:
    fontFamily: Source Serif 4
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -1.28px
  display-2:
    fontFamily: Source Serif 4
    fontSize: 54px
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -1.08px
  heading-1:
    fontFamily: Source Serif 4
    fontSize: 38px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.76px
  heading-2:
    fontFamily: Source Serif 4
    fontSize: 23px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.345px
  heading-3:
    fontFamily: Source Serif 4
    fontSize: 21px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.21px
  title:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.125px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0
  button:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0
  eyebrow:
    fontFamily: Inter
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
  pricing-plan-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 24px
  pricing-plan-card-featured:
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
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

  ex-pricing-tier:
    description: "Default Pricing tier card. Re-uses feature-card chrome with brand canvas-soft surface."
    backgroundColor: "{colors.canvas-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  ex-pricing-tier-featured:
    description: "Featured/highlighted tier — polarity-flipped surface (dark fill + light text in light mode, light fill + dark text in dark mode)."
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  ex-product-selector:
    description: "What's Included summary card — re-purposed for SaaS / B2B verticals (NOT a literal product gallery)."
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  ex-cart-drawer:
    description: "Subscription summary — re-purposed for SaaS / B2B (line items per add-on, not literal cart)."
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
    item-divider: "{colors.hairline}"
  ex-app-shell-row:
    description: "Sidebar nav row inside the App Shell example. Active state uses brand primary as the indicator."
    backgroundColor: "{colors.canvas}"
    activeIndicator: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm} {spacing.md}"
  ex-data-table-cell:
    description: "Default data-table th + td chrome. Header uses mono-caps eyebrow typography; body uses body-sm."
    headerBackground: "{colors.canvas-soft}"
    headerTypography: "{typography.eyebrow}"
    bodyTypography: "{typography.body-sm}"
    cellPadding: "{spacing.sm} {spacing.md}"
    rowBorder: "{colors.hairline}"
  ex-auth-form-card:
    description: "Sign-in / sign-up card. Re-uses feature-card chrome with text-input primitives inside."
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  ex-modal-card:
    description: "Modal dialog surface — same chrome as feature-card with elevated shadow."
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  ex-empty-state-card:
    description: "Empty-state illustration frame."
    backgroundColor: "{colors.canvas-soft}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xxl}"
    captionTypography: "{typography.body-md}"
  ex-toast:
    description: "Toast notification surface — feature-card shape + medium shadow."
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.sm} {spacing.md}"
    typography: "{typography.body-sm}"

---


## Overview

CEOUBB (Centro de Estudio UBB) feels like a well-organized academic workspace in natural daylight. The dominant surface is not a pure sterile white but a calm, paper-soft off-white — `{colors.canvas-soft}` (#f4f6f9) — that takes the eye strain off long study sessions and makes course portals feel like reading a structured academic document rather than a noisy web app. Type is set in `Inter` in near-black `{colors.ink}` (#0f172a) at large, tightly-tracked weights, so headlines read as clear, confident statements with zero letter-spacing slack at display sizes (`{typography.display-1}` pulls −2.125px of tracking at 64px). The whole system speaks in quiet greys and deep slates, punctuated by a single structural accent: **UBB Royal Blue**, `{colors.primary}` (#0055b8), derived from Universidad del Bío-Bío's official heraldic shield and reserved strictly for primary actions, active navigation states, and inline links.

Against that quiet chrome, CEOUBB utilizes an **academic & shield accent palette** inspired by the UBB crest — UBB Shield Red (`{colors.accent-orange}` / #e31b23), Sun Gold (`{colors.accent-yellow}` / #f59e0b), Sky Blue (`{colors.accent-sky}` / #38bdf8), Academic Emerald (`{colors.accent-green}` / #10b981), Teal (`{colors.accent-teal}` / #0d9488), and Violet (`{colors.accent-purple}` / #8b5cf6). These accents carry course category indicators, evaluation tags, status badges, and academic metrics. They never structure the layout or paint primary CTAs; they categorize and decorate. The discipline is deliberate: the interface remains clean and institutional so educational materials and course activity can take center stage. The single exception to the bright daylight tone is the portal hero, which inverts into a deep UBB Midnight Navy band (`{colors.secondary}` / #002b5c) with white typography — a strong institutional anchor section.

Surfaces are defined by clean hairlines (`{colors.hairline}` / #e2e8f0) and subtle layered micro-shadows rather than heavy drop-shadows. Feature cards round at a friendly 12px (`{rounded.lg}`), primary action buttons are fully pill-shaped (`{rounded.full}`), and utility controls round at a tighter 8px (`{rounded.md}`). Nothing is visually distracting; the system's character comes from academic clarity, precise spacing, and harmonious color contrast.

**Key Characteristics:**
- Paper-soft light canvas `{colors.canvas-soft}` over pure white, optimized for long academic reading sessions
- Near-black `{colors.ink}` `Inter` typography with tight negative tracking at display sizes (`{typography.display-1}`)
- Exactly one structural accent — UBB Royal Blue `{colors.primary}` (#0055b8) — reserved for CTAs, active states, and links
- An academic category palette (`{colors.accent-yellow}`, `{colors.accent-orange}`, `{colors.accent-sky}`, `{colors.accent-teal}`, `{colors.accent-green}`, `{colors.accent-purple}`) derived from the UBB heraldic shield to tag subjects, grades, and statuses
- Pill-shaped main CTAs (`{rounded.full}`) contrasted with 8px utility buttons (`{rounded.md}`)
- Elevation achieved via clean hairlines + barely-there layered micro-shadows
- A single dark UBB Midnight Navy hero band (`{colors.secondary}`) anchoring full-bleed portal highlights

## Colors

> Palette derived directly from the official Universidad del Bío-Bío heraldic shield (`ubb-shield.webp`): UBB Royal Blue, Shield Red center, Sun Gold torches/stars, Wave Sky Blue, and Platinum silver accents.

### Primary
- **UBB Royal Blue** (`{colors.primary}` — #0055b8): the single structural accent. Primary CTA fill ("Ingresar a CEOUBB", "Ver ramo"), inline link color, active tab indicator, and focus ring. This is the only color that paints primary user actions.
- **Pressed Blue** (`{colors.primary-active}` — #003d82): the darker press state of the primary CTA button.

### Secondary
- **UBB Midnight Navy** (`{colors.secondary}` — #002b5c): the institutional chrome. It fills the global app bar across every portal view and the dark course cover band, directly matching the deep base of the UBB shield. Both surfaces close with the heraldic rule — royal blue, sky, gold, red — read from the crest.

The remaining colors form CEOUBB's **academic category palette** — used for course badges, evaluation status, faculty tags, and statistics, never as primary CTA fills:
- **Shield Sky Blue** (`{colors.accent-sky}` — #38bdf8)
- **Shield Gold** (`{colors.accent-yellow}` — #f59e0b)
- **Shield Red** (`{colors.accent-orange}` — #e31b23) / **Deep Red** (`{colors.accent-orange-deep}` — #991b1b)
- **Academic Emerald** (`{colors.accent-green}` — #10b981)
- **Academic Teal** (`{colors.accent-teal}` — #0d9488)
- **Academic Purple** (`{colors.accent-purple}` — #8b5cf6) / **Deep Purple** (`{colors.accent-purple-deep}` — #4c1d95)
- **Academic Pink** (`{colors.accent-pink}` — #ec4899)
- **Academic Bronze** (`{colors.accent-brown}` — #78350f)

### Neutral
- **White** (`{colors.canvas}` / `{colors.surface}` — #ffffff): card and panel surfaces, navigation bar, form fields.
- **Paper Canvas** (`{colors.canvas-soft}` — #f4f6f9): the signature page canvas and footer band — a soft off-white slate that gives the entire platform its calm document feel.
- **Hairline** (`{colors.hairline}` — #e2e8f0): 1px card borders and section dividers.
- **Ink** (`{colors.ink}` — #0f172a): primary headings and main body text.
- **Slate Charcoal** (`{colors.ink-secondary}` — #334155): secondary body copy and footer text.
- **Muted Slate** (`{colors.ink-muted}` — #64748b): supporting copy, timestamps, and secondary metadata.
- **Ash Slate** (`{colors.ink-faint}` — #94a3b8): captions, placeholder text, and disabled elements.

## Typography

### Font Family
- **`Source Serif 4`** (`--font-display`): page headings, section titles, course names and cover headlines, the brand lockup, and the large grade and progress figures.
- **`Inter`** (`--font-core`): navigation, tables, forms, metadata, badges, and body copy.

### Hierarchy
- **Display 1** (`{typography.display-1}`): 64px, weight 700, line height 1.0, tracking −2.125px.
- **Display 2** (`{typography.display-2}`): 54px, weight 700, line height 1.04, tracking −1.875px.
- **Headline 1** (`{typography.heading-1}`): 40px, weight 700, line height 1.1, tracking −1px.
- **Headline 2** (`{typography.heading-2}`): 26px, weight 700, line height 1.23, tracking −0.625px.
- **Headline 3** (`{typography.heading-3}`): 22px, weight 700, line height 1.27, tracking −0.25px.
- **Title** (`{typography.title}`): 20px, weight 600, line height 1.4, tracking −0.125px.
- **Body Medium** (`{typography.body-md}`): 16px, weight 400, line height 1.5.
- **Body Small** (`{typography.body-sm}`): 15px, weight 400, line height 1.33.
- **Button** (`{typography.button}`): 16px, weight 500, line height 1.5.
- **Caption** (`{typography.caption}`): 14px, weight 400, line height 1.43.
- **Eyebrow** (`{typography.eyebrow}`): 12px, weight 600, line height 1.33, tracking +0.125px.

## Layout

### Spacing System
- Base unit: 8px.
- Scale: xxs (4px), xs (8px), sm (12px), md (16px), lg (24px), xl (28px), xxl (32px).

### Grid & Container
Centered max-width container (~1080–1300px) with lateral padding. Course dashboards alternate between full-width hero summary blocks and 2-up / 3-up resource grids.

## Elevation & Depth

- **0 — Flat**: Hairline border `{colors.hairline}`, no shadow. Default cards.
- **1 — Soft**: Layered micro shadow. Hoverable course cards.
- **2 — Elevated**: Deeper shadow stack. Modals and popovers.

## Shapes

- **xs (4px)**: Form inputs, search fields.
- **sm (5px)**: Table row actions, dropdown menu items.
- **md (8px)**: Utility buttons, filter tags.
- **lg (12px)**: Course cards, resource containers.
- **xl (16px)**: Main dashboard panels.
- **full (9999px)**: Primary pill CTAs, status badges.

## Components

- **`nav-bar`**: Main navigation bar.
- **`button-primary`**: Primary Action CTA ("Ingresar a CEOUBB").
- **`button-secondary`**: Secondary Action CTA ("Explorar Ramos").
- **`button-utility`**: Compact Navigation / Filter Action.
- **`feature-card`**: Course / Resource Card.
- **`hero-band`**: Portal Hero Header.
- **`badge-pill`**: Status & Category Pill.
- **`footer`**: Institutional Footer.

## Do's and Don'ts

### Do
- Reserve UBB Royal Blue (`{colors.primary}` / #0055b8) strictly for primary actions, active navigation states, and inline links.
- Keep page backgrounds on the paper-soft canvas (`{colors.canvas-soft}` / #f4f6f9) for readability.
- Use the academic shield palette (`{colors.accent-yellow}`, `{colors.accent-orange}`, `{colors.accent-sky}`, etc.) exclusively for category tags, subject badges, and status highlights.

### Don't
- Don't paint primary CTAs or structural page fills in category accent colors.
- Don't use heavy, dark drop-shadows.
- Don't set body copy in bold weights — reserve weight 700 for headings.
