---
version: alpha
name: Sprig
description: "A plant-care reminder app for first-time plant owners. Leaf green and terracotta on soft linen, a friendly soft serif for headlines and a rounded sans for everything else."
omitted:
  - section: spacing
    reason: Lite kit covers palette, type and voice only.
  - section: rounded
    reason: Lite kit covers palette, type and voice only.
  - section: components
    reason: Lite kit covers palette, type and voice only.
colors:
  primary: "#2F6B3F"
  on-primary: "#FFFFFF"
  primary-container: "#DCEBDD"
  on-primary-container: "#173A22"
  secondary: "#A4532F"
  on-secondary: "#FFFFFF"
  tertiary: "#F3D9A4"
  on-tertiary: "#2A2418"
  surface: "#F7F6F0"
  on-surface: "#1F2A22"
  surface-container: "#ECEBE2"
  on-surface-variant: "#52604F"
  outline: "#CFCDBF"
  error: "#B3261E"
  on-error: "#FFFFFF"
typography:
  display:
    fontFamily: Fraunces
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  headline-md:
    fontFamily: Fraunces
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
  title-md:
    fontFamily: Figtree
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
  body-md:
    fontFamily: Figtree
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Figtree
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Figtree
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
brand:
  profile: lite
  tagline: Water less. Worry less.
  personality: [friendly, plain-spoken, encouraging]
  fonts:
    - family: Fraunces
      role: display
      license: OFL-1.1
      source: https://fonts.google.com/specimen/Fraunces
      package: "@fontsource-variable/fraunces"
      fallback: "Georgia, serif"
    - family: Figtree
      role: body
      license: OFL-1.1
      source: https://fonts.google.com/specimen/Figtree
      package: "@fontsource-variable/figtree"
      fallback: "system-ui, 'Segoe UI', Roboto, sans-serif"
  pairs:
    - fg: on-surface
      bg: surface
      use: Body text
    - fg: on-surface-variant
      bg: surface
      use: Secondary text
    - fg: on-surface-variant
      bg: surface-container
      use: Card metadata
    - fg: on-primary
      bg: primary
      use: Primary button
    - fg: primary
      bg: surface
      use: Links
    - fg: on-secondary
      bg: secondary
      use: Reminder badge
    - fg: on-tertiary
      bg: tertiary
      use: Tip callout
    - fg: on-error
      bg: error
      use: Error banner
  imagery:
    style: "Bright window light, real houseplants in simple pots, linen and terracotta, plenty of empty space"
    avoid: "staged luxury interiors, identifiable faces, neon, fake text on pots"
  voice:
    attributes: [Friendly, Plain-spoken, Encouraging]
    do:
      - "Your monstera is due for water today."
      - "Skipped a week? Happens. Check the top inch of soil first."
      - "Tip: most plants prefer too little water to too much."
    dont:
      - "Unleash your inner plant parent!"
      - "ALERT: Plant hydration levels critical."
      - "Our AI-powered botanical engine optimizes your green journey."
    words:
      use: [water, light, soil, check, reminder]
      avoid: [unleash, journey, optimize, hydration levels]
    samples:
      headline: Water less. Worry less.
      body: "Sprig reminds you when each plant needs water, light or a new pot, and explains why."
      cta: Add a plant
      appTitle: Today
      search: Search plants
      listItems:
        - Monstera, living room
        - Pothos, kitchen shelf
        - Snake plant, bedroom
      listExcerpts:
        - Water today. Top inch of soil is dry.
        - Fine for 3 more days.
        - Needs brighter light this month.
      highlight: Water today
      social: Most plants prefer too little water to too much.
      socialKicker: Sprig tip
      sign: Plant clinic
---

# Sprig

## Overview

Sprig helps first-time plant owners keep their plants alive without studying botany. It should feel
like a friendly neighbour with green fingers: friendly, plain-spoken, encouraging, never preachy.
Bright, airy screens with real plant photography; colour is used for state (needs water, fine,
needs light) and for the one main action.

## Colors

- **Leaf (#2F6B3F):** `primary`. The main action, links, the "fine" state.
- **Sprout wash (#DCEBDD):** `primary-container`. Selected plant, healthy-state chips.
- **Terracotta (#A4532F):** `secondary`. Reminders that need attention today, always with a label.
- **Sun (#F3D9A4):** `tertiary`. Tip callouts behind dark text.
- **Linen (#F7F6F0):** `surface`. Page background.
- **Soil (#1F2A22):** `on-surface`. Text.
- **Pale linen (#ECEBE2):** `surface-container`. Plant cards.
- **Moss grey (#52604F):** `on-surface-variant`. Secondary text and metadata.
- **Twine (#CFCDBF):** `outline`. Dividers.
- **Warning red (#B3261E):** `error`. Failed sync or a dying plant, with an icon and text.

## Typography

**Fraunces** (OFL-1.1) for headlines: soft, a little old-fashioned, warm at large sizes, weight 600.
**Figtree** (OFL-1.1) for everything else: rounded, friendly and clear at 14-16 px. Sentence case
everywhere; no all-caps.

## Voice & Tone

Friendly, plain-spoken, encouraging. Say what the plant needs and why in one sentence. Never blame
the user; a missed watering is normal. No exclamation marks except in genuine celebrations (a new
leaf), no jargon unless explained.

| Say | Not |
| --- | --- |
| Your monstera is due for water today. | Unleash your inner plant parent! |
| Skipped a week? Happens. Check the top inch of soil first. | ALERT: Plant hydration levels critical. |
| Tip: most plants prefer too little water to too much. | Our AI-powered botanical engine optimizes your green journey. |

## Do's and Don'ts

- Do keep Leaf for the one main action per screen and for "fine" states.
- Do pair Terracotta reminders with a text label, never colour alone.
- Don't put Sun behind anything but Soil text.
- Don't use stock photos of people; show plants, pots and hands at most.
