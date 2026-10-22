# Markup Properties panel (plan)

_First written 2026-10-17 (day run, item 11; plan only). Rewritten 2026-10-22 (night run, Step 9) against live legacy
(`origin/UmeralamDEV`) and the app as it is today, with the build split into blocks. PARITY_GAPS §14, item 2 of "build
next": an Essentials workspace gets only markups, so their styling is that plan's main surface._

## 1. What legacy's panel shows and edits

One floating panel, `src/components/takeoff/props/PropertiesPanel.tsx`; types and defaults in
`src/lib/takeoff/toolStyles.ts` (`DEFAULT_TOOL_STYLES` L81-94, `CALLOUT_FONTS` L96); wired in `src/pages/ProjectTakeoff.tsx`
L12214-12345. Three kinds of control: a colour swatch (the browser's picker, no preset grid), a slider with its value
beside it, and a segmented choice.

| Kind | Fields, in legacy's order (default) |
|---|---|
| **Cloud** | Color (#E53935); Line width 0.5–12, step 0.5 (6); Bubble size 4–40 (24); Opacity 0.1–1, step 0.05 (1) |
| **Arrow** | Color (#E53935); Line width 0.5–8 (5); Head size 4–40 (30); Opacity 0.1–1 (1) |
| **Callout** | Text (textarea); Font (Arial, Helvetica, Times New Roman, Courier New, Georgia, Verdana; Arial); Font size 6–60 (12); Text scale Fixed / Scale with zoom (Scale with zoom); Style Bold, Italic, Underline (off); Line width 0.5–8 (2); Line end none / arrow / circle (arrow); Border colour (#E53935); Background (#ffffff); Text colour (#000000); Opacity 0.1–1 (1) |
| **Highlight** ("Highlighter Properties") | Color (#FFEB3B); Opacity 0.05–1 (0.35) |
| **Note** | Fill (#FFD54F); Text colour (#000000); Opacity 0.1–1 (0.9); Text size Auto-fit / Fixed (Auto-fit; Fixed adds Font size 6–48, 12, and Text scale, Fixed) |
| **Dimension** | Tool defaults only (already built here, `dimension/DimensionPropertiesPanel.tsx`) |

Legacy has no rectangle, ellipse, polyline, text, stamp or snapshot markup, and no lock, layer, author or link field.

**Behaviour in legacy:**
- **Opens** only from the Properties button on the action bar: with a markup selected (Properties / Start / Copy /
  Delete), or with its tool armed and nothing drawn. A new callout opens it at once. No right-click or double-click
  route (double-click edits a callout's text on the canvas).
- **Edits one markup at a time.** With a markup of the panel's kind selected, edits go to it live; otherwise to the
  tool's defaults (per browser, `intelcost.toolStyles.v1`). The footer says which: "Changes apply to the selected
  markup." / "Changes apply to the next markup you draw and are remembered."
- **Reset** (header) always resets the tool's defaults, even with a markup selected. No "Set as default".
- **Saving:** every slider tick writes (no debounce). Cloud, arrow and callout push one undo entry per tick ("Change
  markup style"); highlight and note push none.
- **Read only:** without `canUseAnnotations` nothing is selectable, so the panel never opens for a markup.
- 320 px wide, dragged by its header, opens near the top right.

## 2. What the app has today

- `markup/markupStyle.ts`: legacy's types and defaults for highlight, note, cloud, callout and arrow
  (`DEFAULT_MARKUP_STYLES`), kept per browser (`patchMarkupStyle`, `useMarkupStyles`).
- `markup/StyleCaret.tsx`: the caret on the Highlight and Note tool buttons only; the tool's defaults only: a colour
  grid plus Custom; for a note, opacity 0.3–1 and Black or White text.
- `markup/MarkupLayer.tsx`: a selected markup's chip with its colour (preset palette, writes `style.color`), Delete, and
  for a dock its Settings. Double-click edits a note's or callout's text; handles move and resize.
- `markup/api.ts`: `PATCH` of a markup's `style`, geometry or text. Drawing and selecting are gated by `canEdit`.
- `dimension/DimensionPropertiesPanel.tsx`: legacy's Dimension panel, with Reset.

## 3. The gaps

1. No Properties panel for cloud, arrow, callout, highlight or note.
2. After drawing, nothing edits a markup's line width, bubble size, head size, opacity, font, size, bold / italic /
   underline, line end, background or text colour, auto-fit or text scale; only its colour, from the chip.
3. The defaults of cloud, callout and arrow cannot be edited at all (no caret).
4. No Reset for markup styles.
5. No undo of a style change.

## 4. The approach

The panel on the shared floating panel (`components/ui/floating-panel.tsx`, D-593), opened as legacy opens it: a
**Properties** button on the selected markup's chip, and on an armed markup tool's caret. With a markup selected it
edits that markup; otherwise the tool's defaults, with legacy's footer sentence. Each change is applied on screen at
once and written when the slider is let go (or after 300 ms of quiet), one `PATCH` of `style`; undo is one step per
change (better than legacy's step per tick). Guests and Viewers never select a markup, so the panel never opens for
them; with the tool caret on a read-only seat the fields show greyed with the tip (D-527).

## 5. The blocks

| Block | What | Hours |
|---|---|---|
| **1** | The panel for a **selected** markup: every legacy field for cloud, arrow, highlight and note, and callout's but its font family; Properties on the chip; live on screen, written on release; Reset (to the tool's defaults, as legacy); gated as selection is (guests and Viewers never reach it) | 5 |
| 2 | Tool defaults mode: the panel from each markup tool's caret (cloud, callout and arrow get a caret), legacy's footer; the per-browser defaults (`intelcost.toolStyles.v1`) | 2 |
| 3 | Undo and redo of style changes, one step per change; a realtime echo from another tab applied | 3 |
| 4 | Callout font family (after M3); the api validating `style` per kind on write, leniently (unknown keys dropped) | 2 |
| 5 | Several markups selected: the fields they share (M2) | 3 |
| | **Total** | **about 15 h** |

## 6. Questions for Umer (unanswered since 2026-10-17)

| # | Question | Recommendation (Block 1 follows it) |
|---|---|---|
| M1 | Docked (one place) or floating by the selection? | Floating, on the shared panel, remembered where it was moved |
| M2 | Several selected: edit the shared fields, or one markup at a time as legacy? | One at a time first (Block 1, as legacy); shared fields in Block 5 |
| M3 | Font families: legacy's six, or the three the print path embeds (Helvetica, Times, Courier)? | The three, named as the user knows them; Block 4 waits for the answer |
| M4 | Defaults per person on this device (as legacy), or the workspace's? | Per person on this device, as legacy |

## 7. Risks

- **`style` is a free dict.** Validating it could refuse markups stored with odd keys: validate on write only, drop
  unknown keys (Block 4).
- **Fonts:** the print path (jsPDF) embeds three families; others print differently (M3).
- **Undo** across a realtime echo from another tab: D-71's history and write tokens, checked in Block 3.
