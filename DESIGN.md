---
name: AI Drag Racing
description: A private performance laboratory presented as an endurance-racing pit wall.
colors:
  asphalt: "#090b0a"
  pit-wall: "#0d100e"
  instrument-surface: "#151a16"
  primary-text: "#f1f4ef"
  supporting-text: "#a4aca4"
  muted-text: "#697169"
  timing-lime: "#c9f74f"
  telemetry-blue: "#78a8bd"
  warning-amber: "#e2b957"
  failure-red: "#e87368"
  rule-white: "rgba(255, 255, 255, 0.09)"
typography:
  display:
    fontFamily: "Nebula Sans Book, system-ui, sans-serif"
    fontSize: "clamp(1.8rem, 4.5vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Nebula Sans Book, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.68rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  2xl: "2rem"
  3xl: "3rem"
components:
  primary-button:
    backgroundColor: "{colors.timing-lime}"
    textColor: "#11150f"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "44px"
  instrument-panel:
    backgroundColor: "{colors.pit-wall}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  telemetry-chip:
    backgroundColor: "{colors.instrument-surface}"
    textColor: "{colors.primary-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
---

# Design System: AI Drag Racing

## Creative North Star

**The Endurance-Racing Pit Wall**

AI Drag Racing should feel like a credible timing station used during a live endurance test. The interface combines a dark asphalt field, solid instrument panels, timing lime, quiet telemetry colors, condensed model labels, and exact readouts. Racing expression belongs in the live track, standings, countdown, and finish. Setup, privacy, methodology, and history remain calm product UI.

This visual world preserves the product's racing identity while replacing generic glass and decorative glow with a more legible pit-wall hierarchy.

## Operating Modes

- Quick Race operates. It gets a visitor from provider setup to one understandable result with minimal ceremony.
- Experiment Lab operates. It exposes controlled settings, repeated trials, variance, and diagnostics without changing the meaning of a Quick Race.
- Methodology and shared receipts read. They explain clocks, scope, privacy, sample size, and exclusions in a stable order.

## Color

- Asphalt is the page canvas. Pit-wall and instrument surfaces provide depth through tone and border, not transparency.
- Timing lime marks the primary action, active race mode, current lane, and the most important finished result.
- Telemetry blue is reserved for secondary measurement series.
- Amber means incomplete or caution. Red means lane failure or invalid configuration. Every semantic state includes text.
- Gradients and glow do not carry the composition. Small live indicators may glow only when the effect improves state recognition.

## Typography

- Nebula Sans carries headings, instructions, and normal interface copy.
- Mono text carries timings, token counts, route IDs, dates, statuses, and experiment settings.
- Model and provider names wrap or use middle truncation that preserves both vendor prefix and model suffix.
- Display scale stays compact enough that race setup and controls appear in the first desktop viewport.
- Uppercase is limited to short timing labels and primary race commands.

## Layout

- Desktop uses a fixed provider and prompt rail beside a flexible timing stage.
- Mobile replaces the rail with one Racers control and a full-height setup panel. The timing stage remains the primary page.
- Privacy, clocks, and retention form one compact status strip above the race statement.
- Race controls use a full-width tab row and a separate three-action grid on mobile, then collapse to one horizontal bar on wider screens.
- Results move from one-line outcome, to standings, to lane evidence, to charts, to history. Users never need a chart to learn the result.

## Components

### Provider Rail

- Provider rows show the provider mark, name, key state, enable state, model search, and selected entries.
- API keys are browser-only inputs. Clear state and key state remain visible without revealing the key.
- Deep links from AI Stats add a bounded handoff receipt and prefill only a validated race-ready provider.

### Track and Telemetry

- Track view makes streaming progress visible through position, lane state, and finished time.
- Telemetry view shows exact browser and edge measurements with the same lane order.
- Live, finished, failed, cancelled, and demo states each have words, iconography, and stable layout.
- Demo data is labeled before and during the race. It never enters history or sharing.

### Finish Summary

- Lead with "Fastest here, this run" or an equally scoped outcome.
- Name the winning clock and show the other clock nearby.
- Show sample count, browser scope, edge region when available, route, prompt size, settings, and methodology version.
- Avoid "best," "fastest model," or global-ranking language.

### Charts

- Charts are optional evidence, not the sole result surface.
- Every axis includes a unit. Every series has a text legend and exact values.
- Hover and keyboard focus expose the same detail.
- Browser-perceived timing determines the default outcome. Edge timing remains a separate diagnostic.

### History and Sharing

- Local history is a 30-day rolling list with export, individual deletion, and clear-all actions.
- Shared receipts contain only sanitized metrics and settings. They never contain prompt text, output, keys, IP, precise location, or fingerprints.
- Share creation is explicit and reports a 30-day expiry before completion.

## Interaction and Motion

- Countdown and lane progress may animate because the movement communicates test state.
- Results settle directly. Avoid confetti, bounce, and autoplay decoration.
- Motion stops under reduced-motion settings while timings and completion remain understandable.
- All race controls, lane disclosures, tabs, history actions, and settings are keyboard reachable with visible focus.

## Accessibility

- Meet WCAG 2.2 AA contrast for text, controls, and focus.
- Use live regions for countdown, lane completion, failure, and final receipt, without announcing every streamed character.
- Do not encode position or status only with color or motion.
- Controls have 44px targets on mobile. Toolbars wrap or reflow instead of clipping.
- Tables or structured lists provide exact equivalents for every visualization.

## Content Rules

- Call one run an observation, not a benchmark conclusion.
- State "from your browser and route" whenever a result could be mistaken for a global average.
- Distinguish measured, estimated, unavailable, demo, and sanitized values.
- State retention and exclusions beside local history and sharing.
- Do not use em dashes, emojis, fake community aggregates, popularity, or universal recommendations.

## Performance and Privacy Budget

- No required paid infrastructure or automatic provider spend.
- Provider keys remain in browser storage and are sent only to the selected provider adapter for the requested race.
- Race rendering stays responsive while streaming. Visual buffers are bounded and decimated.
- Local history prunes at 30 days. Server share records expire at or before 30 days.
- No new chart or motion dependency without explicit approval.

## Visual Acceptance

Verify at 390 by 844, 768 by 1024, 1280 by 800, and 1440 by 900. At every size:

- provider setup is reachable,
- the start action and race state are obvious,
- mobile controls do not clip,
- long model IDs remain distinguishable,
- results name scope and clock,
- demo and failure states remain legible,
- there is no page-level horizontal overflow,
- the surface still looks unmistakably like AI Drag Racing.
