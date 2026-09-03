---
name: Baseline
description: Two luminance worlds — blush paper for the room you walk in from, a dimmed ground for the rooms you are measured in.
colors:
  paper: "#EFE7E2"
  paper-deep: "#E4DAD4"
  ink: "#16110F"
  ash: "#6A615B"
  terra: "#C4491F"
  line: "rgba(22, 17, 15, 0.16)"
  line-strong: "rgba(22, 17, 15, 0.55)"
  calm-paper: "#12100F"
  calm-paper-deep: "#1B1817"
  calm-ink: "#C9BFB6"
  calm-ash: "#8A807A"
  calm-amber: "#B8794A"
  calm-line: "rgba(201, 191, 182, 0.20)"
  calm-line-strong: "rgba(201, 191, 182, 0.55)"
typography:
  display:
    fontFamily: "Bodoni Moda, Didot, Bodoni MT, Georgia, serif"
    fontSize: "clamp(30px, 4vw, 116px)"
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: "-0.015em"
    fontVariation: "'opsz' 28 below 768px, 'opsz' 96 at and above 768px"
  lead:
    fontFamily: "Archivo, Helvetica, Arial, sans-serif"
    fontSize: "clamp(18px, 1.85vw, 27px)"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "-0.014em"
  body:
    fontFamily: "Archivo, Helvetica, Arial, sans-serif"
    fontSize: "clamp(15px, 1.05vw, 17px)"
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: "-0.003em"
  action:
    fontFamily: "Archivo, Helvetica, Arial, sans-serif"
    fontSize: "clamp(14px, 1.05vw, 16px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.005em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "clamp(12px, 0.78vw, 13px)"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.12em"
    fontFeature: "'tnum' 1, uppercase"
rounded:
  none: "0px"
  focus: "2px"
  full: "9999px"
spacing:
  gutter: "clamp(20px, 4.5vw, 76px)"
  room-pad-y: "clamp(20px, 3.5vh, 36px)"
  control-x: "24px"
  control-y: "16px"
  stack-sm: "12px"
  stack-md: "20px"
  stack-lg: "32px"
  stack-xl: "40px"
components:
  button-primary:
    textColor: "{colors.calm-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "16px 24px"
  button-primary-hover:
    textColor: "{colors.terra}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "16px 24px"
  button-quiet:
    textColor: "{colors.calm-ash}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "0px"
  button-quiet-hover:
    textColor: "{colors.calm-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.none}"
    padding: "0px"
  rating-segment:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
    height: "44px"
    width: "34px"
  rating-segment-active:
    backgroundColor: "{colors.terra}"
    rounded: "{rounded.none}"
    height: "44px"
    width: "34px"
  room-nav-item:
    textColor: "{colors.calm-ash}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
  room-nav-item-current:
    textColor: "{colors.terra}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
---

# Design System: Baseline

## Overview

**Creative North Star: "The Engraved Plate and the Dimmed Room"**

Two luminance worlds share one building. The bright world is blush paper (`paper`) under grain and a soft vignette, with a high-contrast didone display face — the letterform of engraved anatomical plates — set enormous and light. The dim world is the same architecture with every value swapped at `:root[data-room='calm']`: a near-black ground, a warm grey ink, and amber where terracotta stood. Nothing about the layout changes when you cross; only the luminance does, and the crossing is stated out loud before it happens.

The system is flat and unfurnished. There are no cards, no gradients, no shadows, no fills that are not either the page ground or a state indicator. Structure is carried by hairline rules, generous negative space, and a rigid three-band room frame: name at the top, one job in the centre at instrument scale, one way onward at the bottom. Density is low on purpose — every room holds exactly one thing to do, and the measure of a room is how little competes with it.

Accessibility is not a layer on top of this world; it is the reason the world has the shape it does. The dim world exists because photophobia is one of the symptoms being measured. Motion is dead in the dim world because motion sensitivity is another. These are recorded below as named rules, not as footnotes.

**Key Characteristics:**
- Two complete luminance worlds, one token set, switched on `<html data-room>`
- Zero shadows, zero gradients, zero cards; hairlines and whitespace do all structural work
- Square corners everywhere except one circular affordance and the 2px focus ring
- A didone display voice against Archivo controls and JetBrains Mono micro-labels
- Motion is absent by default and licensed only for the measurement stimulus
- A third world for print: plain black on white, all controls dropped

## Colors

Two grounds and one accent each — warm on both sides of the threshold, never neutral-cool, never pure white or pure black.

