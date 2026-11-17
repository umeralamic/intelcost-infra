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
