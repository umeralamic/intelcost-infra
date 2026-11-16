# Contour drawing lag: no React commit per pointer move (D-1294)

Tester bug, high priority (the founder, morning-report-2026-11-19/BRIEF.md, added 2026-11-16 08:13 UTC and 11:06 UTC;
readings R22–R25, R39): "While grading, drawing existing and proposed contours manually, the marking lags and the cursor
becomes heavy." Built unattended in the night run of 2026-11-16 (step 0, after D-1293); awaiting the founder's check.

## Where it was reproduced

- A throwaway copy of the 3D test project (P01) in a throwaway workspace, not P02: the guard list's `copy_sources`
  could not take P02 (the change to the private guard list was refused by the session's permissions). P01's copy is
  the busier one: V-100 carries 97 existing contours (1,683 vertices) and C-200 42 proposed ones, where P02 has 50 and
  15 (counted read-only). P02 itself was only read, by that count (D-232).
- Sheet V-100 at Fit, 1440 × 900 at DPR 1.25, Snap on. One pointer path for every run: 900 moves 8 ms apart along a
  wavy diagonal through the contours, a click every 90 moves (10 vertices), the points taken back with Backspace after
  (the sheet is left as it was). Existing (700) and proposed (702) contours, 1× and 4× CPU.
- The tag `tester-candidate-2026-11-13` and umer-dev before and after ran from a separate git worktree (scratch, never
  the bench app tree) on their own Vite port 5175 against the bench api; the production builds (`vite build`, then
  `vite preview`) on 5174. The bench bucket answers CORS for 5173 only: every run fetched the sheet through the same
  page route that adds the header, so every build loads the sheet the same way.
- Measured: a Chrome trace (CDP `Tracing`) and a CPU profile (CDP `Profiler`, 250 µs); the pointer-move handler time is
  the trace's `EventDispatch` for each move (pointermove + mousemove); frames are `requestAnimationFrame` intervals;
  React commits are counted by a stub DevTools hook (a commit more than 150 ms × the CPU factor after a click counts as
  a move's).

## What the trace showed (umer-dev before, dev build, 1×, existing contour)

| Cost | Figure |
|---|---|
| React commits during the path | 759 for 899 moves (0.79 per move); 7.7 s of render over a 28 s path; a commit p50 9 ms (61 ms at 4×) |
| What each commit re-rendered | the sheet canvas (its `cursor` state, set on every move) and, through it, the page's `markupLayer` render prop: `EarthworkLayer` rebuilt every run's path and label each time (2.3 s inclusive, its run map 2.2 s more), then React reconciled and validated that SVG tree (`diffProperties`, `validateProperty`, `jsxDEV`) |
| Per click | the whole takeoff page re-rendered (`onDraftCount` set a new object for every vertex): 15 ms a click at 1×, 115 ms at 4× |
| Snapping | 13 ms over the whole path (0.02 ms a move): the D-656 spatial index already bounds it; nothing to change |
| Surface / TIN / earthwork recalculation | none per move or click (24 ms over the path: the contour-label check once, when the sheet's text lands); Calculate runs only on Calculate |
| Network | no save while a contour is drawn; the run in hand goes to colleagues over the realtime socket at most 8 times a second (`use-drafts.ts`); the path's requests were background (other sheets' fit images, the work-session heartbeat) |
| After the React fix (first cut) | the rubber band, a path in the sheet's SVG, invalidated the box of the run on every frame and Chrome painted every contour under it again: frames p50 33 ms |
| Left after the fix | Chrome's paint, layerize and pre-paint of the whole document on any visual change (the reticle, the band): ~2.5 ms a frame at 1×, ~16 ms at 4× on this sheet; the reticle's own draw ran in every pointermove with two forced reads of the viewport box |

## The fixes

1. `SheetCanvas.tsx`: the pen and the snap point are refs (`cursorRef`, `snapAtRef`), never state. `handleMove`
   writes them, asks for one animation frame (`scheduleLive`) and tells colleagues (`shareDraft` through `shareRef`);
   the live painter (`paintLive`, set in a layout effect) writes the band's `d` (`bandFor`, the former `rubberBand`
   memo) and the snap square's place, and runs again after every render, so a click or an undo shows at once. The two
   elements carry `data-rubber-band` / `data-snap-mark` only while they show, as before.
2. `SheetCanvas.tsx`: the snap square, the band and the run's points sit on a live layer of their own
   (`svg[data-live-layer]`, laid over the sheet's SVG, `will-change: transform`, no pointer events), so moving the band
   repaints only that layer.
3. `SheetCanvas.tsx`: the page's own layers (`markupLayerShown`) are made again only when the page hands a new layer
   or the view (zoom, turn, snap, width) changes; a click on the run no longer rebuilds every contour.
4. `ProjectTakeoff.tsx:onDraftCount`: the run's point count is held only as far as anything reads it (none, some,
   3 or more, and the arc) and the same object is kept when nothing changed, so a vertex past the third renders nothing
   on the page (the layer list included).
5. `Reticle.tsx`: one draw per animation frame however many moves arrive, from the box the move read (no second
   forced read), its place written only when it moved, and its canvas on a compositing layer of its own.
6. `SheetCanvas.tsx:clearHover`: a clear with nothing to clear sets no state (`hoveredSet`): each move while a run is in
   hand clears the hover, and an equal update React could not drop at once still rendered and committed.

(a) "no recalculation and no save mid-contour" and (b) "a spatial index for snapping" were already so; the trace shows
neither costs anything. Hard rule 2 holds: nothing under `src/lib/takeoff/` changed.

## Results unchanged

Two fresh copies of P01. On each, one existing contour on V-100 (710.5 ft, halfway between the 710 and 711 contours,
five clicks) and one proposed contour on C-200 (702.875 ft, between 702.75 and 703), placed by a planner so that
neither crosses another run (at least 4.5 px clear at Fit); Snap and Ortho off; Calculate on C-200. Copy B drawn with
the bench app before the fix, copy C with the fixed build. The stored vertices are identical, and the C-200 result is
identical in all 5,117 values (ids masked): cut 11,587.48 CY, fill 9,514.23 CY, net −2,073.25 CY, area 184,865.42 SF,
existing 3D area 186,082.24 SF, proposed 3D area 186,721.48 SF, 14 regions, before and after.

## Files

`src/features/takeoff/components/SheetCanvas.tsx`, `src/features/takeoff/components/Reticle.tsx`,
`src/pages/ProjectTakeoff.tsx`. No api change, no migration, no new setting.

## Open for the founder

- At 4× CPU the frame is bounded by Chrome painting a document that holds every contour as an SVG path (~16 ms a frame
  on V-100 before any code of ours runs). Drawing the sheet's earthwork runs on a canvas or WebGL layer (as `ShapeGL`
  does for measured shapes) would lift that; it needs its own spec.
