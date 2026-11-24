# Stitch picks: one snap rule for both panes (D-1303 item 5): planned for the next run

## The founder's answer, verbatim (2026-11-17)
"Stitch snap: both panes follow the Snap PDF toggle; while snap data is loading, show a "snap loading" mark; a pick never silently differs by load timing. Next run."

## Background (D-1300 close-out, c42)
- The reference pane (ReferencePane.tsx, `pdfSnap={picking}`, D-188, app c92426f) always snaps a stitch pick to printed lines within the snap reach (SNAP_PX 12 + 2).
- The main pane's pick follows its own Snap PDF toggle, which is off by default.
- The PDF snap index arrives asynchronously, so a pick made before it loads does not snap at all.
- c42 picked 0.7 px from a printed frame: the reference side snapped and the main side did not, so the fit read 0.90 % for a 1 % page. The fixture was moved off the printed lines (infra 554daca, d0af0f6).

## To build
1. Both panes follow the one Snap PDF toggle for stitch picks.
2. While the snap index for a pane is loading, show a "snap loading" mark at the cursor (and in the pane's toolbar). With snap on, a pick made while loading either waits for the index or is marked, and is re-snapped once the index lands. Never silently unsnapped.
3. A fixture: snap on and a pick near a printed line on both panes snaps the same; snap off and the same pick is exact on both; a pick during loading shows the mark and lands the same as after loading.
4. QT rows if a stitch-fit computation changes.

## Built (D-1313, night run of 2026-11-17/18; founder to confirm)
- **One rule.** A stitch's picks (Stitch sheets, Overlay by matching points) follow the tab's one Snap PDF toggle on both
  panes.
  - `ProjectTakeoff.tsx`: `pdfSnapWanted` no longer forces it on for the site join.
  - `ReferencePane` takes the page's `pdfSnap`.
  - A link's control points and a GPS point still always snap (D-188, D-680).
- **The mark.** "Snap loading" shows while a pane's lines are read with Snap PDF on:
  - in the main bar's Snap PDF button and the reference pane's header (`data-snap-loading="toolbar"`);
  - at the cursor (`SheetCanvas`, `data-snap-loading="cursor"`, with how many picks wait).
- **Load timing: the pick waits** (chosen over re-snapping afterwards).
  - With `pdfSnapWait` (set only while picking, Snap PDF on, lines not yet read), a click is queued with the view it was
    clicked at. Nothing is placed while it waits.
  - When the lines land, each queued pick is placed in order, snapped as a click then would be.
  - If the lines cannot be read, it lands where it was clicked. If picking ended first, it is dropped.
  - So a pick never lands differently by when the lines arrived.
- **Fixture c52-stitch-snap** (`fx-suite/browser`, `fx-suite-updates/browser`, identical; `JoinPicks` `data-join-at` gives
  where each pick landed):
  - snap on: a pick 4 px from the printed frame snaps onto it on both panes, the same point;
  - snap off: both land as clicked;
  - a pick while the lines load (the PDFs held back 25 s): the marks show and nothing lands, then both land as after
    loading.
- **QT:** no stitch-fit computation changed, so no QT rows.
- **c42:** its picks are off the printed lines and its Earthwork tab starts with Snap PDF off, so its results should not
  move.

## Fixtures c42 and c52 (D-1334, night run of 2026-11-23/24): not proved, environment
- Three runs on the fx dev servers, health watch on, no ALERT. Run 1: app-fx had no host port published (5176), so every
  step failed to connect; app-fx was recreated (fx only). Runs 2 and 3: c42 2/6 then 3/6, c52 1/5 each; every failure is
  the 30 s wait for the canvas (or a 30 s page reload) on a dev server whose page load runs past it.
- Every stitch assertion that got its page passed (A5's 0.99 % flag and Recalibrate, A7's 102 ft). No code or harness
  change. To prove them: the built apps (`./fx-suite.sh prod` after a memory-limited `prepare`), or the WSL-filesystem move.
  Full section: `intelcost-infra/morning-report-2026-11-24/d1334/SECTION.md`.
