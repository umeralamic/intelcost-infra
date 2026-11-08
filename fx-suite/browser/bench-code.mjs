// The bench itself (D-30): the api and the Celery worker both run the code on disk.
//
//   docker compose --profile browser run --rm browser node scripts/bench-code.mjs
//
// The worker once ran pre-F3 code for weeks, and every drawing render failed without a
// word. It now restarts on a code change, and this is the check that it did. Run it
// first in any regression: a fixture that fails against a stale worker is lying.
//
// A restart takes a few seconds, so an edit made just before the run is given 45 to
// land. Past that the worker is behind, and the run fails with all three fingerprints.
//
// Every fixture now asks the same question before its first step (`run` in
// lib/bench.mjs), and regress.sh runs this first and stops if it fails. This file is
// the question on its own, for a bench you are about to drive by hand.

import { apiCall, expect, run } from "./lib/bench.mjs";

const GRACE_MS = 45000;

const short = (fingerprint) => (fingerprint ? fingerprint.slice(0, 12) : "no answer");

await run("bench-code", [
  {
    title: "The api and the worker run the code on disk",
    run: async () => {
      const deadline = Date.now() + GRACE_MS;
      let seen;
      for (;;) {
        const response = await apiCall(null, "GET", "/health/code");
        expect(response.status === 200, `/health/code: ${response.status} (is ENVIRONMENT local?)`);
        seen = response.body;
        if (seen.current || Date.now() > deadline) break;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      const report = `disk ${short(seen.on_disk)} · api ${short(seen.api)} · worker ${short(seen.worker)}`;
      expect(seen.api === seen.on_disk, `the api runs old code: ${report}`);
      expect(seen.worker !== null, `the worker did not answer in 10 s: ${report}`);
      expect(seen.worker === seen.on_disk, `the worker runs old code: ${report}`);
      return report;
    },
  },
]);
