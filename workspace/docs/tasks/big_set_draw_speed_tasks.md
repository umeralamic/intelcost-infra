# Big-set draw speed (performance task, Q206)

Recorded 2026-11-09 from the founder's answer to Q206. No change this queue.

## Problem

f5-big's step 1 (D-43) asks for a page drawn in about 10 s while the set's thumbnails are still being made, with a
20 s bound. On the bench it drew in 28.6 s alone (2026-11-05) and 35.2 s in the release. Its own step 5 shows a
13.9 s pdf.js draw with nothing else loading.

## Kept

- The 20 s bound stays (Q206). The fixture is not loosened.

## To look at

- Where the 13.9 s goes in pdf.js on the big set: parse, operator list or raster.
- Whether the thumbnail jobs and the page draw share one worker or one network queue.
- Whether the first draw can be a lower-resolution pass, with the full draw after.
