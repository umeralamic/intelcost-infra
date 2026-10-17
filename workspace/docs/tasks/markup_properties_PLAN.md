# Markup Properties panel (plan)

_Plan only, no code (day run 2026-10-17, item 11). PARITY_GAPS §14, item 2 of "build next": "an Essentials workspace
gets only markups, so their styling is that plan's main surface."_

## The problem

Markups are highlight, note, cloud, callout and arrow (`features/takeoff/markup/`). Today, styling them is limited:
- **Before drawing:** a tool's caret picks the next colour (`StyleCaret.tsx`).
- **After drawing:** a selected markup's chip offers its colour and Delete.

Everything else in a markup's style can't be changed once drawn: line width, opacity, the callout's font, bold,
italic, underline, line end, background, text colour, the cloud's bubble size, the arrow's head size, note
auto-fit, scale with zoom. The data and defaults already exist (`markupStyle.ts`, `MarkupStyles`, legacy's
`DEFAULT_TOOL_STYLES`), and each markup stores its own `style` (`api.ts`). Only the panel is missing. Dimension has
one (`dimension/DimensionPropertiesPanel.tsx`); markups do not ("left for later", D-109).

For an Essentials workspace ($9.99), markups are most of the product.

## The approach

One docked **Markup properties** panel on the shared floating panel (`components/ui/floating-panel.tsx`, D-593):
- **Selection, not a dialog:** it opens on a markup's selection (or "Properties" in its menu) and edits that markup
  live. With nothing selected and a markup tool armed, it edits the tool's defaults for the next one.
- **Fields by kind**, from `MarkupStyles`:

| Kind | Fields |
|---|---|
| Highlight | colour, opacity |
| Note | fill colour, opacity, text colour, font size, auto-fit, scale with zoom |
| Cloud | colour, line width, bubble size, opacity |
| Callout | line colour, line width, line end (none, arrow, circle), font family, size, bold, italic, underline, background, text colour, opacity, scale with zoom |
| Arrow | colour, line width, head size, opacity |
| Every kind | **Reset to defaults** (the tool's defaults); **Make default** (this markup's style becomes the tool's) |

- **Saving:** each change is a debounced `PATCH` of the markup's `style` (`markupsApi.update`, already there), one
  undo step per field change, and it goes through realtime as markup edits do today.
- **Several markups selected:** the panel shows the fields they share. A changed field applies to all of them, in
  one undo step.
- **Guest and Viewer:** the panel opens read-only, greyed with the Professional tip (D-527). Nothing is sent.

## Files touched (expected)

| File | Change |
|---|---|
| `features/takeoff/markup/MarkupPropertiesPanel.tsx` (new) | the panel, its fields per kind, on `FloatingPanel` |
| `features/takeoff/markup/markupStyle.ts` | field metadata per kind (labels, ranges), Make default |
| `features/takeoff/markup/MarkupLayer.tsx` | opens the panel on select; draws from the markup's own style (already does); live preview while dragging a slider |
| `features/takeoff/markup/api.ts` | a batch style update for several markups (or one PATCH each) |
| `pages/ProjectTakeoff.tsx` | mount, undo integration |
| api `markup` routes and schemas | validate `style` keys and ranges per kind (today a free dict); no migration (JSONB) |

## Risks

- **`style` is a free dict today.** Validating it on the api could refuse markups stored with odd keys. Validate on
  write only, and drop unknown keys rather than refuse.
- **Live preview:** many PATCHes from sliders. Preview locally, write on release or after 300 ms of quiet.
- **Fonts:** legacy offers a font family list. Only fonts the browser and the PDF print path (jsPDF) both have may
  be offered, or printed markups will differ.
- **Undo** across several markups and a realtime echo from another tab: covered by D-71's history and write tokens,
  to check.

## What I need you to decide

| # | Question | Recommendation |
|---|---|---|
| M1 | Docked (one place, like Dimension's) or floating by the selection? | Floating, on the shared panel, remembered where it was moved (D-593) |
| M2 | Several selected: edit the shared fields, or one markup at a time? | Shared fields |
| M3 | Font families: legacy's list, or the three the print path embeds (Helvetica, Times, Courier)? | The three, named as the user knows them (Arial shows as Helvetica in print) |
| M4 | "Make default": per person on this device (today's `intelcost.toolStyles.v1`), or the workspace's? | Per person, as today; workspace defaults later if asked |

## Paper hours

| Piece | Hours |
|---|---|
| Panel shell, fields per kind, tool defaults mode, Reset and Make default | 6 |
| Live preview, debounced writes, undo, several selected | 4 |
| api: style validation per kind (write-time, lenient) | 2 |
| Guest and Viewer read-only, gates, smoke on a BENCH DUP (each kind; the print PDF checked in the bench container, never Print in the browser), guest check | 3 |
| **Total** | **about 15 h (two days)** |
