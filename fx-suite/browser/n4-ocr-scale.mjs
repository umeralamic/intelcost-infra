// N4, a scale read from a sheet's image (D-852, D-872): the release runs the OCR worker, and this is the run that
// proves it. One sheet whose view titles are drawn as lines, so its text layer prints no scale (the 103-sheet key's
// E1.3A, 3/32" = 1'-0"), is loaded; the read on load finds none in the text and queues the OCR worker, which reads
// the image and applies the scale, flagged "Check scale".
//
// The world: one throwaway workspace and project, one page.

import { existsSync, readFileSync } from "node:fs";

import { APP, apiCall, expect, fixtureOwner, run, signInAs } from "./lib/bench.mjs";
import { freshWorkspace, makeProject } from "./lib/f4.mjs";
import { preparedSheets, sheetsOf, uploadAll } from "./lib/drawings.mjs";

const { token, workspace, base } = await freshWorkspace("N4 OCR scale");
const project = await makeProject(token, base, { name: "OCR scale" });
let sheet;

await run("n4-ocr-scale", [
  {
    title: "setup: the sheet loaded and prepared",
    run: async ({ page }) => {
      // The key's E1.3A, copied from fx-suite-updates/sheet-key/pdfs (a real drawing: on the bench, not in git).
      const at = new URL("./data/n4-ocr-e13a.pdf", import.meta.url);
      expect(existsSync(at), "data/n4-ocr-e13a.pdf is missing: copy the key's ccf33b2a….pdf there (see the comment above)");
      const buffer = readFileSync(at);
      const files = await uploadAll(page, token, base, project.uuid, [{ name: "E1.3A.pdf", buffer, folder: "Plans" }], workspace.uuid);
      // With the Load screen's two ticks (D-321): the name and the scale read from each page.
      const loaded = await apiCall(token, "POST", `${base}/${project.uuid}/drawing/load`, {
        files: [{ project_file_uuid: files["E1.3A.pdf"].uuid, pages: [1] }],
        read: { name: true, scale: true },
      });
      expect(loaded.status === 200, `load: ${loaded.status}`);
      [sheet] = await preparedSheets(token, base, project.uuid, loaded.body.files[0].file_uuid);
      return `prepared ${sheet.uuid}`;
    },
  },
  {
    title: "D-852: the OCR worker reads the scale off the image and applies it, flagged Check scale",
    run: async ({ page }) => {
      const started = Date.now();
      let row = null;
      // The OCR worker reads one sheet at a time, niced: up to five minutes on a loaded bench.
      while (Date.now() - started < 300000) {
        row = (await sheetsOf(token, base, project.uuid)).find((s) => s.uuid === sheet.uuid);
        if (row?.calibration_note?.ocr) break;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      expect(row?.calibration_note?.ocr === true, `no scale read from the image in 5 min: ${JSON.stringify({ label: row?.calibration_label, note: row?.calibration_note })}`);
      expect(row.calibration_label === `3/32" = 1'-0"`, `applied ${row.calibration_label}`);
      const seconds = Math.round((Date.now() - started) / 1000);
      await signInAs(page, (await fixtureOwner()).email);
      await page.goto(`${APP}/project/${project.uuid}/takeoff/${sheet.uuid}`);
      await page.getByText("Check scale").first().waitFor({ timeout: 30000 });
      return `${row.calibration_label} applied from the image ${seconds} s after the sheet was prepared; "Check scale" shown`;
    },
  },
]);