### Primary
- **Terracotta** (`terra` #C4491F): the single accent of the bright world and the marker of the answered state. It marks the current room in the nav, fills a selected rating segment, flags a provoked task in the findings table, paints the focus ring, and colours text selection. It appears on a handful of elements per screen and never as a surface.
- **Muted Amber** (`calm-amber` #B8794A): the dim world's substitution for terracotta on hover and emphasis. It is terracotta pulled down in chroma and up in lightness so it can sit on a near-black ground without glare.

### Neutral
- **Blush Paper** (`paper` #EFE7E2): the bright world's ground. Deliberately warm and off-white; no surface in this system is #FFFFFF on screen.
- **Paper Deep** (`paper-deep` #E4DAD4): the only raised tone in the bright world, used sparingly for inset areas rather than for cards.
- **Ink** (`ink` #16110F): headline and primary text in the bright world; also the ground of the favicon.
- **Ash** (`ash` #6A615B): body copy, table values, scale anchors, and every micro-label in the bright world — a deliberate step down from ink so body text reads as commentary beneath the display voice.
- **Dim Ground** (`calm-paper` #12100F): the dim world's ground, luminance-capped well below the bright world.
- **Dim Raise** (`calm-paper-deep` #1B1817): the dim world's single raised tone.
- **Dim Ink** (`calm-ink` #C9BFB6): text in the dim world — warm grey, never white, so the page never becomes a light source.
- **Dim Ash** (`calm-ash` #8A807A): secondary text and quiet controls in the dim world.
- **Hairline** (`line` / `calm-line`): decorative rules, table row separators, and section divisions at 16–20% opacity.
- **Control Boundary** (`line-strong` / `calm-line-strong`): the border of anything you can operate, at 55% opacity in both worlds.

### Named Rules

**The Two Worlds, One Set Rule.** There is one token vocabulary. The dim world is not a second palette but a complete override of the same names under `:root[data-room='calm']`, and print is a third. A component never branches on world; it reads `var(--ink)`, `var(--paper)`, `var(--terra)` and is correct in all three.

**The Luminance Cap Rule.** No surface in the dim world is lighter than `calm-ink` (#C9BFB6) and no surface anywhere on screen is #FFFFFF. Pure white and large light fields are what the instrument is measuring sensitivity to; the interface does not get to introduce them.

**The Control Boundary Rule.** `line` is decoration and exempt from contrast requirements; `line-strong` is the boundary of anything operable and clears 3:1 against its ground in both worlds, satisfying WCAG 2.2 SC 1.4.11. Never draw an interactive edge with `line`.

**The Never-Colour-Alone Rule.** No state, severity, or result is carried by colour alone. A provoked task is terracotta *and* reads "Provoked +3"; a selected rating segment is filled *and* carries a 2px inset ring in the room's own ground *and* the numeric value is printed beside the scale label. Terracotta on the amber fill measures 1.98:1 — below the 3:1 floor for a state indicator — which is why the ring is drawn in `paper`, not in ink.

## Typography

**Display Font:** Bodoni Moda (with Didot, Bodoni MT, Georgia, serif)
**Body / Control Font:** Archivo (with Helvetica Neue, Helvetica, Arial, sans-serif)
**Label / Mono Font:** JetBrains Mono (with ui-monospace, Menlo, monospace)

**Character:** A high-contrast didone set large and light against a plain grotesque — the register of an engraved scientific plate rather than an app. The serif never speaks below headline size; the grotesque never tries to be expressive.

### Hierarchy
- **Display** (`.t-display`, Bodoni Moda 400, `clamp(30px, 4vw, 58px)` in rooms and `clamp(44px, 7.3vw, 116px)` on the landing, line-height 0.94, tracking -0.015em): the room name or the single claim. One per screen. An italic variant (`.t-display-it`) is available for a single stressed word.
- **Lead** (`.t-lead`, Archivo 400, `clamp(18px, 1.85vw, 27px)`, line-height 1.35): the sentence directly under a display line, and the threshold's three statements.
- **Body** (`.t-body`, Archivo 400, `clamp(15px, 1.05vw, 17px)`, line-height 1.62, coloured `ash` by default): prose, instructions, list items, table row headers. Measures are constrained by `ch` — 44–58ch on the landing, 46–54ch in rooms.
- **Action** (`.t-action`, Archivo 500, `clamp(14px, 1.05vw, 16px)`, tracking 0.005em): every control label without exception, in both worlds.
- **Mono** (`.t-mono`, JetBrains Mono 400, `clamp(12px, 0.78vw, 13px)`, tracking 0.12em, uppercase, tabular numerals): measured values, counts, room names in the progress nav, table captions, and scale anchors.

### Named Rules

**The Optical Size Rule.** The display face carries its `opsz` axis explicitly: 28 below 768px, 96 at and above. Bodoni's hairlines are fragile at heading sizes on small screens, and the axis exists to solve exactly that. Never set the display face without declaring `opsz`.

**The Controls Speak Archivo Rule.** Every operable label is `.t-action`. Mono is never a button, and the display face is never a control.

**The Tabular Data Rule.** Anything measured — a delta, a centimetre reading, a count, a rating out of ten — is set in `.t-mono` with tabular numerals so columns of numbers align down the page. (Note the divergence from intent: the shipped build also uses `.t-mono` for progress-nav room names, table captions, and small section headings. That chrome usage is the built system and is recorded as such, but the tabular-numeral rule is what makes mono earn its place.)

**The One Display Line Rule.** A screen gets one display-scale element. The landing's claim and each room's heading are the only display type in the artifact.

## Layout

Every screen is a **room**: a full-viewport column measured with `calc(var(--vh, 1vh) * 100)` rather than `100vh`, so mobile browser chrome cannot crop the bottom edge. Horizontal inset is a single fluid gutter token, `clamp(20px, 4.5vw, 76px)`, applied by the `.gutter` class and never overridden per component.

The dim rooms use a fixed three-band frame that does not reflow between rooms: a header carrying the progress nav on the left and the always-present Stop control on the right; a centred `flex-1` main holding the room heading and its single job; and a footer pinned with `mt-auto` holding the one way onward. Only the centre changes as you move between Prepare, Screen, and Findings — the frame is identical, so nothing you rely on moves under you.

Content grids are declared with explicit fractional templates rather than a global column system: `md:grid-cols-[1fr_auto]` for the landing's claim-and-instrument pair, `lg:grid-cols-[1fr_auto]` for the ledger, `lg:grid-cols-[1.1fr_0.9fr]` for findings' measurement/plan split. All collapse to a single column below their breakpoint. Tailwind's default breakpoints are used unmodified (sm 640, md 768, lg 1024).

Vertical rhythm is fluid-clamped rather than stepped: room padding `clamp(20px, 3.5vh, 36px)`, main padding `clamp(20px, 4vh, 44px)`, heading-to-content `clamp(18px, 3vh, 32px)`, and section gaps on a coarse 4px-multiple ladder (12 / 20 / 32 / 40px). Line length is always capped in `ch`, never in pixels.

## Elevation & Depth

**There are no shadows in this system.** No `box-shadow` is used for elevation anywhere in the artifact. The single `box-shadow` that ships is `inset 0 0 0 2px var(--paper)` on a selected rating segment, which is a state indicator drawn as a ring, not depth.

Depth is conveyed by three things only: the tonal step between `paper` and `paper-deep` (or `calm-paper` and `calm-paper-deep`); hairline rules at 16–20% opacity dividing sections and table rows; and negative space. In the bright world a fixed grain layer (multiply blend, 30% opacity, 180px tile) and a soft radial vignette sit above the page as atmosphere; both are set `display: none` in the dim world, because high-frequency noise is a migraine trigger for the exact population the tool serves.

### Named Rules

**The Flat Room Rule.** Surfaces never lift. If something needs to read as separate, give it a hairline or give it space — never a shadow, never a card, never a gradient fill.

**The Grain Belongs to Daylight Rule.** Grain and vignette exist only in the bright world. Any atmospheric texture added later must carry the same `:root[data-room='calm'] { display: none }` suppression.

## Shapes

Square by default. Borders are 1px, corners are 0px, and no container in the artifact has a radius. Two deliberate exceptions exist and are the whole exception list: the landing's forward affordance is a 48px circle (`rounded-full`) holding a 13px arrow glyph drawn as inline SVG, and the global `:focus-visible` ring carries a 2px radius so it does not read as a hard rectangle on inline text.

Form language is drawn, not filled: controls are outlines in `line-strong`, tables are rows separated by `line`, sections are divided by a 1px `.rule` at 16% opacity. Icons are inline SVG paths with `stroke="currentColor"` at 1.2px weight — thin enough to sit beside a hairline without competing.

## Components

### Buttons
- **Shape:** Square (0px radius), 1px outline in `line-strong`, padding 16px vertical by 24px horizontal.
- **Primary (bordered):** transparent ground, `calm-ink` label in `.t-action`. This is the room's single forward action, always in the footer band.
- **Hover / Focus:** border and label shift together to the world's accent (`terra` in Screen/Findings, `calm-amber` in Threshold/Prepare) over a 300ms colour transition. Focus is the global 2px `terra` outline at 4px offset. Disabled is 40% opacity with the hover suppressed via `enabled:`.
- **Quiet (underlined):** no border, no padding; `calm-ash` label with a 4px-offset underline, lifting to `calm-ink` on hover. This is the shape of Stop, Skip, and every reversal.
- **Circular forward affordance (landing only):** 48px circle, 1px `line-strong` border, inline SVG arrow; on hover the border and fill both become `terra` and the arrow stroke inverts to `paper`.

### Rating Scale
The signature component. Eleven discrete segments, not a slider: each is a 44px-tall block with a 34px minimum width, flex-wrapping to a second row on narrow screens rather than shrinking below a reliable target. The visually hidden radio input carries its focus state to the segment via `peer-focus-visible`, painting a 2px `terra` outline at 2px offset. Segments at or below the value fill with `terra`; the selected segment additionally carries a 2px inset ring in `paper`. Only every fifth numeral is printed; the ends are named in words, and the current value is echoed in mono beside the label.

### Tables (Findings)
Borderless collapse with a hairline `border-b` per row. Row headers are `.t-body` in `calm-ink`, left aligned, weight 400 — never bold. Values are `.t-mono` in `ash`, right aligned. The caption sits above the table in mono and states the threshold being applied.

### Navigation (Room Progress)
An ordered list of the three room names in `.t-mono`, gap 20px, `ash` for rooms you are not in and `terra` for the one you are, with `aria-current="step"` and a visually hidden "— current room". It never collapses or truncates; it wraps.

### Threshold
A fixed full-viewport dialog on the dim ground stating three lead-size lines, a body-size explanation, and two controls — one bordered, one quiet — inside a 46ch column. It is the only modal surface in the system and it is always skippable.

### Stimulus Field
Drawn to `<canvas>` rather than animated DOM, so the target's position is exact on every frame instead of being interpolated on the browser's schedule. The field is otherwise empty; nothing competes with the target.

### Named Rules

**The Still Room Rule.** In the dim world all animation and transition durations are forced to 0.001ms on every element except `<body>`, regardless of the OS setting — motion sensitivity is a symptom here, not a preference. The body's own 900ms `cubic-bezier(0.16, 1, 0.3, 1)` background and colour transition is exempt because it *is* the announced dimming.

**The One Licensed Motion Rule.** The task stimulus is the only moving thing permitted in the dim world, because its movement is the measurement. It is always user-initiated and always stoppable. Nothing else — no spinner, no skeleton, no reveal, no parallax — may move in a dim room.

**The Stop Is Never Hidden Rule.** The exit from the screening sits in the header band of every dim room at the same coordinates and is never behind a menu, a confirmation, or a scroll.

### Print
A third world defined under `@media print`: `paper` and `paper-deep` become #FFFFFF, `ink` #000000, `ash` #444444, and `terra` collapses to black — colour carries nothing on paper. Grain, vignette, nav, video, and every button are `display: none`; `min-height` room constraints are released so the sheet flows; display type drops to 24pt, body/lead to 10.5pt, mono to 8pt. This is a clinician reading under clinic lighting, and it is the only place white is permitted.

## Do's and Don'ts

### Do:
- **Do** read every colour through the token names (`var(--ink)`, `var(--paper)`, `var(--terra)`, `var(--line-strong)`) so a component is automatically correct in the bright world, the dim world, and print.
- **Do** draw the edge of anything operable with `line-strong` and reserve `line` for decorative hairlines.
- **Do** state a result in words as well as in colour — "Provoked +3", "Not answered", "No rise".
- **Do** set the display face with an explicit `opsz` (28 below 768px, 96 above) and only once per screen.
- **Do** cap measures in `ch` (26ch headings, 44–58ch prose) and inset with the single `--gutter` token.
- **Do** measure full-height rooms with `calc(var(--vh, 1vh) * 100)`, never `100vh`.
- **Do** keep the room frame fixed — name at top, one job centred, one action pinned at the bottom — and change only the centre.
- **Do** give controls a 44px minimum hit height and let them wrap rather than shrink.

### Don't:
- **Don't** put #FFFFFF, a large light field, or an uncapped luminance anywhere on screen; white belongs to print only.
- **Don't** animate anything in the dim world except the task stimulus. No spinners, no skeletons, no entrance reveals, no scroll effects.
- **Don't** add a `box-shadow` for elevation, a gradient fill, or a card. Depth is a hairline, a tonal step, or space.
- **Don't** carry meaning in colour alone, and don't paint a state indicator that fails 3:1 against its own fill.
- **Don't** set a control label in mono or in the display face; controls are `.t-action` Archivo 500.
- **Don't** carry grain or any high-frequency texture into the dim world.
- **Don't** hide Stop, gate it behind a confirmation, or move it between rooms.
- **Don't** round corners. Square is the default; the circular forward affordance and the 2px focus ring are the complete exception list.
