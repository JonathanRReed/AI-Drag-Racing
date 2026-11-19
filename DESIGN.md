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
  tarmac: "#1b1e1d"
  track-paint: "#f4f2e9"
  tree-amber: "#ffb224"
  slip-paper: "#efeee6"
  slip-ink: "#15171a"
typography:
  display:
    fontFamily: "Archivo Expanded, Nebula Sans, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 1.05rem + 2.3vw, 3rem)"
    fontStyle: italic
    fontWeight: 800
    fontStretch: "118%"
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  scoreboard:
    fontFamily: "DSEG7 Classic, JetBrains Mono, monospace"
    fontStyle: italic
    fontWeight: 700
  body:
    fontFamily: "Nebula Sans Book, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Nebula Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  measurement:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  sm: "2px"
  md: "4px"
  lg: "8px"
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
    typography: "{typography.display}"
    rounded: "{rounded.md}"
    height: "44px"
    edge: "3px lower edge that the button travels onto when pressed"
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

Three physical objects carry the identity. Everything else is quiet around them.

1. **The strip.** The drag strip is the first thing on the page, before any race. Selected models roll into its lanes as they become ready, so setup has a visible result. During a race each car's position is its share of the leader's output, and each lane ends in a scoreboard.
2. **The tree.** The countdown is a starting tree: staged bulbs, three ambers, then green. A 404 is a red light.
3. **The timeslip.** A finished race prints a paper slip with torn edges. The same slip is what an unlisted share link opens.

These objects keep their own materials in both themes. Asphalt stays dark and paper stays light, because that is what they are.

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

- Nebula Sans carries section headings, instructions, and normal interface copy.
- Archivo Expanded italic is the site's display identity: page titles, the launch control, lane numbers painted on the strip, standings positions, and the timeslip masthead. It is a subset variable font (weight 600 to 900, width 100 to 125), self-hosted, about 25 KB. It never sets body copy or labels.
- DSEG7 sets scoreboard digits only: the lane scoreboards and the elapsed clock. It receives digits, a decimal point, and dashes, never letters. Each lit readout sits over its unlit segments.
- Mono text carries timings, token counts, route IDs, dates, statuses, and experiment settings.
- Model and provider names wrap or use middle truncation that preserves both vendor prefix and model suffix.
- Display scale stays compact enough that race setup and controls appear in the first desktop viewport.
- Uppercase is limited to the primary race command. Labels are sentence case.

## Layout

- Desktop uses a fixed provider and prompt rail beside a flexible timing stage.
- Mobile replaces the rail with one Racers control and a full-height setup panel. The timing stage remains the primary page.
- The page reads top to bottom as: the question, the strip, the timeslip, each model's response, charts, local history, then what a race measures. The strip is inside the first viewport on every size.
- The launch control, the elapsed clock, the Track and Telemetry switch, and the sound toggle live on the strip's own bar. On a phone the launch control stays on that bar so it is reachable with the rail closed.
- Privacy, clocks, retention, and defaults are reference facts. They sit below the action in "What a race measures", not above the strip.
- Results move from one-line outcome, to standings, to lane evidence, to charts, to history. Users never need a chart to learn the result.

## Components

### Provider Rail

- Provider rows show the provider mark, name, key state, enable state, model search, and selected entries.
- API keys are browser-only inputs. Clear state and key state remain visible without revealing the key.
- Deep links from AI Stats add a bounded handoff receipt and prefill only a validated race-ready provider.

### Track and Telemetry

- Before a race the strip shows staged lanes, or two open lanes with a plain instruction when nothing is staged.
- Track view makes streaming progress visible through position, lane state, and finished time.
- Each lane's scoreboard shows live characters per second while streaming and elapsed seconds once finished, with a plain-words line under the digits. The first clean finish gets the win light and the words "first finish". A Time Trial ranks by output, so it lights no win light.
- Every channel on the strip maps to a measured quantity. Do not add distance markers, speed traps, or any reading that is not measured.
- Telemetry view shows exact browser and edge measurements with the same lane order.
- Live, finished, failed, cancelled, and demo states each have words, iconography, and stable layout.
- Demo data is labeled before and during the race. It never enters history or sharing.

### Finish Summary

- The finish summary is the timeslip: paper, mono figures, dashed rules, torn top and bottom edges. It prints once when the race ends.
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
- A shared receipt renders as the same paper timeslip, so the thing a visitor shares looks like the thing they saw.
- Share creation is explicit and reports a 30-day expiry before completion.

## Interaction and Motion

- Countdown and lane progress may animate because the movement communicates test state.
- A car lifts its nose and leaves tire smoke once, when its first token arrives. Wheels turn and the header flame burns only while the lane is streaming.
- Buttons have a lower edge and travel onto it when pressed. The launch control travels furthest.
- The timeslip printing is the one orchestrated moment after a race. Results otherwise settle directly. Avoid confetti, bounce, and autoplay decoration.
- Sound is off until the visitor turns it on. It is three synthesized tones: a blip for each amber, a longer tone for green, two rising notes at the finish. No audio files.
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
