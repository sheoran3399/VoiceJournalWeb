# Design System — Voice Journal (Web)

## Product Context
- **What this is:** A personal voice + text journaling web app with a CBT
  (cognitive behavioral therapy) reflection mode, AI-generated reflections
  (IFS-style), an English coach, word-of-the-day, and pattern analysis across
  past entries.
- **Who it's for:** A single user (personal tool), used for reflective,
  sometimes vulnerable writing — often at day's end.
- **Space/industry:** Personal journaling / mental wellness, adjacent to
  Day One, Reflectly, How We Feel.
- **Project type:** Mobile-first web app (no build step, vanilla JS/CSS).

## Aesthetic Direction
- **Direction:** Editorial/Magazine — a considered-publication feel, not a
  soft wellness-app look.
- **Decoration level:** Minimal — hairline rules and left-border accents,
  no texture or gradients.
- **Mood:** Confident and credible, warm-toned (not cold/clinical black),
  quietly serious rather than cute or bubbly.
- **Reference sites:** dayoneapp.com (whitespace, warmth), howwefeel.org
  (dark editorial confidence, typography-as-hero).

## Typography
- **Display/Hero:** Fraunces 700 — app masthead, section headers
- **Pull-quote (AI-generated text only):** Fraunces 500 italic — reflections,
  coach insights, poem-of-the-day, pattern-analysis insights. Never used for
  the user's own writing — that distinction is the point of the direction.
- **Body:** Instrument Sans 400/500 — user's own journal text, form inputs
- **UI/Labels:** Instrument Sans 700, uppercase kickers with wide tracking
  for metadata (card titles, timestamps, step counters)
- **Data/Tables:** n/a (no tabular data in this product)
- **Loading:** Google Fonts CDN — see `index.html` `<link>` tags
- **Scale:** Masthead 28px / Section header ~16-18px / Body 14-16px /
  Kicker 11-12px uppercase / CBT step numerals 26px

## Color
- **Approach:** Balanced — one confident accent, semantic colors for
  calm/error states, dark as default.
- **Primary (Ink/bg):** `#171512` dark / `#F5F1E8` light
- **Surface:** `#211E19` dark / `#FFFFFF` light
- **Surface-2 (secondary buttons/chips):** `#2A251F` dark / `#ECE5D6` light
- **Text:** `#F2ECE1` dark / `#1A1712` light — muted: `#9C9184` / `#6E655A`
- **Accent (gold):** `#E8B04B` dark / `#B8811F` light — CTAs, links, active
  tab, step numerals, kicker labels
- **Semantic — calm/positive (sage):** `#5C8267` dark / `#4A6E56` light —
  "connected"/"saved" status, CBT calm states, pattern-analysis insights
- **Semantic — error/distortion (oxblood):** `#C56658` dark / `#7A2E2E`
  light — replaces iOS red; deliberately muted so distortion-tag review
  doesn't read as alarm
- **Dark mode:** Primary/default experience, not an afterthought. Light
  mode is warm paper, not stark white. Theme choice persists to
  `localStorage['theme']`, toggled via `#themeToggleBtn` in the header.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable, with large scale contrast (big masthead type
  vs. small kicker type) rather than uniform gaps

## Layout
- **Approach:** Editorial hierarchy within a single mobile-first column —
  oversized Fraunces step numerals in the CBT form, uppercase kicker labels
  above card titles, hairline dividers instead of card-in-card nesting.
- **Max content width:** 480px (`.app` container)
- **Border radius:** Flat-to-minimal — 4px on buttons/inputs/cards
  (`--radius-input`); AI-content cards use a `border-left: 3px solid
  var(--accent)` accent instead of full rounding; the settings modal (a
  bottom sheet, not a content card) keeps 16px top corners (`--radius-sheet`).

## Motion
- **Approach:** Minimal-functional — quiet and precise, no ambient or
  bouncy motion.
- **Duration:** 150-250ms for fades/transitions, including the light/dark
  theme toggle (`body { transition: background 0.25s, color 0.25s }`).

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-02 | Editorial/dark direction chosen over warm-terracotta alternative | User felt the terracotta/parchment direction was "too generic-warm"; editorial direction reviewed in both dark and light HTML previews before approval |
| 2026-07-02 | AI-generated text gets italic Fraunces pull-quote treatment, user's own writing stays in Instrument Sans | Deliberate typographic distinction between "your voice" and "the app's voice" |
| 2026-07-02 | Per-feature color moods (separate accent per tab/card) rejected | User picked only the pull-quote typographic risk, not the color-mood risk — kept one accent system-wide for coherence |
